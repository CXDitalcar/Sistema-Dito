// Lectura centralizada de LIST de SharePoint mediante Microsoft Graph (client_credentials).
// Todos los módulos que leen LIST (usuarios, procesos, campos, asignaciones, SLA) pasan por aquí.
//
// Variables de entorno:
//   GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET  (obligatorias)
//   SHAREPOINT_HOSTNAME   (por defecto ditalcarchile.sharepoint.com)
//   SHAREPOINT_SITE_PATH  (por defecto /sites/DITALCARSA)
//
// Permisos de la App Registration (Application): Sites.Selected con acceso al sitio,
// o Sites.Read.All. Ambos requieren consentimiento de administrador.

const GRAPH = "https://graph.microsoft.com/v1.0"
const LIST_TTL_MS = 60_000
const MAX_PAGES = 50

let tokenCache = { value: null, expiresAt: 0 }
let siteCache = { id: null, key: null }
let listsIndexCache = { loadedAt: 0, lists: null }
const itemsCache = new Map()

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
}

export function graphConfigured() {
  return Boolean(process.env.GRAPH_TENANT_ID && process.env.GRAPH_CLIENT_ID && process.env.GRAPH_CLIENT_SECRET)
}

function siteSettings() {
  return {
    host: process.env.SHAREPOINT_HOSTNAME || "ditalcarchile.sharepoint.com",
    sitePath: process.env.SHAREPOINT_SITE_PATH || "/sites/DITALCARSA",
  }
}

export async function getGraphToken() {
  if (!graphConfigured()) {
    throw new Error("Microsoft Graph todavía no está configurado en Azure (faltan GRAPH_TENANT_ID, GRAPH_CLIENT_ID o GRAPH_CLIENT_SECRET).")
  }
  if (tokenCache.value && Date.now() < tokenCache.expiresAt) return tokenCache.value

  const response = await fetch(`https://login.microsoftonline.com/${process.env.GRAPH_TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GRAPH_CLIENT_ID,
      client_secret: process.env.GRAPH_CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}))
    const code = detail?.error ? ` (${detail.error})` : ""
    throw new Error(`No fue posible autenticar la API contra Microsoft Graph${code}. Revisa GRAPH_CLIENT_ID / GRAPH_CLIENT_SECRET y que el secreto no haya vencido.`)
  }
  const payload = await response.json()
  // Se renueva 5 minutos antes del vencimiento real.
  tokenCache = {
    value: payload.access_token,
    expiresAt: Date.now() + Math.max(60, Number(payload.expires_in || 3600) - 300) * 1000,
  }
  return tokenCache.value
}

async function graphGet(url, context) {
  const token = await getGraphToken()
  const response = await fetch(url.startsWith("http") ? url : `${GRAPH}${url}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  })
  if (response.ok) return response.json()

  if (response.status === 401 || response.status === 403) {
    throw new Error(`Microsoft Graph rechazó el acceso a ${context} (HTTP ${response.status}). Falta conceder Sites.Selected/Sites.Read.All a la App Registration o el acceso al sitio.`)
  }
  if (response.status === 404) {
    throw new Error(`No se encontró ${context} en SharePoint (HTTP 404).`)
  }
  if (response.status === 429) {
    throw new Error(`Microsoft Graph limitó temporalmente las consultas a ${context} (HTTP 429). Intenta nuevamente en unos minutos.`)
  }
  throw new Error(`Error al leer ${context} desde Microsoft Graph (HTTP ${response.status}).`)
}

async function getAllPages(firstUrl, context) {
  const values = []
  let next = firstUrl
  let pages = 0
  while (next && pages < MAX_PAGES) {
    const payload = await graphGet(next, context)
    values.push(...(payload.value || []))
    next = payload["@odata.nextLink"] || null
    pages += 1
  }
  return values
}

export async function getSiteId() {
  const { host, sitePath } = siteSettings()
  const key = `${host}:${sitePath}`
  if (siteCache.id && siteCache.key === key) return siteCache.id
  const site = await graphGet(`/sites/${host}:${sitePath}?$select=id`, `el sitio ${sitePath}`)
  siteCache = { id: site.id, key }
  return site.id
}

async function getListsIndex(force) {
  if (!force && listsIndexCache.lists && Date.now() - listsIndexCache.loadedAt < LIST_TTL_MS) {
    return listsIndexCache.lists
  }
  const siteId = await getSiteId()
  const lists = await getAllPages(`/sites/${siteId}/lists?$select=id,displayName,name&$top=200`, "las LIST del sitio")
  listsIndexCache = { loadedAt: Date.now(), lists }
  return lists
}

/**
 * Busca la primera LIST que coincida con alguno de los nombres indicados (en orden)
 * y devuelve todas sus filas con sus columnas.
 *
 * @param {string[]} names nombres candidatos, p. ej. ["24_AsignacionesProceso", "11_AsignacionesProceso"]
 * @param {{ force?: boolean }} options
 * @returns {Promise<{ listName: string, listId: string, items: Array<{ id: string, fields: object }>, checkedAt: string }>}
 */
export async function readNamedList(names, { force = false } = {}) {
  const candidates = (Array.isArray(names) ? names : [names]).map((name) => String(name || "").trim()).filter(Boolean)
  if (!candidates.length) throw new Error("No se indicó el nombre de la LIST a leer.")

  const cacheKey = candidates.join("|")
  const cached = itemsCache.get(cacheKey)
  if (!force && cached && Date.now() - cached.loadedAt < LIST_TTL_MS) return cached.value

  const lists = await getListsIndex(force)
  let list = null
  for (const candidate of candidates) {
    const target = normalize(candidate)
    list = lists.find((item) => normalize(item.displayName) === target || normalize(item.name) === target)
    if (list) break
  }
  if (!list) {
    throw new Error(`No se encontró la LIST ${candidates.join(" / ")} en el sitio ${siteSettings().sitePath}.`)
  }

  const siteId = await getSiteId()
  const rows = await getAllPages(
    `/sites/${siteId}/lists/${list.id}/items?$expand=fields&$top=999`,
    `la LIST ${list.displayName}`
  )

  const value = {
    listName: list.displayName,
    listId: list.id,
    items: rows.map((row) => ({ id: row.id, fields: row.fields || {} })),
    checkedAt: new Date().toISOString(),
  }
  itemsCache.set(cacheKey, { loadedAt: Date.now(), value })
  return value
}
