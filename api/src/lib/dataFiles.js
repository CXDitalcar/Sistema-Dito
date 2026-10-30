// Archivos de datos cargados desde la app (Excel/CSV de transición) guardados en Azure Blob Storage.
// Cada "kind" (tipo de fuente, p. ej. "usuarios") tiene un archivo vigente; su estado se guarda
// en la tabla de configuración DitalcarAppConfig. Fuente TEMPORAL: el diseño final son LIST.

import { BlobServiceClient } from "@azure/storage-blob"
import { getAppConfig, setAppConfig } from "./store.js"

const CONTAINER = "ditalcarappfiles"
const INDEX_KEY = "DATA_FILES_INDEX"
const STATE_PREFIX = "DATA_FILE_"
const DEFAULT_MAX_BYTES = 100 * 1024 * 1024
const ALLOWED_EXTENSIONS = [".xlsx", ".xlsm", ".csv"]
const RESERVED_KINDS = new Set(["status", "upload"])

let containerClient = null
let containerReady = false

// Contenedor compartido con kpiUpload.js / chunkedUpload.js. Se crea de forma diferida
// para que un error de Storage no impida que cargue el resto de la API.
export async function appFilesContainer() {
  if (!containerClient) {
    const connectionString = process.env.AUTH_STORAGE_CONNECTION_STRING || process.env.AzureWebJobsStorage
    if (!connectionString) throw new Error("Falta AUTH_STORAGE_CONNECTION_STRING o AzureWebJobsStorage")
    containerClient = BlobServiceClient.fromConnectionString(connectionString).getContainerClient(CONTAINER)
  }
  if (!containerReady) {
    await containerClient.createIfNotExists()
    containerReady = true
  }
  return containerClient
}

export function dataFilesMaxBytes() {
  const configured = Number(process.env.DATA_FILES_MAX_BYTES || 0)
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_BYTES
}

export function normalizeKind(value) {
  const kind = String(value || "").trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(kind) || RESERVED_KINDS.has(kind)) {
    throw new Error("Tipo de fuente no válido. Usa sólo letras, números, guion o guion bajo (2 a 40 caracteres).")
  }
  return kind
}

export function fileExtension(fileName) {
  const lower = String(fileName || "").toLowerCase()
  const extension = ALLOWED_EXTENSIONS.find((ext) => lower.endsWith(ext))
  if (!extension) throw new Error(`Formato no permitido. Usa ${ALLOWED_EXTENSIONS.join(", ")}.`)
  return extension
}

export function safeFileName(fileName) {
  const base = String(fileName || "archivo")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return (base || "archivo").slice(-120)
}

async function readIndex() {
  const stored = await getAppConfig(INDEX_KEY)
  if (!stored?.value) return []
  try {
    const parsed = JSON.parse(String(stored.value))
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []
  } catch {
    return []
  }
}

async function addToIndex(kind) {
  const kinds = await readIndex()
  if (kinds.includes(kind)) return
  await setAppConfig(INDEX_KEY, JSON.stringify([...kinds, kind].sort()))
}

function emptyState(kind) {
  return { kind, configured: false, fileName: null, size: 0, uploadedAt: null, updatedBy: null }
}

export async function getDataFileState(rawKind) {
  const kind = normalizeKind(rawKind)
  const stored = await getAppConfig(`${STATE_PREFIX}${kind.toUpperCase()}`)
  if (!stored?.value) return emptyState(kind)
  try {
    const state = JSON.parse(String(stored.value))
    return { ...emptyState(kind), ...state, kind, configured: Boolean(state.blobName) }
  } catch {
    return emptyState(kind)
  }
}

export async function getAllDataFileStates() {
  const kinds = await readIndex()
  return Promise.all(kinds.map((kind) => getDataFileState(kind).catch(() => emptyState(kind))))
}

/**
 * Registra como vigente un blob ya escrito (usado por la carga por bloques).
 */
export async function registerDataFileBlob(rawKind, { blobName, fileName, size, uploadedAt, contentType } = {}, updatedBy) {
  const kind = normalizeKind(rawKind)
  if (!blobName) throw new Error("No se recibió el archivo a registrar.")
  const state = {
    kind,
    blobName: String(blobName),
    fileName: String(fileName || blobName.split("/").pop()),
    size: Number(size || 0),
    contentType: contentType || undefined,
    uploadedAt: uploadedAt || new Date().toISOString(),
    updatedBy: String(updatedBy || ""),
  }
  await setAppConfig(`${STATE_PREFIX}${kind.toUpperCase()}`, JSON.stringify(state), { updatedBy: state.updatedBy })
  await addToIndex(kind)
  return { ...state, configured: true }
}

/**
 * Guarda un archivo completo (carga directa, hasta dataFilesMaxBytes) y lo deja vigente.
 */
export async function saveDataFile(rawKind, buffer, fileName, contentType, updatedBy) {
  const kind = normalizeKind(rawKind)
  fileExtension(fileName)
  if (!buffer?.length) throw new Error("El archivo está vacío.")
  if (buffer.length > dataFilesMaxBytes()) throw new Error("El archivo supera el tamaño máximo permitido.")

  const container = await appFilesContainer()
  const uploadedAt = new Date().toISOString()
  const blobName = `data/${kind}/${uploadedAt.replace(/[:.]/g, "-")}_${safeFileName(fileName)}`
  await container.getBlockBlobClient(blobName).uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType || "application/octet-stream" },
  })

  return registerDataFileBlob(kind, { blobName, fileName, size: buffer.length, uploadedAt, contentType }, updatedBy)
}
