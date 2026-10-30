// Servidor propio de DITO: sirve el sitio (dist) y la API (/api/*) en un solo proceso.
// Escucha solo en 127.0.0.1; el acceso desde internet entra por Cloudflare Tunnel (HTTPS).
import "./env.mjs"
import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { register } from "node:module"
import { Readable } from "node:stream"
import { fileURLToPath, pathToFileURL } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
process.env.AUTH_STORAGE_CONNECTION_STRING ||= "local"
process.env.DITO_DATA_DIR ||= path.resolve(here, "..", "..", "datos")
const PORT = Number(process.env.PORT || 4300)
const DIST = path.resolve(process.env.DITO_DIST || path.join(here, "..", "..", "dist"))

register("./hooks.mjs", import.meta.url)
const { routes } = await import("./shim/functions.mjs")
await import(pathToFileURL(path.join(here, "..", "src", "index.js")).href)

// Tabla de rutas /api/<route> con {parametros}
const table = routes.map((r) => {
  const names = []
  const rx = new RegExp("^/api/" + r.route.replace(/\{(\w+)\??\}/g, (_, n) => { names.push(n); return "([^/]+)" }) + "/?$")
  return { ...r, rx, names }
})
console.log(`[DITO] ${table.length} rutas de API cargadas. Datos en ${process.env.DITO_DATA_DIR}`)

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".webp": "image/webp", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
  ".pdf": "application/pdf", ".txt": "text/plain; charset=utf-8", ".map": "application/json",
}
const context = { log: console.log, error: console.error, warn: console.warn, info: console.log }

function sendStatic(req, res, pathname) {
  let rel
  try { rel = decodeURIComponent(pathname) } catch { rel = "/" }
  let file = path.resolve(DIST, "." + rel)
  if (file !== DIST && !file.startsWith(DIST + path.sep)) { res.writeHead(400).end(); return }
  let isFile = false
  try { isFile = fs.statSync(file).isFile() } catch {}
  if (!isFile) {
    // Igual que staticwebapp.config.json: rutas de la SPA caen en index.html; archivos con extensión faltante dan 404.
    if (/^\/assets\//.test(rel) || /\.(css|scss|js|png|gif|ico|jpg|jpeg|svg|webp)$/i.test(rel)) { res.writeHead(404).end("No encontrado"); return }
    file = path.join(DIST, "index.html")
    if (!fs.existsSync(file)) { res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" }).end("Falta compilar el sitio (npm run build)."); return }
  }
  const ext = path.extname(file).toLowerCase()
  const headers = { "Content-Type": MIME[ext] || "application/octet-stream" }
  headers["Cache-Control"] = /^\/assets\//.test(rel) ? "public, max-age=31536000, immutable" : "no-cache"
  res.writeHead(200, headers)
  if (req.method === "HEAD") res.end(); else fs.createReadStream(file).pipe(res)
}

async function handleApi(req, res, url) {
  const match = table.map((r) => ({ r, m: r.rx.exec(url.pathname) })).find((x) => x.m && x.r.methods.includes(req.method))
  if (!match) {
    const other = table.some((r) => r.rx.test(url.pathname))
    res.writeHead(other ? 405 : 404, { "Content-Type": "application/json" }).end(JSON.stringify({ message: other ? "Método no permitido." : "No encontrado." }))
    return
  }
  const { r, m } = match
  const hasBody = !["GET", "HEAD"].includes(req.method)
  const request = new Request(url.href, {
    method: req.method,
    headers: Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : v])),
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: hasBody ? "half" : undefined,
  })
  request.query = url.searchParams
  request.params = Object.fromEntries(r.names.map((n, i) => [n, decodeURIComponent(m[i + 1])]))
  let out
  try { out = await r.handler(request, context) }
  catch (error) {
    console.error(`[API ${req.method} ${url.pathname}]`, error)
    out = { status: 500, jsonBody: { message: "Error interno del servidor." } }
  }
  const status = out?.status || 200
  const headers = { ...(out?.headers || {}) }
  let payload
  if (out?.jsonBody !== undefined) { headers["Content-Type"] ||= "application/json"; payload = JSON.stringify(out.jsonBody) }
  else if (out?.body !== undefined && out?.body !== null) {
    const b = out.body
    payload = Buffer.isBuffer(b) || typeof b === "string" ? b : b instanceof ArrayBuffer ? Buffer.from(b) : ArrayBuffer.isView(b) ? Buffer.from(b.buffer, b.byteOffset, b.byteLength) : JSON.stringify(b)
  }
  res.writeHead(status, headers)
  res.end(payload)
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`)
    if (url.pathname === "/healthz") { res.writeHead(200, { "Content-Type": "text/plain" }).end("ok"); return }
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url)
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405).end(); return }
    sendStatic(req, res, url.pathname)
  } catch (error) {
    console.error("[DITO] error", error)
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ message: "Error interno del servidor." }))
  }
})
server.requestTimeout = 0
server.listen(PORT, process.env.HOST || "127.0.0.1", () => console.log(`[DITO] escuchando en http://127.0.0.1:${PORT}`))
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => server.close(() => process.exit(0)))
