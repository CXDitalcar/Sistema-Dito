// Reemplazo mínimo de @azure/data-tables sobre SQLite (solo lo que usa la API de DITO).
import { db } from "./db.mjs"

function httpError(statusCode, message) {
  const e = new Error(message); e.statusCode = statusCode; return e
}

// ---- filtros OData simples: a eq 'x' and b ne 3 or ... ----
function tokenize(s) {
  const out = []; const re = /\s*('(?:[^']|'')*'|\(|\)|[A-Za-z_][A-Za-z0-9_]*|-?\d+(?:\.\d+)?)/y
  let m; re.lastIndex = 0
  while (re.lastIndex < s.length && (m = re.exec(s))) out.push(m[1])
  return out
}
function parseFilter(filter) {
  if (!filter) return () => true
  const t = tokenize(filter); let i = 0
  const value = () => {
    const x = t[i++]
    if (x === undefined) throw new Error("Filtro inválido: " + filter)
    if (x[0] === "'") return x.slice(1, -1).replaceAll("''", "'")
    if (x === "true") return true
    if (x === "false") return false
    if (/^-?\d/.test(x)) return Number(x)
    throw new Error("Filtro inválido: " + filter)
  }
  const cmp = () => {
    if (t[i] === "(") { i++; const f = orExpr(); i++; return f }
    if (t[i] === "not") { i++; const f = cmp(); return (r) => !f(r) }
    const field = t[i++]; const op = t[i++]; const v = value()
    const key = field === "PartitionKey" ? "partitionKey" : field === "RowKey" ? "rowKey" : field
    return (r) => {
      const a = r[key]
      switch (op) {
        case "eq": return a === v || (a === undefined && v === null)
        case "ne": return a !== v
        case "gt": return a > v
        case "ge": return a >= v
        case "lt": return a < v
        case "le": return a <= v
        default: throw new Error("Operador no soportado: " + op)
      }
    }
  }
  const andExpr = () => { let f = cmp(); while (t[i] === "and") { i++; const g = cmp(); const p = f; f = (r) => p(r) && g(r) } return f }
  const orExpr = () => { let f = andExpr(); while (t[i] === "or") { i++; const g = andExpr(); const p = f; f = (r) => p(r) || g(r) } return f }
  return orExpr()
}

function clean(entity) {
  const o = {}
  for (const [k, v] of Object.entries(entity)) {
    if (v === undefined || k === "etag" || k === "timestamp" || k === "partitionKey" || k === "rowKey") continue
    o[k] = v
  }
  return o
}
const etagNow = () => `W/"${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}"`

export class TableClient {
  constructor(name) { this.tableName = name }
  static fromConnectionString(_cs, name) { return new TableClient(name) }

  async createTable() {
    db.prepare("INSERT OR IGNORE INTO tables_(name) VALUES (?)").run(this.tableName)
  }
  async deleteTable() {
    db.prepare("DELETE FROM entities WHERE tbl=?").run(this.tableName)
    db.prepare("DELETE FROM tables_ WHERE name=?").run(this.tableName)
  }
  _row(pk, rk) {
    return db.prepare("SELECT data, etag, ts FROM entities WHERE tbl=? AND pk=? AND rk=?").get(this.tableName, String(pk), String(rk))
  }
  _out(pk, rk, row) {
    return { ...JSON.parse(row.data), partitionKey: pk, rowKey: rk, etag: row.etag, timestamp: row.ts }
  }
  async getEntity(pk, rk) {
    const row = this._row(pk, rk)
    if (!row) throw httpError(404, "ResourceNotFound")
    return this._out(String(pk), String(rk), row)
  }
  _write(entity, mode, { mustExist }) {
    const pk = String(entity.partitionKey), rk = String(entity.rowKey)
    const prev = this._row(pk, rk)
    if (mustExist && !prev) throw httpError(404, "ResourceNotFound")
    let data = clean(entity)
    if (prev && String(mode).toLowerCase() === "merge") data = { ...JSON.parse(prev.data), ...data }
    db.prepare(`INSERT INTO entities(tbl,pk,rk,data,etag,ts) VALUES (?,?,?,?,?,?)
      ON CONFLICT(tbl,pk,rk) DO UPDATE SET data=excluded.data, etag=excluded.etag, ts=excluded.ts`)
      .run(this.tableName, pk, rk, JSON.stringify(data), etagNow(), new Date().toISOString())
  }
  async upsertEntity(entity, mode = "Merge") { this._write(entity, mode, { mustExist: false }); return {} }
  async createEntity(entity) {
    if (this._row(entity.partitionKey, entity.rowKey)) throw httpError(409, "EntityAlreadyExists")
    this._write(entity, "Replace", { mustExist: false }); return {}
  }
  async updateEntity(entity, mode = "Merge") { this._write(entity, mode, { mustExist: true }); return {} }
  async deleteEntity(pk, rk) {
    db.prepare("DELETE FROM entities WHERE tbl=? AND pk=? AND rk=?").run(this.tableName, String(pk), String(rk))
    return {}
  }
  async *listEntities(options) {
    const filter = options?.queryOptions?.filter
    const test = parseFilter(filter)
    // Atajo: si el filtro parte por PartitionKey eq 'X' se lee solo esa partición.
    const m = /^\s*PartitionKey eq '((?:[^']|'')*)'/.exec(filter || "")
    const rows = m
      ? db.prepare("SELECT pk,rk,data,etag,ts FROM entities WHERE tbl=? AND pk=? ORDER BY rk").all(this.tableName, m[1].replaceAll("''", "'"))
      : db.prepare("SELECT pk,rk,data,etag,ts FROM entities WHERE tbl=? ORDER BY pk, rk").all(this.tableName)
    for (const row of rows) {
      const e = this._out(row.pk, row.rk, row)
      if (test(e)) yield e
    }
  }
  async submitTransaction(actions) {
    db.exec("BEGIN")
    try {
      for (const [action, entity, mode] of actions) {
        if (action === "create") await this.createEntity(entity)
        else if (action === "upsert") await this.upsertEntity(entity, mode)
        else if (action === "update") await this.updateEntity(entity, mode)
        else if (action === "delete") await this.deleteEntity(entity.partitionKey, entity.rowKey)
        else throw new Error("Acción no soportada: " + action)
      }
      db.exec("COMMIT")
    } catch (e) { db.exec("ROLLBACK"); throw e }
    return { status: 202 }
  }
}
export class TableServiceClient {
  static fromConnectionString() { return new TableServiceClient() }
  async *listTables() { for (const r of db.prepare("SELECT name FROM tables_").all()) yield { name: r.name } }
}
