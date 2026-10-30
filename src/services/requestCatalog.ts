import { mockUsers } from "../data/mockData"
import {
  demoSupplyCatalog,
  knownPeopleByEmail,
  requestAssignments as fallbackAssignments,
  requestFields as fallbackFields,
  requestProcesses as fallbackProcesses,
} from "../data/requestConfig"
import { PILOT_LOCAL } from "../data/pilotStellantis"
import { applyCatalogV2 } from "../data/requestCatalogV2"
import { getLocals } from "./localesStore"
import { hasExperienceAccess } from "./experienceAccess"
import { fetchOperationalCatalog, type OperationalCatalogMeta, type UsersCatalogMeta } from "./operationalCatalogApi"
import type {
  ProcessAssignment,
  ProcessConfig,
  ProcessFieldDefinition,
  UserScope,
} from "../types"

const DEMO_EMAILS = new Set([
  "vendedor.demo@ditalcar.cl","jefatura.local@ditalcar.cl","jefe.stellantis.nt@ditalcar.cl",
  "jefatura.marca@ditalcar.cl","jefatura.zonal@ditalcar.cl","gerencia.marca@ditalcar.cl",
  "gerencia.marca.stellantis@ditalcar.cl","gerencia.ventas@ditalcar.cl","comercial.clientes@ditalcar.cl",
  "operaciones.comerciales@ditalcar.cl","jefatura.administracion@ditalcar.cl","gerencia.administracion@ditalcar.cl",
  "gerencia.comercial@ditalcar.cl","marketing@ditalcar.cl","experiencia.clientes@ditalcar.cl",
  "administrativo@ditalcar.cl","junior.demo@ditalcar.cl","equipo.comercial@ditalcar.cl",
  "project.manager@ditalcar.cl","gerencia.general@ditalcar.cl",
])

const LEGACY_FIELD_ALIASES: Record<string, string> = {
  BON_NV: "UNI-BON-01-NV_OPERACION", BON_CLIENTE: "UNI-BON-01-DETALLE", BON_MARCA: "UNI-BON-01-MARCA",
  BON_MODELO: "UNI-BON-01-MODELO", BON_MONTO: "UNI-BON-01-MONTO_SOLICITADO", BON_MOTIVO: "UNI-BON-01-MOTIVO",
  PED_NV: "UNI-PED-01-NV_OPERACION", PED_MARCA: "UNI-PED-01-MARCA", PED_MODELO: "UNI-PED-01-MODELO",
  PED_DETALLE: "UNI-PED-01-DETALLE", TRA_VIN: "UNI-TRA-01-VIN", TRA_MARCA: "UNI-TRA-01-MARCA",
  TRA_MODELO: "UNI-TRA-01-MODELO", TRA_ORIGEN: "UNI-TRA-01-LOCAL_ORIGEN", TRA_DESTINO: "UNI-TRA-01-LOCAL_DESTINO",
  TRA_MOTIVO: "UNI-TRA-01-MOTIVO", CRE_NOMBRE: "COL-CRE-01-NOMBRE_COLABORADOR", CRE_CARGO: "COL-CRE-01-CARGO",
  CRE_TIPO: "COL-CRE-01-TIPO_CREDENCIAL", FIR_NOMBRE: "COL-FIR-01-NOMBRE_COLABORADOR", FIR_CARGO: "COL-FIR-01-CARGO",
  FIR_EMAIL: "COL-FIR-01-EMAIL_CORPORATIVO",
}

type RuntimeState = {
  processes: ProcessConfig[]
  fields: ProcessFieldDefinition[]
  assignments: ProcessAssignment[]
  users: UserScope[]
  meta: OperationalCatalogMeta
  usersMeta?: UsersCatalogMeta
}

const fallbackV2 = applyCatalogV2({ processes: fallbackProcesses, fields: fallbackFields, assignments: fallbackAssignments })

let runtime: RuntimeState = {
  processes: fallbackV2.processes,
  fields: fallbackV2.fields,
  assignments: fallbackV2.assignments,
  users: mockUsers,
  meta: { source: "FALLBACK", warning: "Usando snapshot temporal hasta cargar las LIST operativas." },
}

export async function loadOperationalCatalog(force = false) {
  try {
    const result = await fetchOperationalCatalog(force)
    const hasLiveCatalog = result.processes.length > 0
    const catalog = hasLiveCatalog
      ? applyCatalogV2({ processes: result.processes, fields: result.fields, assignments: result.assignments })
      : fallbackV2
    runtime = {
      processes: catalog.processes,
      fields: catalog.fields,
      assignments: catalog.assignments,
      users: result.users?.length ? result.users : mockUsers,
      meta: hasLiveCatalog ? result.meta : { ...result.meta, source: "FALLBACK" },
      usersMeta: result.usersMeta,
    }
  } catch (error) {
    runtime = {
      ...runtime,
      processes: fallbackV2.processes,
      fields: fallbackV2.fields,
      assignments: fallbackV2.assignments,
      meta: { source: "FALLBACK", warning: error instanceof Error ? error.message : "LIST operativas no disponibles." },
    }
  }
  window.dispatchEvent(new Event("ditalcar-operational-catalog-updated"))
  return runtime
}

export function getOperationalCatalogMeta() { return runtime.meta }
export function getOperationalUsersMeta() { return runtime.usersMeta }
export function getAllRequestAssignments() { return runtime.assignments }
export function getAllOperationalUsers() { return runtime.users }
export function setRuntimeUsers(users: UserScope[], meta?: UsersCatalogMeta) {
  runtime.users = users
  if (meta) runtime.usersMeta = meta
}

export function isDemoUser(user: UserScope) { return DEMO_EMAILS.has(user.email.toLowerCase()) }
export function getRequestProcesses(): ProcessConfig[] { return runtime.processes }
export function getRequestProcess(code: string) { return runtime.processes.find((process) => process.code === code) }

function migratedRoleMatches(userRole: UserScope["role"], configuredRole?: UserScope["role"]) {
  if (!configuredRole) return false
  if (configuredRole === userRole) return true
  // Project Manager puede solicitar todo lo que puede solicitar Experiencia.
  if (userRole === "PROJECT_MANAGER") return configuredRole === "EXPERIENCIA_CLIENTES"
  if (userRole === "GERENCIA_MARCA") return ["JEFATURA_MARCA", "JEFATURA_ZONAL"].includes(configuredRole)
  return false
}

// Procesos que el perfil ve al crear una solicitud. Los "OCULTO" solo los ve Experiencia/PM;
// los "CONSTRUCCION" se muestran deshabilitados y los "BETA" generan solicitudes de prueba.
export function getProcessesForUser(user: UserScope) {
  const experience = hasExperienceAccess(user)
  return runtime.processes
    .filter((process) => process.active && process.manualRequest)
    .filter((process) => process.availability !== "OCULTO" || experience)
    .filter((process) => experience || process.requesterRoles.some((role) => migratedRoleMatches(user.role, role)))
    .sort((a, b) => a.order - b.order)
}

// Procesos que gestiona Experiencia de Clientes (los que se ven en "Gestión de Showroom").
export function isExperienceProcess(code: string) {
  return runtime.assignments.some(
    (assignment) =>
      assignment.processCode === code &&
      assignment.type === "MANAGER" &&
      (assignment.role === "EXPERIENCIA_CLIENTES" || /experiencia de clientes/i.test(assignment.areaFunctional ?? ""))
  )
}

export function isProcessRequestable(process: ProcessConfig) {
  return !process.availability || process.availability === "ACTIVO" || process.availability === "BETA"
}

export function getRequestFields(processCode: string) {
  return runtime.fields.filter((field) => field.active && field.processCode === processCode).sort((a, b) => a.order - b.order)
}

export function getFieldDefinition(fieldId: string, processCode?: string): ProcessFieldDefinition | undefined {
  const baseId = fieldId.replace(/__(\d+)$/, "")
  const direct = runtime.fields.find((field) => field.id === baseId)
  if (direct) return direct
  const alias = LEGACY_FIELD_ALIASES[baseId]
  if (alias) return runtime.fields.find((field) => field.id === alias)
  if (processCode) return runtime.fields.find((field) => field.processCode === processCode && field.key === baseId)
  return undefined
}

export function getProcessAssignments(processCode: string) {
  return runtime.assignments.filter((assignment) => assignment.active && assignment.processCode === processCode)
    .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))
}

export function getPrimaryAssignment(processCode: string, type: ProcessAssignment["type"]) {
  const options = getProcessAssignments(processCode).filter((assignment) => assignment.type === type)
  return options.find((assignment) => assignment.isPrincipal) ?? options[0]
}

export function getKnownPersonName(email?: string) {
  if (!email) return undefined
  const live = runtime.users.find((user) => user.email.toLowerCase() === email.toLowerCase())
  return live?.name ?? knownPeopleByEmail[email.toLowerCase()]
}

export function getOperationalUserByEmail(email?: string) {
  if (!email) return undefined
  return runtime.users.find((user) => user.email.toLowerCase() === email.toLowerCase())
}

export function assignmentMatchesUser(user: UserScope, assignment: ProcessAssignment) {
  if (!assignment.active) return false
  if (assignment.email) {
    if (assignment.email.toLowerCase() === user.email.toLowerCase()) return true
    if (isDemoUser(user) && assignment.role && migratedRoleMatches(user.role, assignment.role)) return true
    return false
  }
  if (assignment.role && !migratedRoleMatches(user.role, assignment.role)) return false
  if (assignment.local) {
    const locals = [user.local, user.localPrincipal, ...(user.assignedLocals ?? [])].filter(Boolean).map((value) => value!.toLowerCase())
    if (!locals.includes(assignment.local.toLowerCase())) return false
  }
  if (assignment.brand && user.brands?.length && !user.brands.some((brand) => brand.toLowerCase() === assignment.brand?.toLowerCase())) return false
  if (assignment.zone && user.zone && assignment.zone.toLowerCase() !== user.zone.toLowerCase()) return false
  if (assignment.areaFunctional && user.areaFunctional && assignment.areaFunctional.toLowerCase() !== user.areaFunctional.toLowerCase()) return false
  return Boolean(assignment.role || assignment.email)
}

export function getAssignmentVisibleLabel(assignment?: ProcessAssignment) { return assignment?.label ?? assignment?.areaFunctional ?? "Responsable" }
export function getSupplyCatalog() { return demoSupplyCatalog }

function unique(values: string[]) { return Array.from(new Set(values.filter(Boolean))) }
function normalized(value: string) { return value.trim().toLowerCase() }

export function getLocalOptions(user: UserScope, forcedLocal?: string) {
  if (forcedLocal) return { mode: "LOCKED" as const, options: [forcedLocal], selected: forcedLocal }
  const explicit = unique([...(user.assignedLocals ?? []), ...(user.local ? [user.local] : []), ...(user.localPrincipal ? [user.localPrincipal] : [])])
  if (explicit.length === 1) return { mode: "LOCKED" as const, options: explicit, selected: explicit[0] }
  if (explicit.length > 1) return { mode: "SELECT" as const, options: explicit, selected: user.localPrincipal ?? explicit[0] }

  const brandScope = user.scope === "MARCA" || user.role === "GERENCIA_MARCA" || user.role === "JEFATURA_MARCA"
  if (brandScope && user.brands?.length) {
    const brands = user.brands.map(normalized)
    const options = getLocals().filter((local) => local.brands.some((brand) => brands.includes(normalized(brand)))).map((local) => local.name)
    return { mode: options.length > 1 ? ("SELECT" as const) : ("LOCKED" as const), options, selected: options[0] ?? "" }
  }
  if (user.role === "JEFATURA_ZONAL" || user.scope === "ZONA") {
    const options = getLocals().filter((local) => local.operation !== "GEELY" && local.operation !== "STELLANTIS").map((local) => local.name)
    return { mode: "SELECT" as const, options, selected: options[0] ?? "" }
  }
  const redRoles: UserScope["role"][] = ["GERENCIA_VENTAS","GERENCIA_COMERCIAL","GERENCIA_ADMINISTRACION","JEFATURA_COMERCIAL_CLIENTES","JEFATURA_OPERACIONES_COMERCIALES","JEFATURA_ADMINISTRACION","JEFATURA_MARKETING","EXPERIENCIA_CLIENTES", "PROJECT_MANAGER"]
  if (user.scope === "RED" || redRoles.includes(user.role)) {
    const options = getLocals().map((local) => local.name)
    return { mode: "SELECT" as const, options, selected: options[0] ?? "" }
  }
  return { mode: "LOCKED" as const, options: [user.local ?? PILOT_LOCAL], selected: user.local ?? PILOT_LOCAL }
}
