import { BlobServiceClient } from "@azure/storage-blob"

const connectionString = process.env.AUTH_STORAGE_CONNECTION_STRING || process.env.AzureWebJobsStorage
if (!connectionString) {
  throw new Error("Falta AUTH_STORAGE_CONNECTION_STRING o AzureWebJobsStorage")
}

const CONTAINER = "ditalcarappfiles"
const blobService = BlobServiceClient.fromConnectionString(connectionString)
const container = blobService.getContainerClient(CONTAINER)

async function ensureContainer() {
  await container.createIfNotExists()
}

function safeExtension(fileName) {
  const lower = String(fileName || "").toLowerCase()
  if (lower.endsWith(".xlsm")) return ".xlsm"
  if (lower.endsWith(".xlsx")) return ".xlsx"
  throw new Error("El archivo debe ser Excel .xlsm o .xlsx.")
}

export async function saveKpiUpload(buffer, originalName, contentType) {
  await ensureContainer()
  const extension = safeExtension(originalName)
  const blobName = `kpi/KPI_DITALCAR${extension}`
  const client = container.getBlockBlobClient(blobName)
  await client.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: contentType || "application/octet-stream",
    },
  })
  return {
    blobName,
    fileName: String(originalName || `KPI_DITALCAR${extension}`),
    size: buffer.length,
    uploadedAt: new Date().toISOString(),
  }
}

export async function readKpiUpload(blobName) {
  if (!blobName) throw new Error("No hay un archivo KPI subido todavía.")
  await ensureContainer()
  const client = container.getBlobClient(String(blobName))
  const response = await client.download()
  const chunks = []
  for await (const chunk of response.readableStreamBody) chunks.push(Buffer.from(chunk))
  return {
    buffer: Buffer.concat(chunks),
    lastModified: response.lastModified?.toISOString(),
    contentType: response.contentType || "application/octet-stream",
  }
}
