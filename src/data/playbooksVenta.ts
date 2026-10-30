export type VehicleRoute = "NUEVOS" | "USADOS"

export type PlaybookId =
  | "primer-contacto"
  | "orientacion-sugerencia"
  | "entrega"
  | "reclamos"

export type JourneyStageId =
  | "interes"
  | "exploracion"
  | "compra"
  | "relacion"

export type PlaybookSectionId =
  | "momento"
  | "objetivo"
  | "cliente"
  | "conductas"
  | "pasos"
  | "frases"
  | "evitar"
  | "registro"
  | "compromiso"
  | "indicadores"

export type PlaybookSection = {
  id: PlaybookSectionId
  number: number
  title: string
  shortTitle: string
}

export type JourneyStage = {
  id: JourneyStageId
  number: number
  journey: string
  title: string
  description: string
  playbookId?: PlaybookId
  outcome?: boolean
}

export type PlaybookDefinition = {
  id: PlaybookId
  stageId?: JourneyStageId
  eyebrow: string
  title: string
  journeyMoment: string
  objective: string
  intro: string
  transversal?: boolean
  consulta?: boolean
  routeNotes: Record<VehicleRoute, string[]>
}

export const playbookSections: PlaybookSection[] = [
  { id: "momento", number: 1, title: "Momento del viaje del cliente", shortTitle: "Momento" },
  { id: "objetivo", number: 2, title: "Objetivo de la etapa", shortTitle: "Objetivo" },
  { id: "cliente", number: 3, title: "Qué espera o siente el cliente", shortTitle: "Cliente" },
  { id: "conductas", number: 4, title: "Conductas esperadas", shortTitle: "Conductas" },
  { id: "pasos", number: 5, title: "Pasos de atención", shortTitle: "Pasos" },
  { id: "frases", number: 6, title: "Preguntas y frases sugeridas", shortTitle: "Frases" },
  { id: "evitar", number: 7, title: "Qué debe evitarse", shortTitle: "Evitar" },
  { id: "registro", number: 8, title: "Información que debe registrarse", shortTitle: "Registro" },
  { id: "compromiso", number: 9, title: "Próximo compromiso", shortTitle: "Compromiso" },
  { id: "indicadores", number: 10, title: "Errores críticos e indicadores", shortTitle: "Indicadores" },
]

export const journeyStages: JourneyStage[] = [
  {
    id: "interes",
    number: 1,
    journey: "Interés y entrada",
    title: "Primer contacto",
    description: "La experiencia comienza desde el primer acercamiento, presencial o digital.",
    playbookId: "primer-contacto",
  },
  {
    id: "exploracion",
    number: 2,
    journey: "Exploración y comparación",
    title: "Orientación y sugerencia",
    description: "Comprender antes de ofrecer y convertir necesidades en alternativas relevantes.",
    playbookId: "orientacion-sugerencia",
  },
  {
    id: "compra",
    number: 3,
    journey: "Compra confirmada y espera",
    title: "Preparación y entrega",
    description: "Parte desde la confirmación de compra y acompaña hasta una entrega clara y preparada.",
    playbookId: "entrega",
  },
  {
    id: "relacion",
    number: 4,
    journey: "Relación posterior",
    title: "Fidelización y renovación",
    description: "El cierre abre la relación futura: seguimiento, renovación y construcción de cartera.",
    outcome: true,
  },
]

export const playbooks: PlaybookDefinition[] = [
  {
    id: "primer-contacto",
    stageId: "interes",
    eyebrow: "PLAYBOOK 01",
    title: "Primer contacto",
    journeyMoment: "Interés y entrada",
    objective: "Crear una primera experiencia clara, acogedora y capaz de abrir una conversación útil.",
    intro: "Estructura inicial preparada para validar el primer contacto presencial y digital.",
    routeNotes: {
      NUEVOS: [
        "Disponibilidad, versión y alternativas se validarán con información de vehículo nuevo.",
        "La ruta deberá distinguir atención de piso y contacto de lead/digital.",
      ],
      USADOS: [
        "La conversación deberá considerar la unidad específica, condición y antecedentes disponibles.",
        "La información de disponibilidad y documentación cambia respecto de un vehículo nuevo.",
      ],
    },
  },
  {
    id: "orientacion-sugerencia",
    stageId: "exploracion",
    eyebrow: "PLAYBOOK 02",
    title: "Orientación y sugerencia",
    journeyMoment: "Exploración y comparación",
    objective: "Guiar la elección sin imponer, utilizando CONSULTA como lenguaje común de atención.",
    intro: "Este playbook se construirá sobre el modelo CONSULTA y la lógica de diagnóstico, recomendación y siguiente paso.",
    consulta: true,
    routeNotes: {
      NUEVOS: [
        "Comparación de versiones, atributos, financiamiento, disponibilidad y test drive según corresponda.",
        "La recomendación debe mantener trazabilidad entre necesidad, uso y atributo.",
      ],
      USADOS: [
        "La sugerencia debe partir desde unidades efectivamente disponibles y sus condiciones particulares.",
        "Se incorporarán controles y documentación propios de seminuevos/usados.",
      ],
    },
  },
  {
    id: "entrega",
    stageId: "compra",
    eyebrow: "PLAYBOOK 03",
    title: "Preparación y entrega",
    journeyMoment: "Compra confirmada y espera",
    objective: "Acompañar al cliente desde la compra confirmada hasta una entrega preparada, coherente y sin promesas inciertas.",
    intro: "La entrega no comienza el día del retiro: el playbook partirá con la confirmación de compra y el período de espera.",
    routeNotes: {
      NUEVOS: [
        "Seguimiento de preparación, documentación, patente, accesorios y coordinación de entrega.",
        "La promesa al cliente debe basarse únicamente en hitos confirmados.",
      ],
      USADOS: [
        "Se incorporarán controles de condición, preparación, documentación y particularidades de la unidad usada.",
        "La entrega deberá transparentar claramente el estado y antecedentes acordados de la unidad.",
      ],
    },
  },
  {
    id: "reclamos",
    eyebrow: "PLAYBOOK TRANSVERSAL",
    title: "Reclamos y recuperación",
    journeyMoment: "Puede activarse en cualquier momento del viaje",
    objective: "Recuperar la experiencia con escucha, trazabilidad, compromisos claros y seguimiento hasta el cierre.",
    intro: "No pertenece a una sola etapa: puede activarse en primer contacto, orientación, espera, entrega o postventa.",
    transversal: true,
    routeNotes: {
      NUEVOS: [
        "La recuperación debe considerar responsables, promesas y antecedentes propios del proceso de vehículo nuevo.",
        "El playbook mantendrá el mismo estándar de escucha y trazabilidad durante toda la ruta.",
      ],
      USADOS: [
        "Se distinguirán reclamos asociados a condición, antecedentes, preparación o documentación de la unidad usada.",
        "La recuperación seguirá el mismo modelo de compromiso y seguimiento, ajustando la información disponible.",
      ],
    },
  },
]

export const consultaModel = [
  { letter: "C", title: "Conoce antes de ofrecer." },
  { letter: "O", title: "Observa, escucha y confirma." },
  { letter: "N", title: "Convierte necesidades en beneficios." },
  { letter: "S", title: "Sugiere sin imponer." },
  { letter: "U", title: "Usa información clara y transparente." },
  { letter: "L", title: "Limita las promesas a lo confirmado." },
  { letter: "T", title: "Traza el próximo paso." },
  { letter: "A", title: "Acompaña sin abandonar ni saturar." },
]
