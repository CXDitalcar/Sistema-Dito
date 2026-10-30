import { DatabaseSync } from "node:sqlite"
import fs from "node:fs"
import path from "node:path"

export const DATA_DIR = path.resolve(process.env.DITO_DATA_DIR || path.join(process.cwd(), "datos"))
fs.mkdirSync(DATA_DIR, { recursive: true })
export const BLOB_DIR = path.join(DATA_DIR, "archivos")
fs.mkdirSync(BLOB_DIR, { recursive: true })

let db = globalThis.__ditoDb
if (!db) {
  db = new DatabaseSync(path.join(DATA_DIR, "dito.sqlite"))
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS entities (
      tbl TEXT NOT NULL, pk TEXT NOT NULL, rk TEXT NOT NULL,
      data TEXT NOT NULL, etag TEXT NOT NULL, ts TEXT NOT NULL,
      PRIMARY KEY (tbl, pk, rk)
    ) WITHOUT ROWID;
    CREATE TABLE IF NOT EXISTS tables_ (name TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS blobs (
      container TEXT NOT NULL, name TEXT NOT NULL,
      content_type TEXT, size INTEGER NOT NULL, mtime TEXT NOT NULL,
      PRIMARY KEY (container, name)
    ) WITHOUT ROWID;
  `)
  globalThis.__ditoDb = db
}
export { db }
