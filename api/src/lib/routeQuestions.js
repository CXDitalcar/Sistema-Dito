// Copia en la API de los locales y puntos de la Ruta de Experiencia (fuente: src/data/routeExperience.ts).
// Sirve para la plantilla de históricos y el respaldo. Si cambian las preguntas de la Ruta, actualizar ambos archivos.
const routeLocals = [
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
  "Geely Costanera"
];
const routeQuestions = [
  {
    id: "RUTA-SALA-01",
    section: "Sala de Ventas",
    question: "Fachada y sala de ventas limpias, ordenadas y en \xF3ptimas condiciones.",
    statuses: ["CUMPLE", "NO_CUMPLE", "SOLICITADO"],
    detailLabel: "Detallar qu\xE9 falta o qu\xE9 debe corregirse",
    detailRequiredWhen: ["NO_CUMPLE", "SOLICITADO"],
    mappedProcesses: [{ code: "EXP-OTR-01", label: "Otra solicitud de Experiencia" }]
  },
  {
    id: "RUTA-SALA-02",
    section: "Sala de Ventas",
    question: "Campa\xF1as comerciales y material publicitario vigente; material desactualizado retirado de exhibici\xF3n y correctamente almacenado.",
    statuses: ["CUMPLE", "NO_CUMPLE", "SOLICITADO"],
    detailLabel: "Detallar",
    detailRequiredWhen: ["NO_CUMPLE", "SOLICITADO"],
    mappedProcesses: [{ code: "COM-MAT-01", label: "Materiales de Marketing" }]
  },
  {
    id: "RUTA-SALA-03",
    section: "Sala de Ventas",
    question: "Organigrama y horarios de atenci\xF3n actualizados y exhibidos.",
    statuses: ["CUMPLE", "NO_CUMPLE", "SOLICITADO"],
    detailLabel: "Detallar cambios necesarios",
    detailRequiredWhen: ["NO_CUMPLE", "SOLICITADO"],
    mappedProcesses: [
      { code: "EXP-ORG-01", label: "Organigrama" },
      { code: "EXP-HOR-01", label: "Horarios de atenci\xF3n" }
    ]
  },
  {
    id: "RUTA-EQUIPO-01",
    section: "Imagen del equipo",
    question: "Todo el equipo se presenta con uniforme corporativo completo.",
    statuses: ["CUMPLE", "NO_CUMPLE", "SOLICITADO"],
    detailLabel: "Detallar uniforme faltante",
    detailRequiredWhen: ["NO_CUMPLE", "SOLICITADO"],
    mappedProcesses: [{ code: "COL-UNF-01", label: "Uniformes" }]
  },
  {
    id: "RUTA-EQUIPO-02",
    section: "Imagen del equipo",
    question: "Todo el equipo se presenta con credencial actualizada y visible. Para vendedores con menos de un mes se acepta credencial temporal/gen\xE9rica.",
    statuses: ["CUMPLE", "NO_CUMPLE", "SOLICITADO"],
    detailLabel: "Detallar credencial faltante o desactualizada",
    detailRequiredWhen: ["NO_CUMPLE", "SOLICITADO"],
    mappedProcesses: [{ code: "COL-CRE-01", label: "Credencial" }]
  },
  {
    id: "RUTA-EQUIPO-03",
    section: "Imagen del equipo",
    question: "Todos los ejecutivos de venta tienen pie de firma actualizado.",
    statuses: ["CUMPLE", "NO_CUMPLE", "SOLICITADO"],
    detailLabel: "Detallar pie de firma faltante o desactualizado",
    detailRequiredWhen: ["NO_CUMPLE", "SOLICITADO"],
    mappedProcesses: [{ code: "COL-FIR-01", label: "Pie de firma" }]
  },
  {
    id: "RUTA-ZONA-01",
    section: "Zonas de Experiencia",
    question: "Zona de caf\xE9 operativa, ordenada y abastecida con los insumos necesarios (caf\xE9, t\xE9, az\xFAcar, endulzante, vasos, revolvedores, cafetera, servilletas, entre otros).",
    statuses: ["CUMPLE", "NO_CUMPLE", "SOLICITADO"],
    detailLabel: "Detallar faltantes en zona de caf\xE9",
    detailRequiredWhen: ["NO_CUMPLE", "SOLICITADO"],
    evidenceRequired: true,
    mappedProcesses: [{ code: "INS-ZEX-01", label: "Zonas de experiencia" }]
  },
  {
    id: "RUTA-ZONA-02",
    section: "Zonas de Experiencia",
    question: "Zona de ni\xF1os operativa, ordenada y abastecida con los insumos necesarios (mesa sobre goma EVA, dibujos corporativos, l\xE1pices y porta l\xE1piz).",
    statuses: ["CUMPLE", "NO_CUMPLE", "SOLICITADO"],
    detailLabel: "Detallar faltantes en zona de ni\xF1os",
    detailRequiredWhen: ["NO_CUMPLE", "SOLICITADO"],
    evidenceRequired: true,
    mappedProcesses: [{ code: "INS-ZEX-01", label: "Zonas de experiencia" }]
  },
  {
    id: "RUTA-ATENCION-01",
    section: "Atenci\xF3n y Recepci\xF3n",
    question: "Basado en la \xFAltima semana, ning\xFAn cliente ha esperado m\xE1s de 1 minuto en showroom antes de ser saludado.",
    statuses: ["CUMPLE", "NO_CUMPLE"],
    detailLabel: "Observaci\xF3n"
  },
  {
    id: "RUTA-ATENCION-02",
    section: "Atenci\xF3n y Recepci\xF3n",
    question: "Basado en la \xFAltima semana, no ha habido ning\xFAn reclamo de cliente por la atenci\xF3n de alg\xFAn vendedor.",
    statuses: ["CUMPLE", "NO_CUMPLE"],
    detailLabel: "Observaci\xF3n"
  },
  {
    id: "RUTA-ATENCION-03",
    section: "Atenci\xF3n y Recepci\xF3n",
    question: "Basado en la \xFAltima semana, ning\xFAn cliente ha tenido que pedir bebestible; se le ofrece de manera activa.",
    statuses: ["CUMPLE", "NO_CUMPLE"],
    detailLabel: "Observaci\xF3n"
  },
  {
    id: "RUTA-ATENCION-04",
    section: "Atenci\xF3n y Recepci\xF3n",
    question: "Basado en la \xFAltima semana, ning\xFAn ejecutivo ha pedido ayuda con conocimiento y manejo de situaciones que deber\xEDa saber realizar por su cuenta.",
    statuses: ["CUMPLE", "NO_CUMPLE"],
    detailLabel: "Observaci\xF3n o necesidad de capacitaci\xF3n"
  },
  {
    id: "RUTA-UNIDADES-01",
    section: "Unidades",
    question: "Est\xE1n siendo utilizadas las patentes, fichas de eficiencia energ\xE9tica, elementos de seguridad opcionales y fichas de producto.",
    statuses: ["CUMPLE", "NO_CUMPLE", "SOLICITADO"],
    detailLabel: "Detallar faltante, marca y modelo",
    detailRequiredWhen: ["NO_CUMPLE", "SOLICITADO"],
    evidenceRequired: true,
    missingOptions: [
      "Patente",
      "PAI de precio",
      "Eficiencia Energ\xE9tica",
      "Elementos de seguridad opcionales",
      "Logos adhesivos",
      "Ficha de producto"
    ],
    mappedProcesses: [
      { code: "COM-PME-01", label: "Patente de modelo / exhibici\xF3n" },
      { code: "EXP-FEE-01", label: "Ficha de eficiencia energ\xE9tica" },
      { code: "EXP-SEG-01", label: "Elementos de seguridad opcional" },
      { code: "EXP-OTR-01", label: "Otro faltante de unidad" }
    ]
  }
];
const routeSections = [...new Set(routeQuestions.map((item) => item.section))];
const routeLocalBrands = {
  "Cantagallo": ["Chery", "Mitsubishi", "JMC", "KGM"],
  "Chery Norte": ["Chery"],
  "Geely Norte": ["Geely"],
  "Chery Alameda": ["Chery"],
  "Geely Alameda": ["Geely"],
  "Stellantis Nueva Tobalaba": ["Fiat", "Jeep", "RAM", "Peugeot", "Citro\xEBn", "Leapmotor"],
  "KGM-JMC Nueva Tobalaba": ["KGM", "JMC"],
  "Seminuevos Nueva Tobalaba": [],
  "BYD Nueva Tobalaba": ["BYD"],
  "Chery-MMC Tobalaba": ["Chery", "Mitsubishi"],
  "Geely Tobalaba": ["Geely"],
  "Chery-Renault Vespucio": ["Chery", "Renault"],
  "Seminuevos Florida": [],
  "Geely Florida": ["Geely"],
  "Chery Florida": ["Chery"],
  "Stellantis Costanera": ["Fiat", "Jeep", "RAM", "Peugeot", "Citro\xEBn", "Leapmotor"],
  "Astara Costanera": ["Chery", "JMC", "Mitsubishi", "Nissan", "KGM"],
  "Geely Costanera": ["Geely"]
};
export {
  routeLocalBrands,
  routeLocals,
  routeQuestions,
  routeSections
};
