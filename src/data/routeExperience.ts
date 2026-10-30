export type RouteAnswerStatus = "CUMPLE" | "NO_CUMPLE" | "SOLICITADO"

export type RouteMappedProcess = {
  code: string
  label: string
}

export type RouteQuestionDefinition = {
  id: string
  section: string
  question: string
  statuses: RouteAnswerStatus[]
  detailLabel?: string
  detailRequiredWhen?: RouteAnswerStatus[]
  evidenceRequired?: boolean
  missingOptions?: string[]
  mappedProcesses?: RouteMappedProcess[]
}

export const routeLocals = [
  "Cantagallo",
  "Chery Norte",
  "Geely Norte",
  "Chery Alameda",
  "Geely Alameda",
  "Stellantis Nueva Tobalaba",
  "KGM-JMC Nueva Tobalaba",
  "Seminuevos Nueva Tobalaba",
  "Chery-MMC Tobalaba",
  "Geely Tobalaba",
  "Chery-Renault Vespucio",
  "Seminuevos Florida",
  "Geely Florida",
  "Chery Florida",
  "Stellantis Costanera",
  "Astara Costanera",
  "Geely Costanera",
]

export const routeQuestions: RouteQuestionDefinition[] = [
  {
    id: "RUTA-SALA-01",
    section: "Sala de Ventas",
    question: "Fachada y sala de ventas limpias, ordenadas y en óptimas condiciones.",
    statuses: ["CUMPLE", "NO_CUMPLE", "SOLICITADO"],
    detailLabel: "Detallar qué falta o qué debe corregirse",
    detailRequiredWhen: ["NO_CUMPLE", "SOLICITADO"],
    mappedProcesses: [{ code: "EXP-OTR-01", label: "Otra solicitud de Experiencia" }],
  },
  {
    id: "RUTA-SALA-02",
    section: "Sala de Ventas",
    question: "Campañas comerciales y material publicitario vigente; material desactualizado retirado de exhibición y correctamente almacenado.",
    statuses: ["CUMPLE", "NO_CUMPLE", "SOLICITADO"],
    detailLabel: "Detallar",
    detailRequiredWhen: ["NO_CUMPLE", "SOLICITADO"],
    mappedProcesses: [{ code: "COM-MAT-01", label: "Materiales de Marketing" }],
  },
  {
    id: "RUTA-SALA-03",
    section: "Sala de Ventas",
    question: "Organigrama y horarios de atención actualizados y exhibidos.",
    statuses: ["CUMPLE", "NO_CUMPLE", "SOLICITADO"],
    detailLabel: "Detallar cambios necesarios",
    detailRequiredWhen: ["NO_CUMPLE", "SOLICITADO"],
    mappedProcesses: [
      { code: "EXP-ORG-01", label: "Organigrama" },
      { code: "EXP-HOR-01", label: "Horarios de atención" },
    ],
  },
  {
    id: "RUTA-EQUIPO-01",
    section: "Imagen del equipo",
    question: "Todo el equipo se presenta con uniforme corporativo completo.",
    statuses: ["CUMPLE", "NO_CUMPLE", "SOLICITADO"],
    detailLabel: "Detallar uniforme faltante",
    detailRequiredWhen: ["NO_CUMPLE", "SOLICITADO"],
    mappedProcesses: [{ code: "COL-UNF-01", label: "Uniformes" }],
  },
  {
    id: "RUTA-EQUIPO-02",
    section: "Imagen del equipo",
    question: "Todo el equipo se presenta con credencial actualizada y visible. Para vendedores con menos de un mes se acepta credencial temporal/genérica.",
    statuses: ["CUMPLE", "NO_CUMPLE", "SOLICITADO"],
    detailLabel: "Detallar credencial faltante o desactualizada",
    detailRequiredWhen: ["NO_CUMPLE", "SOLICITADO"],
    mappedProcesses: [{ code: "COL-CRE-01", label: "Credencial" }],
  },
  {
    id: "RUTA-EQUIPO-03",
    section: "Imagen del equipo",
    question: "Todos los ejecutivos de venta tienen pie de firma actualizado.",
    statuses: ["CUMPLE", "NO_CUMPLE", "SOLICITADO"],
    detailLabel: "Detallar pie de firma faltante o desactualizado",
    detailRequiredWhen: ["NO_CUMPLE", "SOLICITADO"],
    mappedProcesses: [{ code: "COL-FIR-01", label: "Pie de firma" }],
  },
  {
    id: "RUTA-ZONA-01",
    section: "Zonas de Experiencia",
    question: "Zona de café operativa, ordenada y abastecida con los insumos necesarios (café, té, azúcar, endulzante, vasos, revolvedores, cafetera, servilletas, entre otros).",
    statuses: ["CUMPLE", "NO_CUMPLE", "SOLICITADO"],
    detailLabel: "Detallar faltantes en zona de café",
    detailRequiredWhen: ["NO_CUMPLE", "SOLICITADO"],
    evidenceRequired: true,
    mappedProcesses: [{ code: "INS-ZEX-01", label: "Zonas de experiencia" }],
  },
  {
    id: "RUTA-ZONA-02",
    section: "Zonas de Experiencia",
    question: "Zona de niños operativa, ordenada y abastecida con los insumos necesarios (mesa sobre goma EVA, dibujos corporativos, lápices y porta lápiz).",
    statuses: ["CUMPLE", "NO_CUMPLE", "SOLICITADO"],
    detailLabel: "Detallar faltantes en zona de niños",
    detailRequiredWhen: ["NO_CUMPLE", "SOLICITADO"],
    evidenceRequired: true,
    mappedProcesses: [{ code: "INS-ZEX-01", label: "Zonas de experiencia" }],
  },
  {
    id: "RUTA-ATENCION-01",
    section: "Atención y Recepción",
    question: "Basado en la última semana, ningún cliente ha esperado más de 1 minuto en showroom antes de ser saludado.",
    statuses: ["CUMPLE", "NO_CUMPLE"],
    detailLabel: "Observación",
  },
  {
    id: "RUTA-ATENCION-02",
    section: "Atención y Recepción",
    question: "Basado en la última semana, no ha habido ningún reclamo de cliente por la atención de algún vendedor.",
    statuses: ["CUMPLE", "NO_CUMPLE"],
    detailLabel: "Observación",
  },
  {
    id: "RUTA-ATENCION-03",
    section: "Atención y Recepción",
    question: "Basado en la última semana, ningún cliente ha tenido que pedir bebestible; se le ofrece de manera activa.",
    statuses: ["CUMPLE", "NO_CUMPLE"],
    detailLabel: "Observación",
  },
  {
    id: "RUTA-ATENCION-04",
    section: "Atención y Recepción",
    question: "Basado en la última semana, ningún ejecutivo ha pedido ayuda con conocimiento y manejo de situaciones que debería saber realizar por su cuenta.",
    statuses: ["CUMPLE", "NO_CUMPLE"],
    detailLabel: "Observación o necesidad de capacitación",
  },
  {
    id: "RUTA-UNIDADES-01",
    section: "Unidades",
    question: "Están siendo utilizadas las patentes, fichas de eficiencia energética, elementos de seguridad opcionales y fichas de producto.",
    statuses: ["CUMPLE", "NO_CUMPLE", "SOLICITADO"],
    detailLabel: "Detallar faltante, marca y modelo",
    detailRequiredWhen: ["NO_CUMPLE", "SOLICITADO"],
    evidenceRequired: true,
    missingOptions: [
      "Patente",
      "PAI de precio",
      "Eficiencia Energética",
      "Elementos de seguridad opcionales",
      "Logos adhesivos",
      "Ficha de producto",
    ],
    mappedProcesses: [
      { code: "COM-PME-01", label: "Patente de modelo / exhibición" },
      { code: "EXP-FEE-01", label: "Ficha de eficiencia energética" },
      { code: "EXP-SEG-01", label: "Elementos de seguridad opcional" },
      { code: "EXP-OTR-01", label: "Otro faltante de unidad" },
    ],
  },
]

export const routeSections = [...new Set(routeQuestions.map((item) => item.section))]

export const routeLocalBrands: Record<string, string[]> = {
  "Cantagallo": ["Chery", "Mitsubishi", "JMC", "KGM"],
  "Chery Norte": ["Chery"],
  "Geely Norte": ["Geely"],
  "Chery Alameda": ["Chery"],
  "Geely Alameda": ["Geely"],
  "Stellantis Nueva Tobalaba": ["Fiat", "Jeep", "RAM", "Peugeot", "Citroën", "Leapmotor"],
  "KGM-JMC Nueva Tobalaba": ["KGM", "JMC"],
  "Seminuevos Nueva Tobalaba": [],
  "BYD Nueva Tobalaba": ["BYD"],
  "Chery-MMC Tobalaba": ["Chery", "Mitsubishi"],
  "Geely Tobalaba": ["Geely"],
  "Chery-Renault Vespucio": ["Chery", "Renault"],
  "Seminuevos Florida": [],
  "Geely Florida": ["Geely"],
  "Chery Florida": ["Chery"],
  "Stellantis Costanera": ["Fiat", "Jeep", "RAM", "Peugeot", "Citroën", "Leapmotor"],
  "Astara Costanera": ["Chery", "JMC", "Mitsubishi", "Nissan", "KGM"],
  "Geely Costanera": ["Geely"],
}
