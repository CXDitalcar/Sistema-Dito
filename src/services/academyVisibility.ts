import { academyCourses, academyEvaluations, PILOT_VISIBLE_COURSE_IDS, PILOT_VISIBLE_EVALUATION_IDS, type AcademyCourse } from "../data/academiaData"
import { academyAudience } from "./homeActivities"
import { hasExperienceAccess } from "./experienceAccess"
import { getCompletedModules, getCourseProgress, hasAcademyFeedback } from "./academyStore"
import type { UserScope } from "../types"

// Qué cursos y evaluaciones ve cada perfil en Academia DITALCAR (misma regla en portada y curso).
export function visibleAcademy(user: UserScope) {
  const audience = academyAudience(user)
  const admin = hasExperienceAccess(user)
  const noAssignments = user.role === "ASISTENTE_GERENCIA"
  const courses = academyCourses.filter((c) =>
    c.audience.includes(audience) && c.status !== "ARCHIVADO" && (admin || c.status !== "BORRADOR") &&
    (admin || PILOT_VISIBLE_COURSE_IDS.includes(c.id as (typeof PILOT_VISIBLE_COURSE_IDS)[number])))
  const assigned = noAssignments ? [] : courses.filter((c) => c.assignedTo.includes(audience))
  const evaluations = academyEvaluations.filter((e) =>
    !noAssignments && e.audience.includes(audience) && e.assignedTo.includes(audience) &&
    (admin || PILOT_VISIBLE_EVALUATION_IDS.includes(e.id as (typeof PILOT_VISIBLE_EVALUATION_IDS)[number])))
  return { audience, admin, courses, assigned, evaluations }
}

export type CourseState = "PENDIENTE" | "EN_CURSO" | "ENCUESTA" | "COMPLETADO"

export function courseState(course: AcademyCourse, email: string): CourseState {
  const progress = getCourseProgress(course)
  if (progress >= 100) return hasAcademyFeedback(course.id, email) ? "COMPLETADO" : "ENCUESTA"
  return progress > 0 ? "EN_CURSO" : "PENDIENTE"
}

/** Próximo módulo disponible sin completar (o undefined si ya vio todos). */
export function nextModuleOf(course: AcademyCourse) {
  const done = getCompletedModules(course.id)
  return course.modules.find((m) => m.available && !done.includes(m.id))
}

export const courseHome = (id: string) => `/academia-ditalcar/curso/${encodeURIComponent(id)}`
export const courseStep = (id: string, step: string) => `${courseHome(id)}/${encodeURIComponent(step)}`
