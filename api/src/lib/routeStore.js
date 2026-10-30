import { TableClient } from "@azure/data-tables"

const connectionString = process.env.AUTH_STORAGE_CONNECTION_STRING || process.env.AzureWebJobsStorage
if (!connectionString) throw new Error("Falta AUTH_STORAGE_CONNECTION_STRING o AzureWebJobsStorage")

const executions = TableClient.fromConnectionString(connectionString, "DitalcarRouteExecutions")
let ready = false
async function ensure() {
  if (ready) return
  await executions.createTable().catch((error) => {
    if (error?.statusCode !== 409) throw error
  })
  ready = true
}

function key(value) {
  return Buffer.from(String(value || "")).toString("base64url")
}

function parse(entity) {
  if (!entity?.payload) return null
  try { return JSON.parse(entity.payload) } catch { return null }
}

export async function saveRouteExecution(execution) {
  await ensure()
  await executions.upsertEntity({
    partitionKey: "ROUTE",
    rowKey: key(execution.id),
    executionId: execution.id,
    local: execution.local,
    mode: execution.mode,
    status: execution.status,
    completedByEmail: execution.completedByEmail,
    updatedAt: execution.updatedAt,
    payload: JSON.stringify(execution),
  }, "Replace")
  return execution
}

export async function getRouteExecution(id) {
  await ensure()
  try {
    return parse(await executions.getEntity("ROUTE", key(id)))
  } catch (error) {
    if (error?.statusCode === 404) return null
    throw error
  }
}

export async function listRouteExecutions() {
  await ensure()
  const rows = []
  for await (const entity of executions.listEntities({ queryOptions: { filter: "PartitionKey eq 'ROUTE'" } })) {
    const parsed = parse(entity)
    if (parsed) rows.push(parsed)
  }
  return rows.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
}

export async function deleteRouteExecutions(ids) {
  await ensure()
  let deleted = 0
  for (const id of ids) {
    try {
      await executions.deleteEntity("ROUTE", key(id))
      deleted += 1
    } catch (error) {
      if (error?.statusCode !== 404) throw error
    }
  }
  return deleted
}
