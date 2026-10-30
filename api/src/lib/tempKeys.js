// Claves temporales de activación (alternativa al correo mientras Mail.Send no esté
// habilitado). Experiencia / Project Manager generan una clave para una persona del
// directorio; la persona entra con su correo + la clave y crea su contraseña.
// La clave se guarda sólo como hash, vence, es de un solo uso y se puede desactivar.

import { TableClient } from "@azure/data-tables"
import crypto from "node:crypto"
import { hashToken, normalizeEmail } from "./security.js"

const TABLE = "DitalcarAuthTempKeys"
const DEFAULT_DAYS = 7
const MAX_ATTEMPTS = 5
let client = null
let ready = false

async function table() {
  if (!client) {
    const connectionString = process.env.AUTH_STORAGE_CONNECTION_STRING || process.env.AzureWebJobsStorage
    if (!connectionString) throw new Error("Falta AUTH_STORAGE_CONNECTION_STRING o AzureWebJobsStorage")
    client = TableClient.fromConnectionString(connectionString, TABLE)
  }
  if (!ready) {
    await client.createTable().catch((error) => { if (error?.statusCode !== 409) throw error })
    ready = true
  }
  return client
}

const rowKey = (email) => Buffer.from(normalizeEmail(email)).toString("base64url")

// Clave legible para dictar o enviar por WhatsApp: 3 grupos de 4 (sin 0/O/1/I).
function newCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = crypto.randomBytes(12)
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length])
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`
}

function publicKey(e) {
  const expired = e.estado === "ACTIVA" && new Date(e.expiresAt).getTime() < Date.now()
  return {
    email: e.email, nombre: e.nombre || "", estado: expired ? "VENCIDA" : e.estado,
    creadaPor: e.creadaPor || "", creadaAt: e.creadaAt || "", expiresAt: e.expiresAt || "",
    usadaAt: e.usadaAt || "", desactivadaAt: e.desactivadaAt || "", intentos: Number(e.intentos || 0),
  }
}

export async function createTempKey({ email, nombre, createdBy, days = DEFAULT_DAYS }) {
  const t = await table()
  const code = newCode()
  const now = Date.now()
  await t.upsertEntity({
    partitionKey: "TEMPKEY", rowKey: rowKey(email), email: normalizeEmail(email), nombre: nombre || "",
    codeHash: hashToken(code.replace(/-/g, "")), estado: "ACTIVA", intentos: 0,
    creadaPor: createdBy || "", creadaAt: new Date(now).toISOString(),
    expiresAt: new Date(now + Math.min(Math.max(Number(days) || DEFAULT_DAYS, 1), 30) * 86400000).toISOString(),
    usadaAt: "", desactivadaAt: "",
  }, "Replace")
  return code
}

export async function listTempKeys() {
  const t = await table()
  const items = []
  for await (const e of t.listEntities()) items.push(publicKey(e))
  return items.sort((a, b) => String(b.creadaAt).localeCompare(String(a.creadaAt)))
}

export async function deactivateTempKey(email, by) {
  const t = await table()
  try {
    const e = await t.getEntity("TEMPKEY", rowKey(email))
    if (e.estado === "ACTIVA") {
      await t.updateEntity({ partitionKey: e.partitionKey, rowKey: e.rowKey, estado: "DESACTIVADA", desactivadaAt: new Date().toISOString(), desactivadaPor: by || "" }, "Merge")
    }
    return true
  } catch (error) {
    if (error?.statusCode === 404) return false
    throw error
  }
}

/** Valida la clave. Devuelve { ok, message }. Bloquea la clave tras 5 intentos fallidos. */
export async function consumeTempKey(email, code) {
  const t = await table()
  let e
  try { e = await t.getEntity("TEMPKEY", rowKey(email)) } catch (error) {
    if (error?.statusCode === 404) return { ok: false, message: "Correo o clave temporal incorrectos." }
    throw error
  }
  const invalid = { ok: false, message: "Correo o clave temporal incorrectos." }
  if (e.estado !== "ACTIVA") return { ok: false, message: "Esta clave temporal ya no está activa. Pide una nueva a Experiencia de Clientes." }
  if (new Date(e.expiresAt).getTime() < Date.now()) return { ok: false, message: "La clave temporal venció. Pide una nueva a Experiencia de Clientes." }
  const given = hashToken(String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, ""))
  const expected = String(e.codeHash || "")
  const match = given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  if (!match) {
    const intentos = Number(e.intentos || 0) + 1
    await t.updateEntity({ partitionKey: e.partitionKey, rowKey: e.rowKey, intentos, ...(intentos >= MAX_ATTEMPTS ? { estado: "BLOQUEADA" } : {}) }, "Merge")
    return intentos >= MAX_ATTEMPTS ? { ok: false, message: "La clave se bloqueó por demasiados intentos. Pide una nueva a Experiencia de Clientes." } : invalid
  }
  await t.updateEntity({ partitionKey: e.partitionKey, rowKey: e.rowKey, estado: "USADA", usadaAt: new Date().toISOString() }, "Merge")
  return { ok: true }
}
