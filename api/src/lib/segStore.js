// Registros del Seguimiento de clientes en Azure Table Storage:
// contactos (WhatsApp), entregas confirmadas, revisiones manuales y reclamos.
// Los estados de contacto nunca se borran: son el historial que evita reenvíos.

import { TableClient } from "@azure/data-tables"
import crypto from "node:crypto"

const TABLES = {
  contactos: "DitalcarSegContactos",
  entregas: "DitalcarSegEntregas",
  revisiones: "DitalcarSegRevisiones",
  reclamos: "DitalcarSegReclamos",
}

let clients = null
let ready = false

function getClients() {
  if (!clients) {
    const connectionString = process.env.AUTH_STORAGE_CONNECTION_STRING || process.env.AzureWebJobsStorage
    if (!connectionString) throw new Error("Falta AUTH_STORAGE_CONNECTION_STRING o AzureWebJobsStorage")
    clients = Object.fromEntries(Object.entries(TABLES).map(([k, name]) => [k, TableClient.fromConnectionString(connectionString, name)]))
  }
  return clients
}

async function ensure() {
  const c = getClients()
  if (ready) return c
  await Promise.all(Object.values(c).map((client) => client.createTable().catch((error) => {
    if (error?.statusCode !== 409) throw error
  })))
  ready = true
  return c
}

async function listAll(client, filter) {
  const items = []
  for await (const entity of client.listEntities(filter ? { queryOptions: { filter } } : undefined)) items.push(entity)
  return items
}

function safeKey(value) {
  return String(value || "SIN").replace(/[\\/#?\u0000-\u001F\u007F-\u009F]/g, "_").slice(0, 200)
}

const cache = { at: 0, value: null }
export function invalidateSegCache() { cache.at = 0 }

// ---------- contactos ----------
export const CONTACT_RESULTS = [
  "ENVIADO", "LEIDO", "RESPONDIDO", "SIN_RESPUESTA", "REAGENDAR",
  "DERIVADO_EJECUTIVO", "DERIVADO_EXPERIENCIA", "DERIVADO_SUCURSAL",
  "NUMERO_INCORRECTO", "NO_CONTACTAR", "GESTION_CERRADA",
]

function contactFromEntity(e) {
  return {
    id: e.rowKey, nv: e.partitionKey === "SIN" ? "" : e.partitionKey, rut: e.rut || "", phone: e.phone || "",
    stage: Number(e.stage || 0), at: e.at, result: e.result, observacion: e.observacion || "",
    derivadoA: e.derivadoA || "", proximaAccion: e.proximaAccion || "", responsable: e.responsable || "",
    responsableEmail: e.responsableEmail || "", source: e.source || "APP", reclamoId: e.reclamoId || "",
  }
}

export async function addContact(contact) {
  const { contactos } = await ensure()
  const id = contact.id || `${new Date().toISOString().replace(/[:.]/g, "-")}_${crypto.randomBytes(3).toString("hex")}`
  await contactos.upsertEntity({
    partitionKey: safeKey(contact.nv),
    rowKey: safeKey(id),
    rut: contact.rut || "", phone: contact.phone || "", stage: Number(contact.stage || 0),
    at: contact.at || new Date().toISOString(), result: contact.result,
    observacion: String(contact.observacion || "").slice(0, 2000),
    derivadoA: contact.derivadoA || "", proximaAccion: contact.proximaAccion || "",
    responsable: contact.responsable || "", responsableEmail: contact.responsableEmail || "",
    source: contact.source || "APP", reclamoId: contact.reclamoId || "",
  }, "Replace")
  invalidateSegCache()
  return id
}

export async function importContacts(list) {
  const { contactos } = await ensure()
  // Agrupar por NV (partition) para usar lotes transaccionales de hasta 100.
  const byPartition = new Map()
  for (const c of list) {
    const pk = safeKey(c.nv)
    if (!byPartition.has(pk)) byPartition.set(pk, new Map())
    byPartition.get(pk).set(safeKey(c.id), c)
  }
  let count = 0
  for (const [pk, map] of byPartition) {
    const actions = [...map.entries()].map(([rk, c]) => ["upsert", {
      partitionKey: pk, rowKey: rk, rut: c.rut || "", phone: c.phone || "", stage: Number(c.stage || 0),
      at: c.at || "", result: c.result, observacion: String(c.observacion || "").slice(0, 2000),
      derivadoA: c.derivadoA || "", proximaAccion: "", responsable: c.responsable || "",
      responsableEmail: "", source: c.source, reclamoId: "",
    }, "Replace"])
    for (let i = 0; i < actions.length; i += 100) {
      await contactos.submitTransaction(actions.slice(i, i + 100))
      count += Math.min(100, actions.length - i)
    }
  }
  invalidateSegCache()
  return count
}

// ---------- entregas ----------
export async function confirmDelivery(nv, data) {
  const { entregas } = await ensure()
  await entregas.upsertEntity({
    partitionKey: "ENTREGA", rowKey: safeKey(nv),
    entregado: data.entregado !== false, fechaEntrega: data.fechaEntrega || "",
    percepcion: data.percepcion || "", comentario: String(data.comentario || "").slice(0, 1000),
    confirmadoPor: data.confirmadoPor || "", confirmadoPorEmail: data.confirmadoPorEmail || "",
    confirmadoAt: new Date().toISOString(),
  }, "Replace")
  invalidateSegCache()
}

// ---------- revisiones manuales ----------
export async function saveReview(nv, stage, data) {
  const { revisiones } = await ensure()
  await revisiones.upsertEntity({
    partitionKey: "REVISION", rowKey: safeKey(`${nv}_${stage}`), nv, stage: Number(stage),
    decision: data.decision, nota: String(data.nota || "").slice(0, 1000),
    por: data.por || "", porEmail: data.porEmail || "", at: new Date().toISOString(),
  }, "Replace")
  invalidateSegCache()
}

// ---------- reclamos ----------
function claimFromEntity(e) {
  let historial = []
  try { historial = JSON.parse(e.historial || "[]") } catch { historial = [] }
  return {
    id: e.rowKey, nv: e.nv || "", rut: e.rut || "", cliente: e.cliente || "", marca: e.marca || "",
    grupo: e.grupo || "", local: e.local || "", motivo: e.motivo || "", urgencia: e.urgencia || "",
    detalle: e.detalle || "", estado: e.estado || "ABIERTO", nivel: e.nivel || "SUCURSAL",
    ayudaSolicitada: Boolean(e.ayudaSolicitada), creadoPor: e.creadoPor || "", creadoPorEmail: e.creadoPorEmail || "",
    creadoAt: e.creadoAt || "", actualizadoAt: e.actualizadoAt || "", historial,
  }
}

export async function getClaim(id) {
  const { reclamos } = await ensure()
  try { return claimFromEntity(await reclamos.getEntity("RECLAMO", safeKey(id))) } catch (error) {
    if (error?.statusCode === 404) return null
    throw error
  }
}

export async function saveClaim(claim) {
  const { reclamos } = await ensure()
  const id = claim.id || `R${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString("hex").toUpperCase()}`
  const historial = JSON.stringify((claim.historial || []).slice(-80))
  await reclamos.upsertEntity({
    partitionKey: "RECLAMO", rowKey: safeKey(id), nv: claim.nv || "", rut: claim.rut || "",
    cliente: claim.cliente || "", marca: claim.marca || "", grupo: claim.grupo || "", local: claim.local || "",
    motivo: String(claim.motivo || "").slice(0, 300), urgencia: claim.urgencia || "NORMAL",
    detalle: String(claim.detalle || "").slice(0, 4000), estado: claim.estado || "ABIERTO",
    nivel: claim.nivel || "SUCURSAL", ayudaSolicitada: Boolean(claim.ayudaSolicitada),
    creadoPor: claim.creadoPor || "", creadoPorEmail: claim.creadoPorEmail || "",
    creadoAt: claim.creadoAt || new Date().toISOString(), actualizadoAt: new Date().toISOString(),
    historial,
  }, "Replace")
  invalidateSegCache()
  return id
}

// ---------- lectura conjunta (con caché corta) ----------
export async function readSegData() {
  if (cache.value && Date.now() - cache.at < 15_000) return cache.value
  const c = await ensure()
  const [contactos, entregas, revisiones, reclamos] = await Promise.all([
    listAll(c.contactos), listAll(c.entregas), listAll(c.revisiones), listAll(c.reclamos),
  ])
  const value = {
    contactos: contactos.map(contactFromEntity),
    entregas: Object.fromEntries(entregas.map((e) => [e.rowKey, {
      entregado: e.entregado !== false, fechaEntrega: e.fechaEntrega || "", percepcion: e.percepcion || "",
      comentario: e.comentario || "", confirmadoPor: e.confirmadoPor || "", confirmadoAt: e.confirmadoAt || "",
    }])),
    revisiones: Object.fromEntries(revisiones.map((e) => [e.rowKey, {
      decision: e.decision, nota: e.nota || "", por: e.por || "", at: e.at,
    }])),
    reclamos: reclamos.map(claimFromEntity),
  }
  cache.value = value
  cache.at = Date.now()
  return value
}
