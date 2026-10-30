import type {
  ProcessAssignment,
  ProcessConfig,
  ProcessFieldDefinition,
  RequestFamily,
  UserRole,
} from "../types"

// ======================================================
// CATÁLOGO DE SOLICITUDES v2 · revisado con Florencia el 08-10-2026
// Se aplica encima de la fuente (LIST 22/23/24 o snapshot requestConfig.ts):
// estas decisiones tienen prioridad hasta que se reflejen en las LIST.
// ======================================================

const ALL_ROLES: UserRole[] = [
  "VENDEDOR", "ASISTENTE_JUNIOR", "JEFATURA_LOCAL", "JEFATURA_MARCA", "JEFATURA_ZONAL", "GERENCIA_MARCA",
  "GERENCIA_VENTAS", "JEFATURA_OPERACIONES_COMERCIALES", "JEFATURA_ADMINISTRACION",
  "GERENCIA_ADMINISTRACION", "GERENCIA_COMERCIAL", "JEFATURA_MARKETING", "EXPERIENCIA_CLIENTES",
  "PROJECT_MANAGER", "ASISTENTE_GERENCIA", "ADMINISTRATIVO", "EQUIPO_COMERCIAL", "GERENCIA_GENERAL",
]

const JEFATURAS_Y_GERENCIAS: UserRole[] = [
  "JEFATURA_LOCAL", "JEFATURA_MARCA", "JEFATURA_ZONAL", "GERENCIA_MARCA", "GERENCIA_VENTAS",
  "JEFATURA_OPERACIONES_COMERCIALES", "JEFATURA_ADMINISTRACION", "GERENCIA_ADMINISTRACION",
  "GERENCIA_COMERCIAL", "JEFATURA_MARKETING",
]

// Horarios, Señalizaciones y Organigrama (mismo formulario y flujo).
const SENALETICA_ROLES: UserRole[] = [
  "VENDEDOR", "ASISTENTE_JUNIOR", "JEFATURA_LOCAL", "GERENCIA_MARCA", "GERENCIA_COMERCIAL",
  "JEFATURA_MARKETING", "EXPERIENCIA_CLIENTES",
]

const DOCUMENTOS_ROLES: UserRole[] = [
  "VENDEDOR", "ASISTENTE_JUNIOR", "JEFATURA_LOCAL", "GERENCIA_MARCA", "GERENCIA_COMERCIAL",
  "EXPERIENCIA_CLIENTES",
]

const MARKETING_ROLES: UserRole[] = [
  ...JEFATURAS_Y_GERENCIAS, "EQUIPO_COMERCIAL", "EXPERIENCIA_CLIENTES", "VENDEDOR", "ASISTENTE_JUNIOR",
]

const PROPUESTA_ROLES: UserRole[] = [
  ...JEFATURAS_Y_GERENCIAS, "EQUIPO_COMERCIAL", "EXPERIENCIA_CLIENTES",
]

const OTRA_ROLES: UserRole[] = [
  "JEFATURA_LOCAL", "GERENCIA_MARCA", "GERENCIA_COMERCIAL", "EXPERIENCIA_CLIENTES",
  "EQUIPO_COMERCIAL", "JEFATURA_MARKETING", "VENDEDOR", "ASISTENTE_JUNIOR",
]

const TIPO_SENALETICA = ["Nuevo", "Actualización", "Reposición"]

type ProcessPatch = Partial<ProcessConfig> & { remove?: boolean }

const PROCESS_PATCHES: Record<string, ProcessPatch> = {
  // ---------- Colaboradores ----------
  "COL-CRE-01": {
    family: "COLABORADORES", requesterRoles: ALL_ROLES, localReviewRule: "SOLO_VENDEDOR",
    slaDays: 5, availability: "ACTIVO", areaLabel: "Experiencia de Clientes",
    description: "Credencial de colaborador. El teléfono es obligatorio.", order: 10,
  },
  "COL-FIR-01": {
    family: "COLABORADORES", requesterRoles: ALL_ROLES, localReviewRule: "SOLO_VENDEDOR",
    slaDays: 5, closeMode: "INSTALADA", availability: "ACTIVO", areaLabel: "Marketing",
    description: "Creación o actualización del pie de firma corporativo. Al recibirlo, marcas que quedó instalado.",
    order: 20,
  },
  "COL-UNF-01": { family: "COLABORADORES", availability: "CONSTRUCCION", order: 30 },
  "COL-TI-01": { family: "COLABORADORES", availability: "CONSTRUCCION", slaDays: 5, order: 40, name: "Habilitación tecnológica de colaborador" },
  "COL-TI-02": { family: "COLABORADORES", availability: "CONSTRUCCION", slaDays: 5, order: 50 },

  // ---------- Experiencia del local ----------
  "EXP-HOR-01": {
    family: "EXPERIENCIA", requesterRoles: SENALETICA_ROLES, localReviewRule: "SOLO_VENDEDOR",
    slaDays: 5, availability: "ACTIVO", order: 10,
    description: "Creación, actualización o reposición del horario de atención del local. El horario lo obtiene Experiencia.",
  },
  "EXP-SEN-01": {
    family: "EXPERIENCIA", requesterRoles: SENALETICA_ROLES, localReviewRule: "SOLO_VENDEDOR",
    slaDays: 5, availability: "ACTIVO", order: 20,
    description: "Creación, actualización o reposición de señalizaciones del local.",
  },
  "EXP-ORG-01": {
    family: "EXPERIENCIA", requesterRoles: SENALETICA_ROLES, localReviewRule: "SOLO_VENDEDOR",
    slaDays: 5, availability: "ACTIVO", order: 30,
    description: "Creación, actualización o reposición del organigrama visible del local.",
  },
  "INS-ZEX-01": {
    family: "EXPERIENCIA", requesterRoles: PROPUESTA_ROLES, localReviewRule: "NUNCA",
    flow: "PROPUESTA", closeMode: "FOTO", slaDays: 14, slaCalendarDays: true, availability: "ACTIVO",
    areaLabel: "Experiencia de Clientes", order: 40,
    formNotice: "El café y los consumibles de la zona de café se piden en Insumos.",
    description: "Zona de café, zona niños, recepción o sala. Experiencia y la Gerencia de Marca acuerdan la propuesta antes de pasar a Gerencia Comercial.",
  },
  "INS-MOB-01": {
    family: "EXPERIENCIA", requesterRoles: PROPUESTA_ROLES, localReviewRule: "NUNCA",
    flow: "PROPUESTA", closeMode: "FOTO", slaDays: 14, slaCalendarDays: true, availability: "ACTIVO",
    areaLabel: "Experiencia de Clientes", order: 50,
    description: "Mobiliario y equipamiento del local. Experiencia y la Gerencia de Marca acuerdan la propuesta antes de pasar a Gerencia Comercial.",
  },
  "INS-MAN-01": {
    family: "EXPERIENCIA", requesterRoles: PROPUESTA_ROLES, localReviewRule: "NUNCA",
    flow: "PROPUESTA", closeMode: "FOTO", slaDays: 14, slaCalendarDays: true, availability: "ACTIVO",
    name: "Instalaciones e infraestructura", areaLabel: "Experiencia de Clientes", order: 60,
    description: "Reparaciones, mantención e infraestructura del local. Experiencia y la Gerencia de Marca acuerdan la propuesta antes de pasar a Gerencia Comercial.",
  },
  "EXP-OTR-01": {
    family: "EXPERIENCIA", requesterRoles: OTRA_ROLES, localReviewRule: "SOLO_VENDEDOR",
    slaDays: 5, slaDefault: true, amountTriggersProposal: true, availability: "ACTIVO", order: 70,
    description: "Necesidades del local que no calzan en otro proceso. Si informas un monto, pasa al flujo con propuesta.",
  },

  // ---------- Marketing ----------
  "COM-PME-01": {
    family: "DOCUMENTACION", requesterRoles: MARKETING_ROLES, localReviewRule: "SOLO_VENDEDOR",
    slaDays: 5, availability: "ACTIVO", areaLabel: "Marketing", order: 15,
    description: "Patente de modelo o de exhibición para el showroom.",
  },
  "COM-MAT-01": {
    family: "COMERCIAL", requesterRoles: MARKETING_ROLES, localReviewRule: "SOLO_VENDEDOR",
    slaDays: 5, availability: "ACTIVO", areaLabel: "Marketing", order: 20,
    description: "Banderas, gráficas, POP, pendones y otros materiales de Marketing.",
  },

  // ---------- Documentación de unidades ----------
  "UNI-DOC-PAI": {
    family: "DOCUMENTACION", requesterRoles: MARKETING_ROLES, localReviewRule: "SOLO_VENDEDOR",
    slaDays: 5, allowsWaitingApproval: true, availability: "ACTIVO", active: true, manualRequest: true,
    name: "PAI / Precio", areaLabel: "Marketing", order: 10,
    description: "PAI de precio por marca para la sala de ventas.",
  },
  "EXP-FEE-01": {
    family: "DOCUMENTACION", requesterRoles: DOCUMENTOS_ROLES, localReviewRule: "SOLO_VENDEDOR",
    slaDays: 5, availability: "ACTIVO", order: 20,
    description: "Fichas de eficiencia energética por modelo.",
  },
  "EXP-SEG-01": {
    family: "DOCUMENTACION", requesterRoles: DOCUMENTOS_ROLES, localReviewRule: "SOLO_VENDEDOR",
    slaDays: 5, availability: "ACTIVO", order: 30,
    description: "Fichas de elementos de seguridad opcional por modelo.",
  },
  "UNI-DOC-FIC": {
    family: "DOCUMENTACION", requesterRoles: DOCUMENTOS_ROLES, localReviewRule: "SOLO_VENDEDOR",
    slaDays: 5, slaDefault: true, availability: "ACTIVO", active: true, manualRequest: true,
    name: "Ficha de producto (impresa)", areaLabel: "Experiencia de Clientes", order: 40,
    description: "Fichas de producto impresas por modelo.",
  },
  "UNI-DOC-EFI": { remove: true },
  "UNI-DOC-SEG": { remove: true },

  // ---------- Eliminados ----------
  "UNI-BON-01": { remove: true },
  "UNI-TRA-01": { remove: true },

  // ---------- Beta de prueba (el flujo oficial sigue por correo) ----------
  "UNI-PED-01": { family: "UNIDADES", availability: "BETA", active: true, name: "Creación / notificación de pedido" },
  "UNI-GES-01": { family: "UNIDADES", availability: "BETA", active: true, name: "Gestión de unidad" },
  "UNI-FAC-01": { family: "UNIDADES", availability: "BETA", active: true, name: "Facturación" },
  "UNI-VUE-01": { family: "UNIDADES", availability: "BETA", active: true },
  "UNI-PAT-01": { family: "UNIDADES", availability: "BETA", active: true },
  "UNI-DEV-01": { family: "UNIDADES", availability: "BETA", active: true, name: "Devolución web" },
  "UNI-USA-01": { family: "UNIDADES", availability: "BETA", active: true },
  "INS-PED-01": { family: "INSUMOS_SHOWROOM", availability: "BETA", active: true, name: "Pedido de insumos · clásico" },
  "INS-200-01": { family: "INSUMOS_SHOWROOM", availability: "BETA", active: true, name: "Reposición de insumos 2.0" },

  // ---------- Oculto (solo Experiencia y PM, "En construcción") ----------
  "OTR-COM-01": { availability: "OCULTO" },
}

// Campos: reemplazos completos por proceso. Se reutilizan los ID existentes cuando el dato es el mismo.
function field(processCode: string, key: string, label: string, type: ProcessFieldDefinition["type"], order: number, extra: Partial<ProcessFieldDefinition> = {}): ProcessFieldDefinition {
  return { id: `${processCode}-${key}`, processCode, key, label, type, order, required: false, adjustable: false, active: true, ...extra }
}

function senaleticaFields(code: string, explicacionKey: string, label: string) {
  return [
    field(code, "TIPO_SOLICITUD", "Tipo de solicitud", "SELECT", 10, { required: true, options: TIPO_SENALETICA }),
    field(code, explicacionKey, label, "TEXTAREA", 20, { required: true }),
  ]
}

function modeloRows(code: string) {
  return [
    field(code, "MODELO", "Modelo", "MODEL_SELECT", 10, {
      required: true, repeatable: true,
      help: "Elige el modelo de la lista de precios. Si no aparece, elige \"Otro\" y escríbelo.",
    }),
    field(code, "CANTIDAD", "Cantidad", "NUMBER", 20, { repeatable: true, placeholder: "Opcional" }),
    field(code, "OBSERVACIONES", "Observaciones", "TEXTAREA", 30),
  ]
}

const FIELD_REPLACEMENTS: Record<string, ProcessFieldDefinition[]> = {
  "EXP-HOR-01": senaleticaFields("EXP-HOR-01", "EXPLICACION", "Explicación / motivo"),
  "EXP-SEN-01": senaleticaFields("EXP-SEN-01", "DETALLE", "¿Qué cambios se requieren o qué está mal?").map((f) =>
    f.key === "TIPO_SOLICITUD" ? { ...f, options: ["Nueva señalización", "Actualización", "Reposición", "Corrección"] } : f
  ),
  "EXP-ORG-01": senaleticaFields("EXP-ORG-01", "CAMBIOS", "¿Qué cambios se requieren o qué está mal?"),
  "EXP-FEE-01": modeloRows("EXP-FEE-01"),
  "EXP-SEG-01": modeloRows("EXP-SEG-01"),
  "UNI-DOC-FIC": modeloRows("UNI-DOC-FIC"),
  "EXP-OTR-01": [
    field("EXP-OTR-01", "DETALLE", "Detalle de la necesidad", "TEXTAREA", 10, { required: true }),
    field("EXP-OTR-01", "PRIORIDAD", "Prioridad", "SELECT", 20, { required: true, options: ["Normal", "Alta", "Crítica / impide operación"] }),
    field("EXP-OTR-01", "MONTO_PRESUPUESTO", "Monto de presupuesto (si existe)", "CURRENCY", 30, {
      help: "Si informas un monto, la solicitud pasa al flujo con propuesta (Experiencia y Gerencia de Marca, luego Gerencia Comercial).",
    }),
  ],
  "COM-PME-01": [
    field("COM-PME-01", "MARCA", "Marca", "BRAND_SELECT", 10, { required: true }),
    field("COM-PME-01", "TIPO_PATENTE", "Tipo de patente", "SELECT", 20, { required: true, options: ["Modelo", "Exhibición"] }),
    field("COM-PME-01", "CANTIDAD", "Cantidad", "NUMBER", 30, { required: true }),
    field("COM-PME-01", "MOTIVO", "Motivo / detalle", "TEXTAREA", 40),
  ],
  "COM-OTR-01": [
    field("COM-OTR-01", "DETALLE", "¿Qué necesitas?", "TEXTAREA", 10, { required: true }),
    field("COM-OTR-01", "MARCA", "Marca (si aplica)", "BRAND_SELECT", 20),
    field("COM-OTR-01", "PRIORIDAD", "Prioridad", "SELECT", 30, { required: true, options: ["Normal", "Alta"] }),
  ],
  "COM-MAT-01": [
    field("COM-MAT-01", "TIPO_MATERIAL", "Tipo de material", "SELECT", 10, { required: true, options: ["Bandera", "Gráfica", "POP", "Pendón", "Otro"] }),
    field("COM-MAT-01", "MARCA", "Marca", "BRAND_SELECT", 20),
    field("COM-MAT-01", "CANTIDAD", "Cantidad", "NUMBER", 30, { required: true }),
    field("COM-MAT-01", "MOTIVO", "Motivo", "TEXTAREA", 40),
    field("COM-MAT-01", "ESPECIFICACION", "Especificación / medida", "TEXTAREA", 50),
  ],
  "UNI-DOC-PAI": [
    field("UNI-DOC-PAI", "MARCA", "Marca", "BRAND_SELECT", 10, { required: true }),
    field("UNI-DOC-PAI", "MOTIVO", "Motivo / detalle", "TEXTAREA", 20),
  ],
}

// Ajustes puntuales sobre campos existentes.
const FIELD_PATCHES: Record<string, Partial<ProcessFieldDefinition> & { remove?: boolean }> = {
  "COL-CRE-01-REQUIERE_QR": { remove: true }, // Experiencia decide internamente si lleva QR.
  "COL-CRE-01-TELEFONO": { required: true, help: "Siempre obligatorio." },
}

// Responsables de Marketing (mismos de Patente) para PAI.
function marketingManagers(processCode: string, base: ProcessAssignment[]): ProcessAssignment[] {
  return base
    .filter((a) => a.processCode === "COM-PME-01" && a.type === "MANAGER")
    .map((a, index) => ({ ...a, id: `V2-${processCode}-MGR-${index + 1}`, processCode }))
}

function experienceManager(processCode: string): ProcessAssignment {
  return {
    id: `V2-${processCode}-EXP`, processCode, type: "MANAGER", mode: "ROL",
    role: "EXPERIENCIA_CLIENTES", areaFunctional: "Experiencia de Clientes", label: "Experiencia de Clientes",
    scope: "PROCESO", condition: "SIEMPRE", priority: 10, isPrincipal: true, active: true,
  }
}

const REMOVED_ROLE: UserRole = "JEFATURA_COMERCIAL_CLIENTES"

// Procesos nuevos que aún no existen en la LIST 22_Procesos.
const EXTRA_PROCESSES: ProcessConfig[] = [
  {
    code: "COM-OTR-01",
    name: "Otra solicitud de Marketing",
    family: "COMERCIAL",
    description: "Necesidades de Marketing que no son banderas ni materiales.",
    formMode: "DINAMICO",
    requesterRoles: MARKETING_ROLES,
    localReviewRule: "SOLO_VENDEDOR",
    allowsAmountAdjustment: false,
    allowsAttachments: true,
    requiresAttachment: false,
    manualRequest: true,
    fromBreach: false,
    areaLabel: "Marketing",
    confirmationHours: 48,
    version: 1,
    order: 30,
    active: true,
    availability: "ACTIVO",
    slaDays: 5,
    slaDefault: true,
  },
]

export function applyCatalogV2(source: {
  processes: ProcessConfig[]
  fields: ProcessFieldDefinition[]
  assignments: ProcessAssignment[]
}) {
  const removed = new Set(Object.entries(PROCESS_PATCHES).filter(([, p]) => p.remove).map(([code]) => code))

  const processes = [...source.processes, ...EXTRA_PROCESSES.filter((extra) => !source.processes.some((p) => p.code === extra.code))]
    .filter((p) => !removed.has(p.code))
    .map((p) => {
      const { remove: _remove, ...patch } = PROCESS_PATCHES[p.code] ?? {}
      const next: ProcessConfig = { availability: "ACTIVO", flow: "ESTANDAR", closeMode: "CONFIRMAR", ...p, ...patch }
      next.requesterRoles = (next.requesterRoles || []).filter((role) => role !== REMOVED_ROLE)
      if (next.availability === "BETA" || next.availability === "CONSTRUCCION" || next.availability === "OCULTO") {
        next.active = true
      }
      return next
    })

  const replaced = new Set(Object.keys(FIELD_REPLACEMENTS))
  const fields = [
    ...source.fields
      .filter((f) => !removed.has(f.processCode) && !replaced.has(f.processCode))
      .filter((f) => !FIELD_PATCHES[f.id]?.remove)
      .map((f) => {
        const { remove: _remove, ...patch } = FIELD_PATCHES[f.id] ?? {}
        return { ...f, ...patch }
      }),
    ...Object.values(FIELD_REPLACEMENTS).flat(),
  ]

  const base = source.assignments.filter((a) => !removed.has(a.processCode))
  const assignments = [
    ...base
      // Jefatura Comercial y Clientes ya no existe; Gerencia Comercial deja de ser observadora
      // (solo ve lo que se le envía a aprobación). Se quitan aprobadores que hoy resuelve el flujo.
      .filter((a) => a.role !== REMOVED_ROLE)
      .filter((a) => !(a.type === "VIEWER" && a.role === "GERENCIA_COMERCIAL"))
      .filter((a) => !(a.type === "APPROVER" && ["INS-MOB-01", "INS-MAN-01", "COM-PME-01", "COM-MAT-01"].includes(a.processCode))),
    ...marketingManagers("UNI-DOC-PAI", base),
    ...marketingManagers("COM-OTR-01", base),
    experienceManager("UNI-DOC-FIC"),
  ]
  // Procesos de Experiencia sin responsable configurado (por ejemplo INS-ZEX en la LIST): Experiencia.
  for (const process of processes) {
    if (process.areaLabel === "Experiencia de Clientes" && !assignments.some((a) => a.processCode === process.code && a.type === "MANAGER")) {
      assignments.push(experienceManager(process.code))
    }
  }

  return { processes, fields, assignments }
}

export const FAMILY_ORDER: RequestFamily[] = [
  "COLABORADORES", "EXPERIENCIA", "COMERCIAL", "DOCUMENTACION", "UNIDADES", "INSUMOS_SHOWROOM", "OTROS",
]
