import { normalizeEmail } from "./security.js"
import { localsFrom, mapRoleText, mapScopeText, splitList } from "./userFields.js"
import { getUser, upsertUser } from "./store.js"

const validRoles = new Set([
  "VENDEDOR","JEFATURA_LOCAL","JEFATURA_MARCA","JEFATURA_ZONAL","GERENCIA_MARCA",
  "GERENCIA_VENTAS","JEFATURA_COMERCIAL_CLIENTES","JEFATURA_OPERACIONES_COMERCIALES",
  "JEFATURA_ADMINISTRACION","GERENCIA_ADMINISTRACION","GERENCIA_COMERCIAL",
  "JEFATURA_MARKETING","EXPERIENCIA_CLIENTES","PROJECT_MANAGER","ASISTENTE_GERENCIA","ASISTENTE_JUNIOR","ADMINISTRATIVO","EQUIPO_COMERCIAL","GERENCIA_GENERAL"
])

const NETWORK_ROLES = new Set([
  "GERENCIA_VENTAS","GERENCIA_COMERCIAL","GERENCIA_ADMINISTRACION","GERENCIA_GENERAL",
  "JEFATURA_COMERCIAL_CLIENTES","JEFATURA_OPERACIONES_COMERCIALES","JEFATURA_ADMINISTRACION",
  "JEFATURA_MARKETING","EXPERIENCIA_CLIENTES","PROJECT_MANAGER","ASISTENTE_GERENCIA"
])

export function publicUser(entity) {
  if (!entity) return null
  return {
    email: entity.email,
    name: entity.name || entity.email,
    role: entity.role === "JEFATURA_COMERCIAL_CLIENTES" ? "GERENCIA_MARCA" : validRoles.has(entity.role) ? entity.role : "VENDEDOR",
    local: entity.local || undefined,
    localPrincipal: entity.localPrincipal || entity.local || undefined,
    assignedLocals: parseArray(entity.assignedLocals),
    scope: entity.scope || "LOCAL",
    zone: entity.zone || undefined,
    brands: parseArray(entity.brands),
    areaFunctional: entity.areaFunctional || undefined,
    active: entity.active !== false,
  }
}

function parseArray(value) {
  if (!value) return undefined
  if (Array.isArray(value)) return value
  try { return JSON.parse(value) } catch { return String(value).split(/[;,]/).map(x => x.trim()).filter(Boolean) }
}

async function graphAccessToken() {
  const tenant = process.env.GRAPH_TENANT_ID
  const clientId = process.env.GRAPH_CLIENT_ID
  const clientSecret = process.env.GRAPH_CLIENT_SECRET
  if (!tenant || !clientId || !clientSecret) return null

  const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  })
  if (!response.ok) throw new Error("No fue posible autenticar la API contra Microsoft Graph")
  return (await response.json()).access_token
}

function normalizeKey(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, "").toLowerCase()
}
function pick(fields, aliases) {
  for (const [key, value] of Object.entries(fields || {})) {
    if (aliases.some((alias) => normalizeKey(alias) === normalizeKey(key))) return value
  }
  return undefined
}
function split(value) {
  return String(value ?? "").split(/;#|[;,]/).map(x => x.replace(/^#/, "").trim()).filter(Boolean)
}

export async function refreshProfileFromSharePoint(email) {
  const token = await graphAccessToken()
  if (!token) return getUser(email)

  const host = process.env.SHAREPOINT_HOSTNAME || "ditalcarchile.sharepoint.com"
  const sitePath = process.env.SHAREPOINT_SITE_PATH || "/sites/DITALCARSA"
  const listName = process.env.SHAREPOINT_USERS_LIST || "02_Usuarios"
  const headers = { Authorization: `Bearer ${token}` }

  const siteResp = await fetch(`https://graph.microsoft.com/v1.0/sites/${host}:${sitePath}?$select=id`, { headers })
  if (!siteResp.ok) throw new Error("No fue posible acceder al sitio SharePoint")
  const site = await siteResp.json()

  const listsResp = await fetch(`https://graph.microsoft.com/v1.0/sites/${site.id}/lists?$filter=displayName eq '${listName.replaceAll("'", "''")}'`, { headers })
  if (!listsResp.ok) throw new Error("No fue posible acceder a 02_Usuarios")
  const lists = await listsResp.json()
  const list = lists.value?.[0]
  if (!list) return null

  const itemsResp = await fetch(`https://graph.microsoft.com/v1.0/sites/${site.id}/lists/${list.id}/items?expand=fields&$top=999`, { headers })
  if (!itemsResp.ok) throw new Error("No fue posible leer 02_Usuarios")
  const items = await itemsResp.json()
  const normalized = normalizeEmail(email)
  const item = items.value?.find((row) => normalizeEmail(pick(row.fields, ["Email"])) === normalized)
  if (!item) {
    // Usuarios creados en la app (Usuarios › Agregar usuario) siguen válidos aunque no estén en 02_Usuarios.
    const local = await getUser(normalized)
    return local?.source === "APP" && local.active !== false ? local : null
  }

  const fields = item.fields || {}
  const activeRaw = pick(fields, ["Activo"])
  const active = activeRaw === undefined ? true : [true, 1, "1", "true", "si", "sí", "activo"].includes(typeof activeRaw === "string" ? activeRaw.toLowerCase() : activeRaw)
  if (!active) return null

  const existing = await getUser(normalized)
  const { localPrincipal, assignedLocals } = localsFrom(pick, fields)
  const rawRole = pick(fields, ["RolApp", "Rol"])
  const mapped = rawRole ? mapRoleText(rawRole, assignedLocals) : { role: existing?.role || "VENDEDOR" }
  const role = mapped.role
  // Cada usuario queda limitado a sus locales ("Local(es)"); sin locales y con Alcance Red, ve la red.
  const rawScope = pick(fields, ["Alcance"])
  const scope = rawScope ? mapScopeText(rawScope, role, assignedLocals) : (NETWORK_ROLES.has(role) ? "RED" : (existing?.scope || mapScopeText("", role, assignedLocals)))
  const user = {
    email: normalized,
    name: String(pick(fields, ["Nombre", "Title"]) || existing?.name || normalized),
    role,
    local: localPrincipal || undefined,
    localPrincipal: localPrincipal || undefined,
    assignedLocals: JSON.stringify(assignedLocals),
    scope,
    zone: String(pick(fields, ["Zona"]) || "") || undefined,
    brands: JSON.stringify(splitList(pick(fields, ["Marcas"]))),
    areaFunctional: String(pick(fields, ["AreaFuncional", "ÁreaFuncional"]) || "") || mapped.areaFunctional || undefined,
    active: true,
    passwordHash: existing?.passwordHash,
    activatedAt: existing?.activatedAt,
    failedLoginCount: existing?.failedLoginCount || 0,
    lockedUntil: existing?.lockedUntil,
  }
  await upsertUser(user)
  return getUser(normalized)
}

export async function eligibleUser(email) {
  const fromSharePoint = await refreshProfileFromSharePoint(email).catch(() => null)
  return fromSharePoint || getUser(email)
}
