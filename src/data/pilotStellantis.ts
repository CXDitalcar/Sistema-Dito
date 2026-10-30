import type { UserRole, UserScope } from "../types"
import { hasExperienceAccess } from "../services/experienceAccess"

export const PILOT_LOCAL = "Stellantis Nueva Tobalaba"

export const PILOT_REQUEST_CODES = [
  "COL-CRE-01",
  "COL-FIR-01",
  "EXP-HOR-01",
  "EXP-SEN-01",
  "EXP-ORG-01",
  "EXP-FEE-01",
  "EXP-SEG-01",
  "INS-ZEX-01",
  "INS-MOB-01",
  "INS-MAN-01",
  "EXP-OTR-01",
] as const

export type PilotModule =
  | "HOME"
  | "ACADEMIA"
  | "MI_LOCAL"
  | "SOLICITUDES"
  | "FORMULARIOS"
  | "INSUMOS"
  | "KPI"

export const PILOT_ACTIVE_ROLES: UserRole[] = [
  "VENDEDOR",
  "JEFATURA_LOCAL",
  "GERENCIA_MARCA",
  "EXPERIENCIA_CLIENTES", "PROJECT_MANAGER",
  "ASISTENTE_GERENCIA",
  "JEFATURA_MARKETING",
  "GERENCIA_COMERCIAL",
]

// Perfiles visibles en el selector del piloto. Experiencia conserva acceso completo
// a toda la app para poder revisar módulos que siguen ocultos al resto.
export const PILOT_DEMO_EMAILS = new Set([
  "vendedor.demo@ditalcar.cl",
  "jefe.stellantis.nt@ditalcar.cl",
  "gerencia.marca.stellantis@ditalcar.cl",
  "experiencia.clientes@ditalcar.cl",
  "marketing@ditalcar.cl",
  "gerencia.comercial@ditalcar.cl",
])

export function isPilotDemoProfile(user: UserScope) {
  return PILOT_DEMO_EMAILS.has(user.email.toLowerCase())
}

export function isPilotFullAccess(user: UserScope) {
  return hasExperienceAccess(user)
}

export function canAccessPilotModule(
  user: UserScope,
  module: PilotModule
) {
  if (!user.active) return false
  if (isPilotFullAccess(user)) return true

  // "Ver como" es una herramienta exclusiva de Experiencia durante el piloto.
  // Permite revisar la experiencia de todos los cargos sin cambiar las reglas
  // que tendrá un usuario real en el piloto.
  if (user.testingView) {
    if (user.role === "ASISTENTE_JUNIOR") {
      return module === "HOME" || module === "SOLICITUDES" || module === "ACADEMIA"
    }
    if (
      module === "HOME" ||
      module === "SOLICITUDES" ||
      module === "ACADEMIA" ||
      module === "KPI"
    ) {
      return true
    }

    if (module === "FORMULARIOS") {
      return [
        "JEFATURA_LOCAL",
        "GERENCIA_MARCA",
        "JEFATURA_MARCA",
        "JEFATURA_ZONAL",
        "GERENCIA_VENTAS",
        "EXPERIENCIA_CLIENTES", "PROJECT_MANAGER",
      ].includes(user.role)
    }

    if (module === "MI_LOCAL") {
      return [
        "VENDEDOR",
        "JEFATURA_LOCAL",
        "GERENCIA_MARCA",
        "JEFATURA_MARCA",
        "JEFATURA_ZONAL",
        "GERENCIA_VENTAS",
        "GERENCIA_COMERCIAL",
        "EXPERIENCIA_CLIENTES", "PROJECT_MANAGER",
      ].includes(user.role)
    }

    if (module === "INSUMOS") {
      return (
        hasExperienceAccess(user) ||
        (user.role === "ADMINISTRATIVO" &&
          (user.areaFunctional ?? "").toLowerCase().includes("junior"))
      )
    }
  }

  // Desde el 08-10 Inicio, Academia y Solicitudes están abiertos a todos los perfiles activos
  // (el catálogo define qué puede pedir cada uno). KPI sigue acotado y el Junior no lo ve.
  if (module === "HOME" || module === "SOLICITUDES" || module === "ACADEMIA") {
    return true
  }

  if (module === "KPI") {
    return PILOT_ACTIVE_ROLES.includes(user.role)
  }

  if (module === "FORMULARIOS") {
    return ["JEFATURA_LOCAL", "GERENCIA_MARCA"].includes(user.role)
  }

  return false
}

export function getPilotRequestCodesForUser(user: UserScope) {
  if (isPilotFullAccess(user)) return null

  if (user.role === "VENDEDOR") {
    return new Set([
      "COL-CRE-01",
      "COL-FIR-01",
      "EXP-HOR-01",
      "EXP-SEN-01",
      "EXP-ORG-01",
      "EXP-FEE-01",
      "EXP-SEG-01",
    ])
  }

  if (["JEFATURA_LOCAL", "GERENCIA_MARCA"].includes(user.role)) {
    return new Set(PILOT_REQUEST_CODES)
  }

  if (["JEFATURA_MARKETING", "GERENCIA_COMERCIAL"].includes(user.role)) {
    return new Set([
      "COL-CRE-01",
      "COL-FIR-01",
      "EXP-HOR-01",
      "EXP-SEN-01",
      "EXP-ORG-01",
      "EXP-FEE-01",
      "EXP-SEG-01",
    ])
  }

  return new Set<string>()
}

export function isPilotLocal(user: UserScope) {
  const locals = [
    user.local,
    user.localPrincipal,
    ...(user.assignedLocals ?? []),
  ]
    .filter(Boolean)
    .map((value) => value!.trim().toLowerCase())

  return locals.includes(PILOT_LOCAL.toLowerCase())
}
