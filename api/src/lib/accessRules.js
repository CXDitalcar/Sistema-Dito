// Quién puede qué en DITO (reglas confidenciales).
// - Administradores de DITO: las 3 personas que cargan archivos, cruzan datos, vacían detalle y ven Contabilidad completa.
//   Se pueden cambiar sin código con la config DITO_ADMINS (lista de correos separada por comas).
// - Gerentes (cualquier cargo "Gerencia ...", sin importar su ámbito): ven Contabilidad solo en lectura.
// Debe coincidir con src/services/ditoAccess.ts.
import { getAppConfig } from "./store.js"
import { normalizeEmail } from "./security.js"

export const DITO_ADMIN_DEFAULTS = ["flee@ditalcar.cl", "lolivares@ditalcar.cl", "breveco@ditalcar.cl"]
export const GERENTE_ROLES = new Set(["GERENCIA_MARCA", "GERENCIA_VENTAS", "GERENCIA_COMERCIAL", "GERENCIA_ADMINISTRACION", "GERENCIA_GENERAL"])

export async function ditoAdmins() {
  const stored = await getAppConfig("DITO_ADMINS").catch(() => null)
  const list = String(stored?.value || "").split(/[,;\s]+/).map(normalizeEmail).filter((e) => /^[^\s@]+@ditalcar\.cl$/.test(e))
  return list.length ? list : DITO_ADMIN_DEFAULTS
}

export async function isDitoAdmin(user) {
  return Boolean(user) && (await ditoAdmins()).includes(normalizeEmail(user.email))
}

export const isGerente = (user) => Boolean(user) && GERENTE_ROLES.has(user.role)

/** Ver Contabilidad (lectura): administradores y gerentes. */
export async function canViewContabilidad(user) {
  return Boolean(user) && (isGerente(user) || (await isDitoAdmin(user)))
}
