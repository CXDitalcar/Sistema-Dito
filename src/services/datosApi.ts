// Carga de planillas en "Datos": se suben por bloques (sirve para archivos de
// varios MB, como el Control de unidades) y luego el backend las procesa.

export type DataKind = "siga" | "control" | "traslados" | "consolidado" | "operativo" | "extranet" | "frogmi" | "notificados"

export type ImportSummary = {
  leidos: number
  nuevos: number
  actualizados: number
  sinCambios: number
  duplicados: number
  errores: number
  omitidos: number
}

export type ImportLogEntry = {
  kind: DataKind
  label: string
  fileName: string
  by: string
  byName?: string
  at: string
  ok: boolean
  summary?: ImportSummary
  error?: string
  ms?: number
}

export type DataSource = {
  kind: DataKind
  label: string
  registros: number
  ultimaCarga: ImportLogEntry | null
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.message || `Error ${response.status}`)
  return payload as T
}

export function getDatosEstado() {
  return apiJson<{ fuentes: DataSource[]; log: ImportLogEntry[] }>("/api/datos/estado")
}

export async function uploadAndProcess(
  kind: DataKind | "precios",
  file: File,
  onProgress?: (label: string, percent: number) => void,
  extra: Record<string, string> = {}
): Promise<ImportLogEntry> {
  onProgress?.("Preparando carga…", 0)
  const start = await apiJson<{ uploadId: string; chunkBytes: number; totalChunks: number }>("/api/uploads/start", {
    method: "POST",
    body: JSON.stringify({ kind, fileName: file.name, size: file.size, contentType: file.type || "application/octet-stream" }),
  })
  for (let index = 0; index < start.totalChunks; index++) {
    const blob = file.slice(index * start.chunkBytes, (index + 1) * start.chunkBytes)
    const response = await fetch(`/api/uploads/chunk?uploadId=${encodeURIComponent(start.uploadId)}&index=${index}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/octet-stream" },
      body: blob,
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload?.message || "No fue posible subir el archivo.")
    }
    onProgress?.("Subiendo archivo…", Math.round(((index + 1) / start.totalChunks) * 80))
  }
  await apiJson("/api/uploads/finalize", { method: "POST", body: JSON.stringify({ uploadId: start.uploadId }) })
  onProgress?.("Procesando datos…", 90)
  const result = await apiJson<ImportLogEntry>("/api/datos/procesar", { method: "POST", body: JSON.stringify({ kind, ...extra }) })
  onProgress?.("Listo", 100)
  return result
}
