import { getAppConfig, setAppConfig } from "./store.js"
import { readNamedList } from "./graphLists.js"

const CACHE_KEY = "SLA_CATALOG_CACHE"
const MEMORY_TTL_MS = 60_000
let memory = { checkedAt: 0, catalog: null, source: null, listName: null, diagnostics: null }

// Sólo quedan como respaldo técnico para etapas transversales conocidas.
// Los SLA específicos de proceso deben resolverse desde 09_AcuerdosSLA.
const FALLBACKS = {
  SLA_SOL_REV_LOCAL: 24,
  SLA_SOL_TOMA: 24,
  SLA_SOL_CONFIRM: 48,
}

function normalizeKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
}

function pick(fields, aliases) {
  for (const [key, value] of Object.entries(fields || {})) {
    if (aliases.some((alias) => normalizeKey(alias) === normalizeKey(key))) return value
  }
  return undefined
}

function truthy(value) {
  if (value === undefined || value === null || value === "") return true
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  return ["1", "true", "si", "sí", "activo", "vigente", "yes"].includes(String(value).trim().toLowerCase())
}

function asHours(fields) {
  const direct = Number(pick(fields, ["SLAHoras", "Horas", "Hours", "TiempoHoras", "PlazoHoras", "HorasSLA"]))
  if (Number.isFinite(direct) && direct >= 0) return direct

  const raw = pick(fields, ["Valor", "Plazo", "Tiempo", "Cantidad"])
  const value = Number(String(raw ?? "").replace(",", "."))
  if (!Number.isFinite(value) || value < 0) return undefined
  const unit = normalizeKey(pick(fields, ["Unidad", "Unit", "UnidadTiempo", "TipoUnidad"]))
  if (unit.includes("dia")) return value * 24
  if (unit.includes("min")) return value / 60
  return value
}

function configuredListName() {
  return String(process.env.SHAREPOINT_SLA_LIST || "09_AcuerdosSLA").trim()
}

async function loadFromSharePoint() {
  // No se adivina el nombre de la LIST: se usa la configurada o 09_AcuerdosSLA.
  const list = await readNamedList([configuredListName()], { force: true })
  const catalog = {}
  let activeRows = 0
  let missingTechnicalCodeRows = 0
  let invalidHoursRows = 0

  for (const row of list.items || []) {
    const fields = row.fields || {}
    if (!truthy(pick(fields, ["Activo", "Active", "Vigente", "Estado"]))) continue
    activeRows += 1

    // CodigoSLA es la llave técnica para cruzar con 22_Procesos.
    // "Codigo" (SLA01, SLA02, etc.) queda sólo como identificador administrativo de la fila.
    const code = String(pick(fields, ["CodigoSLA", "CódigoSLA"]) || "").trim()
    const rowCode = String(pick(fields, ["Codigo", "Código", "Code"]) || "").trim()
    const hours = asHours(fields)

    if (!code) {
      missingTechnicalCodeRows += 1
      continue
    }
    if (!Number.isFinite(hours)) {
      invalidHoursRows += 1
      continue
    }

    catalog[code] = {
      code,
      rowCode: rowCode || undefined,
      hours,
      title: String(pick(fields, ["Title", "Nombre", "Descripcion", "Descripción"]) || code),
      flow: String(pick(fields, ["Flujo"]) || ""),
      request: String(pick(fields, ["Solicitud"]) || ""),
      requester: String(pick(fields, ["QuienSolicita", "QuiénSolicita"]) || ""),
      responder: String(pick(fields, ["QuienResponde", "QuiénResponde"]) || ""),
      processCode: String(pick(fields, ["ProcesoCodigo", "CodigoProceso", "CódigoProceso"]) || ""),
      stage: String(pick(fields, ["Etapa"]) || ""),
      slaType: String(pick(fields, ["TipoSLA"]) || ""),
      pauseAllowed: truthy(pick(fields, ["PausaPermitida"])),
      businessDays: truthy(pick(fields, ["DiasHabiles", "DíasHábiles"])),
      priority: pick(fields, ["Prioridad"]),
      validFrom: String(pick(fields, ["FechaVigenciaDesde"]) || ""),
      validTo: String(pick(fields, ["FechaVigenciaHasta"]) || ""),
      updatedAt: String(fields.Modified || fields.FechaActualizacion || ""),
    }
  }

  const diagnostics = {
    totalRows: (list.items || []).length,
    activeRows,
    validTechnicalRows: Object.keys(catalog).length,
    missingTechnicalCodeRows,
    invalidHoursRows,
  }

  const warning = missingTechnicalCodeRows > 0
    ? `${list.listName}: ${missingTechnicalCodeRows} fila(s) activa(s) no tienen CodigoSLA. Esas filas todavía no pueden cruzarse con 22_Procesos.`
    : invalidHoursRows > 0
      ? `${list.listName}: ${invalidHoursRows} fila(s) tienen CodigoSLA pero no un SLAHoras válido.`
      : undefined

  return { catalog, listName: list.listName, diagnostics, warning }
}

async function cachedCatalog() {
  const stored = await getAppConfig(CACHE_KEY)
  if (!stored?.value) return null
  try { return JSON.parse(String(stored.value)) } catch { return null }
}

export async function getSlaCatalog({ force = false } = {}) {
  if (!force && memory.catalog && Date.now() - memory.checkedAt < MEMORY_TTL_MS) {
    return {
      catalog: memory.catalog,
      source: memory.source,
      listName: memory.listName,
      diagnostics: memory.diagnostics,
      checkedAt: new Date(memory.checkedAt).toISOString(),
    }
  }

  try {
    const live = await loadFromSharePoint()
    const checkedAt = new Date().toISOString()
    const snapshot = { ...live, checkedAt }
    await setAppConfig(CACHE_KEY, JSON.stringify(snapshot), { source: "SHAREPOINT_LIST" }).catch(() => {})
    memory = {
      checkedAt: Date.now(),
      catalog: live.catalog,
      source: "SHAREPOINT_LIST",
      listName: live.listName,
      diagnostics: live.diagnostics,
    }
    return { ...snapshot, source: "SHAREPOINT_LIST" }
  } catch (error) {
    const cached = await cachedCatalog().catch(() => null)
    if (cached?.catalog) {
      memory = {
        checkedAt: Date.now(),
        catalog: cached.catalog || {},
        source: "CACHE",
        listName: cached.listName || configuredListName(),
        diagnostics: cached.diagnostics || null,
      }
      return {
        ...cached,
        source: "CACHE",
        listName: cached.listName || configuredListName(),
        warning: error?.message || cached.warning || "No fue posible actualizar SLA desde SharePoint.",
      }
    }
    memory = { checkedAt: Date.now(), catalog: {}, source: "FALLBACK", listName: configuredListName(), diagnostics: null }
    return {
      catalog: {},
      source: "FALLBACK",
      listName: configuredListName(),
      diagnostics: null,
      checkedAt: new Date().toISOString(),
      warning: error?.message || `LIST ${configuredListName()} no disponible.`,
    }
  }
}

function resolved(code, catalog, fallbackHours) {
  if (!code) return undefined
  const live = catalog?.[code]?.hours
  const hours = Number.isFinite(live) ? live : (FALLBACKS[code] ?? fallbackHours)
  return Number.isFinite(hours)
    ? { code, hours, resolvedFromList: Number.isFinite(live) }
    : { code, hours: undefined, resolvedFromList: false }
}

export async function resolveSlaSet(codes = {}, options = {}) {
  const result = await getSlaCatalog(options)
  return {
    review: resolved(codes.reviewCode, result.catalog),
    acceptance: resolved(codes.acceptanceCode, result.catalog),
    resolution: resolved(codes.resolutionCode, result.catalog),
    confirmation: resolved(codes.confirmationCode, result.catalog, Number(codes.confirmationFallbackHours || 48)),
    source: result.source,
    listName: result.listName,
    checkedAt: result.checkedAt,
    diagnostics: result.diagnostics,
    warning: result.warning,
  }
}
