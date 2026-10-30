// Lectura común de 02_Usuarios (LIST de SharePoint, Excel/CSV temporal y perfil al ingresar).
// Formato real (23-10): Email · Title · Rol · Activo · EsAdmin · Alcance · Local(es) · EscalamientoVentasEmail.
// "Local(es)" puede venir como arreglo JSON (["Vespucio"]), como valor múltiple de SharePoint
// ("A;#B") o separado por ";", "," o "|". Cada usuario queda limitado a sus locales.

export const VALID_ROLES = new Set([
  "VENDEDOR", "JEFATURA_LOCAL", "JEFATURA_MARCA", "JEFATURA_ZONAL", "GERENCIA_MARCA",
  "GERENCIA_VENTAS", "JEFATURA_COMERCIAL_CLIENTES", "JEFATURA_OPERACIONES_COMERCIALES",
  "JEFATURA_ADMINISTRACION", "GERENCIA_ADMINISTRACION", "GERENCIA_COMERCIAL",
  "JEFATURA_MARKETING", "EXPERIENCIA_CLIENTES", "PROJECT_MANAGER", "ASISTENTE_GERENCIA",
  "ASISTENTE_JUNIOR", "ADMINISTRATIVO", "EQUIPO_COMERCIAL", "GERENCIA_GENERAL",
])

const ROLE_ALIASES = {
  vendedor: "VENDEDOR",
  ejecutivodeventas: "VENDEDOR",
  ejecutivoventas: "VENDEDOR",
  ejecutivocomercial: "VENDEDOR",
  jefedesucursal: "JEFATURA_LOCAL",
  jefesucursal: "JEFATURA_LOCAL",
  jefaturasucursal: "JEFATURA_LOCAL",
  jefaturadesucursal: "JEFATURA_LOCAL",
  jefaturalocal: "JEFATURA_LOCAL",
  jefaturamarca: "JEFATURA_MARCA",
  jefaturazonal: "JEFATURA_ZONAL",
  gerentemarca: "GERENCIA_MARCA",
  gerenciademarca: "GERENCIA_MARCA",
  gerenciamarca: "GERENCIA_MARCA",
  gerenciaventas: "GERENCIA_VENTAS",
  gerenciadeventas: "GERENCIA_VENTAS",
  jefaturacomercialyclientes: "GERENCIA_MARCA",
  jefaturacomercialclientes: "GERENCIA_MARCA",
  jefaturaoperacionescomerciales: "JEFATURA_OPERACIONES_COMERCIALES",
  operacionescomerciales: "JEFATURA_OPERACIONES_COMERCIALES",
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
  administracion: "ADMINISTRATIVO",
  tasador: "ADMINISTRATIVO",
  callcenter: "ADMINISTRATIVO",
  junior: "ASISTENTE_JUNIOR",
  asistentejunior: "ASISTENTE_JUNIOR",
  juniorpreparador: "ASISTENTE_JUNIOR",
  equipocomercial: "EQUIPO_COMERCIAL",
  gerenciageneral: "GERENCIA_GENERAL",
  // Supervisor de ventas: con locales asignados se limita a ellos (zonal); sin locales, ve la red.
  supervisorventas: "SUPERVISOR",
  supervisordeventas: "SUPERVISOR",
}

// Etiqueta visible cuando el cargo del archivo se agrupa en un rol más amplio.
const AREA_FROM_ROLE = { tasador: "Tasación", callcenter: "Call Center", administracion: "Administración", supervisorventas: "Supervisión de ventas", supervisordeventas: "Supervisión de ventas" }

export function normalizeKey(value) {
  return String(value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/gi, "").toLowerCase()
}

function plain(value) {
  if (value === undefined || value === null) return ""
  if (Array.isArray(value)) return value.map(plain).filter(Boolean).join(";")
  if (typeof value === "object") {
    if (typeof value.LookupValue === "string") return value.LookupValue
    if (typeof value.Description === "string") return value.Description
    if (typeof value.text === "string") return value.text
    if (value.result !== undefined) return String(value.result ?? "")
    if (Array.isArray(value.richText)) return value.richText.map((p) => p.text || "").join("")
    return ""
  }
  return String(value)
}

/** Lista de valores: arreglo JSON, "A;#B", "A; B", "A, B" o "A | B". */
export function splitList(value) {
  if (Array.isArray(value)) return [...new Set(value.flatMap(splitList))]
  const raw = plain(value).trim()
  if (!raw) return []
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return [...new Set(parsed.map((item) => plain(item).trim()).filter(Boolean))]
    } catch { /* no era JSON: se separa como texto */ }
  }
  return [...new Set(raw.split(/;#|[;,|]/).map((item) => item.replace(/^[#\["\s]+|[\]"\s]+$/g, "").trim()).filter(Boolean))]
}

/** Devuelve { role, areaFunctional? } a partir del texto de la columna Rol. */
export function mapRoleText(value, locals = []) {
  const raw = plain(value).trim()
  const upper = raw.toUpperCase().replace(/[\s-]+/g, "_")
  if (upper === "JEFATURA_COMERCIAL_CLIENTES") return { role: "GERENCIA_MARCA" }
  if (VALID_ROLES.has(upper)) return { role: upper }
  const key = normalizeKey(raw)
  let role = ROLE_ALIASES[key] || "VENDEDOR"
  if (role === "SUPERVISOR") role = locals.length ? "JEFATURA_ZONAL" : "JEFATURA_OPERACIONES_COMERCIALES"
  return { role, areaFunctional: AREA_FROM_ROLE[key] }
}

/** Alcance: Red, Local, Multilocal, Marca, Zona; "Proceso" se trata como Local (limitado a sus locales). */
export function mapScopeText(value, role, locals = []) {
  const raw = normalizeKey(value).toUpperCase()
  if (raw === "PROCESO") return locals.length > 1 ? "MULTILOCAL" : "LOCAL"
  if (["LOCAL", "MULTILOCAL", "MARCA", "ZONA", "RED"].includes(raw)) return raw
  if (locals.length > 1) return "MULTILOCAL"
  if (role === "GERENCIA_MARCA" || role === "JEFATURA_MARCA") return "MARCA"
  if (role === "JEFATURA_ZONAL") return "ZONA"
  if ([
    "GERENCIA_VENTAS", "GERENCIA_COMERCIAL", "GERENCIA_ADMINISTRACION", "JEFATURA_COMERCIAL_CLIENTES",
    "JEFATURA_OPERACIONES_COMERCIALES", "JEFATURA_ADMINISTRACION", "JEFATURA_MARKETING",
    "EXPERIENCIA_CLIENTES", "PROJECT_MANAGER", "ASISTENTE_GERENCIA", "GERENCIA_GENERAL",
  ].includes(role)) return "RED"
  return "LOCAL"
}

/** Locales del usuario: "Local(es)"/LocalesAsignados + LocalPrincipal (el primero es el principal). */
export function localsFrom(pick, fields) {
  // En Graph la columna "Local(es)" llega con su nombre interno "Local_x0028_es_x0029_".
  const assigned = splitList(pick(fields, ["Local(es)", "Local_x0028_es_x0029_", "Locales", "LocalesAsignados", "SucursalesAsignadas"]))
  const principalList = splitList(pick(fields, ["LocalPrincipal", "Local", "Sucursal"]))
  const all = [...new Set([...principalList, ...assigned])]
  return { localPrincipal: principalList[0] || all[0] || "", assignedLocals: all }
}

/** CSV simple con comillas (exportación de la LIST 02_Usuarios). Devuelve filas como arreglos. */
export function parseCsvRows(text) {
  const clean = String(text).replace(/^﻿/, "")
  const firstLine = clean.split(/\r?\n/, 1)[0] || ""
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ","
  const rows = []
  let row = []
  let cell = ""
  let quoted = false
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === delimiter) { row.push(cell); cell = "" }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++
      row.push(cell); cell = ""
      if (row.some((value) => value.trim() !== "")) rows.push(row)
      row = []
    } else cell += ch
  }
  row.push(cell)
  if (row.some((value) => value.trim() !== "")) rows.push(row)
  return rows
}
