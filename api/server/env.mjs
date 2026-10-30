// Carga api/server/.env (KEY=valor) sin pisar variables ya definidas.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
const file = process.env.DITO_ENV_FILE || path.join(path.dirname(fileURLToPath(import.meta.url)), ".env")
if (fs.existsSync(file)) {
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
    if (!m || line.trim().startsWith("#")) continue
    let v = m[2]
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1)
    if (process.env[m[1]] === undefined) process.env[m[1]] = v
  }
}
