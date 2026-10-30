import type {
  ProcessAssignment,
  ProcessDefinition,
  ProcessFieldDefinition,
  RequestAttachment,
  RequestItem,
  RequestTimelineItem,
  UserScope,
} from "../types"


// ======================================================
// USUARIOS DEMO
// ======================================================

export const mockUsers: UserScope[] = [
  {
    email: "vendedor.demo@ditalcar.cl",
    name: "Vendedor Piloto",
    role: "VENDEDOR",
    local: "Stellantis Nueva Tobalaba",
    localPrincipal: "Stellantis Nueva Tobalaba",
    assignedLocals: ["Stellantis Nueva Tobalaba"],
    brands: ["Jeep", "RAM", "Fiat"],
    scope: "LOCAL",
    active: true,
  },
  {
    email: "jefe.stellantis.nt@ditalcar.cl",
    name: "Jefe Sucursal · Stellantis Nueva Tobalaba",
    role: "JEFATURA_LOCAL",
    local: "Stellantis Nueva Tobalaba",
    localPrincipal: "Stellantis Nueva Tobalaba",
    assignedLocals: ["Stellantis Nueva Tobalaba"],
    brands: ["Jeep", "RAM", "Fiat"],
    scope: "LOCAL",
    active: true,
  },
  {
    email: "gerencia.marca.stellantis@ditalcar.cl",
    name: "Gerencia de Marca · Stellantis",
    role: "GERENCIA_MARCA",
    localPrincipal: "Stellantis Nueva Tobalaba",
    assignedLocals: ["Stellantis Nueva Tobalaba"],
    brands: ["Jeep", "RAM", "Fiat"],
    scope: "MARCA",
    active: true,
  },
  {
    email: "experiencia.clientes@ditalcar.cl",
    name: "Experiencia de Clientes",
    role: "EXPERIENCIA_CLIENTES",
    scope: "RED",
    areaFunctional: "Experiencia de Clientes",
    active: true,
  },
  {
    email: "marketing@ditalcar.cl",
    name: "Equipo de Marketing",
    role: "JEFATURA_MARKETING",
    scope: "RED",
    areaFunctional: "Marketing",
    active: true,
  },
  {
    email: "gerencia.comercial@ditalcar.cl",
    name: "Gerencia Comercial",
    role: "GERENCIA_COMERCIAL",
    scope: "RED",
    areaFunctional: "Comercial",
    active: true,
  },

  // Perfiles antiguos se conservan desactivados únicamente para compatibilidad
  // con datos históricos y reglas todavía no migradas.
  {
    email: "jefatura.marca@ditalcar.cl",
    name: "Jefatura Marca Demo",
    role: "JEFATURA_MARCA",
    brands: ["Geely"],
    active: false,
  },
  {
    email: "jefatura.zonal@ditalcar.cl",
    name: "Jefatura Zonal Demo",
    role: "JEFATURA_ZONAL",
    zone: "Santiago",
    active: false,
  },
  {
    email: "gerencia.ventas@ditalcar.cl",
    name: "Gerencia Ventas Demo",
    role: "GERENCIA_VENTAS",
    active: false,
  },
  {
    email: "comercial.clientes@ditalcar.cl",
    name: "Jefatura Comercial y Clientes",
    role: "JEFATURA_COMERCIAL_CLIENTES",
    active: false,
  },
  {
    email: "project.manager@ditalcar.cl",
    name: "Project Manager Demo",
    role: "EQUIPO_COMERCIAL",
    scope: "RED",
    areaFunctional: "Project Management",
    active: false,
  },
  {
    email: "gerencia.general@ditalcar.cl",
    name: "Gerencia General",
    role: "GERENCIA_GENERAL",
    active: false,
  },
]


// ======================================================
// PERFILES PARA "VER COMO" (SOLO EXPERIENCIA / PILOTO)
// ======================================================

const additionalDemoUsers: UserScope[] = [
  {
    email: "junior.demo@ditalcar.cl",
    name: "Junior Demo",
    role: "ADMINISTRATIVO",
    local: "Stellantis Nueva Tobalaba",
    localPrincipal: "Stellantis Nueva Tobalaba",
    assignedLocals: ["Stellantis Nueva Tobalaba"],
    brands: ["Jeep", "RAM", "Fiat"],
    scope: "LOCAL",
    areaFunctional: "Junior / Operación",
    active: true,
    testingView: true,
  },
  {
    email: "operaciones.comerciales.demo@ditalcar.cl",
    name: "Jefatura Operaciones Comerciales Demo",
    role: "JEFATURA_OPERACIONES_COMERCIALES",
    scope: "RED",
    areaFunctional: "Operaciones Comerciales",
    active: true,
    testingView: true,
  },
  {
    email: "jefatura.administracion.demo@ditalcar.cl",
    name: "Jefatura Administración Demo",
    role: "JEFATURA_ADMINISTRACION",
    scope: "RED",
    areaFunctional: "Administración",
    active: true,
    testingView: true,
  },
  {
    email: "gerencia.administracion.demo@ditalcar.cl",
    name: "Gerencia Administración Demo",
    role: "GERENCIA_ADMINISTRACION",
    scope: "RED",
    areaFunctional: "Administración",
    active: true,
    testingView: true,
  },
  {
    email: "administrativo.demo@ditalcar.cl",
    name: "Administrativo Demo",
    role: "ADMINISTRATIVO",
    scope: "RED",
    areaFunctional: "Administración",
    active: true,
    testingView: true,
  },
]

export const demoViewUsers: UserScope[] = [
  ...mockUsers,
  ...additionalDemoUsers,
].map((user) => ({ ...user, active: true, testingView: true }))


// ======================================================
// PROCESOS
// ======================================================

export const mockProcesses: ProcessDefinition[] = [
  // ------------------------------------------------------
  // UNIDADES
  // ------------------------------------------------------

  {
    code: "UNI-BON-01",
    family: "UNIDADES",
    name: "Bonificación",
    description:
      "Solicitud de bonificación asociada a una operación comercial.",
    active: true,
    order: 1,

    requesterRoles: [
      "VENDEDOR",
      "JEFATURA_LOCAL",
      "JEFATURA_MARCA",
      "JEFATURA_ZONAL",
      "GERENCIA_VENTAS",
    ],

    requiresApproval: true,
    hasManagementStage: true,

    confirmationHours: 48,

    academyEnabled: false,

    internalCheckpoints: [
      {
        id: "BON_SOLICITUD_MARCA",
        label: "Solicitud realizada a marca",
        order: 1,
      },
      {
        id: "BON_FACTURA_RECIBIDA",
        label: "Factura recibida",
        order: 2,
      },
    ],
  },

  {
    code: "UNI-PED-01",
    family: "UNIDADES",
    name: "Creación / Notificación de pedido",
    description:
      "Solicitud asociada a creación o notificación de pedidos de unidades.",
    active: true,
    order: 2,

    requesterRoles: [
      "VENDEDOR",
      "JEFATURA_LOCAL",
      "JEFATURA_MARCA",
      "JEFATURA_ZONAL",
    ],

    requiresApproval: true,
    hasManagementStage: true,

    confirmationHours: 48,

    academyEnabled: false,
  },

  {
    code: "UNI-TRA-01",
    family: "UNIDADES",
    name: "Traslado de unidad",
    description:
      "Solicitud para gestionar el traslado de una unidad.",
    active: true,
    order: 3,

    requesterRoles: [
      "VENDEDOR",
      "JEFATURA_LOCAL",
      "JEFATURA_MARCA",
      "JEFATURA_ZONAL",
    ],

    requiresApproval: true,
    hasManagementStage: true,

    confirmationHours: 48,

    academyEnabled: false,
  },

  {
    code: "UNI-GES-01",
    family: "UNIDADES",
    name: "Gestión de unidad",
    description:
      "Otras gestiones operativas asociadas a una unidad.",
    active: false,
    order: 4,

    requesterRoles: [
      "JEFATURA_LOCAL",
    ],

    requiresApproval: false,
    hasManagementStage: true,

    confirmationHours: 48,

    academyEnabled: false,
  },

  {
    code: "UNI-DEV-WEB-01",
    family: "UNIDADES",
    name: "Devolución Web",
    description:
      "Solicitud de devolución asociada a una reserva o pago web.",
    active: false,
    order: 5,

    requesterRoles: [
      "JEFATURA_LOCAL",
    ],

    requiresApproval: true,
    hasManagementStage: true,

    confirmationHours: 48,

    academyEnabled: false,
  },

  {
    code: "UNI-VUEL-01",
    family: "UNIDADES",
    name: "Vuelto de negocio",
    description:
      "Solicitud de devolución por diferencia entre VPP y pie del negocio.",
    active: false,
    order: 6,

    requesterRoles: [
      "JEFATURA_LOCAL",
    ],

    requiresApproval: true,
    hasManagementStage: true,

    confirmationHours: 48,

    academyEnabled: false,
  },

  {
    code: "UNI-PAT-01",
    family: "UNIDADES",
    name: "Patentes",
    description:
      "Solicitud de patentes para unidades en exhibición o gestión comercial.",
    active: true,
    order: 7,

    requesterRoles: [
      "JEFATURA_LOCAL",
    ],

    requiresApproval: false,
    hasManagementStage: true,

    confirmationHours: 48,

    academyEnabled: false,
  },


  // ------------------------------------------------------
  // INSUMOS Y SHOWROOM
  // ------------------------------------------------------

  {
    code: "INS-PED-01",
    family: "INSUMOS_SHOWROOM",
    name: "Pedido de insumos",
    description:
      "Reposición de insumos operativos para el funcionamiento del local.",
    active: true,
    order: 1,

    requesterRoles: [
      "JEFATURA_LOCAL",
    ],

    requiresApproval: false,
    hasManagementStage: true,

    confirmationHours: 48,

    academyEnabled: false,
  },

  {
    code: "INS-ZEX-01",
    family: "INSUMOS_SHOWROOM",
    name: "Zonas de experiencia",
    description:
      "Necesidades asociadas a zona de café, zona de niños, espera y hospitalidad.",
    active: true,
    order: 2,

    requesterRoles: [
      "JEFATURA_LOCAL",
      "EXPERIENCIA_CLIENTES",
    ],

    requiresApproval: false,
    hasManagementStage: true,

    confirmationHours: 48,

    academyEnabled: false,
  },

  {
    code: "INS-MOB-01",
    family: "INSUMOS_SHOWROOM",
    name: "Mobiliario y equipamiento",
    description:
      "Reposición o necesidad de mobiliario y equipamiento del local.",
    active: true,
    order: 3,

    requesterRoles: [
      "JEFATURA_LOCAL",
      "EXPERIENCIA_CLIENTES",
    ],

    requiresApproval: false,
    hasManagementStage: true,

    confirmationHours: 48,

    academyEnabled: false,
  },

  {
    code: "INS-MAN-01",
    family: "INSUMOS_SHOWROOM",
    name: "Instalaciones y mantención",
    description:
      "Pintura, iluminación, enchufes, puertas, cerraduras, climatización y otras necesidades del local.",
    active: true,
    order: 4,

    requesterRoles: [
      "JEFATURA_LOCAL",
      "EXPERIENCIA_CLIENTES",
    ],

    requiresApproval: false,
    hasManagementStage: true,

    confirmationHours: 48,

    academyEnabled: false,
  },


  // ------------------------------------------------------
  // COLABORADORES
  // ------------------------------------------------------

  {
    code: "COL-CRE-01",
    family: "COLABORADORES",
    name: "Credencial",
    description:
      "Solicitud de creación o reposición de credencial de colaborador.",
    active: true,
    order: 1,

    requesterRoles: [
      "VENDEDOR",
      "JEFATURA_LOCAL",
      "JEFATURA_MARCA",
      "JEFATURA_ZONAL",
      "EXPERIENCIA_CLIENTES",
    ],

    requiresApproval: false,
    hasManagementStage: true,

    confirmationHours: 48,

    academyEnabled: false,
  },

  {
    code: "COL-FIR-01",
    family: "COLABORADORES",
    name: "Pie de firma",
    description:
      "Solicitud de creación o ajuste del pie de firma corporativo.",
    active: true,
    order: 2,

    requesterRoles: [
      "VENDEDOR",
      "JEFATURA_LOCAL",
      "JEFATURA_MARCA",
      "JEFATURA_ZONAL",
      "EXPERIENCIA_CLIENTES",
    ],

    requiresApproval: false,
    hasManagementStage: true,

    confirmationHours: 48,

    academyEnabled: false,
  },


  // ------------------------------------------------------
  // OTROS
  // ------------------------------------------------------

  {
    code: "OTR-GEN-01",
    family: "OTROS",
    name: "Otra solicitud",
    description:
      "Solicitud que no corresponde todavía a un proceso específico.",
    active: true,
    order: 1,

    requesterRoles: [
      "VENDEDOR",
      "JEFATURA_LOCAL",
      "JEFATURA_MARCA",
      "JEFATURA_ZONAL",
      "GERENCIA_VENTAS",
      "JEFATURA_COMERCIAL_CLIENTES",
      "JEFATURA_OPERACIONES_COMERCIALES",
      "JEFATURA_ADMINISTRACION",
      "GERENCIA_ADMINISTRACION",
      "GERENCIA_COMERCIAL",
      "JEFATURA_MARKETING",
      "EXPERIENCIA_CLIENTES",
      "ADMINISTRATIVO",
      "EQUIPO_COMERCIAL",
      "GERENCIA_GENERAL",
    ],

    requiresApproval: false,
    hasManagementStage: true,

    confirmationHours: 48,

    academyEnabled: false,
  },
]


// ======================================================
// CAMPOS DE PROCESO
// ======================================================

export const mockProcessFields: ProcessFieldDefinition[] = [
  // ------------------------------------------------------
  // BONIFICACIÓN
  // ------------------------------------------------------

  {
    id: "BON_NV",
    processCode: "UNI-BON-01",
    label: "Número de venta",
    type: "TEXT",
    required: true,
    adjustable: false,
    order: 1,
    placeholder: "Ej. 66534",
    active: true,
  },

  {
    id: "BON_CLIENTE",
    processCode: "UNI-BON-01",
    label: "Cliente",
    type: "TEXT",
    required: true,
    adjustable: false,
    order: 2,
    placeholder: "Nombre del cliente",
    active: true,
  },

  {
    id: "BON_MARCA",
    processCode: "UNI-BON-01",
    label: "Marca",
    type: "TEXT",
    required: true,
    adjustable: false,
    order: 3,
    placeholder: "Marca",
    active: true,
  },

  {
    id: "BON_MODELO",
    processCode: "UNI-BON-01",
    label: "Modelo",
    type: "TEXT",
    required: true,
    adjustable: false,
    order: 4,
    placeholder: "Modelo",
    active: true,
  },

  {
    id: "BON_MONTO",
    processCode: "UNI-BON-01",
    label: "Monto solicitado",
    type: "CURRENCY",
    required: true,
    adjustable: true,
    order: 5,
    placeholder: "Monto",
    active: true,
  },

  {
    id: "BON_MOTIVO",
    processCode: "UNI-BON-01",
    label: "Motivo",
    type: "TEXTAREA",
    required: true,
    adjustable: false,
    order: 6,
    placeholder:
      "Explica brevemente el motivo de la solicitud.",
    active: true,
  },


  // ------------------------------------------------------
  // CREACIÓN / NOTIFICACIÓN DE PEDIDO
  // ------------------------------------------------------

  {
    id: "PED_NV",
    processCode: "UNI-PED-01",
    label: "Número de venta",
    type: "TEXT",
    required: true,
    adjustable: false,
    order: 1,
    active: true,
  },

  {
    id: "PED_MARCA",
    processCode: "UNI-PED-01",
    label: "Marca",
    type: "TEXT",
    required: true,
    adjustable: false,
    order: 2,
    active: true,
  },

  {
    id: "PED_MODELO",
    processCode: "UNI-PED-01",
    label: "Modelo / versión",
    type: "TEXT",
    required: true,
    adjustable: false,
    order: 3,
    active: true,
  },

  {
    id: "PED_DETALLE",
    processCode: "UNI-PED-01",
    label: "Detalle",
    type: "TEXTAREA",
    required: true,
    adjustable: false,
    order: 4,
    active: true,
  },


  // ------------------------------------------------------
  // TRASLADO
  // ------------------------------------------------------

  {
    id: "TRA_VIN",
    processCode: "UNI-TRA-01",
    label: "VIN / Chasis",
    type: "TEXT",
    required: true,
    adjustable: false,
    order: 1,
    active: true,
  },

  {
    id: "TRA_MARCA",
    processCode: "UNI-TRA-01",
    label: "Marca",
    type: "TEXT",
    required: true,
    adjustable: false,
    order: 2,
    active: true,
  },

  {
    id: "TRA_MODELO",
    processCode: "UNI-TRA-01",
    label: "Modelo",
    type: "TEXT",
    required: true,
    adjustable: false,
    order: 3,
    active: true,
  },

  {
    id: "TRA_ORIGEN",
    processCode: "UNI-TRA-01",
    label: "Local de origen",
    type: "TEXT",
    required: true,
    adjustable: false,
    order: 4,
    active: true,
  },

  {
    id: "TRA_DESTINO",
    processCode: "UNI-TRA-01",
    label: "Local de destino",
    type: "TEXT",
    required: true,
    adjustable: true,
    order: 5,
    active: true,
  },

  {
    id: "TRA_MOTIVO",
    processCode: "UNI-TRA-01",
    label: "Motivo del traslado",
    type: "TEXTAREA",
    required: true,
    adjustable: false,
    order: 6,
    active: true,
  },


  // ------------------------------------------------------
  // PATENTES
  // ------------------------------------------------------

  {
    id: "PAT_MARCA",
    processCode: "UNI-PAT-01",
    label: "Marca",
    type: "TEXT",
    required: true,
    adjustable: false,
    order: 1,
    active: true,
  },

  {
    id: "PAT_CANTIDAD",
    processCode: "UNI-PAT-01",
    label: "Cantidad",
    type: "NUMBER",
    required: true,
    adjustable: true,
    order: 2,
    active: true,
  },

  {
    id: "PAT_MOTIVO",
    processCode: "UNI-PAT-01",
    label: "Motivo de reposición",
    type: "TEXTAREA",
    required: true,
    adjustable: false,
    order: 3,
    active: true,
  },


  // ------------------------------------------------------
  // PEDIDO DE INSUMOS
  // ------------------------------------------------------

  {
    id: "INS_OBSERVACION",
    processCode: "INS-PED-01",
    label: "Observaciones del pedido",
    type: "TEXTAREA",
    required: false,
    adjustable: false,
    order: 1,
    placeholder:
      "Agrega información relevante si es necesario.",
    active: true,
  },


  // ------------------------------------------------------
  // ZONAS DE EXPERIENCIA
  // ------------------------------------------------------

  {
    id: "ZEX_ZONA",
    processCode: "INS-ZEX-01",
    label: "Zona",
    type: "SELECT",
    required: true,
    adjustable: false,
    order: 1,
    options: [
      "Zona de café",
      "Zona de niños",
      "Zona de espera",
      "Otra",
    ],
    active: true,
  },

  {
    id: "ZEX_NECESIDAD",
    processCode: "INS-ZEX-01",
    label: "¿Qué se necesita?",
    type: "TEXTAREA",
    required: true,
    adjustable: false,
    order: 2,
    active: true,
  },


  // ------------------------------------------------------
  // MOBILIARIO
  // ------------------------------------------------------

  {
    id: "MOB_ELEMENTO",
    processCode: "INS-MOB-01",
    label: "Mobiliario o equipamiento",
    type: "TEXT",
    required: true,
    adjustable: false,
    order: 1,
    active: true,
  },

  {
    id: "MOB_DETALLE",
    processCode: "INS-MOB-01",
    label: "Detalle de la necesidad",
    type: "TEXTAREA",
    required: true,
    adjustable: false,
    order: 2,
    active: true,
  },


  // ------------------------------------------------------
  // INSTALACIONES Y MANTENCIÓN
  // ------------------------------------------------------

  {
    id: "MAN_TIPO",
    processCode: "INS-MAN-01",
    label: "Tipo de necesidad",
    type: "SELECT",
    required: true,
    adjustable: false,
    order: 1,
    options: [
      "Iluminación",
      "Pintura",
      "Puerta o cerradura",
      "Enchufe o electricidad",
      "Climatización",
      "Infraestructura",
      "Otra",
    ],
    active: true,
  },

  {
    id: "MAN_DETALLE",
    processCode: "INS-MAN-01",
    label: "Detalle",
    type: "TEXTAREA",
    required: true,
    adjustable: false,
    order: 2,
    active: true,
  },


  // ------------------------------------------------------
  // CREDENCIAL
  // ------------------------------------------------------

  {
    id: "CRE_NOMBRE",
    processCode: "COL-CRE-01",
    label: "Nombre del colaborador",
    type: "TEXT",
    required: true,
    adjustable: false,
    order: 1,
    active: true,
  },

  {
    id: "CRE_CARGO",
    processCode: "COL-CRE-01",
    label: "Cargo",
    type: "TEXT",
    required: true,
    adjustable: false,
    order: 2,
    active: true,
  },

  {
    id: "CRE_LOCAL",
    processCode: "COL-CRE-01",
    label: "Local",
    type: "TEXT",
    required: true,
    adjustable: false,
    order: 3,
    active: true,
  },

  {
    id: "CRE_TIPO",
    processCode: "COL-CRE-01",
    label: "Tipo de solicitud",
    type: "SELECT",
    required: true,
    adjustable: false,
    order: 4,
    options: [
      "Nueva",
      "Reposición",
      "Cambio de cargo",
      "Otro",
    ],
    active: true,
  },


  // ------------------------------------------------------
  // PIE DE FIRMA
  // ------------------------------------------------------

  {
    id: "FIR_NOMBRE",
    processCode: "COL-FIR-01",
    label: "Nombre del colaborador",
    type: "TEXT",
    required: true,
    adjustable: false,
    order: 1,
    active: true,
  },

  {
    id: "FIR_CARGO",
    processCode: "COL-FIR-01",
    label: "Cargo",
    type: "TEXT",
    required: true,
    adjustable: false,
    order: 2,
    active: true,
  },

  {
    id: "FIR_EMAIL",
    processCode: "COL-FIR-01",
    label: "Correo corporativo",
    type: "TEXT",
    required: true,
    adjustable: false,
    order: 3,
    active: true,
  },

  {
    id: "FIR_LOCAL",
    processCode: "COL-FIR-01",
    label: "Local / Área",
    type: "TEXT",
    required: true,
    adjustable: false,
    order: 4,
    active: true,
  },


  // ------------------------------------------------------
  // OTROS
  // ------------------------------------------------------

  {
    id: "OTR_ASUNTO",
    processCode: "OTR-GEN-01",
    label: "Asunto",
    type: "TEXT",
    required: true,
    adjustable: false,
    order: 1,
    active: true,
  },

  {
    id: "OTR_DETALLE",
    processCode: "OTR-GEN-01",
    label: "Detalle de la solicitud",
    type: "TEXTAREA",
    required: true,
    adjustable: false,
    order: 2,
    active: true,
  },
]


// ======================================================
// ASIGNACIONES DE PROCESO
// ======================================================

export const mockProcessAssignments: ProcessAssignment[] = [
  // ------------------------------------------------------
  // BONIFICACIÓN
  // APROBACIÓN Y GESTIÓN:
  // JEFATURA OPERACIONES COMERCIALES
  // ------------------------------------------------------

  {
    id: "BON-APP-OPS",
    processCode: "UNI-BON-01",
    type: "APPROVER",
    role: "JEFATURA_OPERACIONES_COMERCIALES",
    active: true,
  },

  {
    id: "BON-MAN-OPS",
    processCode: "UNI-BON-01",
    type: "MANAGER",
    role: "JEFATURA_OPERACIONES_COMERCIALES",
    active: true,
  },


  // VISIBILIDAD BONIFICACIÓN

  {
    id: "BON-VIEW-COMCLI",
    processCode: "UNI-BON-01",
    type: "VIEWER",
    role: "JEFATURA_COMERCIAL_CLIENTES",
    active: true,
  },

  {
    id: "BON-VIEW-MARCA",
    processCode: "UNI-BON-01",
    type: "VIEWER",
    role: "JEFATURA_MARCA",
    active: true,
  },

  {
    id: "BON-VIEW-ZONAL",
    processCode: "UNI-BON-01",
    type: "VIEWER",
    role: "JEFATURA_ZONAL",
    active: true,
  },

  {
    id: "BON-VIEW-GV",
    processCode: "UNI-BON-01",
    type: "VIEWER",
    role: "GERENCIA_VENTAS",
    active: true,
  },

  {
    id: "BON-VIEW-GC",
    processCode: "UNI-BON-01",
    type: "VIEWER",
    role: "GERENCIA_COMERCIAL",
    active: true,
  },


  // ------------------------------------------------------
  // TRASLADO
  // ------------------------------------------------------

  {
    id: "TRA-APP-OPS",
    processCode: "UNI-TRA-01",
    type: "APPROVER",
    role: "JEFATURA_OPERACIONES_COMERCIALES",
    active: true,
  },

  {
    id: "TRA-MAN-OPS",
    processCode: "UNI-TRA-01",
    type: "MANAGER",
    role: "JEFATURA_OPERACIONES_COMERCIALES",
    active: true,
  },


  // ------------------------------------------------------
  // CREDENCIAL
  // ------------------------------------------------------

  {
    id: "CRE-MAN-CX",
    processCode: "COL-CRE-01",
    type: "MANAGER",
    role: "EXPERIENCIA_CLIENTES",
    active: true,
  },


  // ------------------------------------------------------
  // PIE DE FIRMA
  //
  // Los 2 responsables específicos de Marketing
  // se configurarán por correo en Lists.
  // No inventamos esos correos en el mock.
  // ------------------------------------------------------

  {
    id: "FIR-VIEW-MKT",
    processCode: "COL-FIR-01",
    type: "VIEWER",
    role: "JEFATURA_MARKETING",
    active: true,
  },


  // ------------------------------------------------------
  // GERENCIA GENERAL
  // VISIÓN GENERAL
  // ------------------------------------------------------

  {
    id: "BON-VIEW-GG",
    processCode: "UNI-BON-01",
    type: "VIEWER",
    role: "GERENCIA_GENERAL",
    active: true,
  },

  {
    id: "TRA-VIEW-GG",
    processCode: "UNI-TRA-01",
    type: "VIEWER",
    role: "GERENCIA_GENERAL",
    active: true,
  },

  {
    id: "CRE-VIEW-GG",
    processCode: "COL-CRE-01",
    type: "VIEWER",
    role: "GERENCIA_GENERAL",
    active: true,
  },

  {
    id: "FIR-VIEW-GG",
    processCode: "COL-FIR-01",
    type: "VIEWER",
    role: "GERENCIA_GENERAL",
    active: true,
  },
]


// ======================================================
// SOLICITUDES DEMO
// ======================================================

export const mockRequests: RequestItem[] = [
  {
    id: "PRUEBA-001",
    processCode: "COL-CRE-01",
    processName: "Credencial",
    family: "COLABORADORES",
    requesterEmail: "vendedor.demo@ditalcar.cl",
    requesterName: "Vendedor Piloto",
    requesterRole: "VENDEDOR",
    local: "Stellantis Nueva Tobalaba",
    status: "RECIBIDA",
    currentResponsibleEmail: "experiencia.clientes@ditalcar.cl",
    currentResponsibleName: "Experiencia de Clientes",
    currentResponsibleLabel: "Experiencia de Clientes",
    fields: [
      { fieldId: "COL-CRE-01-NOMBRE_COLABORADOR", requestedValue: "Vendedor Piloto" },
      { fieldId: "COL-CRE-01-CARGO", requestedValue: "Vendedor" },
      { fieldId: "COL-CRE-01-TELEFONO", requestedValue: "+56 9 5555 5555" },
      { fieldId: "COL-CRE-01-EMAIL_CORPORATIVO", requestedValue: "vendedor.demo@ditalcar.cl" },
    ],
    createdAt: "2026-09-21T09:15:00-03:00",
    acceptanceSLAHours: 24,
    acceptanceSLAStartedAt: "2026-09-21T09:15:00-03:00",
    approvalSLAPausedMinutes: 0,
    resolutionSLAPausedMinutes: 0,
    reopened: false,
    autoClosed: false,
    internalCheckpoints: [],
    isTest: true,
  },
  {
    id: "PRUEBA-002",
    processCode: "EXP-SEN-01",
    processName: "Señalizaciones",
    family: "INSUMOS_SHOWROOM",
    requesterEmail: "jefe.stellantis.nt@ditalcar.cl",
    requesterName: "Jefe Sucursal · Stellantis Nueva Tobalaba",
    requesterRole: "JEFATURA_LOCAL",
    local: "Stellantis Nueva Tobalaba",
    status: "EN_GESTION",
    currentResponsibleEmail: "experiencia.clientes@ditalcar.cl",
    currentResponsibleName: "Experiencia de Clientes",
    currentResponsibleLabel: "Experiencia de Clientes",
    managementOwnerEmail: "experiencia.clientes@ditalcar.cl",
    managementOwnerName: "Experiencia de Clientes",
    managementOwnerLabel: "Experiencia de Clientes",
    fields: [
      { fieldId: "EXP-SEN-01-TIPO", requestedValue: "Señalización de atención" },
      { fieldId: "EXP-SEN-01-DESCRIPCION", requestedValue: "Actualizar señalización visible del showroom." },
    ],
    createdAt: "2026-09-20T10:00:00-03:00",
    acceptanceSLAHours: 24,
    acceptanceSLAStartedAt: "2026-09-20T10:00:00-03:00",
    managementAcceptedAt: "2026-09-20T12:10:00-03:00",
    resolutionSLAHours: 72,
    resolutionSLAStartedAt: "2026-09-20T12:10:00-03:00",
    approvalSLAPausedMinutes: 0,
    resolutionSLAPausedMinutes: 0,
    reopened: false,
    autoClosed: false,
    internalCheckpoints: [],
    isTest: true,
  },
  {
    id: "PRUEBA-003",
    processCode: "EXP-ORG-01",
    processName: "Organigrama del local",
    family: "INSUMOS_SHOWROOM",
    requesterEmail: "jefe.stellantis.nt@ditalcar.cl",
    requesterName: "Jefe Sucursal · Stellantis Nueva Tobalaba",
    requesterRole: "JEFATURA_LOCAL",
    local: "Stellantis Nueva Tobalaba",
    status: "INFORMACION_REQUERIDA",
    currentResponsibleEmail: "jefe.stellantis.nt@ditalcar.cl",
    currentResponsibleName: "Jefe Sucursal · Stellantis Nueva Tobalaba",
    currentResponsibleLabel: "Jefatura de Sucursal",
    returnStatusAfterInfo: "EN_GESTION",
    returnResponsibleEmail: "experiencia.clientes@ditalcar.cl",
    returnResponsibleName: "Experiencia de Clientes",
    returnResponsibleLabel: "Experiencia de Clientes",
    managementOwnerEmail: "experiencia.clientes@ditalcar.cl",
    managementOwnerName: "Experiencia de Clientes",
    fields: [
      { fieldId: "EXP-ORG-01-MOTIVO", requestedValue: "Actualizar equipo visible del local" },
    ],
    createdAt: "2026-09-19T15:30:00-03:00",
    acceptanceSLAHours: 24,
    acceptanceSLAStartedAt: "2026-09-19T15:30:00-03:00",
    managementAcceptedAt: "2026-09-19T16:15:00-03:00",
    resolutionSLAHours: 72,
    resolutionSLAStartedAt: "2026-09-19T16:15:00-03:00",
    resolutionSLAPausedAt: "2026-09-20T11:00:00-03:00",
    slaPausedReason: "Falta confirmar nombres y cargos del equipo.",
    approvalSLAPausedMinutes: 0,
    resolutionSLAPausedMinutes: 0,
    reopened: false,
    autoClosed: false,
    internalCheckpoints: [],
    isTest: true,
  },
  {
    id: "PRUEBA-004",
    processCode: "INS-MOB-01",
    processName: "Mobiliario y equipamiento",
    family: "INSUMOS_SHOWROOM",
    requesterEmail: "jefe.stellantis.nt@ditalcar.cl",
    requesterName: "Jefe Sucursal · Stellantis Nueva Tobalaba",
    requesterRole: "JEFATURA_LOCAL",
    local: "Stellantis Nueva Tobalaba",
    status: "PENDIENTE_APROBACION",
    approvalContext: "PRESUPUESTO_COMERCIAL",
    currentResponsibleEmail: "gerencia.comercial@ditalcar.cl",
    currentResponsibleName: "Gerencia Comercial",
    currentResponsibleLabel: "Gerencia Comercial",
    managementOwnerEmail: "experiencia.clientes@ditalcar.cl",
    managementOwnerName: "Experiencia de Clientes",
    managementOwnerLabel: "Experiencia de Clientes",
    fields: [
      { fieldId: "INS-MOB-01-ELEMENTO", requestedValue: "Mueble zona de clientes" },
      { fieldId: "INS-MOB-01-CANTIDAD", requestedValue: "1" },
      { fieldId: "INS-MOB-01-MONTO_REFERENCIAL", requestedValue: "180000" },
    ],
    createdAt: "2026-09-19T09:00:00-03:00",
    acceptanceSLAHours: 24,
    acceptanceSLAStartedAt: "2026-09-19T09:00:00-03:00",
    managementAcceptedAt: "2026-09-19T10:00:00-03:00",
    approvalSLAHours: 24,
    approvalSLAStartedAt: "2026-09-21T09:00:00-03:00",
    approvalSLAPausedMinutes: 0,
    resolutionSLAHours: 120,
    resolutionSLAStartedAt: "2026-09-19T10:00:00-03:00",
    resolutionSLAPausedAt: "2026-09-21T09:00:00-03:00",
    resolutionSLAPausedMinutes: 0,
    slaPausedReason: "Aprobación de presupuesto en curso.",
    reopened: false,
    autoClosed: false,
    internalCheckpoints: [],
    isTest: true,
  },
  {
    id: "PRUEBA-005",
    processCode: "EXP-HOR-01",
    processName: "Horarios de atención",
    family: "INSUMOS_SHOWROOM",
    requesterEmail: "jefe.stellantis.nt@ditalcar.cl",
    requesterName: "Jefe Sucursal · Stellantis Nueva Tobalaba",
    requesterRole: "JEFATURA_LOCAL",
    local: "Stellantis Nueva Tobalaba",
    status: "RESUELTA_POR_CONFIRMAR",
    currentResponsibleEmail: "jefe.stellantis.nt@ditalcar.cl",
    currentResponsibleName: "Jefe Sucursal · Stellantis Nueva Tobalaba",
    currentResponsibleLabel: "Jefatura de Sucursal",
    fields: [
      { fieldId: "EXP-HOR-01-TIPO", requestedValue: "Actualización" },
      { fieldId: "EXP-HOR-01-DETALLE", requestedValue: "Horario actualizado para exhibición." },
    ],
    createdAt: "2026-09-18T10:15:00-03:00",
    acceptanceSLAHours: 24,
    acceptanceSLAStartedAt: "2026-09-18T10:15:00-03:00",
    managementAcceptedAt: "2026-09-18T11:00:00-03:00",
    resolutionSLAHours: 72,
    resolutionSLAStartedAt: "2026-09-18T11:00:00-03:00",
    resolutionConfirmationDeadline: "2026-09-23T12:00:00-03:00",
    approvalSLAPausedMinutes: 0,
    resolutionSLAPausedMinutes: 0,
    reopened: false,
    autoClosed: false,
    internalCheckpoints: [],
    isTest: true,
  },
  {
    id: "PRUEBA-006",
    processCode: "COL-FIR-01",
    processName: "Pie de firma",
    family: "COLABORADORES",
    requesterEmail: "jefe.stellantis.nt@ditalcar.cl",
    requesterName: "Jefe Sucursal · Stellantis Nueva Tobalaba",
    requesterRole: "JEFATURA_LOCAL",
    local: "Stellantis Nueva Tobalaba",
    status: "RESUELTA",
    currentResponsibleEmail: "marketing@ditalcar.cl",
    currentResponsibleName: "Equipo de Marketing",
    currentResponsibleLabel: "Equipo Marketing",
    fields: [
      { fieldId: "COL-FIR-01-NOMBRE_COLABORADOR", requestedValue: "Jefe Sucursal Piloto" },
      { fieldId: "COL-FIR-01-TELEFONO", requestedValue: "+56 9 5555 0000" },
      { fieldId: "COL-FIR-01-EMAIL_CORPORATIVO", requestedValue: "jefe.stellantis.nt@ditalcar.cl" },
    ],
    createdAt: "2026-09-17T09:20:00-03:00",
    acceptanceSLAHours: 24,
    acceptanceSLAStartedAt: "2026-09-17T09:20:00-03:00",
    managementAcceptedAt: "2026-09-17T10:00:00-03:00",
    resolutionSLAHours: 24,
    resolutionSLAStartedAt: "2026-09-17T10:00:00-03:00",
    approvalSLAPausedMinutes: 0,
    resolutionSLAPausedMinutes: 0,
    reopened: false,
    autoClosed: false,
    internalCheckpoints: [],
    isTest: true,
  },
  {
    id: "PRUEBA-007",
    processCode: "INS-MAN-01",
    processName: "Instalaciones y mantención",
    family: "INSUMOS_SHOWROOM",
    requesterEmail: "jefe.stellantis.nt@ditalcar.cl",
    requesterName: "Jefe Sucursal · Stellantis Nueva Tobalaba",
    requesterRole: "JEFATURA_LOCAL",
    local: "Stellantis Nueva Tobalaba",
    status: "EN_GESTION",
    currentResponsibleEmail: "experiencia.clientes@ditalcar.cl",
    currentResponsibleName: "Experiencia de Clientes",
    currentResponsibleLabel: "Experiencia de Clientes",
    managementOwnerEmail: "experiencia.clientes@ditalcar.cl",
    managementOwnerName: "Experiencia de Clientes",
    fields: [
      { fieldId: "INS-MAN-01-TIPO", requestedValue: "Infraestructura" },
      { fieldId: "INS-MAN-01-DESCRIPCION", requestedValue: "Revisión de reparación menor en área visible del showroom." },
    ],
    createdAt: "2026-09-16T08:40:00-03:00",
    acceptanceSLAHours: 24,
    acceptanceSLAStartedAt: "2026-09-16T08:40:00-03:00",
    managementAcceptedAt: "2026-09-16T09:15:00-03:00",
    resolutionSLAHours: 24,
    resolutionSLAStartedAt: "2026-09-16T09:15:00-03:00",
    approvalSLAPausedMinutes: 0,
    resolutionSLAPausedMinutes: 0,
    reopened: false,
    autoClosed: false,
    internalCheckpoints: [],
    isTest: true,
  },
]

// ======================================================
// HISTORIAL DEMO
// ======================================================

export const mockRequestTimeline: RequestTimelineItem[] = [
  {
    id: "SEG-PRUEBA-001",
    requestId: "PRUEBA-001",
    type: "CREATED",
    authorEmail: "vendedor.demo@ditalcar.cl",
    authorName: "Vendedor Piloto",
    createdAt: "2026-09-21T09:15:00-03:00",
    comment: "Solicitud de prueba creada para revisar el estado Nueva.",
  },
  {
    id: "SEG-PRUEBA-002A",
    requestId: "PRUEBA-002",
    type: "CREATED",
    authorEmail: "jefe.stellantis.nt@ditalcar.cl",
    authorName: "Jefe Sucursal · Stellantis Nueva Tobalaba",
    createdAt: "2026-09-20T10:00:00-03:00",
    comment: "Solicitud de prueba creada.",
  },
  {
    id: "SEG-PRUEBA-002B",
    requestId: "PRUEBA-002",
    type: "MANAGEMENT",
    authorEmail: "experiencia.clientes@ditalcar.cl",
    authorName: "Experiencia de Clientes",
    createdAt: "2026-09-20T12:10:00-03:00",
    comment: "Experiencia tomó la gestión de la solicitud.",
  },
  {
    id: "SEG-PRUEBA-003A",
    requestId: "PRUEBA-003",
    type: "INFORMATION_REQUESTED",
    authorEmail: "experiencia.clientes@ditalcar.cl",
    authorName: "Experiencia de Clientes",
    createdAt: "2026-09-20T11:00:00-03:00",
    comment: "Falta confirmar nombres y cargos del equipo antes de preparar el organigrama.",
  },
  {
    id: "SEG-PRUEBA-004A",
    requestId: "PRUEBA-004",
    type: "BUDGET_REQUESTED",
    authorEmail: "experiencia.clientes@ditalcar.cl",
    authorName: "Experiencia de Clientes",
    createdAt: "2026-09-21T09:00:00-03:00",
    comment: "Se solicita aprobación del monto referencial a Gerencia Comercial.",
  },
  {
    id: "SEG-PRUEBA-005A",
    requestId: "PRUEBA-005",
    type: "RESOLUTION_REPORTED",
    authorEmail: "experiencia.clientes@ditalcar.cl",
    authorName: "Experiencia de Clientes",
    createdAt: "2026-09-21T12:00:00-03:00",
    comment: "Horario actualizado. Pendiente confirmación del local.",
  },
  {
    id: "SEG-PRUEBA-006A",
    requestId: "PRUEBA-006",
    type: "RESOLUTION_CONFIRMED",
    authorEmail: "jefe.stellantis.nt@ditalcar.cl",
    authorName: "Jefe Sucursal · Stellantis Nueva Tobalaba",
    createdAt: "2026-09-18T15:00:00-03:00",
    comment: "Pie de firma recibido y confirmado.",
  },
  {
    id: "SEG-PRUEBA-007A",
    requestId: "PRUEBA-007",
    type: "MANAGEMENT",
    authorEmail: "experiencia.clientes@ditalcar.cl",
    authorName: "Experiencia de Clientes",
    createdAt: "2026-09-16T09:15:00-03:00",
    comment: "Caso en gestión para probar señalización de vencido.",
  },
]

// ======================================================
// ADJUNTOS DEMO
// ======================================================

export const mockAttachments: RequestAttachment[] = [
  {
    id: "ADJ-001",
    requestId: "SOL-001",

    fileName:
      "respaldo-bonificacion.pdf",

    stage: "SOLICITUD",

    uploadedByEmail:
      "vendedor.demo@ditalcar.cl",

    uploadedByName:
      "Vendedor Demo",

    uploadedAt:
      "2026-08-31T09:10:00-04:00",
  },
]


// ======================================================
// FORMULARIOS
//
// Estos datos siguen siendo DEMO.
// Los links sí corresponden a los Forms que después
// leeremos desde 12_Formularios.
// ======================================================

export type MockFormDefinition = {
  code: string
  name: string
  description: string
  url: string

  frequency:
    | "SEMANAL"
    | "QUINCENAL"
    | "SEGUN_PLAN"

  roles: string[]

  stellantisOnly: boolean

  active: boolean
}


export const mockForms: MockFormDefinition[] = [
  {
    code: "FOR-RUTA-01",

    name:
      "Ruta de Experiencia",

    description:
      "Revisión semanal de estándares visuales, físicos y operacionales del local.",

    url:
      "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=hSzArnhODUilGQQSUxh3cWkTgPCss7NNnCuYtKwOFnpUOU9OTVQ4RzRQUjQ4UlhRVlQ0UlpCU09EUy4u",

    frequency:
      "SEMANAL",

    roles: [
      "JEFATURA_LOCAL",
    ],

    stellantisOnly:
      false,

    active:
      true,
  },

  {
    code: "FOR-TOUR-STL-01",

    name:
      "Tour del Manager VN · Stellantis",

    description:
      "Revisión quincenal correspondiente a locales Stellantis.",

    url:
      "https://forms.cloud.microsoft/r/nx2f9XGGLg",

    frequency:
      "QUINCENAL",

    roles: [
      "JEFATURA_LOCAL",
    ],

    stellantisOnly:
      true,

    active:
      true,
  },

  {
    code: "FOR-AUD-RUTA-01",

    name:
      "Auditoría Ruta Experiencia",

    description:
      "Auditoría de contraste para revisar la exactitud de la Ruta de Experiencia.",

    url:
      "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=hSzArnhODUilGQQSUxh3cWkTgPCss7NNnCuYtKwOFnpUNk42MEdFVTJHUFlPR0pDUUMyUjJJOVFITi4u",

    frequency:
      "SEGUN_PLAN",

    roles: [
      "EXPERIENCIA_CLIENTES",
      "JEFATURA_COMERCIAL_CLIENTES",
    ],

    stellantisOnly:
      false,

    active:
      true,
  },
]


// ======================================================
// EJECUCIONES DE FORMULARIOS DEMO
// ======================================================

export type MockFormExecution = {
  id: string

  formCode: string

  local: string

  completedByName: string
  completedByEmail: string

  completedAt: string

  compliant: number
  nonCompliant: number
  requested: number
}


export const mockFormExecutions: MockFormExecution[] = [
  {
    id: "EJ-RUTA-001",

    formCode:
      "FOR-RUTA-01",

    local:
      "Vespucio",

    completedByName:
      "Jefatura Local Demo",

    completedByEmail:
      "jefatura.local@ditalcar.cl",

    completedAt:
      "2026-08-27T10:12:00-04:00",

    compliant: 19,
    nonCompliant: 2,
    requested: 1,
  },

  {
    id: "EJ-TOUR-001",

    formCode:
      "FOR-TOUR-STL-01",

    local:
      "Stellantis Costanera",

    completedByName:
      "Jefatura Local Demo",

    completedByEmail:
      "jefatura.local@ditalcar.cl",

    completedAt:
      "2026-08-26T11:20:00-04:00",

    compliant: 25,
    nonCompliant: 3,
    requested: 0,
  },
  {
    id: "EJ-RUTA-STL-001",
    formCode: "FOR-RUTA-01",
    local: "Stellantis Nueva Tobalaba",
    completedByName: "Jefe Sucursal · Stellantis Nueva Tobalaba",
    completedByEmail: "jefe.stellantis.nt@ditalcar.cl",
    completedAt: "2026-09-18T10:35:00-03:00",
    compliant: 18,
    nonCompliant: 4,
    requested: 0,
  }
]


// ======================================================
// BRECHAS DE FORMULARIOS DEMO
// ======================================================

export type MockFormBreach = {
  id: string

  executionId: string
  formCode: string

  local: string

  section: string
  question: string

  status:
    | "NO_CUMPLE"
    | "SOLICITADO"

  mappedProcessCode?: string

  linkedRequestId?: string
}


export const mockFormBreaches: MockFormBreach[] = [
  {
    id: "BRE-RUTA-001",

    executionId:
      "EJ-RUTA-001",

    formCode:
      "FOR-RUTA-01",

    local:
      "Vespucio",

    section:
      "Imagen del equipo",

    question:
      "¿Todos los colaboradores cuentan con su credencial?",

    status:
      "NO_CUMPLE",

    mappedProcessCode:
      "COL-CRE-01",
  },

  {
    id: "BRE-RUTA-002",

    executionId:
      "EJ-RUTA-001",

    formCode:
      "FOR-RUTA-01",

    local:
      "Vespucio",

    section:
      "Zonas de Experiencia",

    question:
      "¿La zona de café se encuentra operativa y correctamente abastecida?",

    status:
      "NO_CUMPLE",

    mappedProcessCode:
      "INS-ZEX-01",
  },

  {
    id: "BRE-RUTA-003",

    executionId:
      "EJ-RUTA-001",

    formCode:
      "FOR-RUTA-01",

    local:
      "Vespucio",

    section:
      "Imagen del equipo",

    question:
      "¿Los colaboradores cuentan con pie de firma corporativo?",

    status:
      "SOLICITADO",

    mappedProcessCode:
      "COL-FIR-01",

    linkedRequestId:
      "SOL-003",
  },
  {
    id: "BRE-RUTA-STL-001",
    executionId: "EJ-RUTA-STL-001",
    formCode: "FOR-RUTA-01",
    local: "Stellantis Nueva Tobalaba",
    section: "Imagen del equipo",
    question: "¿Todos los colaboradores cuentan con su credencial?",
    status: "NO_CUMPLE",
    mappedProcessCode: "COL-CRE-01",
  },
  {
    id: "BRE-RUTA-STL-002",
    executionId: "EJ-RUTA-STL-001",
    formCode: "FOR-RUTA-01",
    local: "Stellantis Nueva Tobalaba",
    section: "Sala de ventas",
    question: "¿Los horarios de atención se encuentran visibles y actualizados?",
    status: "NO_CUMPLE",
    mappedProcessCode: "EXP-HOR-01",
  },
  {
    id: "BRE-RUTA-STL-003",
    executionId: "EJ-RUTA-STL-001",
    formCode: "FOR-RUTA-01",
    local: "Stellantis Nueva Tobalaba",
    section: "Sala de ventas",
    question: "¿El organigrama visible se encuentra actualizado?",
    status: "NO_CUMPLE",
    mappedProcessCode: "EXP-ORG-01",
  },
  {
    id: "BRE-RUTA-STL-004",
    executionId: "EJ-RUTA-STL-001",
    formCode: "FOR-RUTA-01",
    local: "Stellantis Nueva Tobalaba",
    section: "Señalización",
    question: "¿La señalización requerida se encuentra completa y en buen estado?",
    status: "NO_CUMPLE",
    mappedProcessCode: "EXP-SEN-01",
  }
]
