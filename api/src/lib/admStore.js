// Contabilidad · guarda en Azure.
// - DitalcarAdmListas: una fila por PDF cargado (marca, vigencia, estado). Clave = SHA-256: cargar de nuevo no duplica.
// - Blob contabilidad/pdf/<marca>/<sha>.pdf (original) y contabilidad/listas/<sha>.json (filas leídas).
// - DitalcarAdmCondiciones: si cada NV financió con SCF o tuvo retoma (lo ingresa Contabilidad).
// Estos datos (precios, márgenes, bonos) solo los lee la API de Contabilidad.
import { TableClient } from "@azure/data-tables"
import { appFilesContainer } from "./dataFiles.js"

const connectionString = process.env.AUTH_STORAGE_CONNECTION_STRING || process.env.AzureWebJobsStorage

let tables = null
async function table(name) {
  if (!connectionString) throw new Error("Falta AUTH_STORAGE_CONNECTION_STRING o AzureWebJobsStorage")
  tables ||= {}
  if (!tables[name]) {
    const client = TableClient.fromConnectionString(connectionString, name)
    await client.createTable().catch((error) => { if (error?.statusCode !== 409) throw error })
    tables[name] = client
  }
  return tables[name]
}

async function readBlobJson(name) {
  const container = await appFilesContainer()
  const client = container.getBlockBlobClient(name)
  if (!(await client.exists())) return null
  return JSON.parse((await client.downloadToBuffer()).toString("utf8"))
}

async function writeBlob(name, data, contentType) {
  const container = await appFilesContainer()
  await container.getBlockBlobClient(name).uploadData(data, { blobHTTPHeaders: { blobContentType: contentType } })
}

const listaMeta = (e) => ({
  sha: e.rowKey, marca: e.marca || null, tipo: e.tipo || "RETAIL", mes: e.mes || null, ruta: e.ruta || e.archivo, extension: e.extension || "pdf",
  estado: e.estado, lector: e.lector || null, archivo: e.archivo,
  titulo: e.titulo || null, canal: e.canal || null, desde: e.desde || null, hasta: e.hasta || null, filas: e.filas || 0,
  avisos: JSON.parse(e.avisos || "[]"), observaciones: JSON.parse(e.observaciones || "[]"),
  cargadoPor: e.cargadoPor, cargadoEn: e.cargadoEn,
})

export async function getLista(sha) {
  const client = await table("DitalcarAdmListas")
  try { return listaMeta(await client.getEntity("LISTA", sha)) } catch (error) {
    if (error?.statusCode === 404) return null
    throw error
  }
}

export async function listListas() {
  const client = await table("DitalcarAdmListas")
  const rows = []
  for await (const e of client.listEntities({ queryOptions: { filter: "PartitionKey eq 'LISTA'" } })) rows.push(listaMeta(e))
  return rows.sort((a, b) => String(b.cargadoEn).localeCompare(String(a.cargadoEn)))
}

// Listas RETAIL con sus filas, para calcular bonos (solo las que el lector leyó bien; flota va aparte).
export async function listasConFilas() {
  const metas = (await listListas()).filter((l) => l.estado === "OK" && l.tipo === "RETAIL")
  const conFilas = await Promise.all(metas.map(async (m) => ({ ...m, filas: (await readBlobJson(`contabilidad/listas/${m.sha}.json`))?.filas || [] })))
  return conFilas.filter((l) => l.filas.length)
}

const blobOriginal = (meta) => `contabilidad/archivos/${(meta.marca || "sin_marca").toLowerCase()}/${meta.sha}.${meta.extension}`

// Archivo original guardado (para volver a leerlo cuando se agregue el lector de su marca).
export async function readOriginal(meta) {
  const container = await appFilesContainer()
  return container.getBlockBlobClient(blobOriginal(meta)).downloadToBuffer()
}

export async function saveLista({ sha, buffer, archivo, ruta, lectura, cargadoPor, original = true }) {
  const extension = /\.xlsx?$|\.xlsm$/i.test(archivo) ? archivo.split(".").pop().toLowerCase() : "pdf"
  const meta = { sha, marca: lectura.marca, extension }
  if (original) await writeBlob(blobOriginal(meta), buffer, extension === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  await writeBlob(`contabilidad/listas/${sha}.json`, Buffer.from(JSON.stringify({ meta: lectura.meta, filas: lectura.filas })), "application/json")
  const client = await table("DitalcarAdmListas")
  await client.upsertEntity({
    partitionKey: "LISTA",
    rowKey: sha,
    marca: lectura.marca || "",
    tipo: lectura.tipo || "RETAIL",
    mes: lectura.meta.desde ? lectura.meta.desde.slice(0, 7) : (lectura.mes || ""),
    ruta: String(ruta || archivo).slice(0, 300),
    extension,
    estado: lectura.estado,
    lector: lectura.lector || "",
    archivo: String(archivo).slice(0, 200),
    titulo: lectura.meta.titulo || "",
    canal: lectura.meta.canal || "",
    desde: lectura.meta.desde || "",
    hasta: lectura.meta.hasta || "",
    filas: lectura.filas.length,
    avisos: JSON.stringify(lectura.meta.avisos || []).slice(0, 16000),
    observaciones: JSON.stringify(lectura.meta.observaciones || []).slice(0, 16000),
    cargadoPor,
    cargadoEn: new Date().toISOString(),
  }, "Replace")
  return getLista(sha)
}

export async function listCondiciones() {
  const client = await table("DitalcarAdmCondiciones")
  const out = {}
  for await (const e of client.listEntities({ queryOptions: { filter: "PartitionKey eq 'NV'" } })) {
    out[e.rowKey] = {
      financiaScf: typeof e.financiaScf === "boolean" ? e.financiaScf : undefined,
      tieneRetoma: typeof e.tieneRetoma === "boolean" ? e.tieneRetoma : undefined,
      canal: e.canal || undefined,
    }
  }
  return out
}

// null en un campo = "no se sabe" (vuelve a usar lo que diga SIGA, si dice algo).
// canal (Stellantis): TMP todo medio de pago · CC crédito convencional · CI compra inteligente.
export async function saveCondicion(nv, { financiaScf, tieneRetoma, canal }, actualizadoPor) {
  const client = await table("DitalcarAdmCondiciones")
  const entity = { partitionKey: "NV", rowKey: String(nv), actualizadoPor, actualizadoEn: new Date().toISOString() }
  if (typeof financiaScf === "boolean") entity.financiaScf = financiaScf
  if (typeof tieneRetoma === "boolean") entity.tieneRetoma = tieneRetoma
  if (canal) entity.canal = canal
  await client.upsertEntity(entity, "Replace")
}
