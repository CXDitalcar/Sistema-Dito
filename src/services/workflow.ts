import {
  getAllOperationalUsers,
  getAssignmentVisibleLabel,
  getKnownPersonName,
  getPrimaryAssignment,
  getRequestProcess,
  isDemoUser,
} from "./requestCatalog"
import type {
  ProcessAssignment,
  RequestItem,
  UserRole,
  UserScope,
} from "../types"

const LOCAL_APPROVAL_HOURS = 24
const MANAGER_ACCEPTANCE_HOURS = 24

type RuntimeSla = {
  reviewHours?: number
  acceptanceHours?: number
}

export function roleLabel(role: UserRole) {
  const labels: Record<UserRole, string> = {
    VENDEDOR: "Vendedor",
    JEFATURA_LOCAL: "Jefatura de Sucursal",
    JEFATURA_MARCA: "Jefatura de Marca",
    JEFATURA_ZONAL: "Gerencia de Marca",
    GERENCIA_MARCA: "Gerencia de Marca",
    GERENCIA_VENTAS: "Gerencia de Ventas",
    JEFATURA_COMERCIAL_CLIENTES: "Gerencia de Marca",
    JEFATURA_OPERACIONES_COMERCIALES: "Jefatura Operaciones Comerciales",
    JEFATURA_ADMINISTRACION: "Jefatura Administración",
    GERENCIA_ADMINISTRACION: "Gerencia Administración",
    GERENCIA_COMERCIAL: "Gerencia Comercial",
    JEFATURA_MARKETING: "Equipo de Marketing",
    EXPERIENCIA_CLIENTES: "Experiencia de Clientes",
    PROJECT_MANAGER: "Project Manager",
    ASISTENTE_GERENCIA: "Asistente de Gerencia",
    ASISTENTE_JUNIOR: "Junior",
    ADMINISTRATIVO: "Administración",
    EQUIPO_COMERCIAL: "Equipo Comercial",
    GERENCIA_GENERAL: "Gerencia General",
  }

  return labels[role]
}

function assignmentPerson(assignment?: ProcessAssignment) {
  if (!assignment) {
    return {
      email: undefined,
      name: "Por asignar",
      label: "Por asignar",
    }
  }

  const label = getAssignmentVisibleLabel(assignment)

  if (assignment.email) {
    return {
      email: assignment.email,
      name:
        getKnownPersonName(assignment.email) ??
        label,
      label,
    }
  }

  return {
    email: undefined,
    name: assignment.role
      ? roleLabel(assignment.role)
      : label,
    label,
  }
}

function assignmentWouldSelfApprove(
  user: UserScope,
  assignment?: ProcessAssignment
) {
  if (!assignment) return false

  if (
    assignment.email &&
    assignment.email.toLowerCase() === user.email.toLowerCase()
  ) {
    return true
  }

  if (
    !assignment.email &&
    assignment.role === user.role
  ) {
    return true
  }

  // En demo permitimos simular el cargo, pero tampoco debe
  // generarse una autoaprobación del mismo perfil demo.
  if (
    isDemoUser(user) &&
    assignment.role === user.role
  ) {
    return true
  }

  return false
}

export function requiresLocalReview(
  user: UserScope,
  processCode: string
) {
  const process = getRequestProcess(processCode)
  if (!process) return user.role === "VENDEDOR"

  if (process.localReviewRule === "NUNCA") return false
  if (process.localReviewRule === "SOLO_VENDEDOR") {
    // Vendedor y Junior pueden pedir, pero la solicitud pasa primero por su jefe.
    return user.role === "VENDEDOR" || user.role === "ASISTENTE_JUNIOR"
  }

  // SIEMPRE no obliga a una persona a aprobarse a sí misma.
  if (user.role === "JEFATURA_LOCAL") return false

  return true
}

function getSellerLocalReviewer(local: string) {
  const normalizedLocal = local.trim().toLowerCase()

  const localHead = getAllOperationalUsers().find(
    (item) =>
      item.active &&
      item.role === "JEFATURA_LOCAL" &&
      item.local?.trim().toLowerCase() === normalizedLocal
  )

  if (localHead) {
    return {
      email: localHead.email,
      name: localHead.name,
      label: "Jefatura de Sucursal",
    }
  }

  // Nueva estructura comercial: Gerencia de Marca es el respaldo
  // de Jefatura Local. Durante la migración conservamos compatibilidad
  // con los antiguos perfiles de Jefatura de Marca / Zonal.
  const brandManager = getAllOperationalUsers().find(
    (item) =>
      item.active &&
      item.role === "GERENCIA_MARCA" &&
      (
        item.assignedLocals?.some(
          (assigned) => assigned.trim().toLowerCase() === normalizedLocal
        ) ||
        item.local?.trim().toLowerCase() === normalizedLocal
      )
  )

  if (brandManager) {
    return {
      email: brandManager.email,
      name: brandManager.name,
      label: "Gerencia de Marca",
    }
  }

  if (normalizedLocal.includes("geely")) {
    const legacyBrandHead = getAllOperationalUsers().find(
      (item) => item.active && item.role === "JEFATURA_MARCA"
    )

    if (legacyBrandHead) {
      return {
        email: legacyBrandHead.email,
        name: legacyBrandHead.name,
        label: "Gerencia de Marca",
      }
    }
  }

  const legacyZoneHead = getAllOperationalUsers().find(
    (item) => item.active && item.role === "JEFATURA_ZONAL"
  )

  if (legacyZoneHead) {
    return {
      email: legacyZoneHead.email,
      name: legacyZoneHead.name,
      label: "Gerencia de Marca",
    }
  }

  return {
    email: undefined,
    name: "Jefatura correspondiente",
    label: "Jefatura correspondiente",
  }
}

function routeToManager(processCode: string, runtimeSla?: RuntimeSla) {
  const manager = assignmentPerson(
    getPrimaryAssignment(processCode, "MANAGER")
  )

  return {
    status: "RECIBIDA" as const,
    approvalContext: undefined,
    acceptanceSLAHours: runtimeSla?.acceptanceHours ?? MANAGER_ACCEPTANCE_HOURS,
    acceptanceSLAStartedAt: new Date().toISOString(),
    currentResponsibleEmail: manager.email,
    currentResponsibleName: manager.name,
    currentResponsibleLabel: manager.label,
  }
}

function routeToProcessApproval(
  user: UserScope,
  processCode: string,
  runtimeSla?: RuntimeSla
) {
  const approver = getPrimaryAssignment(processCode, "APPROVER")

  if (!approver || (approver.condition && approver.condition !== "SIEMPRE")) {
    return routeToManager(processCode, runtimeSla)
  }

  if (assignmentWouldSelfApprove(user, approver)) {
    return routeToManager(processCode, runtimeSla)
  }

  const person = assignmentPerson(approver)

  return {
    status: "PENDIENTE_APROBACION" as const,
    approvalContext: "PROCESO" as const,
    approvalSLAHours: runtimeSla?.reviewHours ?? LOCAL_APPROVAL_HOURS,
    approvalSLAStartedAt: new Date().toISOString(),
    currentResponsibleEmail: person.email,
    currentResponsibleName: person.name,
    currentResponsibleLabel: person.label,
  }
}

export function initialRequestRouting(
  user: UserScope,
  processCode: string,
  local: string,
  runtimeSla?: RuntimeSla
) {
  // Beta: solicitudes de prueba. No se asignan a nadie ni generan gestión real.
  if (getRequestProcess(processCode)?.availability === "BETA") {
    return {
      status: "RECIBIDA" as const,
      approvalContext: undefined,
      currentResponsibleEmail: undefined,
      currentResponsibleName: "Solicitud de prueba",
      currentResponsibleLabel: "Sin gestión (prueba)",
    }
  }

  if (local && requiresLocalReview(user, processCode)) {
    const reviewer = getSellerLocalReviewer(local)

    // Protección adicional: nadie se envía una aprobación a sí mismo.
    if (
      reviewer.email &&
      reviewer.email.toLowerCase() === user.email.toLowerCase()
    ) {
      return routeToProcessApproval(user, processCode, runtimeSla)
    }

    return {
      status: "PENDIENTE_APROBACION" as const,
      approvalContext: "JEFATURA_LOCAL" as const,
      approvalSLAHours: runtimeSla?.reviewHours ?? LOCAL_APPROVAL_HOURS,
      approvalSLAStartedAt: new Date().toISOString(),
      currentResponsibleEmail: reviewer.email,
      currentResponsibleName: reviewer.name,
      currentResponsibleLabel: reviewer.label,
    }
  }

  return routeToProcessApproval(user, processCode, runtimeSla)
}

export function routeAfterApproval(request: RequestItem) {
  if (request.approvalContext === "PRESUPUESTO_COMERCIAL") {
    const pausedMinutes = request.resolutionSLAPausedAt
      ? Math.max(
          0,
          Math.round(
            (Date.now() -
              new Date(request.resolutionSLAPausedAt).getTime()) /
              60000
          )
        )
      : 0

    return {
      status: "EN_GESTION" as const,
      approvalContext: undefined,
      currentResponsibleEmail: request.managementOwnerEmail,
      currentResponsibleName:
        request.managementOwnerName ?? "Responsable de gestión",
      currentResponsibleLabel:
        request.managementOwnerLabel ?? "Responsable de gestión",
      resolutionSLAPausedAt: undefined,
      resolutionSLAPausedMinutes:
        (request.resolutionSLAPausedMinutes ?? 0) + pausedMinutes,
      slaPausedReason: undefined,
    }
  }

  if (request.approvalContext === "JEFATURA_LOCAL") {
    const requester: UserScope = {
      email: request.requesterEmail,
      name: request.requesterName,
      role: request.requesterRole ?? "VENDEDOR",
      local: request.local,
      active: true,
    }

    return routeToProcessApproval(requester, request.processCode, {
      reviewHours: request.approvalSLAHours,
      acceptanceHours: request.acceptanceSLAHours,
    })
  }

  return routeToManager(request.processCode, {
    acceptanceHours: request.acceptanceSLAHours,
  })
}

export function budgetApprovalRouting(request: RequestItem) {
  const approver = getAllOperationalUsers().find(
    (item) => item.active && item.role === "GERENCIA_COMERCIAL"
  )

  return {
    status: "PENDIENTE_APROBACION" as const,
    approvalContext: "PRESUPUESTO_COMERCIAL" as const,
    currentResponsibleEmail: approver?.email,
    currentResponsibleName: approver?.name ?? "Gerencia Comercial",
    currentResponsibleLabel: "Gerencia Comercial",
    managementOwnerEmail:
      request.managementOwnerEmail ?? request.currentResponsibleEmail,
    managementOwnerName:
      request.managementOwnerName ?? request.currentResponsibleName,
    managementOwnerLabel:
      request.managementOwnerLabel ?? request.currentResponsibleLabel,
    resolutionSLAPausedAt:
      request.resolutionSLAPausedAt ?? new Date().toISOString(),
    slaPausedReason: "Esperando aprobación",
  }
}


// ======================================================
// SLA EN DÍAS (catálogo v2)
// ======================================================

// Horas corridas que equivalen a N días hábiles desde una fecha (lunes a viernes).
export function businessDaysToHours(days: number, from = new Date()) {
  const start = new Date(from)
  const end = new Date(from)
  let remaining = days
  while (remaining > 0) {
    end.setDate(end.getDate() + 1)
    const weekday = end.getDay()
    if (weekday !== 0 && weekday !== 6) remaining -= 1
  }
  return Math.round((end.getTime() - start.getTime()) / 3600000)
}

export function processSlaHours(processCode: string, from = new Date()) {
  const process = getRequestProcess(processCode)
  if (!process?.slaDays) return undefined
  return process.slaCalendarDays ? process.slaDays * 24 : businessDaysToHours(process.slaDays, from)
}

export function processSlaLabel(processCode: string) {
  const process = getRequestProcess(processCode)
  if (!process?.slaDays) return undefined
  const unit = process.slaCalendarDays ? "días" : "días hábiles"
  return `${process.slaDays} ${unit}${process.slaDefault ? " (por defecto)" : ""}`
}

// ======================================================
// FLUJO "CON PROPUESTA" (Zonas, Mobiliario, Instalaciones y Otra con monto)
// Experiencia ⇄ Gerencia de Marca (con imágenes) → acuerdo → Gerencia Comercial (pausa) → ejecución → cierre con foto.
// ======================================================

export function findBrandManagerForLocal(local: string) {
  const target = local.trim().toLowerCase()
  const users = getAllOperationalUsers().filter((item) => item.active && item.role === "GERENCIA_MARCA")
  const byLocal = users.find((item) =>
    [item.local, item.localPrincipal, ...(item.assignedLocals ?? [])]
      .filter(Boolean)
      .some((value) => value!.trim().toLowerCase() === target)
  )
  if (byLocal) return byLocal
  return users.find((item) => item.brands?.some((brand) => target.includes(brand.trim().toLowerCase())))
}

export function sendProposalToBrandRouting(request: RequestItem) {
  const manager = findBrandManagerForLocal(request.local)
  const round = (request.proposal?.round ?? 0) + 1
  return {
    status: "PENDIENTE_APROBACION" as const,
    approvalContext: "PROPUESTA_MARCA" as const,
    currentResponsibleEmail: manager?.email,
    currentResponsibleName: manager?.name ?? "Gerencia de Marca",
    currentResponsibleLabel: "Gerencia de Marca",
    proposal: {
      ...(request.proposal ?? { round: 0, stage: "EXPERIENCIA" as const }),
      round,
      stage: "MARCA" as const,
      brandManagerEmail: manager?.email,
      brandManagerName: manager?.name,
    },
  }
}

function backToExperience(request: RequestItem) {
  return {
    status: "EN_GESTION" as const,
    approvalContext: undefined,
    currentResponsibleEmail: request.managementOwnerEmail,
    currentResponsibleName: request.managementOwnerName ?? "Experiencia de Clientes",
    currentResponsibleLabel: request.managementOwnerLabel ?? "Experiencia de Clientes",
  }
}

export function brandAgreesRouting(request: RequestItem) {
  return {
    ...backToExperience(request),
    proposal: { ...(request.proposal ?? { round: 1 }), stage: "ACUERDO" as const, agreedAt: new Date().toISOString() },
  }
}

export function brandRequestsChangesRouting(request: RequestItem) {
  return {
    ...backToExperience(request),
    proposal: { ...(request.proposal ?? { round: 1 }), stage: "EXPERIENCIA" as const, agreedAt: undefined },
  }
}

export function sendToCommercialRouting(request: RequestItem) {
  return {
    ...budgetApprovalRouting(request),
    slaPausedReason: "En aprobación de Gerencia Comercial",
    proposal: { ...(request.proposal ?? { round: 1 }), stage: "GERENCIA_COMERCIAL" as const, sentToCommercialAt: new Date().toISOString() },
  }
}
