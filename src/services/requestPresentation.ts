import { mockUsers } from "../data/mockData"
import { requestAssignments } from "../data/requestConfig"
import { getKnownPersonName, getOperationalUserByEmail } from "./requestCatalog"
import type {
  RequestItem,
  RequestStatus,
  UserRole,
  UserScope,
} from "../types"

const exactManagerRoles: UserRole[] = [
  "JEFATURA_ADMINISTRACION",
  "JEFATURA_COMERCIAL_CLIENTES",
  "JEFATURA_OPERACIONES_COMERCIALES",
  "JEFATURA_MARKETING",
  "JEFATURA_ZONAL",
  "JEFATURA_MARCA",
  "GERENCIA_MARCA",
  "GERENCIA_ADMINISTRACION",
  "GERENCIA_COMERCIAL",
  "GERENCIA_VENTAS",
]

export function roleLabel(role?: UserRole) {
  const labels: Partial<Record<UserRole, string>> = {
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
  }

  return role ? labels[role] ?? "Responsable" : "Responsable"
}

export function canSeeExactManager(user: UserScope) {
  return exactManagerRoles.includes(user.role)
}

function roleFromEmail(email?: string) {
  if (!email) return undefined
  return (
    getOperationalUserByEmail(email)?.role ??
    mockUsers.find((item) => item.email.toLowerCase() === email.toLowerCase())?.role
  )
}

function assignmentLabelFromEmail(email?: string) {
  if (!email) return undefined
  const assignment = requestAssignments.find(
    (item) =>
      item.email?.toLowerCase() === email.toLowerCase() &&
      item.active
  )
  return assignment?.label ?? assignment?.areaFunctional
}

export function responsibleLabel(
  user: UserScope,
  request: RequestItem
) {
  if (request.approvalContext === "JEFATURA_LOCAL") {
    if (canSeeExactManager(user) && request.currentResponsibleName) {
      return `${request.currentResponsibleName} · ${
        request.currentResponsibleLabel ?? "Jefatura de Sucursal"
      }`
    }
    return request.currentResponsibleLabel ?? "Jefatura de Sucursal"
  }

  if (request.approvalContext === "PROPUESTA_MARCA") {
    return request.currentResponsibleName && request.currentResponsibleName !== "Gerencia de Marca"
      ? `${request.currentResponsibleName} · Gerencia de Marca`
      : "Gerencia de Marca"
  }

  if (request.approvalContext === "PRESUPUESTO_COMERCIAL") {
    if (canSeeExactManager(user) && request.currentResponsibleName) {
      return `${request.currentResponsibleName} · Gerencia Comercial`
    }
    return "Gerencia Comercial"
  }

  const visibleLabel =
    request.currentResponsibleLabel ??
    assignmentLabelFromEmail(request.currentResponsibleEmail) ??
    roleLabel(roleFromEmail(request.currentResponsibleEmail))

  if (canSeeExactManager(user) && request.currentResponsibleName) {
    const exactName =
      getKnownPersonName(request.currentResponsibleEmail) ??
      request.currentResponsibleName

    if (
      visibleLabel &&
      exactName.toLowerCase() !== visibleLabel.toLowerCase()
    ) {
      return `${exactName} · ${visibleLabel}`
    }

    return exactName
  }

  return visibleLabel || "Por asignar"
}

export function actorLabel(
  user: UserScope,
  email: string,
  name: string
) {
  const role = roleFromEmail(email)
  const visibleLabel =
    assignmentLabelFromEmail(email) ?? roleLabel(role)

  if (canSeeExactManager(user)) {
    const exactName = getKnownPersonName(email) ?? name
    return visibleLabel && exactName !== visibleLabel
      ? `${exactName} · ${visibleLabel}`
      : exactName
  }

  return visibleLabel
}

export function visibleStatusLabel(
  request: Pick<RequestItem, "status" | "approvalContext">
) {
  if (
    request.status === "PENDIENTE_APROBACION" &&
    request.approvalContext === "JEFATURA_LOCAL"
  ) {
    return "Revisión local"
  }

  const labels: Record<RequestStatus, string> = {
    RECIBIDA: "Ingresada",
    INFORMACION_REQUERIDA: "Falta información",
    PENDIENTE_APROBACION: "Por aprobar",
    APROBADA: "Ingresada",
    APROBADA_CON_AJUSTE: "Ingresada",
    EN_GESTION: "En gestión",
    RESUELTA_POR_CONFIRMAR: "Por confirmar",
    RESUELTA: "Resuelta",
    RECHAZADA: "Rechazada",
  }

  return labels[request.status]
}

export function stageLabel(request: RequestItem) {
  if (request.isTest) return "Prueba (Beta)"
  if (request.waitingApproval) return "En espera de aprobación"
  if (request.flow === "PROPUESTA" && request.status !== "RESUELTA" && request.status !== "RECHAZADA") {
    const stage = request.proposal?.stage
    if (request.status === "RESUELTA_POR_CONFIRMAR") return "Implementada · falta foto del local"
    if (stage === "MARCA") return `Propuesta en Gerencia de Marca (vuelta ${request.proposal?.round ?? 1})`
    if (stage === "ACUERDO") return "Propuesta acordada"
    if (stage === "GERENCIA_COMERCIAL") return "En aprobación"
    if (stage === "EJECUCION") return "En ejecución"
    if (request.status === "EN_GESTION") return "Preparando propuesta"
  }
  if (
    request.status === "PENDIENTE_APROBACION" &&
    request.approvalContext === "JEFATURA_LOCAL"
  ) {
    return "Revisión local"
  }

  if (request.status === "PENDIENTE_APROBACION") {
    return "Por aprobar"
  }

  return visibleStatusLabel(request)
}
