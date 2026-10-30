import { localMatches } from "./localMatch"
import { assignmentMatchesUser } from "./requestCatalog"
import type {
  ProcessAssignment,
  RequestItem,
  RequestPermissions,
  UserScope,
} from "../types"
import { hasExperienceAccess } from "./experienceAccess"

// Experiencia y PM ven todas las solicitudes (seguimiento y futuro dashboard).
// Gerencia Comercial ya no tiene vista amplia: ve lo que se le envía a aprobación.
const broadVisibilityRoles: UserScope["role"][] = [
  "GERENCIA_VENTAS",
  "GERENCIA_ADMINISTRACION",
  "EXPERIENCIA_CLIENTES", "PROJECT_MANAGER",
]

function normalized(value?: string) {
  return value?.trim().toLowerCase() ?? ""
}

function userHasLocal(user: UserScope, local: string) {
  const target = normalized(local)
  const locals = [
    user.local,
    user.localPrincipal,
    ...(user.assignedLocals ?? []),
  ]
    .filter(Boolean)
    .map((value) => normalized(value))

  // Mismo local escrito distinto ("Vespucio" ↔ "Chery-Renault Vespucio", "JMC-KGM" ↔ "KGM-JMC").
  return locals.includes(target) || [user.local, user.localPrincipal, ...(user.assignedLocals ?? [])].some((value) => localMatches(value, local))
}

// Perfiles atados a su local (Alcance Local o Multilocal, vendedores y jefaturas de sucursal):
// nunca ven datos de otros locales. Debe coincidir con isLocalBound en api/src/index.js.
export function isLocalBound(user: UserScope) {
  if (hasExperienceAccess(user)) return false
  if (["GERENCIA_GENERAL", "GERENCIA_COMERCIAL", "GERENCIA_VENTAS", "GERENCIA_ADMINISTRACION", "JEFATURA_COMERCIAL_CLIENTES"].includes(user.role)) return false
  return user.scope === "LOCAL" || user.scope === "MULTILOCAL" || user.role === "VENDEDOR" || user.role === "JEFATURA_LOCAL"
}

function isGeelyLocal(local: string) {
  return normalized(local).includes("geely")
}

function isStellantisLocal(local: string) {
  return normalized(local).includes("stellantis")
}

function isExactCurrentResponsible(
  user: UserScope,
  request: RequestItem
) {
  return Boolean(
    request.currentResponsibleEmail &&
      normalized(request.currentResponsibleEmail) ===
        normalized(user.email)
  )
}

export function canViewRequest(
  user: UserScope,
  request: RequestItem,
  assignments: ProcessAssignment[]
): boolean {
  if (!user.active || user.role === "GERENCIA_GENERAL") return false

  if (normalized(request.requesterEmail) === normalized(user.email)) {
    return true
  }

  if (user.role === "JEFATURA_LOCAL" && userHasLocal(user, request.local)) {
    return true
  }

  if (isExactCurrentResponsible(user, request)) {
    return true
  }

  if (broadVisibilityRoles.includes(user.role)) {
    return true
  }

  const email = normalized(user.email)
  if (normalized(request.managementOwnerEmail) === email) return true
  if ((request.participants ?? []).some((value) => normalized(value) === email)) return true
  if ((request.audience?.emails ?? []).some((value) => normalized(value) === email)) return true
  // Lo asignado al cargo o al proceso le llega a un perfil de local solo si es de su local.
  const ownLocal = !isLocalBound(user) || !request.local || userHasLocal(user, request.local)
  if ((request.audience?.roles ?? []).includes(user.role) && ownLocal) return true

  if (user.role === "GERENCIA_MARCA") {
    // La Gerencia de Marca ve los locales asignados a su perfil.
    // Si aún no se cargaron, usamos marcas explícitas solo como respaldo
    // cuando el nombre del local contiene la marca.
    if (userHasLocal(user, request.local)) return true
    return Boolean(
      user.brands?.some((brand) =>
        normalized(request.local).includes(normalized(brand))
      )
    )
  }

  if (user.role === "JEFATURA_MARCA") {
    return isGeelyLocal(request.local)
  }

  if (user.role === "JEFATURA_ZONAL") {
    return !isGeelyLocal(request.local) && !isStellantisLocal(request.local)
  }

  return ownLocal && assignments.some(
    (assignment) =>
      assignment.processCode === request.processCode &&
      assignmentMatchesUser(user, assignment)
  )
}

export function canApproveRequest(
  user: UserScope,
  request: RequestItem,
  assignments: ProcessAssignment[]
): boolean {
  if (
    !user.active ||
    user.role === "GERENCIA_GENERAL" ||
    request.status !== "PENDIENTE_APROBACION"
  ) {
    return false
  }

  if (normalized(request.requesterEmail) === normalized(user.email)) {
    return false
  }

  if (request.approvalContext === "JEFATURA_LOCAL") {
    if (isExactCurrentResponsible(user, request)) {
      return [
        "JEFATURA_LOCAL",
        "JEFATURA_MARCA",
        "JEFATURA_ZONAL",
        "GERENCIA_MARCA",
      ].includes(user.role)
    }

    // Compatibilidad demo y futuro perfil multilocal.
    return (
      user.role === "JEFATURA_LOCAL" && userHasLocal(user, request.local)
    )
  }

  if (request.approvalContext === "PRESUPUESTO_COMERCIAL") {
    return user.role === "GERENCIA_COMERCIAL"
  }

  if (request.approvalContext === "PROPUESTA_MARCA") {
    if (isExactCurrentResponsible(user, request)) return true
    return user.role === "GERENCIA_MARCA" && userHasLocal(user, request.local)
  }

  return assignments.some(
    (assignment) =>
      assignment.processCode === request.processCode &&
      assignment.type === "APPROVER" &&
      assignmentMatchesUser(user, assignment)
  )
}

export function canManageRequest(
  user: UserScope,
  request: RequestItem,
  assignments: ProcessAssignment[]
): boolean {
  if (!user.active || user.role === "GERENCIA_GENERAL") return false

  return assignments.some(
    (assignment) =>
      assignment.processCode === request.processCode &&
      assignment.type === "MANAGER" &&
      assignmentMatchesUser(user, assignment)
  )
}

export function canConfirmResolution(
  user: UserScope,
  request: RequestItem
): boolean {
  if (!user.active || user.role === "GERENCIA_GENERAL") return false

  if (normalized(request.requesterEmail) === normalized(user.email)) {
    return true
  }

  return user.role === "JEFATURA_LOCAL" && userHasLocal(user, request.local)
}

// La persona forma parte del proceso de la solicitud: tiene una asignación activa
// (cualquier tipo) en ese proceso, es la responsable actual o participa en ella.
export function isProcessParticipant(
  user: UserScope,
  request: RequestItem,
  assignments: ProcessAssignment[]
): boolean {
  if (!user.active) return false
  const email = normalized(user.email)
  if (isExactCurrentResponsible(user, request)) return true
  if (normalized(request.managementOwnerEmail) === email) return true
  if ((request.participants ?? []).some((value) => normalized(value) === email)) return true
  return assignments.some(
    (assignment) =>
      assignment.processCode === request.processCode &&
      assignment.active !== false &&
      assignmentMatchesUser(user, assignment)
  )
}

export function getRequestPermissions(
  user: UserScope,
  request: RequestItem,
  assignments: ProcessAssignment[]
): RequestPermissions {
  const canView = canViewRequest(user, request, assignments)
  const canApprove = canApproveRequest(user, request, assignments)
  const canManage = canManageRequest(user, request, assignments)
  const canConfirm = canConfirmResolution(user, request)

  return {
    canView,
    canApprove,
    canManage,
    canConfirmResolution: canConfirm,
    canRequestInformation: canApprove || canManage,
    canReject: canApprove,
    canApproveWithAdjustment: canApprove,
  }
}

export function canAccessApprovalInbox(
  user: UserScope,
  assignments: ProcessAssignment[]
): boolean {
  if (!user.active || user.role === "GERENCIA_GENERAL") return false

  if (
    [
      "JEFATURA_LOCAL",
      "JEFATURA_MARCA",
      "JEFATURA_ZONAL",
      "GERENCIA_MARCA",
      "GERENCIA_COMERCIAL",
    ].includes(user.role)
  ) {
    return true
  }

  return assignments.some(
    (assignment) =>
      assignment.active &&
      (assignment.type === "APPROVER" || assignment.type === "MANAGER") &&
      assignmentMatchesUser(user, assignment)
  )
}

export function canViewLocalDetail(user: UserScope, local: string): boolean {
  if (!user.active || user.role === "GERENCIA_GENERAL") return false

  if (
    user.role === "GERENCIA_VENTAS" ||
    user.role === "GERENCIA_COMERCIAL" ||
    hasExperienceAccess(user)
  ) {
    return true
  }

  if (user.role === "VENDEDOR" || user.role === "JEFATURA_LOCAL") {
    return userHasLocal(user, local)
  }

  if (user.role === "GERENCIA_MARCA") {
    if (userHasLocal(user, local)) return true
    return Boolean(
      user.brands?.some((brand) => normalized(local).includes(normalized(brand)))
    )
  }

  if (user.role === "JEFATURA_MARCA") return isGeelyLocal(local)

  if (user.role === "JEFATURA_ZONAL") {
    return !isGeelyLocal(local) && !isStellantisLocal(local)
  }

  return false
}
