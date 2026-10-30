import { appConfig } from "../config"
import { getAccessToken } from "./auth"

export type GraphListItem = {
  id: string
  fields: Record<string, any>
}

export type Solicitud = GraphListItem

export type SolicitudWriteInput = {
  title?: string
  areaResponsable?: string
  categoria?: string
  seccion?: string
  solicitud?: string
  fechaSolicitud?: string
  local?: string
  estado?: string
  jefeLocal?: string
  solicitarMasInformacion?: string | null
  procesoCodigo?: string
  procesoVersion?: number
  solicitanteEmail?: string
  solicitanteNombre?: string
  estadoFlujo?: string
  responsableActualEmail?: string | null
  responsableActualNombre?: string | null
  slaAprobacionSnapshot?: number
  slaResolucionSnapshot?: number
  confirmacionHorasSnapshot?: number
  slaInicioAprobacion?: string | null
  slaPausaInicio?: string | null
  slaPausaMinutos?: number
  slaInicioResolucion?: string | null
  fechaLimiteConfirmacion?: string | null
  reabierta?: boolean
  cierreAutomatico?: boolean
  origenFormularioCodigo?: string
  origenEjecucionID?: string
  origenBrechaID?: string
}

type SiteInfo = { id: string }
type ListInfo = { id: string; displayName?: string; name?: string }
type ListColumn = {
  name: string
  displayName?: string
  number?: Record<string, unknown>
  boolean?: Record<string, unknown>
  dateTime?: Record<string, unknown>
  choice?: { choices?: string[]; allowTextEntry?: boolean }
  text?: Record<string, unknown>
}

export type NamedFieldWrite = {
  aliases: string[]
  value: unknown
}

let siteIdCache: string | null = null
let siteListsCache: ListInfo[] | null = null
const columnsCache = new Map<string, ListColumn[]>()

async function graph<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`Graph ${response.status}: ${text}`)
  }
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .trim()
    .toLowerCase()
}

function findColumn(columns: ListColumn[], aliases: string[]) {
  for (const alias of aliases) {
    const target = normalize(alias)
    const match = columns.find(
      (column) =>
        normalize(column.name) === target ||
        normalize(column.displayName ?? "") === target
    )
    if (match) return match
  }
  return undefined
}

function coerceValue(column: ListColumn | undefined, value: unknown) {
  if (value === null) return null
  if (value === undefined || value === "") return undefined

  if (column?.boolean) {
    if (typeof value === "boolean") return value
    const normalized = String(value).trim().toLowerCase()
    return ["1", "true", "si", "sí", "yes"].includes(normalized)
  }

  if (column?.number) {
    if (typeof value === "number") return value
    const parsed = Number(String(value).replace(/[^0-9.-]/g, ""))
    return Number.isFinite(parsed) ? parsed : value
  }

  if ((column?.text || column?.choice) && typeof value === "boolean") {
    return value ? "Si" : "No"
  }

  return value
}

async function getColumns(listId: string) {
  const cached = columnsCache.get(listId)
  if (cached) return cached

  const siteId = await getSiteId()
  const data = await graph<{ value: ListColumn[] }>(
    `/sites/${siteId}/lists/${listId}/columns?$top=300`
  )
  columnsCache.set(listId, data.value)
  return data.value
}

async function buildFields(
  listId: string,
  writes: NamedFieldWrite[],
  includeNull = false
) {
  const columns = await getColumns(listId)
  const fields: Record<string, any> = {}
  const skipped: string[] = []

  for (const write of writes) {
    const column = findColumn(columns, write.aliases)
    if (!column) {
      if (write.value !== undefined && write.value !== null && write.value !== "") {
        skipped.push(write.aliases[0])
      }
      continue
    }

    if (write.value === null && !includeNull) continue
    const value = coerceValue(column, write.value)
    if (value === undefined) continue
    fields[column.name] = value
  }

  return { fields, skipped }
}

export async function getSiteId() {
  if (siteIdCache) return siteIdCache
  const { hostname, sitePath } = appConfig.sharePoint
  const site = await graph<SiteInfo>(`/sites/${hostname}:${sitePath}`)
  siteIdCache = site.id
  return site.id
}

async function getSiteLists() {
  if (siteListsCache) return siteListsCache
  const siteId = await getSiteId()
  const data = await graph<{ value: ListInfo[] }>(
    `/sites/${siteId}/lists?$select=id,displayName,name&$top=500`
  )
  siteListsCache = data.value
  return data.value
}

export async function resolveListId(names: string[]) {
  const lists = await getSiteLists()
  const normalizedNames = names.map(normalize)
  const match = lists.find((list) =>
    normalizedNames.includes(normalize(list.displayName ?? list.name ?? ""))
  )
  if (!match) {
    throw new Error(`No se encontró la List: ${names.join(" / ")}`)
  }
  return match.id
}

export async function getItemsFromNamedList(names: string[]) {
  const siteId = await getSiteId()
  const listId = await resolveListId(names)
  const data = await graph<{ value: GraphListItem[] }>(
    `/sites/${siteId}/lists/${listId}/items?expand=fields&$top=999`
  )
  return data.value
}

export async function createItemInNamedList(
  names: string[],
  writes: NamedFieldWrite[]
) {
  const siteId = await getSiteId()
  const listId = await resolveListId(names)
  const { fields, skipped } = await buildFields(listId, writes, false)
  const item = await graph<GraphListItem>(
    `/sites/${siteId}/lists/${listId}/items`,
    { method: "POST", body: JSON.stringify({ fields }) }
  )
  return { item, skipped }
}

export async function updateItemInNamedList(
  names: string[],
  itemId: string,
  writes: NamedFieldWrite[]
) {
  const siteId = await getSiteId()
  const listId = await resolveListId(names)
  const { fields, skipped } = await buildFields(listId, writes, true)
  if (Object.keys(fields).length) {
    await graph<void>(`/sites/${siteId}/lists/${listId}/items/${itemId}/fields`, {
      method: "PATCH",
      body: JSON.stringify(fields),
    })
  }
  return { skipped }
}

function solicitudWrites(input: SolicitudWriteInput): NamedFieldWrite[] {
  return [
    { aliases: ["Title"], value: input.title ?? input.solicitud ?? "Solicitud Ditalcar" },
    { aliases: ["Área responsable", "Area responsable", "AreaResponsable"], value: input.areaResponsable },
    { aliases: ["Categorías", "Categorias", "Categoría", "Categoria"], value: input.categoria },
    { aliases: ["Sección", "Seccion"], value: input.seccion },
    { aliases: ["Solicitud"], value: input.solicitud },
    { aliases: ["Fecha solicitud", "Fecha Solicitud", "FechaSolicitud"], value: input.fechaSolicitud },
    { aliases: ["Local"], value: input.local },
    { aliases: ["Estado"], value: input.estado },
    { aliases: ["Jefe de Local", "Jefe de local", "JefeLocal"], value: input.jefeLocal },
    { aliases: ["Solicitar más información", "Solicitar mas informacion"], value: input.solicitarMasInformacion },
    { aliases: ["ProcesoCodigo"], value: input.procesoCodigo },
    { aliases: ["ProcesoVersion"], value: input.procesoVersion },
    { aliases: ["SolicitanteEmail"], value: input.solicitanteEmail },
    { aliases: ["SolicitanteNombre"], value: input.solicitanteNombre },
    { aliases: ["EstadoFlujo"], value: input.estadoFlujo },
    { aliases: ["ResponsableActualEmail"], value: input.responsableActualEmail },
    { aliases: ["ResponsableActualNombre"], value: input.responsableActualNombre },
    { aliases: ["SLAAprobacionSnapshot"], value: input.slaAprobacionSnapshot },
    { aliases: ["SLAResolucionSnapshot"], value: input.slaResolucionSnapshot },
    { aliases: ["ConfirmacionHorasSnapshot"], value: input.confirmacionHorasSnapshot },
    { aliases: ["SLAInicioAprobacion"], value: input.slaInicioAprobacion },
    { aliases: ["SLAPausaInicio"], value: input.slaPausaInicio },
    { aliases: ["SLAPausaMinutos"], value: input.slaPausaMinutos },
    { aliases: ["SLAInicioResolucion"], value: input.slaInicioResolucion },
    { aliases: ["FechaLimiteConfirmacion"], value: input.fechaLimiteConfirmacion },
    { aliases: ["Reabierta"], value: input.reabierta },
    { aliases: ["CierreAutomatico"], value: input.cierreAutomatico },
    { aliases: ["OrigenFormularioCodigo"], value: input.origenFormularioCodigo },
    { aliases: ["OrigenEjecucionID"], value: input.origenEjecucionID },
    { aliases: ["OrigenBrechaID"], value: input.origenBrechaID },
  ]
}

export async function getSolicitudes(): Promise<Solicitud[]> {
  const siteId = await getSiteId()
  const listId = appConfig.sharePoint.solicitudesListId
  const data = await graph<{ value: Solicitud[] }>(
    `/sites/${siteId}/lists/${listId}/items?expand=fields&$top=999`
  )
  return data.value
}

export async function getSolicitud(id: string): Promise<Solicitud> {
  const siteId = await getSiteId()
  const listId = appConfig.sharePoint.solicitudesListId
  return graph<Solicitud>(
    `/sites/${siteId}/lists/${listId}/items/${id}?expand=fields`
  )
}

export async function createSolicitud(input: SolicitudWriteInput) {
  const siteId = await getSiteId()
  const listId = appConfig.sharePoint.solicitudesListId
  const { fields, skipped } = await buildFields(listId, solicitudWrites(input), false)
  const item = await graph<Solicitud>(`/sites/${siteId}/lists/${listId}/items`, {
    method: "POST",
    body: JSON.stringify({ fields }),
  })
  return { item, skipped }
}

export async function updateSolicitud(id: string, input: SolicitudWriteInput) {
  const siteId = await getSiteId()
  const listId = appConfig.sharePoint.solicitudesListId
  const { fields, skipped } = await buildFields(listId, solicitudWrites(input), true)
  if (Object.keys(fields).length) {
    await graph<void>(`/sites/${siteId}/lists/${listId}/items/${id}/fields`, {
      method: "PATCH",
      body: JSON.stringify(fields),
    })
  }
  return { skipped }
}

export async function findActiveSolicitudByBreach(breachId: string) {
  if (!breachId) return undefined
  const activeStatuses = new Set([
    "RECIBIDA",
    "INFORMACION_REQUERIDA",
    "PENDIENTE_APROBACION",
    "APROBADA",
    "APROBADA_CON_AJUSTE",
    "EN_GESTION",
    "RESUELTA_POR_CONFIRMAR",
  ])
  const solicitudes = await getSolicitudes()
  return solicitudes.find((item) => {
    const origin = String(item.fields?.OrigenBrechaID ?? "")
    const status = String(item.fields?.EstadoFlujo ?? "")
    return origin === breachId && activeStatuses.has(status)
  })
}

export async function getCurrentUser() {
  return graph<{
    displayName: string
    mail?: string
    userPrincipalName: string
  }>("/me?$select=displayName,mail,userPrincipalName")
}
