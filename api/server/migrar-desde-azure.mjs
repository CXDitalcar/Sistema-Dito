// Copia TODOS los datos de Azure (tablas + archivos) al servidor propio.
// Uso (desde la carpeta api):
//   $env:AZURE_CONNECTION_STRING="<cadena de conexión de la cuenta de Storage>"
//   node server/migrar-desde-azure.mjs            -> copia y verifica
//   node server/migrar-desde-azure.mjs --verificar -> solo compara, sin copiar
// Solo LEE de Azure; nunca borra ni modifica nada allá. Se puede repetir (actualiza lo copiado).
import "./env.mjs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import crypto from "node:crypto"

const here = path.dirname(fileURLToPath(import.meta.url))
process.env.DITO_DATA_DIR ||= path.resolve(here, "..", "..", "datos")
const cs = process.env.AZURE_CONNECTION_STRING
if (!cs) { console.error("Falta AZURE_CONNECTION_STRING (cadena de conexión de la cuenta de Storage de Azure)."); process.exit(1) }
const opts = process.env.AZURE_ALLOW_INSECURE ? { allowInsecureConnection: true } : undefined // solo para pruebas con emulador
const soloVerificar = process.argv.includes("--verificar")

const az = { tables: await import("@azure/data-tables"), blob: await import("@azure/storage-blob") }
const local = {
  tables: await import(pathToFileURL(path.join(here, "shim", "data-tables.mjs")).href),
  blob: await import(pathToFileURL(path.join(here, "shim", "storage-blob.mjs")).href),
}

const problemas = []
const resumen = { tablas: {}, archivos: { azure: 0, local: 0, bytes: 0 } }

// ---------- Tablas ----------
const svc = az.tables.TableServiceClient.fromConnectionString(cs, opts)
const nombres = []
for await (const t of svc.listTables()) nombres.push(t.name)
for (const name of nombres) {
  const remote = az.tables.TableClient.fromConnectionString(cs, name, opts)
  const dest = local.tables.TableClient.fromConnectionString("local", name)
  await dest.createTable()
  let n = 0
  const claves = new Set()
  for await (const e of remote.listEntities()) {
    const { etag, timestamp, ...resto } = e
    for (const k of Object.keys(resto)) if (k.startsWith("odata.")) delete resto[k]
    claves.add(`${e.partitionKey}|${e.rowKey}`)
    if (!soloVerificar) await dest.upsertEntity({ ...JSON.parse(JSON.stringify(resto)), partitionKey: e.partitionKey, rowKey: e.rowKey }, "Replace")
    n++
  }
  let m = 0
  for await (const e of dest.listEntities()) { if (!claves.has(`${e.partitionKey}|${e.rowKey}`)) problemas.push(`Sobra en local: ${name} ${e.partitionKey}/${e.rowKey}`); m++ }
  resumen.tablas[name] = { azure: n, local: m }
  if (n !== m) problemas.push(`Tabla ${name}: Azure ${n} filas, local ${m}`)
  console.log(`Tabla ${name}: ${n} filas ${soloVerificar ? "(verificada)" : "copiadas"}`)
}

// ---------- Archivos (blobs) ----------
const bsvc = az.blob.BlobServiceClient.fromConnectionString(cs)
const lsvc = local.blob.BlobServiceClient.fromConnectionString("local")
for await (const c of bsvc.listContainers()) {
  const rc = bsvc.getContainerClient(c.name)
  const lc = lsvc.getContainerClient(c.name)
  await lc.createIfNotExists()
  for await (const b of rc.listBlobsFlat()) {
    const rb = rc.getBlockBlobClient(b.name)
    const lb = lc.getBlockBlobClient(b.name)
    resumen.archivos.azure++
    let buf
    if (!soloVerificar) {
      const props = await rb.getProperties()
      buf = await rb.downloadToBuffer()
      await lb.uploadData(buf, { blobHTTPHeaders: { blobContentType: props.contentType } })
    }
    try {
      const copia = await lb.downloadToBuffer()
      resumen.archivos.local++; resumen.archivos.bytes += copia.length
      if (b.properties?.contentLength !== undefined && copia.length !== Number(b.properties.contentLength)) problemas.push(`Archivo ${c.name}/${b.name}: tamaño distinto (${b.properties.contentLength} vs ${copia.length})`)
      if (buf && crypto.createHash("sha256").update(buf).digest("hex") !== crypto.createHash("sha256").update(copia).digest("hex")) problemas.push(`Archivo ${c.name}/${b.name}: contenido distinto`)
    } catch { problemas.push(`Falta en local: ${c.name}/${b.name}`) }
  }
}
console.log(`Archivos: ${resumen.archivos.azure} en Azure, ${resumen.archivos.local} en local (${(resumen.archivos.bytes / 1048576).toFixed(1)} MB)`)

console.log("\n===== RESUMEN =====")
for (const [t, r] of Object.entries(resumen.tablas)) console.log(`${r.azure === r.local ? "OK " : "ERR"} ${t}: Azure ${r.azure} / local ${r.local}`)
if (problemas.length) { console.log("\nPROBLEMAS:"); problemas.forEach((p) => console.log(" - " + p)); process.exit(2) }
console.log("\nTodo coincide. Los datos de Azure quedaron copiados y verificados.")
