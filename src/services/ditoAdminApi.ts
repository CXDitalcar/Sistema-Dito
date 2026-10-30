// Herramientas de administración de DITO (solo los 3 administradores).
async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error((payload as { message?: string })?.message || `Error ${response.status}`)
  return payload as T
}
const json = { "Content-Type": "application/json" }

export type Implementacion = { active: boolean; activatedAt: string | null; updatedAt?: string | null; updatedBy?: string | null; canManage: boolean }

export const getImplementacion = () => call<Implementacion>("/api/route/implementacion")
export const setImplementacion = (active: boolean) =>
  call<Implementacion>("/api/route/implementacion", { method: "POST", headers: json, body: JSON.stringify({ active }) })

export type ResumenRespaldo = {
  rutas: { total: number; enviadas: number; aVaciar: number; evidenciasSinVaciar: number }
  solicitudes: { total: number }
  macro: { semanasGuardadas: number; detalleDesde: string | null; actualizado: string | null }
  corte: { corte: string; semana: string; valida: boolean; mensaje: string } | null
  ultimosRespaldos: { id?: string; at?: string; by?: string; fileName?: string }[]
  ultimosVaciados: { at?: string; by?: string; corte?: string; rutasEliminadas?: number }[]
}
export const getResumenRespaldo = (corte: string) => call<ResumenRespaldo>(`/api/dito/respaldo/resumen?corte=${encodeURIComponent(corte)}`)

async function sha256Hex(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

/** Genera el respaldo, lo descarga al computador y devuelve los datos necesarios para vaciar. */
export async function descargarRespaldo(corte: string) {
  const response = await fetch("/api/dito/respaldo", { method: "POST", credentials: "include", headers: json, body: JSON.stringify({ corte }) })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error((payload as { message?: string })?.message || `Error ${response.status}`)
  }
  const respaldoId = response.headers.get("x-respaldo-id") || ""
  const buffer = await response.arrayBuffer()
  const sha256 = await sha256Hex(buffer)
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/zip" }))
  const a = document.createElement("a")
  const name = `DITO_respaldo_${new Date().toISOString().slice(0, 10)}.zip`
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return { respaldoId, sha256, fileName: name }
}

export const vaciarDetalle = (input: { corte: string; respaldoId: string; sha256: string; confirmacion: string }) =>
  call<{ message: string; [key: string]: unknown }>("/api/dito/vaciar", { method: "POST", headers: json, body: JSON.stringify(input) })

export async function descargarPlantillaHistorico() {
  const response = await fetch("/api/route/plantilla-historico", { credentials: "include" })
  if (!response.ok) throw new Error(`Error ${response.status}`)
  const url = URL.createObjectURL(await response.blob())
  const a = document.createElement("a")
  a.href = url; a.download = "DITO_plantilla_historico_rutas.xlsx"; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export type ImportResult = { message: string; importadas?: number; errores?: { fila: number; mensaje: string }[] }
export async function importarHistorico(file: File): Promise<ImportResult> {
  const response = await fetch("/api/route/importar-historico", {
    method: "POST", credentials: "include",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  })
  const payload = (await response.json().catch(() => ({}))) as ImportResult
  if (!response.ok && !payload.errores) throw new Error(payload.message || `Error ${response.status}`)
  return payload
}

export type MacroManual = { local: string; periodo: string; adherencia?: number | null; estandares?: number | null; auditoria?: number | null; exactitud?: number | null; nota?: string }
export const listMacroManual = () => call<{ items: (MacroManual & { nota?: string })[] }>("/api/route/macro-manual")
export async function guardarMacroManual(form: FormData) {
  return call<{ message: string }>("/api/route/macro-manual", { method: "POST", body: form })
}
