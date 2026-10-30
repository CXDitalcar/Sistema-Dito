// Datos maestros de "Datos" (SIGA, Control de unidades, planilla T) guardados como
// JSON en Azure Blob. Cada carga se fusiona con lo existente:
// - se eliminan duplicados por llave (NV, VIN o traslado),
// - un registro existente se actualiza con la última lectura, conservando la
//   fecha en que se vio por primera vez (_firstSeen) e historial de cambios.

import { appFilesContainer } from "./dataFiles.js"
import { getAppConfig, setAppConfig } from "./store.js"

const MASTER_PREFIX = "datos/master"
const LOG_KEY = "DATOS_IMPORT_LOG"
const MAX_CHANGES = 25
const memory = new Map()

export async function readJsonBlob(name) {
  const container = await appFilesContainer()
  const client = container.getBlockBlobClient(name)
  try {
    const buffer = await client.downloadToBuffer()
    return JSON.parse(buffer.toString("utf8"))
  } catch (error) {
    if (error?.statusCode === 404) return null
    throw error
  }
}

export async function writeJsonBlob(name, value) {
  const container = await appFilesContainer()
  const body = Buffer.from(JSON.stringify(value))
  await container.getBlockBlobClient(name).uploadData(body, {
    blobHTTPHeaders: { blobContentType: "application/json" },
  })
}

export async function readMaster(kind) {
  const cached = memory.get(kind)
  if (cached && Date.now() - cached.at < 30_000) return cached.value
  const value = (await readJsonBlob(`${MASTER_PREFIX}/${kind}.json`)) || { kind, records: {}, updatedAt: null }
  memory.set(kind, { at: Date.now(), value })
  return value
}

export async function readAllMasters() {
  const [siga, control, traslados] = await Promise.all([readMaster("siga"), readMaster("control"), readMaster("traslados")])
  return { siga, control, traslados }
}

function sameValue(a, b) {
  return JSON.stringify(a ?? "") === JSON.stringify(b ?? "")
}

/**
 * Fusiona registros en el maestro.
 * @returns {{read:number, nuevos:number, actualizados:number, sinCambios:number, duplicados:number}}
 */
export async function mergeMaster(kind, records, { fileName, userEmail }) {
  const master = await readMaster(kind)
  const now = new Date().toISOString()
  const summary = { leidos: records.length, nuevos: 0, actualizados: 0, sinCambios: 0, duplicados: 0 }
  // Duplicados dentro del mismo archivo: se conserva la última fila de cada llave.
  const unique = new Map()
  for (const r of records) {
    if (!r.key) continue
    if (unique.has(r.key)) summary.duplicados++
    unique.set(r.key, r)
  }

  for (const incoming of unique.values()) {
    const { key, ...fields } = incoming
    const existing = master.records[key]
    if (!existing) {
      master.records[key] = { ...fields, _firstSeen: now, _lastSeen: now, _file: fileName, _changes: [] }
      summary.nuevos++
      continue
    }
    const changes = []
    for (const [field, value] of Object.entries(fields)) {
      // Un dato vacío en la nueva lectura no borra un dato ya conocido (por ejemplo, VIN asignado).
      if ((value === "" || value === null || value === undefined) && existing[field]) continue
      // Gespark: una vez visto el Estado Color 32768 (realizado), una lectura posterior no lo revierte.
      if (kind === "extranet" && field === "color" && existing.color === 32768) continue
      if (!sameValue(existing[field], value)) {
        changes.push({ at: now, field, from: existing[field] ?? "", to: value })
        existing[field] = value
      }
    }
    existing._lastSeen = now
    existing._file = fileName
    if (changes.length) {
      existing._changes = [...(existing._changes || []), ...changes].slice(-MAX_CHANGES)
      summary.actualizados++
    } else {
      summary.sinCambios++
    }
  }

  master.updatedAt = now
  master.updatedBy = userEmail
  await writeJsonBlob(`${MASTER_PREFIX}/${kind}.json`, master)
  memory.set(kind, { at: Date.now(), value: master })
  return summary
}

export async function appendImportLog(entry) {
  const stored = await getAppConfig(LOG_KEY)
  let log = []
  try { log = JSON.parse(String(stored?.value || "[]")) } catch { log = [] }
  log.unshift(entry)
  await setAppConfig(LOG_KEY, JSON.stringify(log.slice(0, 60)))
}

export async function getImportLog() {
  const stored = await getAppConfig(LOG_KEY)
  try { return JSON.parse(String(stored?.value || "[]")) } catch { return [] }
}

export function invalidateMasters() {
  memory.clear()
}
