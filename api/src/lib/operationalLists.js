import { getAppConfig, setAppConfig } from "./store.js"
import { readNamedList } from "./graphLists.js"

const CACHE_KEY = "OPERATIONS_CATALOG_CACHE"
const MEMORY_TTL_MS = 60_000
let memory = null

const VALID_ROLES = new Set([
  "VENDEDOR","JEFATURA_LOCAL","JEFATURA_MARCA","JEFATURA_ZONAL","GERENCIA_MARCA",
  "GERENCIA_VENTAS","JEFATURA_COMERCIAL_CLIENTES","JEFATURA_OPERACIONES_COMERCIALES",
  "JEFATURA_ADMINISTRACION","GERENCIA_ADMINISTRACION","GERENCIA_COMERCIAL",
  "JEFATURA_MARKETING","EXPERIENCIA_CLIENTES","PROJECT_MANAGER","ASISTENTE_GERENCIA","ASISTENTE_JUNIOR","ADMINISTRATIVO","EQUIPO_COMERCIAL","GERENCIA_GENERAL"
])

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
}

function pick(fields, aliases) {
  for (const [key, value] of Object.entries(fields || {})) {
    if (aliases.some((alias) => normalize(alias) === normalize(key))) return value
  }
  return undefined
}

function text(value, fallback = "") {
  if (value === undefined || value === null) return fallback
  return String(value).trim()
}

function bool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  return ["1","true","si","sí","yes","activo","vigente","x"].includes(String(value).trim().toLowerCase())
}

function number(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(",", "."))
  return Number.isFinite(parsed) ? parsed : fallback
}

function split(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean)
  return text(value).split(/[;,|]/).map((item) => item.trim()).filter(Boolean)
}

function role(value) {
  const upper = text(value).toUpperCase().replace(/[\s-]+/g, "_")
  if (upper === "JEFATURA_COMERCIAL_CLIENTES") return "GERENCIA_MARCA"
  return VALID_ROLES.has(upper) ? upper : undefined
}

function enumValue(value, allowed, fallback) {
  const raw = text(value).toUpperCase().replace(/[\s-]+/g, "_")
  return allowed.includes(raw) ? raw : fallback
}

function processFromRow(row, index) {
  const f = row.fields || {}
  const code = text(pick(f, ["CodigoProceso","CódigoProceso","ProcesoCodigo","Código","Codigo","Code","Title"]))
  if (!code) return null
  const requesterRoles = split(pick(f, ["RolesSolicitantes","RequesterRoles","Roles","Solicitantes"]))
    .map(role).filter(Boolean)
  return {
    code,
    name: text(pick(f, ["NombreProceso","Nombre","Proceso","Name","Title"]), code),
    family: enumValue(pick(f, ["Familia","Family"]), ["UNIDADES","INSUMOS_SHOWROOM","COLABORADORES","COMERCIAL","OTROS"], "OTROS"),
    description: text(pick(f, ["Descripcion","Descripción","Description"])),
    formMode: enumValue(pick(f, ["ModoFormulario","FormMode","Formulario"]), ["DINAMICO","INSUMOS_CLASICO","INSUMOS_2_0"], "DINAMICO"),
    requesterRoles: requesterRoles.length ? requesterRoles : ["EXPERIENCIA_CLIENTES"],
    localReviewRule: enumValue(pick(f, ["ReglaRevisionLocal","RequiereRevisionLocal","RevisiónLocal","RevisionLocal","LocalReviewRule"]), ["NUNCA","SOLO_VENDEDOR","SIEMPRE"], "NUNCA"),
    localRule: text(pick(f, ["ReglaLocal","LocalRule"])) || undefined,
    allowsAmountAdjustment: bool(pick(f, ["PermiteAjusteMonto","AllowsAmountAdjustment","AjusteMonto"]), false),
    allowsAttachments: bool(pick(f, ["PermiteAdjuntos","AllowsAttachments","Adjuntos"]), true),
    requiresAttachment: bool(pick(f, ["RequiereAdjunto","RequiresAttachment"]), false),
    manualRequest: bool(pick(f, ["SolicitudManual","PermiteSolicitudManual","ManualRequest","VisibleSolicitudManual"]), true),
    fromBreach: bool(pick(f, ["DesdeBrecha","PermiteDesdeBrecha","FromBreach","RutaExperiencia"]), false),
    areaLabel: text(pick(f, ["AreaResponsable","ÁreaResponsable","AreaResponsableBase","AreaLabel","Área","Area"])) || undefined,
    approvalRule: text(pick(f, ["ReglaAprobacion","ReglaAprobación","ReglaAprobacionAdicional","ApprovalRule"])) || undefined,
    slaReviewCode: text(pick(f, ["SLARevisionCodigo","SLARevisiónCodigo","SLAReviewCode","SLAAprobacionCodigo","SLARevisionLocalCodigo"])) || undefined,
    slaAcceptanceCode: text(pick(f, ["SLATomaCodigo","SLATomaGestionCodigo","SLAAceptacionCodigo","SLAAceptaciónCodigo","SLAAcceptanceCode"])) || undefined,
    slaResolutionCode: text(pick(f, ["SLAResolucionCodigo","SLAResoluciónCodigo","SLAResolutionCode"])) || undefined,
    slaConfirmationCode: text(pick(f, ["SLAConfirmacionCodigo","SLAConfirmaciónCodigo","SLAConfirmationCode"])) || undefined,
    confirmationHours: number(pick(f, ["HorasConfirmacion","HorasConfirmación","ConfirmacionHorasFallback","ConfirmationHours"]), 48),
    version: number(pick(f, ["Version","Versión"]), 1),
    order: number(pick(f, ["Orden","Order"]), (index + 1) * 10),
    active: bool(pick(f, ["Activo","Active","Vigente"]), true),
    notes: text(pick(f, ["Notas","Observaciones","Notes"])) || undefined,
  }
}

function fieldFromRow(row, index) {
  const f = row.fields || {}
  const processCode = text(pick(f, ["ProcesoCodigo","CódigoProceso","CodigoProceso","ProcessCode"]))
  const id = text(pick(f, ["CampoID","CampoId","IDCampo","CodigoCampo","CódigoCampo","FieldId","Title"]))
  if (!processCode || !id) return null
  return {
    id,
    processCode,
    key: text(pick(f, ["Clave","ClaveCampo","Key","CampoKey"])) || undefined,
    label: text(pick(f, ["Etiqueta","Label","NombreCampo","Nombre","Title"]), id),
    type: enumValue(pick(f, ["TipoCampo","Tipo","Type"]), ["TEXT","TEXTAREA","NUMBER","CURRENCY","DATE","SELECT","BOOLEAN","FILE","PHONE","EMAIL","VIN","LOCAL_SELECT","CALCULATED_CURRENCY","INTERNAL_NUMBER","INTERNAL_TEXT","CATALOG_ITEM"], "TEXT"),
    required: bool(pick(f, ["Obligatorio","Required"]), false),
    adjustable: bool(pick(f, ["Ajustable","AjustableAprobacion","AjustableAprobación","Adjustable"]), false),
    order: number(pick(f, ["Orden","Order"]), (index + 1) * 10),
    placeholder: text(pick(f, ["Placeholder","Ejemplo","TextoAyudaCorto"])) || undefined,
    help: text(pick(f, ["Ayuda","Help","Descripcion","Descripción"])) || undefined,
    exampleImage: text(pick(f, ["ImagenEjemplo","ExampleImage"])) || undefined,
    exampleCaption: text(pick(f, ["PieImagenEjemplo","ExampleCaption"])) || undefined,
    options: split(pick(f, ["Opciones","Options","Valores"])),
    source: text(pick(f, ["Fuente","Source"])) || undefined,
    readOnly: bool(pick(f, ["SoloLectura","ReadOnly"]), false),
    visibleBeforeSubmit: bool(pick(f, ["VisibleAntesEnviar","VisibleSolicitanteAntes","VisibleBeforeSubmit"]), true),
    visibleAfterSubmit: bool(pick(f, ["VisibleDespuesEnviar","VisibleDespuésEnviar","VisibleSolicitanteDespues","VisibleSolicitanteDespués","VisibleAfterSubmit"]), true),
    visibleManager: bool(pick(f, ["VisibleGestor","VisibleManager"]), true),
    isAmount: bool(pick(f, ["EsMonto","IsAmount"]), false),
    group: text(pick(f, ["Grupo","Group"])) || undefined,
    repeatable: bool(pick(f, ["Repetible","Repeatable"]), false),
    validation: text(pick(f, ["Validacion","Validación","Validation"])) || undefined,
    unit: text(pick(f, ["Unidad","Unit"])) || undefined,
    formula: text(pick(f, ["Formula","Fórmula"])) || undefined,
    snapshot: bool(pick(f, ["Snapshot","GuardarSnapshot"]), false),
    historical: bool(pick(f, ["Historico","Histórico","RegistrarHistorico","RegistrarHistórico","Historical"]), false),
    allowPostComment: bool(pick(f, ["PermiteComentarioPosterior","AllowPostComment"]), false),
    active: bool(pick(f, ["Activo","Active","Vigente"]), true),
    notes: text(pick(f, ["Notas","Observaciones","Notes"])) || undefined,
  }
}

function assignmentFromRow(row, index) {
  const f = row.fields || {}
  const processCode = text(pick(f, ["ProcesoCodigo","CódigoProceso","CodigoProceso","ProcessCode"]))
  const type = enumValue(pick(f, ["TipoAsignacion","TipoAsignación","Tipo","AssignmentType"]), ["APPROVER","MANAGER","VIEWER"], "MANAGER")
  if (!processCode) return null
  const email = text(pick(f, ["Email","Correo","ResponsableEmail"])) || undefined
  const configuredRole = role(pick(f, ["Rol","RolApp","Role"]))
  return {
    id: text(pick(f, ["AsignacionID","AsignaciónID","IDAsignacion","Id","Title"]), `${processCode}-${type}-${index + 1}`),
    processCode,
    type,
    mode: enumValue(pick(f, ["Modo","ModoAsignacion","ModoAsignación","Mode"]), ["ROL","EMAIL"], email ? "EMAIL" : "ROL"),
    email,
    role: configuredRole,
    local: text(pick(f, ["Local","Sucursal"])) || undefined,
    zone: text(pick(f, ["Zona","Zone"])) || undefined,
    brand: text(pick(f, ["Marca","Brand"])) || undefined,
    areaFunctional: text(pick(f, ["AreaFuncional","ÁreaFuncional","Area","Área"])) || undefined,
    label: text(pick(f, ["Etiqueta","EtiquetaVisible","Label","NombreResponsable","Responsable"])) || undefined,
    scope: text(pick(f, ["Alcance","Scope"])) || undefined,
    condition: text(pick(f, ["Condicion","Condición","Condition"])) || undefined,
    priority: number(pick(f, ["Prioridad","Priority"]), 999),
    isPrincipal: bool(pick(f, ["Principal","EsPrincipal","IsPrincipal"]), false),
    active: bool(pick(f, ["Activo","Active","Vigente"]), true),
  }
}

function listNames() {
  return {
    // 22_Procesos es la fuente maestra del catálogo y de los códigos SLA por etapa.
    processes: [process.env.SHAREPOINT_PROCESSES_LIST || "22_Procesos"],
    fields: [process.env.SHAREPOINT_PROCESS_FIELDS_LIST || "23_CamposProceso"],
    // Se mantiene el alias histórico sólo como compatibilidad transitoria.
    assignments: [process.env.SHAREPOINT_PROCESS_ASSIGNMENTS_LIST || "24_AsignacionesProceso", "11_AsignacionesProceso"],
  }
}

async function liveCatalog() {
  const names = listNames()
  const [processRows, fieldRows, assignmentRows] = await Promise.all([
    readNamedList(names.processes),
    readNamedList(names.fields),
    readNamedList(names.assignments),
  ])
  const processes = processRows.items.map(processFromRow).filter(Boolean)
  const fields = fieldRows.items.map(fieldFromRow).filter(Boolean)
  const assignments = assignmentRows.items.map(assignmentFromRow).filter(Boolean)
  if (!processes.length) throw new Error(`${processRows.listName} no contiene procesos reconocibles.`)
  return {
    processes,
    fields,
    assignments,
    meta: {
      source: "SHAREPOINT_LIST",
      checkedAt: new Date().toISOString(),
      lists: {
        processes: processRows.listName,
        fields: fieldRows.listName,
        assignments: assignmentRows.listName,
      },
      counts: { processes: processes.length, fields: fields.length, assignments: assignments.length },
    },
  }
}

async function storedCache() {
  const entity = await getAppConfig(CACHE_KEY)
  if (!entity?.value) return null
  try { return JSON.parse(String(entity.value)) } catch { return null }
}

export async function getOperationalCatalog({ force = false } = {}) {
  if (!force && memory && Date.now() - memory.loadedAt < MEMORY_TTL_MS) return memory.value
  try {
    const live = await liveCatalog()
    await setAppConfig(CACHE_KEY, JSON.stringify(live), { source: "SHAREPOINT_LIST" }).catch(() => {})
    memory = { loadedAt: Date.now(), value: live }
    return live
  } catch (error) {
    const cached = await storedCache().catch(() => null)
    if (cached?.processes?.length) {
      const value = {
        ...cached,
        meta: {
          ...(cached.meta || {}),
          source: "CACHE",
          checkedAt: new Date().toISOString(),
          warning: error?.message || "No fue posible actualizar las LIST operativas.",
        },
      }
      memory = { loadedAt: Date.now(), value }
      return value
    }
    return {
      processes: [], fields: [], assignments: [],
      meta: {
        source: "FALLBACK",
        checkedAt: new Date().toISOString(),
        warning: error?.message || "LIST operativas no disponibles.",
        lists: {
          processes: listNames().processes[0] || "22_Procesos",
          fields: listNames().fields[0] || "23_CamposProceso",
          assignments: listNames().assignments[0] || "24_AsignacionesProceso",
        },
        counts: { processes: 0, fields: 0, assignments: 0 },
      },
    }
  }
}
