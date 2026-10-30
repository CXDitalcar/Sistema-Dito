// Ventas (estado de NV sin datos del cliente), Frogmi y Gespark.

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

const post = <T>(path: string, data: unknown) => apiJson<T>(path, { method: "POST", body: JSON.stringify(data) })

// ---------- Ventas ----------
export type VentaEvento = { tipo: string; fecha: string; titulo: string; detalle: string; estimada?: boolean }
export type Venta = {
  nv: string; fechaNV: string; marca: string; modelo: string; color: string; vin: string
  local: string; vendedor: string; etapa: number; etapaLabel: string; nula: boolean; letraChica: string
  entregado: boolean; eventos: VentaEvento[]; alertas: { tipo: string; texto: string }[]
}
export type FormEstado = { key: string; label: string; hecho: boolean; fecha: string; vinDigitado: string; metodo: string; pendienteAprobacion: boolean }
export type VentasResponse = {
  total: number; enAlcance: number; conAlertas: number; rows: Venta[]
  frogmi: Record<string, FormEstado[]> | null; actualizado: string | null
}

export function getVentas(q = "", soloAlertas = false) {
  const params = new URLSearchParams()
  if (q) params.set("q", q)
  if (soloAlertas) params.set("alertas", "1")
  return apiJson<VentasResponse>(`/api/ventas${params.toString() ? `?${params}` : ""}`)
}

// ---------- Frogmi ----------
export type FormRatio = { key: string; label: string; ok: number; total: number; pct: number | null; cumple?: boolean }
export type FrogmiLocal = { local: string; label: string; activo: boolean; notificados: number; vin: number; forms: FormRatio[]; completos: number }
export type FrogmiForm = { fecha: string; vinDigitado: string; metodo: string; local: string } | null
export type FrogmiRow = {
  vin: string; nv: string; fechaVenta: string; marca: string; modelo: string; local: string; vendedor: string
  exclusion: string; activo: boolean; llegada: string; forms: Record<string, FrogmiForm>; pendientes: Record<string, boolean>
  juniorOk: number; otroLocal: string[]
}
export type TmRow = { key: string; label: string; activo: boolean; planificados: number; validos: number; pendientes: number; fechas: string[]; extra: number; pct: number | null }
export type Pendiente = { key: string; local: string; vinDigitado: string; metodo: string; formularios: { form: string; fecha: string }[]; candidatos: { vin: string; score: number }[] }
export type Evolutivo = {
  corte: string; estado: "SIN_CIERRE" | "INICIO" | "CIERRE"; periodo?: string; notificados?: number; evaluados?: number
  junior?: number; juniorTxt?: string; juniorAjustado?: number; entrega?: number; entregaTxt?: string
  tourManager?: number; tourManagerTxt?: string; nota?: string
}
export type FrogmiResumen = {
  alcance: "RED" | "LOCAL"; local?: string
  corte: string; range: { desde: string; hasta: string; label: string }; cortes: string[]
  activos: Record<string, boolean>; ultimoFormulario: string; umbral: number
  universo: { notificados: number; evaluables: number; junior: number; exclusiones: Record<string, number> }
  porLocal: FrogmiLocal[]; formTotals: FormRatio[]
  junior: { ok: number; total: number; pct: number | null; completos: number; cumplen: number }
  entrega: { ok: number; total: number; pct: number | null; ranking: { vendedor: string; local: string; vin: number; entregas: number; pct: number | null; sorteo: boolean }[] }
  ajustada: { forms: FormRatio[]; total: { ok: number; total: number; pct: number | null }; arrastres: number; llegadasTardias: number }
  tourManager: { planificados: number; validos: number; pendientes: number; registros: number; pct: number | null; rows: TmRow[] }
  pendientesAprobacion: Pendiente[]
  rows: FrogmiRow[]
  forms: { key: string; label: string }[]
  locales: { key: string; label: string }[]
  tmLocales: { key: string; label: string; junior: string }[]
  evolutivo: Evolutivo[]
  fuentes: { notificados: string | null; frogmi: string | null; siga: string | null }
}

export const getFrogmi = (corte = "") => apiJson<FrogmiResumen>(`/api/frogmi/resumen${corte ? `?corte=${encodeURIComponent(corte)}` : ""}`)
export const aprobarCruce = (data: { key: string; vin?: string; decision: "APROBADO" | "RECHAZADO" | "QUITAR" }) => post<{ message: string }>("/api/frogmi/aprobar", data)
export const guardarFrogmiConfig = (data: { corte: string; activos?: Record<string, boolean>; tourManager?: { local: string; fechas: string[] } }) =>
  post<{ message: string }>("/api/frogmi/config", data)

// ---------- Gespark ----------
export type GesparkUnidad = { vin: string; marca: string; modelo: string; fecha: string; retiro: string; destino: string; ok?: boolean; estado?: string }
export type GesparkMes = { mes: string; total: number; ok: number; pct: number | null; paTotal?: number; paOk?: number; paPct?: number | null; nota?: string; fuente?: string }
export type GesparkResumen = {
  mes: string; meses: string[]; baseHistorica: boolean; cobertura: string
  detalle: { mes: string; total: number; ok: number; pct: number | null; paTotal: number; paOk: number; pendientes: GesparkUnidad[]; realizadas: GesparkUnidad[]; sinExtranet: GesparkUnidad[] }
  ilegibles: { vin: string; marca: string; modelo: string; fechaTexto: string; destino: string; retiro: string }[]
  evolutivo: GesparkMes[]
  extranet: { registros: number; desde: string; hasta: string }
}
export const getGespark = (mes = "") => apiJson<GesparkResumen>(`/api/gespark${mes ? `?mes=${encodeURIComponent(mes)}` : ""}`)

// ---------- utilidades ----------
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
export function monthLabel(ym: string) {
  const [y, m] = ym.split("-")
  return m ? `${MONTHS[Number(m) - 1]} ${y}` : ym
}
export function fmtPct(value: number | null | undefined) {
  return value === null || value === undefined ? "–" : `${value.toFixed(1).replace(".", ",")}%`
}
export function shortDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso || "")) return iso || "—"
  const [, m, d] = iso.slice(0, 10).split("-")
  return `${d}/${m}`
}
export function miniVin(vin: string) {
  return vin ? vin.slice(-7) : ""
}
