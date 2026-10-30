// Directorio de usuarios desde la LIST maestra 02_Usuarios (SharePoint vía Graph).
// Si la LIST no está disponible, esta función lanza error y index.js usa el Excel
// temporal como fallback (ver rutas users/directory y operations/catalog).

import { readNamedList } from "./graphLists.js"
import { localsFrom, mapRoleText, mapScopeText, splitList } from "./userFields.js"

const VALID_ROLES = new Set([
  "VENDEDOR","JEFATURA_LOCAL","JEFATURA_MARCA","JEFATURA_ZONAL","GERENCIA_MARCA",
  "GERENCIA_VENTAS","JEFATURA_COMERCIAL_CLIENTES","JEFATURA_OPERACIONES_COMERCIALES",
  "JEFATURA_ADMINISTRACION","GERENCIA_ADMINISTRACION","GERENCIA_COMERCIAL",
  "JEFATURA_MARKETING","EXPERIENCIA_CLIENTES","PROJECT_MANAGER","ASISTENTE_GERENCIA","ASISTENTE_JUNIOR","ADMINISTRATIVO","EQUIPO_COMERCIAL","GERENCIA_GENERAL"
])

const ROLE_ALIASES = {
  vendedor: "VENDEDOR",
  jefedesucursal: "JEFATURA_LOCAL",
  jefaturalocal: "JEFATURA_LOCAL",
  jefaturamarca: "JEFATURA_MARCA",
  jefaturazonal: "JEFATURA_ZONAL",
  gerentemarca: "GERENCIA_MARCA",
  gerenciademarca: "GERENCIA_MARCA",
  gerenciamarca: "GERENCIA_MARCA",
  gerenciaventas: "GERENCIA_VENTAS",
  jefaturacomercialyclientes: "GERENCIA_MARCA",
  jefaturacomercialclientes: "GERENCIA_MARCA",
  jefaturaoperacionescomerciales: "JEFATURA_OPERACIONES_COMERCIALES",
  jefaturaadministracion: "JEFATURA_ADMINISTRACION",
  gerenciaadministracion: "GERENCIA_ADMINISTRACION",
  gerenciacomercial: "GERENCIA_COMERCIAL",
  jefaturamarketing: "JEFATURA_MARKETING",
  marketing: "JEFATURA_MARKETING",
  experiencia: "EXPERIENCIA_CLIENTES",
  experienciadeclientes: "EXPERIENCIA_CLIENTES",
  experienciaclientes: "EXPERIENCIA_CLIENTES",
  projectmanager: "PROJECT_MANAGER",
  pm: "PROJECT_MANAGER",
  asistentegerencia: "ASISTENTE_GERENCIA",
  asistentedegerencia: "ASISTENTE_GERENCIA",
  asistenciadegerencia: "ASISTENTE_GERENCIA",
  asistenciagerencia: "ASISTENTE_GERENCIA",
  administrativo: "ADMINISTRATIVO",
  junior: "ASISTENTE_JUNIOR",
  asistentejunior: "ASISTENTE_JUNIOR",
  juniorpreparador: "ASISTENTE_JUNIOR",
  equipocomercial: "EQUIPO_COMERCIAL",
  gerenciageneral: "GERENCIA_GENERAL",
}

const CACHE_MS = 60_000
let cache = null

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
}

// Las columnas de SharePoint pueden llegar como texto, número, booleano,
// arreglo (elección múltiple) u objeto (hipervínculo, etc.).
function text(value) {
  if (value === undefined || value === null) return ""
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(";")
  if (typeof value === "object") {
    if (typeof value.Description === "string" && value.Description) return value.Description.trim()
    if (typeof value.Url === "string") return value.Url.trim()
    if (typeof value.LookupValue === "string") return value.LookupValue.trim()
    if (typeof value.Email === "string") return value.Email.trim()
    return ""
  }
  return String(value).trim()
}

function pick(fields, aliases) {
  for (const [key, value] of Object.entries(fields || {})) {
    if (aliases.some((alias) => normalize(alias) === normalize(key))) return value
  }
  return undefined
}

// Acepta listas separadas por ";", "," o "|" y valores múltiples de SharePoint ("A;#B").
function split(value) {
  return text(value).split(/;#|[;,|]/).map((item) => item.replace(/^#/, "").trim()).filter(Boolean)
}

function bool(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  return ["1","true","si","sí","yes","activo","activa","vigente","x"].includes(text(value).toLowerCase())
}

function mapRole(value) {
  const raw = text(value)
  const upper = raw.toUpperCase().replace(/[\s-]+/g, "_")
  if (upper === "JEFATURA_COMERCIAL_CLIENTES") return "GERENCIA_MARCA" // rol eliminado el 08-10: ahora es Gerencia de Marca
  if (VALID_ROLES.has(upper)) return upper
  return ROLE_ALIASES[normalize(raw)] || "VENDEDOR"
}

function mapScope(value, role, assignedLocals) {
  const raw = text(value).toUpperCase()
  if (["LOCAL","MULTILOCAL","MARCA","ZONA","RED"].includes(raw)) return raw
  if (assignedLocals.length > 1) return "MULTILOCAL"
  if (role === "GERENCIA_MARCA" || role === "JEFATURA_MARCA") return "MARCA"
  if (role === "JEFATURA_ZONAL") return "ZONA"
  if ([
    "GERENCIA_VENTAS","GERENCIA_COMERCIAL","GERENCIA_ADMINISTRACION",
    "JEFATURA_COMERCIAL_CLIENTES","JEFATURA_OPERACIONES_COMERCIALES",
    "JEFATURA_ADMINISTRACION","JEFATURA_MARKETING","EXPERIENCIA_CLIENTES","PROJECT_MANAGER","ASISTENTE_GERENCIA","GERENCIA_GENERAL"
  ].includes(role)) return "RED"
  return "LOCAL"
}

function toUser(fields) {
  const email = text(pick(fields, ["Email", "Correo", "CorreoElectronico", "Correo Electrónico"])).toLowerCase()
  if (!email || !email.includes("@")) return null

  // Cada usuario queda limitado a sus locales ("Local(es)"); sin locales y con Alcance Red, ve la red.
  const { localPrincipal, assignedLocals } = localsFrom(pick, fields)
  const mapped = mapRoleText(pick(fields, ["RolApp", "Rol", "CargoApp"]), assignedLocals)
  const role = mapped.role
  const local = localPrincipal || assignedLocals[0] || undefined

  return {
    email,
    name: text(pick(fields, ["Nombre", "Name", "Title"])) || email,
    role,
    local,
    localPrincipal: localPrincipal || undefined,
    assignedLocals: assignedLocals.length ? assignedLocals : local ? [local] : undefined,
    scope: mapScopeText(pick(fields, ["Alcance", "Scope"]), role, assignedLocals),
    zone: text(pick(fields, ["Zona"])) || undefined,
    brands: splitList(pick(fields, ["Marcas", "Marca"])),
    areaFunctional: text(pick(fields, ["AreaFuncional", "ÁreaFuncional", "Area", "Área"])) || mapped.areaFunctional || undefined,
    escalationEmail: text(pick(fields, ["EscalamientoVentasEmail", "Escalamiento"])).toLowerCase() || undefined,
    active: bool(pick(fields, ["Activo", "Activa", "Estado"]), true),
  }
}

function configuredListName() {
  return String(process.env.SHAREPOINT_USERS_LIST || "02_Usuarios").trim()
}

/**
 * Devuelve { users, meta } con la misma forma que loadUsersFromExcel,
 * para que el frontend no distinga la fuente.
 */
export async function loadUsersFromList({ force = false } = {}) {
  if (!force && cache && Date.now() - cache.loadedAt < CACHE_MS) return cache.value

  const list = await readNamedList([configuredListName()], { force })

  // Si un correo aparece repetido, prevalece la última fila.
  const byEmail = new Map()
  for (const row of list.items || []) {
    const user = toUser(row.fields)
    if (user) byEmail.set(user.email, user)
  }
  const users = [...byEmail.values()]
  if (!users.length) {
    throw new Error(`${list.listName} no tiene filas con columna Email válida.`)
  }

  const value = {
    users,
    meta: {
      source: "SHAREPOINT_LIST",
      listName: list.listName,
      sheet: list.listName,
      rowCount: users.length,
      activeCount: users.filter((user) => user.active).length,
      inactiveCount: users.filter((user) => !user.active).length,
      checkedAt: list.checkedAt || new Date().toISOString(),
    },
  }
  cache = { loadedAt: Date.now(), value }
  return value
}
