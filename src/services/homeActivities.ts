// Acciones y pendientes de Inicio. Se usa en Inicio y para los avisos del menú.
import { signalFromRequest, type SignalTone } from "../components/SignalLight"
import {
  academyCourses,
  academyEvaluations,
  PILOT_VISIBLE_COURSE_IDS,
  PILOT_VISIBLE_EVALUATION_IDS,
  type AcademyAudience,
} from "../data/academiaData"
import { getCourseProgress, getEvaluationAttempts, hasAcademyFeedback } from "./academyStore"
import { getRequestPermissions, isProcessParticipant } from "./permissions"
import { getAllRequestAssignments, getProcessesForUser } from "./requestCatalog"
import { hasExperienceAccess } from "./experienceAccess"
import type { RequestItem, UserScope } from "../types"

// Base de sugerencias mientras no haya historial (acordado el 09-10).
const SUGGESTED_BY_ROLE: Record<string, string[]> = {
  VENDEDOR: ["COL-CRE-01", "EXP-FEE-01", "EXP-SEG-01", "EXP-HOR-01"],
  ASISTENTE_JUNIOR: ["COL-CRE-01", "EXP-FEE-01", "EXP-SEG-01", "EXP-HOR-01"],
  JEFATURA_LOCAL: ["EXP-SEN-01", "INS-ZEX-01", "INS-MOB-01", "COM-PME-01"],
  GERENCIA_MARCA: ["INS-ZEX-01", "INS-MAN-01", "COM-MAT-01"],
  JEFATURA_MARKETING: ["COM-MAT-01", "COM-OTR-01"],
  EQUIPO_COMERCIAL: ["COM-MAT-01", "COM-OTR-01"],
  DEFAULT: ["COL-CRE-01", "COL-FIR-01"],
}

export type ActivityItem = {
  id: string
  title: string
  detail: string
  to: string
  tone?: SignalTone
}

function normalize(value?: string) {
  return value?.trim().toLowerCase() ?? ""
}

export function academyAudience(user: UserScope): AcademyAudience {
  if (hasExperienceAccess(user)) return "EXPERIENCIA"
  if (user.role === "GERENCIA_VENTAS") return "GERENCIA_VENTAS"
  if (["GERENCIA_MARCA", "JEFATURA_MARCA", "JEFATURA_ZONAL"].includes(user.role)) {
    return "GERENCIA_MARCA"
  }
  if (user.role === "JEFATURA_LOCAL") return "JEFATURA"
  if (user.role === "VENDEDOR") return "VENTAS"
  if (user.role === "ASISTENTE_JUNIOR") return "JUNIOR"
  if (
    user.role === "ADMINISTRATIVO" &&
    (normalize(user.name).includes("junior") || normalize(user.areaFunctional).includes("oper"))
  ) {
    return "JUNIOR"
  }
  return "CASA_MATRIZ"
}


export function computeHomeActivities(currentUser: UserScope, requests: RequestItem[]) {
  const actions: ActivityItem[] = []
  const pending: ActivityItem[] = []

  // Formularios viven en Gestión; en Inicio aparecen cuando hay que realizarlos.
  if (currentUser.role === "JEFATURA_LOCAL") {
    actions.push({
      id: "ruta-experiencia",
      title: "Realizar Ruta de Experiencia",
      detail: `Formulario semanal de la Jefatura de Sucursal${currentUser.local ? ` · ${currentUser.local}` : ""}.`,
      to: "/formularios",
      tone: "green",
    })
  }

  requests.forEach((request) => {
    const permissions = getRequestPermissions(currentUser, request, getAllRequestAssignments())
    if (!permissions.canView) return

    const to = `/solicitudes/${request.id}`
    const oversight = ["GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA_CLIENTES", "PROJECT_MANAGER"].includes(
      currentUser.role
    )

    if (request.status === "RECIBIDA" && permissions.canManage) {
      actions.push({
        id: `new-${request.id}`,
        title: `Revisar nueva solicitud · ${request.processName}`,
        detail: `${request.local} · disponible para tomar gestión.`,
        to,
        tone: "green",
      })
    }

    // Solicitud nueva de un proceso donde la persona participa (responsable, aprobador,
    // visor asignado, participante) pero que no le toca tomar: queda en Pendientes.
    if (
      // No se repite si ya está en "¿Qué necesitas hacer?" (tomar gestión o aprobar).
      ((request.status === "RECIBIDA" && !permissions.canManage) ||
        (request.status === "PENDIENTE_APROBACION" && !permissions.canApprove)) &&
      normalize(request.requesterEmail) !== normalize(currentUser.email) &&
      isProcessParticipant(currentUser, request, getAllRequestAssignments())
    ) {
      pending.push({
        id: `participa-${request.id}`,
        title: `Nueva solicitud · ${request.processName}`,
        detail: `${request.local} · ${request.status === "RECIBIDA" ? "recibida, por tomar gestión" : "en aprobación"}.`,
        to,
        tone: "green",
      })
    }

    if (request.status === "PENDIENTE_APROBACION" && permissions.canApprove) {
      actions.push({
        id: `approve-${request.id}`,
        title: `Revisar aprobación · ${request.processName}`,
        detail: `${request.local} · requiere tu decisión.`,
        to,
        tone: "green",
      })
    }

    if (
      request.status === "INFORMACION_REQUERIDA" &&
      normalize(request.requesterEmail) === normalize(currentUser.email)
    ) {
      actions.push({
        id: `info-${request.id}`,
        title: `Completar información · ${request.processName}`,
        detail: "La gestión está esperando antecedentes del solicitante.",
        to,
        tone: "green",
      })
    }

    if (request.status === "RESUELTA_POR_CONFIRMAR" && permissions.canConfirmResolution) {
      actions.push({
        id: `confirm-${request.id}`,
        title: `Confirmar resolución · ${request.processName}`,
        detail: `${request.local} · confirma si quedó resuelto.`,
        to,
        tone: "green",
      })
    }

    if (request.status === "EN_GESTION" && permissions.canManage) {
      pending.push({
        id: `manage-${request.id}`,
        title: `En gestión · ${request.processName}`,
        detail: `${request.local} · seguimiento activo.`,
        to,
        tone: signalFromRequest(request),
      })
    } else if (request.status === "EN_GESTION" && oversight) {
      pending.push({
        id: `scope-${request.id}`,
        title: `Seguimiento · ${request.processName}`,
        detail: `${request.local} · ${request.isTest ? "caso de prueba" : "gestión activa"}.`,
        to,
        tone: signalFromRequest(request),
      })
    }

    if (request.status === "INFORMACION_REQUERIDA" && oversight) {
      pending.push({
        id: `scope-info-${request.id}`,
        title: `Falta información · ${request.processName}`,
        detail: `${request.local} · gestión temporalmente detenida.`,
        to,
        tone: "orange",
      })
    }
  })

  const audience = academyAudience(currentUser)
  const noAssignments = currentUser.role === "ASISTENTE_GERENCIA"
  const pilotCourses = noAssignments ? [] : academyCourses.filter(
    (course) =>
      PILOT_VISIBLE_COURSE_IDS.includes(
        course.id as (typeof PILOT_VISIBLE_COURSE_IDS)[number]
      ) &&
      course.audience.includes(audience) &&
      course.assignedTo.includes(audience)
  )

  pilotCourses.forEach((course) => {
    const progress = getCourseProgress(course)
    const feedbackDone = hasAcademyFeedback(course.id, currentUser.email)

    if (progress === 0) {
      actions.push({
        id: `course-${course.id}`,
        title: `Comenzar curso · ${course.title}`,
        detail: "Curso asignado · 0% de avance.",
        to: "/academia?tab=cursos",
        tone: "green",
      })
    } else if (progress < 100) {
      pending.push({
        id: `course-progress-${course.id}`,
        title: `Continuar curso · ${course.title}`,
        detail: `${progress}% de avance.`,
        to: "/academia?tab=cursos",
        tone: "orange",
      })
    } else if (!feedbackDone) {
      actions.push({
        id: `course-feedback-${course.id}`,
        title: `Cerrar curso · ${course.title}`,
        detail: "Completa la encuesta breve obligatoria del curso asignado.",
        to: "/academia?tab=cursos",
        tone: "green",
      })
    }
  })

  academyEvaluations
    .filter(
      (evaluation) =>
        !noAssignments &&
        PILOT_VISIBLE_EVALUATION_IDS.includes(
          evaluation.id as (typeof PILOT_VISIBLE_EVALUATION_IDS)[number]
        ) &&
        evaluation.audience.includes(audience) &&
        evaluation.assignedTo.includes(audience)
    )
    .forEach((evaluation) => {
      const attempts = getEvaluationAttempts(evaluation.id)
      const passed = attempts.some((attempt) => attempt.passed)
      if (!passed && attempts.length < evaluation.attempts) {
        pending.push({
          id: `evaluation-${evaluation.id}`,
          title: `Evaluación pendiente · ${evaluation.title}`,
          detail: `${evaluation.attempts - attempts.length} intento(s) disponible(s).`,
          to: "/academia?tab=evaluaciones",
          tone: attempts.length ? "orange" : "green",
        })
      }
    })

  // Solicitudes sugeridas: lo que más pide la persona → lo que más pide su rol → base por perfil.
  const requestable = getProcessesForUser(currentUser).filter(
    (process) => (process.availability ?? "ACTIVO") === "ACTIVO"
  )
  const allowed = new Set(requestable.map((process) => process.code))
  const score = new Map<string, number>()
  requests.forEach((request) => {
    if (!allowed.has(request.processCode) || request.isTest) return
    const mine = normalize(request.requesterEmail) === normalize(currentUser.email)
    const sameRole = request.requesterRole === currentUser.role
    if (mine) score.set(request.processCode, (score.get(request.processCode) ?? 0) + 100)
    else if (sameRole) score.set(request.processCode, (score.get(request.processCode) ?? 0) + 1)
  })
  const defaults = SUGGESTED_BY_ROLE[currentUser.role] ?? SUGGESTED_BY_ROLE.DEFAULT
  defaults.forEach((code, index) => {
    if (allowed.has(code)) score.set(code, (score.get(code) ?? 0) + 0.5 - index * 0.01)
  })
  const suggested = [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([code]) => requestable.find((process) => process.code === code)!)
    .filter(Boolean)
  suggested.forEach((process) => {
    actions.push({
      id: `sugerida-${process.code}`,
      title: `Solicitar · ${process.name}`,
      detail: "Solicitud frecuente para tu perfil.",
      to: `/solicitudes/nueva?process=${encodeURIComponent(process.code)}`,
      tone: "neutral",
    })
  })

  const needsAction = dedupeActivities(actions)
  const pendingItems = dedupeActivities(pending)
  // Aviso del menú: solo cosas por hacer (sin sugerencias ni la Ruta semanal fija).
  // Los cursos y evaluaciones se avisan en Academia, no en Inicio.
  const counts = (item: ActivityItem) => !/^(sugerida-|course-|evaluation-)/.test(item.id) && item.id !== "ruta-experiencia"
  const badgeCount = needsAction.filter(counts).length + pendingItems.filter(counts).length
  // Para las tarjetas del inicio: lo que toca revisar/aprobar y el resto de las solicitudes abiertas.
  const requestItems = [...needsAction, ...pendingItems].filter((item) => item.to.startsWith("/solicitudes/") && !item.id.startsWith("sugerida-"))
  const bandejaCount = requestItems.filter((item) => /^(new-|approve-)/.test(item.id)).length
  const solicitudesCount = requestItems.length - bandejaCount
  return {
    needsAction: needsAction.slice(0, 10),
    pendingItems: pendingItems.slice(0, 12),
    badgeCount,
    bandejaCount,
    solicitudesCount,
  }
}

function dedupeActivities(items: ActivityItem[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

// Cursos y evaluaciones asignados pendientes (para el aviso de Academia).
// La Asistente de Gerencia no tiene asignados.
export function academyPendingCount(currentUser: UserScope) {
  if (currentUser.role === "ASISTENTE_GERENCIA") return 0
  const audience = academyAudience(currentUser)
  const courses = academyCourses.filter(
    (course) =>
      PILOT_VISIBLE_COURSE_IDS.includes(course.id as (typeof PILOT_VISIBLE_COURSE_IDS)[number]) &&
      course.status !== "ARCHIVADO" && course.status !== "BORRADOR" &&
      course.audience.includes(audience) &&
      course.assignedTo.includes(audience)
  ).filter((course) => !(getCourseProgress(course) >= 100 && hasAcademyFeedback(course.id, currentUser.email)))
  const evaluations = academyEvaluations.filter((evaluation) => {
    if (!PILOT_VISIBLE_EVALUATION_IDS.includes(evaluation.id as (typeof PILOT_VISIBLE_EVALUATION_IDS)[number])) return false
    if (!evaluation.audience.includes(audience) || !evaluation.assignedTo.includes(audience)) return false
    const attempts = getEvaluationAttempts(evaluation.id)
    return !attempts.some((attempt) => attempt.passed) && attempts.length < evaluation.attempts
  })
  return courses.length + evaluations.length
}

// Mi local: hay algo nuevo cuando llega una Ruta o Auditoría posterior a la última visita.
const SEEN_PREFIX = "ditalapp-milocal-visto:"
export function markMiLocalSeen(email?: string) {
  try { if (email) localStorage.setItem(SEEN_PREFIX + email.toLowerCase(), new Date().toISOString()) } catch { /* sin almacenamiento */ }
  window.dispatchEvent(new Event("ditalapp-badges"))
}
export function miLocalLastSeen(email?: string) {
  try { return (email && localStorage.getItem(SEEN_PREFIX + email.toLowerCase())) || "" } catch { return "" }
}
