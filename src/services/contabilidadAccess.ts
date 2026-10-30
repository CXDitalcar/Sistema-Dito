import type { UserScope } from "../types"
import { isDitoAdminUser, isGerenteUser } from "./ditoAccess"

// Contabilidad es confidencial: la ven los 3 administradores de DITO (con carga y edición) y los cargos de Gerente
// (solo lectura). Debe coincidir con api/src/lib/accessRules.js; la API vuelve a validar en cada llamada.
export function canAccessContabilidad(user: UserScope) {
  return Boolean(user.active) && (isDitoAdminUser(user) || isGerenteUser(user))
}

export const canManageContabilidad = (user: UserScope) => Boolean(user.active) && isDitoAdminUser(user)
