// Reemplazo mínimo de @azure/storage-blob: archivos en disco + metadatos en SQLite.
import fs from "node:fs"
import path from "node:path"
import { Readable } from "node:stream"
import { db, BLOB_DIR } from "./db.mjs"

function httpError(statusCode, message) { const e = new Error(message); e.statusCode = statusCode; return e }

function safeJoin(base, name) {
  // Caracteres no válidos en nombres de archivo de Windows se codifican.
  const seg = String(name).split("/").map((x) => x.replace(/[<>:"\\|?*%\x00-\x1f]/g, (c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).replace(/[. ]+$/, (t) => "%2e".repeat(t.length)))
  const full = path.resolve(base, ...seg)
  if (full !== base && !full.startsWith(base + path.sep)) throw httpError(400, "Nombre de archivo no válido")
  return full
}
function cleanContainer(c) { if (!/^[a-z0-9-]{3,63}$/.test(c)) throw httpError(400, "Contenedor no válido"); return c }

class BlockBlobClient {
  constructor(container, name) {
    this.container = container; this.name = name
    this.file = safeJoin(path.join(BLOB_DIR, cleanContainer(container)), name)
    this.stageDir = safeJoin(path.join(BLOB_DIR, ".bloques", container), name)
  }
  _meta() { return db.prepare("SELECT content_type, size, mtime FROM blobs WHERE container=? AND name=?").get(this.container, this.name) }
  _save(buffer, contentType) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true })
    const tmp = this.file + ".tmp-" + process.pid
    fs.writeFileSync(tmp, buffer); fs.renameSync(tmp, this.file)
    db.prepare(`INSERT INTO blobs(container,name,content_type,size,mtime) VALUES (?,?,?,?,?)
      ON CONFLICT(container,name) DO UPDATE SET content_type=excluded.content_type,size=excluded.size,mtime=excluded.mtime`)
      .run(this.container, this.name, contentType || "application/octet-stream", buffer.length, new Date().toISOString())
  }
  async uploadData(data, options) {
    this._save(Buffer.isBuffer(data) ? data : Buffer.from(data), options?.blobHTTPHeaders?.blobContentType)
    return {}
  }
  async downloadToBuffer() {
    if (!this._meta()) throw httpError(404, "BlobNotFound")
    return fs.readFileSync(this.file)
  }
  async download() {
    const m = this._meta(); if (!m) throw httpError(404, "BlobNotFound")
    return { readableStreamBody: Readable.from([fs.readFileSync(this.file)]), lastModified: new Date(m.mtime), contentType: m.content_type }
  }
  async getProperties() {
    const m = this._meta(); if (!m) throw httpError(404, "BlobNotFound")
    return { contentLength: m.size, contentType: m.content_type, lastModified: new Date(m.mtime) }
  }
  async exists() { return Boolean(this._meta()) }
  async delete() {
    if (!this._meta()) throw httpError(404, "BlobNotFound")
    await this.deleteIfExists()
  }
  async deleteIfExists() {
    const had = Boolean(this._meta())
    db.prepare("DELETE FROM blobs WHERE container=? AND name=?").run(this.container, this.name)
    fs.rmSync(this.file, { force: true })
    return { succeeded: had }
  }
  // Carga por bloques
  async stageBlock(blockId, body) {
    fs.mkdirSync(this.stageDir, { recursive: true })
    fs.writeFileSync(path.join(this.stageDir, Buffer.from(blockId).toString("hex")), Buffer.isBuffer(body) ? body : Buffer.from(body))
    return {}
  }
  async getBlockList() {
    if (!fs.existsSync(this.stageDir)) throw httpError(404, "BlobNotFound")
    return { uncommittedBlocks: fs.readdirSync(this.stageDir).map((n) => ({ name: Buffer.from(n, "hex").toString() })) }
  }
  async commitBlockList(ids, options) {
    const parts = ids.map((id) => {
      const f = path.join(this.stageDir, Buffer.from(id).toString("hex"))
      if (!fs.existsSync(f)) throw httpError(400, "InvalidBlockList")
      return fs.readFileSync(f)
    })
    this._save(Buffer.concat(parts), options?.blobHTTPHeaders?.blobContentType)
    fs.rmSync(this.stageDir, { recursive: true, force: true })
    return {}
  }
}

class ContainerClient {
  constructor(name) { this.containerName = name }
  async createIfNotExists() { fs.mkdirSync(path.join(BLOB_DIR, cleanContainer(this.containerName)), { recursive: true }); return {} }
  getBlockBlobClient(name) { return new BlockBlobClient(this.containerName, name) }
  getBlobClient(name) { return new BlockBlobClient(this.containerName, name) }
  async *listBlobsFlat() {
    for (const r of db.prepare("SELECT name,size,mtime FROM blobs WHERE container=? ORDER BY name").all(this.containerName)) yield { name: r.name, properties: { contentLength: r.size } }
  }
}
export class BlobServiceClient {
  static fromConnectionString() { return new BlobServiceClient() }
  getContainerClient(name) { return new ContainerClient(name) }
}
