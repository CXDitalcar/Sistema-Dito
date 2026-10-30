import type { UserScope } from "../types"

// ======================================================
// ACCESO NIVEL EXPERIENCIA
// Perfiles que ven la app completa (Usuarios, fuentes de datos, "Ver como",
// módulos en desarrollo). Project Manager tiene el mismo alcance que
// Experiencia de Clientes. El backend replica esta regla en isExperienceUser().
// ======================================================

export const EXPERIENCE_ACCESS_ROLES: UserScope["role"][] = [
  "EXPERIENCIA_CLIENTES",
  "PROJECT_MANAGER",
]

// Seguimiento de clientes: Experiencia, Project Manager y Asistente de Gerencia.
export function canSeeSeguimiento(user?: Pick<UserScope, "role"> | null) {
  return hasExperienceAccess(user) || user?.role === "ASISTENTE_GERENCIA"
}

// Datos (carga de planillas): sólo Experiencia y Project Manager.
export function canSeeDatos(user?: Pick<UserScope, "role"> | null) {
  return hasExperienceAccess(user)
}

export function hasExperienceAccess(user?: Pick<UserScope, "role"> | null) {
  return Boolean(user && EXPERIENCE_ACCESS_ROLES.includes(user.role))
}
