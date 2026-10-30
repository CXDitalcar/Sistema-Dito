// Respaldo diario: copia consistente de la base + archivos, en carpetas con fecha.
// Variables: DITO_DATA_DIR, DITO_BACKUP_DIR (por defecto <datos>/../respaldos),
//            DITO_BACKUP_EXTRA_DIR (opcional, p.ej. carpeta de OneDrive/SharePoint sincronizada),
//            DITO_BACKUP_KEEP_DAYS (por defecto 30).
import "./env.mjs"
import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { DatabaseSync } from "node:sqlite"

const here = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(process.env.DITO_DATA_DIR || path.join(here, "..", "..", "datos"))
const backupDir = path.resolve(process.env.DITO_BACKUP_DIR || path.join(dataDir, "..", "respaldos"))
const keep = Number(process.env.DITO_BACKUP_KEEP_DAYS || 30)
const stamp = new Date().toISOString().replace(/[:]/g, "-").slice(0, 19)
const out = path.join(backupDir, `DITO_${stamp}`)
fs.mkdirSync(out, { recursive: true })

const dbFile = path.join(dataDir, "dito.sqlite")
if (!fs.existsSync(dbFile)) { console.error("No existe la base de datos en " + dbFile); process.exit(1) }
const db = new DatabaseSync(dbFile)
db.exec(`VACUUM INTO '${path.join(out, "dito.sqlite").replaceAll("'", "''")}'`)
db.close()

const files = path.join(dataDir, "archivos")
if (fs.existsSync(files) && fs.readdirSync(files).length) {
  // tar viene incluido en Windows 10/11 y en Linux/Mac.
  execFileSync("tar", ["-czf", path.join(out, "archivos.tar.gz"), "-C", dataDir, "archivos"], { stdio: "inherit" })
}
// Comprobación: la copia se abre y tiene datos.
const chk = new DatabaseSync(path.join(out, "dito.sqlite"), { readOnly: true })
const n = chk.prepare("SELECT COUNT(*) c FROM entities").get().c
chk.close()
fs.writeFileSync(path.join(out, "LEEME.txt"), `Respaldo de DITO ${new Date().toISOString()}\nFilas en base: ${n}\nPara restaurar: detén DITO, reemplaza datos\\dito.sqlite y descomprime archivos.tar.gz dentro de datos\\.\n`)
console.log(`Respaldo listo: ${out} (${n} filas)`)

// Copia secundaria (otra ubicación)
if (process.env.DITO_BACKUP_EXTRA_DIR) {
  const extra = path.join(path.resolve(process.env.DITO_BACKUP_EXTRA_DIR), path.basename(out))
  fs.cpSync(out, extra, { recursive: true })
  console.log("Copia secundaria: " + extra)
}
// Limpieza de respaldos antiguos
const limite = Date.now() - keep * 86400000
for (const base of [backupDir, process.env.DITO_BACKUP_EXTRA_DIR && path.resolve(process.env.DITO_BACKUP_EXTRA_DIR)].filter(Boolean)) {
  for (const d of fs.readdirSync(base)) {
    const p = path.join(base, d)
    if (/^DITO_\d{4}-\d{2}-\d{2}T/.test(d) && fs.statSync(p).mtimeMs < limite) { fs.rmSync(p, { recursive: true, force: true }); console.log("Eliminado respaldo antiguo " + d) }
  }
}
