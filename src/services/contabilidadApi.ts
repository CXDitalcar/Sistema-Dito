// Contabilidad: listas de precio de marca y bonos por cobrar por NV.
// La carpeta mensual de listas se sube en Gestión › Datos; Contabilidad solo la consulta.
export type TipoLista = "RETAIL" | "FLOTA" | "CIRCULAR"
export type EstadoLista = "OK" | "REVISAR" | "FALTA_LECTOR" | "GUARDADO"

export type ListaPrecio = {
  sha: string
  marca: string | null
  tipo: TipoLista
  mes: string | null
  ruta: string
  estado: EstadoLista
  archivo: string
  titulo: string | null
  canal: string | null
  desde: string | null
  hasta: string | null
  filas: number
  avisos: string[]
  observaciones: string[]
  cargadoPor: string
  cargadoEn: string
}

export type Revision = "CALCULADO" | "SOLO_MARCA" | "MODELO_POR_CONFIRMAR" | "SIN_MODELO"
// Stellantis: TMP todo medio de pago · CC crédito convencional · CI compra inteligente.
export type Canal = "TMP" | "CC" | "CI"
export type CondicionNv = "financia" | "retoma" | "canal"

export type BonoNv = {
  nv: string
  fecha: string
  factura: string
  local: string
  modeloSistema: string
  modeloLista: string | null
  puntaje: number | null
  lista: string
  financiaScf: boolean | null
  tieneRetoma: boolean | null
  canal: Canal | null
  bono: { marca: number; financiamiento: number; vpp: number; neto: number; bruto: number } | null
  revision: Revision
}

export type BonosMarca = {
  marca: string
  condiciones: CondicionNv[]
  filas: BonoNv[]
  sinLista: { nv: string; fecha: string; modelo: string; local: string; mes: string }[]
  totales: { nv: number; neto: number; bruto: number; porRevision: Partial<Record<Revision, number>>; sinLista: number }
}

export type BonosRespuesta = {
  marcas: BonosMarca[]
  siga: { actualizado: string | null; nv: number }
  listas: ListaPrecio[]
}

async function apiJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { credentials: "include", ...init })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.message || `Error ${response.status}`)
  return payload as T
}

export const getListas = () => apiJson<{ listas: ListaPrecio[] }>("/api/adm/listas")
export const getBonos = () => apiJson<BonosRespuesta>("/api/adm/bonos")

// Gestión › Datos: un archivo de la carpeta mensual (PDF o Excel) con su ruta dentro de la carpeta.
export function subirArchivoLista(file: File) {
  const ruta = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
  return apiJson<{ lista: ListaPrecio; duplicado: boolean; catalogo?: number; message?: string }>("/api/datos/listas-precio", {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream", "x-file-name": encodeURIComponent(file.name), "x-file-path": encodeURIComponent(ruta) },
    body: file,
  })
}

export const releerListas = () => apiJson<{ revisadas: number; leidas: number; message: string }>("/api/adm/listas/releer", { method: "POST" })

export function guardarCondicion(nv: string, cambio: { financiaScf?: boolean | null; tieneRetoma?: boolean | null; canal?: Canal | null }) {
  return apiJson<{ message: string }>("/api/adm/condiciones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nv, ...cambio }),
  })
}

export type ResumenAcumulado = {
  generado: string
  totalListas: number
  listas: { marca: string; mes: string; archivos: number; leidas: number; porRevisar: number; filas: number }[]
  cargas: { en: string; por: string; archivo: string; resultado: string; marca?: string; mes?: string; filas?: number }[]
}
export const getResumenAcumulado = () => apiJson<ResumenAcumulado>("/api/adm/resumen")
