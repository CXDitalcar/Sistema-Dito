import type { UserScope } from "../types"

export type Bucket = "enviar" | "reintentar" | "revisar" | "no_enviar" | "al_dia" | "en_espera" | "fuera"

export type Contacto = {
  id: string
  nv: string
  rut: string
  phone: string
  stage: number
  at: string
  result: string
  observacion: string
  derivadoA: string
  proximaAccion: string
  responsable: string
  source: string
  reclamoId?: string
}

export type Entrega = {
  entregado: boolean
  fechaEntrega: string
  percepcion: string
  comentario: string
  confirmadoPor: string
  confirmadoAt: string
}

export type SegRow = {
  nv: string
  fechaNV: string
  marca: string
  grupo: string
  modelo: string
  vin: string
  color: string
  local: string
  vendedor: string
  cliente: string
  rut: string
  telefono: string
  telefonoValido: boolean
  email: string
  fechaFactura: string
  fechaRecepcion: string
  recepcionFuente: string
  llegadaEsperada: string
  destinoControl: string
  entrega: Entrega | null
  etapa: number
  etapaLabel: string
  maxContactada: number
  ultimoContacto: Contacto | null
  totalContactos: number
  bucket: Bucket
  motivo: string
  letraChica: string
  mensajeTipo: string
  mensajeTitulo?: string
  mensajeCuidado?: string
  mensaje?: string
  confirmarEntrega: boolean
  entregaPrioritaria: boolean
}

export type QuickResponse = {
  id: string
  label: string
  result: string
  observacion?: string
  sugerencia?: string
  derivadoA?: string
  proximaAccion?: string
  abreReclamo?: boolean
}

export type Reglas = {
  stellantisSoloPromotores: boolean
  diasCompraReciente: number
  diasVigenciaRecibido: number
  diasVentanaEntrega: number
  detallePropio?: boolean
}

export type SegMacro = {
  total: number
  etapas: { etapa: number; total: number }[]
  contactados: number
  respondidos: number
  entregasConfirmadas: number
  promotores: number
  neutros: number
  detractores: number
  reclamosAbiertos: { total: number; SUCURSAL: number; MARCA: number; COMERCIAL: number }
  porLocal: { local: string; total: number; contactados: number; entregados: number; etapas: number[] }[]
  detalle: { nv: string; cliente: string; marca: string; modelo: string; local: string; etapaLabel: string; ultimoContacto: { result: string; at: string } | null }[] | null
  actualizado: string
}

export type Reclamo = {
  id: string
  nv: string
  rut: string
  cliente: string
  marca: string
  local: string
  motivo: string
  urgencia: string
  detalle: string
  estado: "ABIERTO" | "ESCALADO" | "CERRADO"
  nivel: string
  nivelLabel: string
  ayudaSolicitada: boolean
  creadoPor: string
  creadoAt: string
  actualizadoAt: string
  historial: { at: string; por: string; tipo: string; texto: string }[]
  puedeActuar: boolean
  puedeComentar: boolean
}

export type SegLista = {
  rows: SegRow[]
  counts: Record<Bucket, number>
  buckets: Record<Bucket, string>
  rules: Reglas
  fuentes: Record<string, { updatedAt: string | null; registros: number }>
  quickResponses: QuickResponse[]
  reclamoMensaje: string
  generatedAt: string
}

export type Unidad = SegRow & {
  traslados: { fecha: string; retiro: string; destino: string; llegadaLocal: boolean; tipo: string; estado: string }[]
  cambiosSiga: { at: string; field: string; from: string; to: string }[]
  primeraVezSiga: string
  puedeConfirmarEntrega: boolean
}

export type Ficha = {
  cliente: { nombre: string; rut: string; telefono: string; telefonoValido: boolean; email: string }
  unidades: Unidad[]
  contactos: Contacto[]
  reclamos: Reclamo[]
  permisos: { registrarContacto: boolean; crearReclamo: boolean }
  quickResponses: QuickResponse[]
  reclamoMensaje: string
}

export type Pendientes = {
  entregas: { nv: string; cliente: string; marca: string; modelo: string; local: string; vendedor: string; fechaFactura: string; fechaRecepcion: string; prioritaria: boolean }[]
  derivaciones: { nv: string; cliente: string; telefono: string; marca: string; modelo: string; observacion: string; at: string }[]
  reclamos: { id: string; nv: string; cliente: string; motivo: string; urgencia: string; nivel: string; nivelLabel: string; creadoAt: string }[]
  ayuda: { id: string; nv: string; cliente: string; motivo: string; nivelLabel: string }[]
  contactos?: { enviar: number; reintentar: number; revisar: number } | null
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

const post = <T>(path: string, data: unknown) => apiJson<T>(path, { method: "POST", body: JSON.stringify(data) })

export const getSeguimiento = () => apiJson<SegLista>("/api/seguimiento/lista")
export const getSeguimientoMacro = () => apiJson<SegMacro>("/api/seguimiento/macro")
export const getFicha = (params: { nv?: string; rut?: string }) =>
  apiJson<Ficha>(`/api/seguimiento/ficha?${new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString()}`)
export const registrarContacto = (data: { nv: string; stage?: number; quickId?: string; result?: string; observacion?: string }) =>
  post<{ message: string }>("/api/seguimiento/contacto", data)
export const confirmarEntrega = (data: { nv: string; fechaEntrega: string; percepcion: string; comentario?: string }) =>
  post<{ message: string }>("/api/seguimiento/entrega", data)
export const revisar = (data: { nv: string; stage: number; decision: "APROBADO" | "NO_ENVIAR"; nota?: string }) =>
  post<{ message: string }>("/api/seguimiento/revision", data)
export const guardarReglas = (data: Partial<Reglas>) => post<Reglas>("/api/seguimiento/reglas", data)
export const getReclamos = () => apiJson<{ reclamos: Reclamo[] }>("/api/seguimiento/reclamos")
export const crearReclamo = (data: { nv: string; motivo: string; urgencia: string; detalle: string; registrarContacto?: boolean }) =>
  post<{ message: string; id: string }>("/api/seguimiento/reclamos", data)
export const accionReclamo = (data: { id: string; accion: "COMENTAR" | "ESCALAR" | "CERRAR" | "PEDIR_AYUDA"; texto?: string }) =>
  post<{ message: string }>("/api/seguimiento/reclamos/accion", data)
export const derivacionAtendida = (data: { nv: string; nota?: string }) => post<{ message: string }>("/api/seguimiento/derivacion-atendida", data)

export function getPendientes(viewAs?: UserScope | null) {
  const params = new URLSearchParams()
  if (viewAs) {
    params.set("asEmail", viewAs.email)
    params.set("asName", viewAs.name)
    params.set("asRole", viewAs.role)
    params.set("asLocal", viewAs.local || viewAs.localPrincipal || "")
    params.set("asBrands", (viewAs.brands || []).join(","))
  }
  return apiJson<Pendientes>(`/api/seguimiento/pendientes${params.toString() ? `?${params}` : ""}`)
}

// ---------- claves temporales ----------
export type ClaveTemporal = { email: string; nombre: string; estado: string; creadaPor: string; creadaAt: string; expiresAt: string; usadaAt: string; intentos: number }
export const getClavesTemporales = () => apiJson<{ claves: ClaveTemporal[] }>("/api/auth/temp-keys")
export const crearClaveTemporal = (email: string, dias = 7) => post<{ clave: string; email: string; message: string }>("/api/auth/temp-keys", { email, dias })
export const desactivarClaveTemporal = (email: string) => post<{ message: string }>("/api/auth/temp-keys/desactivar", { email })

// ---------- utilidades de presentación ----------
export const RESULT_LABELS: Record<string, string> = {
  ENVIADO: "Enviado", LEIDO: "Leído", RESPONDIDO: "Respondido", SIN_RESPUESTA: "Sin respuesta", REAGENDAR: "Reagendar",
  DERIVADO_EJECUTIVO: "Derivado a ejecutivo", DERIVADO_EXPERIENCIA: "Derivado a Experiencia", DERIVADO_SUCURSAL: "Derivado a sucursal (reclamo)",
  NUMERO_INCORRECTO: "Número incorrecto", NO_CONTACTAR: "No contactar", GESTION_CERRADA: "Gestión cerrada",
}

export const STAGE_LABELS: Record<number, string> = { 1: "Compra confirmada", 2: "En camino", 3: "Recibido y en preparación", 4: "Entregado" }

export function fmtDate(value?: string | null) {
  if (!value) return "—"
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [y, m] = value.split("-")
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
    return `${months[Number(m) - 1]} ${y} (estimado)`
  }
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("es-CL", value.length === 10 ? { dateStyle: "medium" } : { dateStyle: "medium", timeStyle: "short" }).format(date)
}

export function whatsappLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`
}
