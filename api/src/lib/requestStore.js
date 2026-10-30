import { TableClient } from "@azure/data-tables"
import crypto from "node:crypto"
import { appFilesContainer, safeFileName } from "./dataFiles.js"

// Solicitudes de DitalApp guardadas en Azure Table (mientras Graph/SharePoint no
// tenga permisos). Cuando TI habilite Sites.Selected se sincronizan a las LIST.

const connectionString = process.env.AUTH_STORAGE_CONNECTION_STRING || process.env.AzureWebJobsStorage
if (!connectionString) throw new Error("Falta AUTH_STORAGE_CONNECTION_STRING o AzureWebJobsStorage")

const requests = TableClient.fromConnectionString(connectionString, "DitalcarRequests")
const timeline = TableClient.fromConnectionString(connectionString, "DitalcarRequestTimeline")
let ready = false
async function ensure() {
  if (ready) return
  await Promise.all([requests, timeline].map((client) => client.createTable().catch((error) => {
    if (error?.statusCode !== 409) throw error
  })))
  ready = true
}

// Azure Table limita cada propiedad de texto a 32K caracteres: el JSON se reparte.
const CHUNK = 30_000
function payloadProps(value) {
  const text = JSON.stringify(value)
  const props = {}
  for (let i = 0; i * CHUNK < text.length || i === 0; i++) {
    props[i === 0 ? "payload" : `payload${i}`] = text.slice(i * CHUNK, (i + 1) * CHUNK)
  }
  props.payloadParts = Object.keys(props).length
  return props
}
function parse(entity) {
  if (!entity?.payload) return null
  let text = entity.payload
  const parts = Number(entity.payloadParts || 1)
  for (let i = 1; i < parts; i++) text += entity[`payload${i}`] || ""
  try { return JSON.parse(text) } catch { return null }
}

function key(value) { return Buffer.from(String(value || "")).toString("base64url") }
function makeId() {
  const d = new Date()
  const stamp = d.toISOString().replace(/[-:TZ.]/g, "").slice(2, 12)
  return `SOL-${stamp}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`
}

export async function listRequestsStored() {
  await ensure()
  const rows = []
  for await (const entity of requests.listEntities({ queryOptions: { filter: "PartitionKey eq 'REQUEST'" } })) {
    const item = parse(entity)
    if (item) rows.push(item)
  }
  return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function getRequestStored(id) {
  await ensure()
  try { return parse(await requests.getEntity("REQUEST", key(id))) }
  catch (error) { if (error?.statusCode === 404) return null; throw error }
}

export async function saveRequestStored(request) {
  await ensure()
  const id = request.id || makeId()
  const item = { ...request, id }
  await requests.upsertEntity({
    partitionKey: "REQUEST",
    rowKey: key(id),
    requestId: id,
    local: item.local || "",
    requesterEmail: item.requesterEmail || "",
    currentResponsibleEmail: item.currentResponsibleEmail || "",
    status: item.status || "RECIBIDA",
    isTest: Boolean(item.isTest),
    updatedAt: new Date().toISOString(),
    ...payloadProps(item),
  }, "Replace")
  return item
}

export async function appendRequestTimeline(item) {
  await ensure()
  await timeline.upsertEntity({
    partitionKey: key(item.requestId),
    rowKey: key(item.id || crypto.randomUUID()),
    createdAt: item.createdAt,
    type: item.type,
    ...payloadProps(item),
  }, "Replace")
}

export async function getRequestTimelineStored(requestId) {
  await ensure()
  const filter = `PartitionKey eq '${key(requestId)}'`
  const rows = []
  for await (const entity of timeline.listEntities({ queryOptions: { filter } })) {
    const item = parse(entity)
    if (item) rows.push(item)
  }
  return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// ---------- Adjuntos (Blob) ----------
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = /^(image\/(png|jpe?g|webp|gif|heic|heif)|application\/pdf|application\/vnd\.openxmlformats-officedocument\..+|application\/vnd\.ms-excel|application\/msword|text\/plain)$/i

export async function saveRequestAttachment(requestId, { fileName, contentType, buffer }) {
  if (!buffer?.length) throw new Error("El archivo está vacío.")
  if (buffer.length > ATTACHMENT_MAX_BYTES) throw new Error("El archivo supera el máximo de 10 MB.")
  const type = String(contentType || "application/octet-stream")
  if (!ALLOWED_TYPES.test(type)) throw new Error("Formato no permitido. Usa imágenes, PDF, Word, Excel o texto.")
  const id = crypto.randomUUID()
  const name = safeFileName(fileName)
  const blobName = `solicitudes/${safeFileName(requestId)}/${id}-${name}`
  const container = await appFilesContainer()
  await container.getBlockBlobClient(blobName).uploadData(buffer, { blobHTTPHeaders: { blobContentType: type } })
  return { id, fileName: name, contentType: type, size: buffer.length, blobName }
}

export async function readRequestAttachment(blobName) {
  const container = await appFilesContainer()
  const client = container.getBlockBlobClient(blobName)
  const properties = await client.getProperties()
  const buffer = await client.downloadToBuffer()
  return { buffer, contentType: properties.contentType || "application/octet-stream" }
}
