// Carga de archivos grandes por bloques (Azure Blob "block blob").
// Flujo: uploads/start -> uploads/chunk (n veces) -> uploads/finalize.
// Cada bloque se envía en una petición separada para no superar el límite de tamaño
// de request de Azure Functions. Nada queda vigente hasta finalizar.

import crypto from "node:crypto"
import { getAppConfig, setAppConfig } from "./store.js"
import { appFilesContainer, dataFilesMaxBytes, fileExtension, normalizeKind, safeFileName } from "./dataFiles.js"

const SESSION_PREFIX = "UPLOAD_SESSION_"
const DEFAULT_CHUNK_BYTES = 4 * 1024 * 1024
const SESSION_HOURS = 6

export function largeUploadLimits() {
  const configured = Number(process.env.UPLOAD_CHUNK_BYTES || 0)
  const chunkBytes = Number.isFinite(configured) && configured >= 256 * 1024 && configured <= 16 * 1024 * 1024
    ? configured
    : DEFAULT_CHUNK_BYTES
  return { chunkBytes, maxBytes: dataFilesMaxBytes() }
}

// Todos los IDs de bloque de un blob deben tener el mismo largo.
function blockId(index) {
  return Buffer.from(`block-${String(index).padStart(6, "0")}`).toString("base64")
}

async function readSession(uploadId) {
  const id = String(uploadId || "")
  if (!/^[a-f0-9]{32}$/.test(id)) throw new Error("Identificador de carga no válido.")
  const stored = await getAppConfig(`${SESSION_PREFIX}${id}`)
  if (!stored?.value) throw new Error("La carga no existe o ya venció. Vuelve a subir el archivo.")
  try {
    return JSON.parse(String(stored.value))
  } catch {
    throw new Error("La sesión de carga está dañada. Vuelve a subir el archivo.")
  }
}

async function writeSession(session) {
  await setAppConfig(`${SESSION_PREFIX}${session.id}`, JSON.stringify(session), { updatedBy: session.createdBy })
  return session
}

function assertOwner(session, userEmail) {
  if (String(session.createdBy || "").toLowerCase() !== String(userEmail || "").toLowerCase()) {
    throw new Error("Esta carga pertenece a otro usuario.")
  }
  if (session.status === "COMPLETED") throw new Error("Esta carga ya fue finalizada.")
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    throw new Error("La carga venció. Vuelve a subir el archivo.")
  }
}

export async function startLargeUpload({ kind, fileName, size, contentType, createdBy }) {
  const normalizedKind = normalizeKind(kind)
  const extension = fileExtension(fileName)
  if (normalizedKind === "kpi" && ![".xlsx", ".xlsm"].includes(extension)) {
    throw new Error("El archivo KPI debe ser Excel .xlsm o .xlsx.")
  }

  const totalSize = Number(size)
  const { chunkBytes, maxBytes } = largeUploadLimits()
  if (!Number.isFinite(totalSize) || totalSize <= 0) throw new Error("El archivo está vacío.")
  if (totalSize > maxBytes) throw new Error(`El archivo supera el máximo de ${Math.round(maxBytes / 1024 / 1024)} MB.`)

  const id = crypto.randomBytes(16).toString("hex")
  const blobName = normalizedKind === "kpi"
    ? `kpi/uploads/${id}${extension}`
    : `data/${normalizedKind}/${id}_${safeFileName(fileName)}`

  const now = Date.now()
  return writeSession({
    id,
    kind: normalizedKind,
    fileName: String(fileName),
    size: totalSize,
    contentType: contentType || "application/octet-stream",
    blobName,
    chunkBytes,
    totalChunks: Math.ceil(totalSize / chunkBytes),
    createdBy: String(createdBy || ""),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_HOURS * 3_600_000).toISOString(),
    status: "IN_PROGRESS",
  })
}

export async function stageLargeUploadChunk({ uploadId, index, buffer, userEmail }) {
  const session = await readSession(uploadId)
  assertOwner(session, userEmail)

  if (!Number.isInteger(index) || index < 0 || index >= session.totalChunks) {
    throw new Error(`Bloque fuera de rango (0 a ${session.totalChunks - 1}).`)
  }
  if (!buffer?.length) throw new Error("El bloque llegó vacío.")
  if (buffer.length > session.chunkBytes) throw new Error("El bloque supera el tamaño permitido.")

  const container = await appFilesContainer()
  await container.getBlockBlobClient(session.blobName).stageBlock(blockId(index), buffer, buffer.length)
  return { uploadId: session.id, index, received: buffer.length, totalChunks: session.totalChunks }
}

export async function finalizeLargeUpload({ uploadId, userEmail }) {
  const session = await readSession(uploadId)
  assertOwner(session, userEmail)

  const container = await appFilesContainer()
  const client = container.getBlockBlobClient(session.blobName)
  // Si todavía no llega ningún bloque, el blob no existe y Azure responde 404.
  const list = await client.getBlockList("uncommitted").catch((error) => {
    if (error?.statusCode === 404) return { uncommittedBlocks: [] }
    throw error
  })
  const staged = new Set((list.uncommittedBlocks || []).map((block) => block.name))

  const ids = Array.from({ length: session.totalChunks }, (_, index) => blockId(index))
  const missing = ids.map((id, index) => (staged.has(id) ? null : index)).filter((value) => value !== null)
  if (missing.length) {
    throw new Error(`Faltan ${missing.length} bloque(s) por subir (primero faltante: ${missing[0]}).`)
  }

  await client.commitBlockList(ids, { blobHTTPHeaders: { blobContentType: session.contentType } })
  const properties = await client.getProperties()
  if (Number(properties.contentLength) !== Number(session.size)) {
    await client.deleteIfExists().catch(() => {})
    throw new Error("El archivo recibido no coincide con el tamaño declarado. Vuelve a subirlo.")
  }

  return writeSession({ ...session, status: "COMPLETED", completedAt: new Date().toISOString() })
}
