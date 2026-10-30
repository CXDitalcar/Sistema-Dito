import { BlobServiceClient } from "@azure/storage-blob"
import crypto from "node:crypto"

const connectionString = process.env.AUTH_STORAGE_CONNECTION_STRING || process.env.AzureWebJobsStorage
if (!connectionString) throw new Error("Falta AUTH_STORAGE_CONNECTION_STRING o AzureWebJobsStorage")

const blobService = BlobServiceClient.fromConnectionString(connectionString)
const container = blobService.getContainerClient("ditalcarappfiles")

async function ensure() {
  await container.createIfNotExists()
}

function safeName(name) {
  return String(name || "archivo")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(-120)
}

export async function saveRouteEvidence(buffer, originalName, contentType, executionId, itemId) {
  await ensure()
  const id = crypto.randomUUID()
  const uploadedAt = new Date().toISOString()
  const fileName = safeName(originalName)
  const blobName = `ruta/${safeName(executionId)}/${safeName(itemId)}/${id}-${fileName}`
  const client = container.getBlockBlobClient(blobName)
  await client.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType || "application/octet-stream" },
    metadata: { executionId: safeName(executionId), itemId: safeName(itemId), originalName: fileName },
  })
  return { id, fileName, size: buffer.length, uploadedAt, itemId, blobName }
}
