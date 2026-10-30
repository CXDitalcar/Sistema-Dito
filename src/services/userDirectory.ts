import { getItemsFromNamedList } from "./graph"
import type { UserRole, UserScope, UserScopeLevel } from "../types"

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
}

function pick(fields: Record<string, any>, aliases: string[]) {
  const entries = Object.entries(fields)
  for (const alias of aliases) {
    const target = normalize(alias)
    const match = entries.find(([key]) => normalize(key) === target)
    if (match && match[1] !== undefined && match[1] !== null) return match[1]
  }
  return undefined
}

function text(value: unknown) {
  return value === undefined || value === null ? "" : String(value).trim()
}

function split(value: unknown) {
  return text(value)
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function bool(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value
  if (value === undefined || value === null || value === "") return fallback
  return ["1", "true", "si", "sí", "yes", "activo"].includes(
    String(value).trim().toLowerCase()
  )
}

const validRoles: UserRole[] = [
  "VENDEDOR",
  "JEFATURA_LOCAL",
  "JEFATURA_MARCA",
  "JEFATURA_ZONAL",
  "GERENCIA_MARCA",
  "GERENCIA_VENTAS",
  "JEFATURA_COMERCIAL_CLIENTES",
  "JEFATURA_OPERACIONES_COMERCIALES",
  "JEFATURA_ADMINISTRACION",
  "GERENCIA_ADMINISTRACION",
  "GERENCIA_COMERCIAL",
  "JEFATURA_MARKETING",
  "EXPERIENCIA_CLIENTES", "PROJECT_MANAGER",
  "ASISTENTE_GERENCIA",
  "ASISTENTE_JUNIOR",
  "ADMINISTRATIVO",
  "EQUIPO_COMERCIAL",
  "GERENCIA_GENERAL",
]

function mapRole(value: unknown): UserRole {
  const raw = text(value)
  const upper = raw.toUpperCase().replace(/\s+/g, "_")
  // Rol eliminado el 08-10: Jefatura Comercial y Clientes ahora es Gerencia de Marca.
  if (upper === "JEFATURA_COMERCIAL_CLIENTES") return "GERENCIA_MARCA"
  if (validRoles.includes(upper as UserRole)) return upper as UserRole

  const normalized = normalize(raw)
  const aliases: Record<string, UserRole> = {
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
  return aliases[normalized] ?? "VENDEDOR"
}

function mapScope(value: unknown, role: UserRole, assignedLocals: string[]): UserScopeLevel {
  const normalized = text(value).toUpperCase()
  if (["LOCAL", "MULTILOCAL", "MARCA", "ZONA", "RED"].includes(normalized)) {
    return normalized as UserScopeLevel
  }
  if (assignedLocals.length > 1) return "MULTILOCAL"
  if (role === "GERENCIA_MARCA" || role === "JEFATURA_MARCA") return "MARCA"
  if (role === "JEFATURA_ZONAL") return "ZONA"
  if (
    [
      "GERENCIA_VENTAS",
      "GERENCIA_COMERCIAL",
      "GERENCIA_ADMINISTRACION",
      "JEFATURA_COMERCIAL_CLIENTES",
      "JEFATURA_OPERACIONES_COMERCIALES",
      "JEFATURA_ADMINISTRACION",
      "JEFATURA_MARKETING",
      "EXPERIENCIA_CLIENTES", "PROJECT_MANAGER", "ASISTENTE_GERENCIA",
    ].includes(role)
  ) {
    return "RED"
  }
  return "LOCAL"
}

export async function getUserScopeFromList(
  email: string,
  fallbackName: string
): Promise<UserScope | undefined> {
  if (!email) return undefined
  const rows = await getItemsFromNamedList(["02_Usuarios"])
  const row = rows.find(
    (item) => text(pick(item.fields, ["Email"]))?.toLowerCase() === email.toLowerCase()
  )
  if (!row) return undefined

  const fields = row.fields
  const role = mapRole(pick(fields, ["RolApp", "Rol"]))
  const assignedLocals = split(pick(fields, ["LocalesAsignados"]))
  const localPrincipal = text(
    pick(fields, ["LocalPrincipal", "Local", "Sucursal"])
  )
  const local = localPrincipal || assignedLocals[0] || undefined
  const scope = mapScope(pick(fields, ["Alcance"]), role, assignedLocals)

  return {
    email,
    name: text(pick(fields, ["Nombre", "Title"])) || fallbackName,
    role,
    local,
    localPrincipal: localPrincipal || undefined,
    assignedLocals: assignedLocals.length ? assignedLocals : local ? [local] : undefined,
    scope,
    zone: text(pick(fields, ["Zona"])) || undefined,
    brands: split(pick(fields, ["Marcas"])),
    areaFunctional: text(pick(fields, ["AreaFuncional", "ÁreaFuncional"])) || undefined,
    active: bool(pick(fields, ["Activo"]), true),
  }
}
