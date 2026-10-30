import { TableClient } from "@azure/data-tables"
import { hashToken, normalizeEmail } from "./security.js"

const connectionString = process.env.AUTH_STORAGE_CONNECTION_STRING || process.env.AzureWebJobsStorage
if (!connectionString) {
  throw new Error("Falta AUTH_STORAGE_CONNECTION_STRING o AzureWebJobsStorage")
}

const clients = {
  users: TableClient.fromConnectionString(connectionString, "DitalcarAuthUsers"),
  tokens: TableClient.fromConnectionString(connectionString, "DitalcarAuthTokens"),
  sessions: TableClient.fromConnectionString(connectionString, "DitalcarAuthSessions"),
  config: TableClient.fromConnectionString(connectionString, "DitalcarAppConfig"),
}

let initialized = false
export async function ensureTables() {
  if (initialized) return
  await Promise.all(Object.values(clients).map((client) => client.createTable().catch((error) => {
    if (error?.statusCode !== 409) throw error
  })))
  initialized = true
}

function emailKey(email) {
  return Buffer.from(normalizeEmail(email)).toString("base64url")
}

// Usuarios creados dentro de DitalApp por Experiencia/PM (source = "APP").
export async function listAppUsers() {
  await ensureTables()
  const rows = []
  for await (const entity of clients.users.listEntities({ queryOptions: { filter: "PartitionKey eq 'USER' and source eq 'APP'" } })) {
    rows.push(entity)
  }
  return rows
}

export async function getUser(email) {
  await ensureTables()
  try {
    return await clients.users.getEntity("USER", emailKey(email))
  } catch (error) {
    if (error?.statusCode === 404) return null
    throw error
  }
}

export async function upsertUser(user) {
  await ensureTables()
  const entity = {
    partitionKey: "USER",
    rowKey: emailKey(user.email),
    ...user,
    email: normalizeEmail(user.email),
  }
  await clients.users.upsertEntity(entity, "Merge")
  return entity
}

export async function createOneTimeToken(email, type, minutes) {
  await ensureTables()
  const raw = (await import("./security.js")).randomToken(32)
  const tokenHash = hashToken(raw)
  await clients.tokens.upsertEntity({
    partitionKey: type,
    rowKey: tokenHash,
    email: normalizeEmail(email),
    expiresAt: new Date(Date.now() + minutes * 60_000).toISOString(),
    used: false,
  }, "Replace")
  return raw
}

export async function consumeOneTimeToken(raw, type) {
  await ensureTables()
  const key = hashToken(raw)
  try {
    const entity = await clients.tokens.getEntity(type, key)
    if (entity.used || new Date(entity.expiresAt).getTime() < Date.now()) return null
    entity.used = true
    entity.usedAt = new Date().toISOString()
    await clients.tokens.updateEntity(entity, "Replace")
    return entity
  } catch (error) {
    if (error?.statusCode === 404) return null
    throw error
  }
}

export async function createSession(email, days = 1) {
  await ensureTables()
  const { randomToken } = await import("./security.js")
  const raw = randomToken(40)
  await clients.sessions.upsertEntity({
    partitionKey: "SESSION",
    rowKey: hashToken(raw),
    email: normalizeEmail(email),
    expiresAt: new Date(Date.now() + days * 86_400_000).toISOString(),
    createdAt: new Date().toISOString(),
  }, "Replace")
  return raw
}

export async function getSession(raw) {
  if (!raw) return null
  await ensureTables()
  try {
    const entity = await clients.sessions.getEntity("SESSION", hashToken(raw))
    if (new Date(entity.expiresAt).getTime() < Date.now()) {
      await clients.sessions.deleteEntity("SESSION", hashToken(raw)).catch(() => {})
      return null
    }
    return entity
  } catch (error) {
    if (error?.statusCode === 404) return null
    throw error
  }
}

export async function deleteSession(raw) {
  if (!raw) return
  await ensureTables()
  await clients.sessions.deleteEntity("SESSION", hashToken(raw)).catch(() => {})
}


export async function getAppConfig(key) {
  await ensureTables()
  try {
    return await clients.config.getEntity("CONFIG", String(key))
  } catch (error) {
    if (error?.statusCode === 404) return null
    throw error
  }
}

export async function setAppConfig(key, value, extra = {}) {
  await ensureTables()
  const entity = {
    partitionKey: "CONFIG",
    rowKey: String(key),
    value: String(value ?? ""),
    updatedAt: new Date().toISOString(),
    ...extra,
  }
  await clients.config.upsertEntity(entity, "Replace")
  return entity
}
