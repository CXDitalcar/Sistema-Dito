import type { UserScope } from "../types"

// Reglas de acceso confidenciales de DITO. Deben coincidir con api/src/lib/accessRules.js (la API es la que decide).
// Administradores: cargan archivos, cruzan datos, vacían detalle y ven Contabilidad completa.
// Gerentes (cualquier gerencia, de cualquier ámbito): ven Contabilidad solo en lectura.
export const DITO_ADMIN_EMAILS = ["flee@ditalcar.cl", "lolivares@ditalcar.cl", "breveco@ditalcar.cl"]
export const GERENTE_ROLES: UserScope["role"][] = ["GERENCIA_MARCA", "GERENCIA_VENTAS", "GERENCIA_COMERCIAL", "GERENCIA_ADMINISTRACION", "GERENCIA_GENERAL"]

export const isDitoAdminUser = (user?: Pick<UserScope, "email"> | null) =>
  Boolean(user?.email && DITO_ADMIN_EMAILS.includes(user.email.toLowerCase()))

export const isGerenteUser = (user?: Pick<UserScope, "role"> | null) => Boolean(user && GERENTE_ROLES.includes(user.role))
