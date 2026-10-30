import ExcelJS from "exceljs"
import { localsFrom, mapRoleText, mapScopeText, parseCsvRows, splitList } from "./userFields.js"

const VALID_ROLES = new Set([
  "VENDEDOR","JEFATURA_LOCAL","JEFATURA_MARCA","JEFATURA_ZONAL","GERENCIA_MARCA",
  "GERENCIA_VENTAS","JEFATURA_COMERCIAL_CLIENTES","JEFATURA_OPERACIONES_COMERCIALES",
  "JEFATURA_ADMINISTRACION","GERENCIA_ADMINISTRACION","GERENCIA_COMERCIAL",
  "JEFATURA_MARKETING","EXPERIENCIA_CLIENTES","PROJECT_MANAGER","ASISTENTE_GERENCIA","ASISTENTE_JUNIOR","ADMINISTRATIVO","EQUIPO_COMERCIAL","GERENCIA_GENERAL"
])

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
}

function cellText(value) {
  if (value === undefined || value === null) return ""
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value).trim()
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("").trim()
    if (typeof value.text === "string") return value.text.trim()
    if (typeof value.result === "string" || typeof value.result === "number" || typeof value.result === "boolean") return String(value.result).trim()
    if (typeof value.hyperlink === "string") return String(value.text || value.hyperlink).trim()
  }
  return String(value).trim()
}

function pick(fields, aliases) {
  for (const [key, value] of Object.entries(fields || {})) {
    if (aliases.some((alias) => normalize(alias) === normalize(key))) return value
  }
  return undefined
}

function split(value) {
  return cellText(value)
    .split(/;#|[;,]/)
    .map((item) => item.replace(/^#/, "").trim())
    .filter(Boolean)
}

function bool(value, fallback = true) {
  const raw = cellText(value)
  if (!raw) return fallback
  return ["1","true","si","sí","yes","activo","activa","x"].includes(raw.toLowerCase())
}

function mapRole(value) {
  const raw = cellText(value)
  const upper = raw.toUpperCase().replace(/\s+/g, "_")
  if (upper === "JEFATURA_COMERCIAL_CLIENTES") return "GERENCIA_MARCA" // rol eliminado el 08-10: ahora es Gerencia de Marca
  if (VALID_ROLES.has(upper)) return upper

  const aliases = {
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
  return aliases[normalize(raw)] || "VENDEDOR"
}

function mapScope(value, role, assignedLocals) {
  const raw = cellText(value).toUpperCase()
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

function excelDownloadUrl(rawUrl) {
  const url = new URL(String(rawUrl || "").trim())
  if (!/^https?:$/.test(url.protocol)) throw new Error("El enlace debe comenzar con https://")

  const host = url.hostname.toLowerCase()
  if (host.includes("sharepoint.com") || host.includes("onedrive.live.com") || host === "1drv.ms") {
    url.searchParams.delete("web")
    url.searchParams.set("download", "1")
  }
  return url.toString()
}

function normalizeHeaderRow(worksheet) {
  const headers = []
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = cellText(cell.value)
  })
  return headers
}

function toUser(fields) {
  const email = cellText(pick(fields, ["Email", "Correo", "CorreoElectronico", "Correo Electrónico"])).toLowerCase()
  if (!email || !email.includes("@")) return null

  // Cada usuario queda limitado a sus locales ("Local(es)"); sin locales y con Alcance Red, ve la red.
  const { localPrincipal, assignedLocals } = localsFrom(pick, fields)
  const mapped = mapRoleText(pick(fields, ["RolApp", "Rol", "CargoApp", "Cargo"]), assignedLocals)
  const role = mapped.role
  const scope = mapScopeText(pick(fields, ["Alcance", "Scope"]), role, assignedLocals)
  const local = localPrincipal || assignedLocals[0] || undefined

  return {
    email,
    name: cellText(pick(fields, ["Nombre", "Name", "Title"])) || email,
    role,
    local: local || undefined,
    localPrincipal: localPrincipal || undefined,
    assignedLocals: assignedLocals.length ? assignedLocals : local ? [local] : undefined,
    scope,
    zone: cellText(pick(fields, ["Zona"])) || undefined,
    brands: splitList(pick(fields, ["Marcas", "Marca"])),
    areaFunctional: cellText(pick(fields, ["AreaFuncional", "ÁreaFuncional", "Area", "Área"])) || mapped.areaFunctional || undefined,
    escalationEmail: cellText(pick(fields, ["EscalamientoVentasEmail", "Escalamiento"])).toLowerCase() || undefined,
    active: bool(pick(fields, ["Activo", "Activa", "Estado"]), true),
  }
}

let cache = null
const CACHE_MS = 60_000

export async function loadUsersFromExcel(rawUrl, options = {}) {
  const sourceUrl = String(rawUrl || "").trim()
  if (!sourceUrl) throw new Error("No hay un enlace de Excel configurado.")

  const cacheKey = `${sourceUrl}|${options.sheetName || ""}`
  if (!options.force && cache?.key === cacheKey && Date.now() - cache.loadedAt < CACHE_MS) {
    return cache.value
  }

  const downloadUrl = excelDownloadUrl(sourceUrl)
  const response = await fetch(downloadUrl, {
    method: "GET",
    redirect: "follow",
    headers: {
      Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream;q=0.9,*/*;q=0.1",
      "User-Agent": "DitalApp/1.0",
    },
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("El Excel exige inicio de sesión. Mientras Graph siga bloqueado, usa un enlace de descarga que pueda abrirse sin autenticación.")
    }
    throw new Error(`No fue posible descargar el Excel (HTTP ${response.status}).`)
  }

  const contentType = String(response.headers.get("content-type") || "").toLowerCase()
  const buffer = Buffer.from(await response.arrayBuffer())
  const prefix = buffer.subarray(0, 64).toString("utf8").toLowerCase()
  if (contentType.includes("text/html") || prefix.includes("<!doctype html") || prefix.includes("<html")) {
    throw new Error("El enlace abre una página web en vez del archivo Excel. Usa un enlace de descarga directa o un enlace compartido que no pida inicio de sesión.")
  }

  const parsed = await parseUsersWorkbook(buffer, options)
  const users = parsed.users
  const worksheet = { name: parsed.sheet }
  const result = {
    users,
    meta: {
      sourceUrl,
      finalUrl: response.url,
      sheet: worksheet.name,
      rowCount: users.length,
      activeCount: users.filter((user) => user.active).length,
      inactiveCount: users.filter((user) => !user.active).length,
      checkedAt: new Date().toISOString(),
      lastModified: response.headers.get("last-modified") || undefined,
    },
  }

  cache = { key: cacheKey, loadedAt: Date.now(), value: result }
  return result
}

// Lee un libro de usuarios (mismo formato que 02_Usuarios: encabezados en la primera fila).
export async function parseUsersWorkbook(buffer, options = {}) {
  // CSV (exportación de la LIST): mismo formato, encabezados en la primera fila.
  const isZip = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b
  if (!isZip) {
    const rows = parseCsvRows(buffer.toString("utf8"))
    const headers = (rows[0] || []).map((h) => String(h || "").trim())
    if (!headers.some((header) => ["email", "correo", "correoelectronico"].includes(normalize(header)))) {
      throw new Error("El archivo no tiene una columna Email/Correo en la primera fila.")
    }
    const users = []
    let skipped = 0
    for (const row of rows.slice(1)) {
      const fields = {}
      headers.forEach((header, i) => { if (header) fields[header] = row[i] ?? "" })
      const user = toUser(fields)
      if (user) users.push(user)
      else skipped += 1
    }
    return { users, sheet: "csv", skipped }
  }
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const preferred = String(options.sheetName || process.env.USERS_EXCEL_SHEET || "Usuarios").trim()
  const worksheet = workbook.getWorksheet(preferred)
    || workbook.getWorksheet("02_Usuarios")
    || workbook.worksheets[0]

  if (!worksheet) throw new Error("El archivo no contiene hojas legibles.")

  const headers = normalizeHeaderRow(worksheet)
  if (!headers.some((header) => normalize(header) === "email" || normalize(header) === "correo" || normalize(header) === "correoelectronico")) {
    throw new Error("La hoja no tiene una columna Email/Correo en la primera fila.")
  }

  const users = []
  let skipped = 0
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const fields = {}
    headers.forEach((header, colNumber) => {
      if (!header) return
      fields[header] = cellText(row.getCell(colNumber).value)
    })
    const user = toUser(fields)
    if (user) users.push(user)
    else skipped += 1
  })
  return { users, sheet: worksheet.name, skipped }
}

export async function findUserInExcel(rawUrl, email) {
  const { users } = await loadUsersFromExcel(rawUrl)
  const target = String(email || "").trim().toLowerCase()
  return users.find((user) => user.email === target) || null
}
