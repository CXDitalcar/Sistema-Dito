import { getAppConfig, setAppConfig } from "./store.js"

const URL_KEY = "KPI_EXCEL_URL"
const SNAPSHOT_KEY = "KPI_LAST_SNAPSHOT"
const MODE_KEY = "KPI_SOURCE_MODE"
const UPLOAD_KEY = "KPI_UPLOAD_META"

export async function getKpiExcelUrl() {
  const stored = await getAppConfig(URL_KEY)
  return String(stored?.value || process.env.KPI_EXCEL_URL || "").trim()
}

export async function saveKpiExcelUrl(url, updatedBy) {
  const value = String(url || "").trim()
  if (!value.startsWith("https://")) throw new Error("El enlace debe comenzar con https://")
  return setAppConfig(URL_KEY, value, { updatedBy: String(updatedBy || "") })
}

export async function getKpiSourceMode() {
  const stored = await getAppConfig(MODE_KEY)
  const mode = String(stored?.value || "").trim().toLowerCase()
  if (mode === "url" || mode === "upload" || mode === "manual") return mode
  const upload = await getKpiUploadMeta()
  if (upload?.blobName) return "upload"
  const url = await getKpiExcelUrl()
  return url ? "url" : ""
}

export async function saveKpiSourceMode(mode, updatedBy) {
  const value = String(mode || "").trim().toLowerCase()
  if (!["url", "upload", "manual"].includes(value)) throw new Error("Fuente KPI no válida.")
  return setAppConfig(MODE_KEY, value, { updatedBy: String(updatedBy || "") })
}

export async function saveKpiUploadMeta(meta, updatedBy) {
  return setAppConfig(UPLOAD_KEY, JSON.stringify(meta || {}), { updatedBy: String(updatedBy || "") })
}

export async function getKpiUploadMeta() {
  const stored = await getAppConfig(UPLOAD_KEY)
  if (!stored?.value) return null
  try {
    return JSON.parse(String(stored.value))
  } catch {
    return null
  }
}

export async function saveKpiSnapshot(snapshot, updatedBy) {
  const value = JSON.stringify(snapshot)
  return setAppConfig(SNAPSHOT_KEY, value, { updatedBy: String(updatedBy || "") })
}

export async function getKpiSnapshot() {
  const stored = await getAppConfig(SNAPSHOT_KEY)
  if (!stored?.value) return null
  try {
    return JSON.parse(String(stored.value))
  } catch {
    return null
  }
}
