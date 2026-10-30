export type AcademyTab =
  | "MODELO"
  | "PLAYBOOKS"
  | "CURSOS"
  | "EVALUACIONES"
  | "BIBLIOTECA"

export type AcademyAudience =
  | "VENTAS"
  | "JEFATURA"
  | "GERENCIA_MARCA"
  | "GERENCIA_VENTAS"
  | "JUNIOR"
  | "EXPERIENCIA"
  | "CASA_MATRIZ"

export type AcademyContentStatus =
  | "BORRADOR"
  | "PILOTO"
  | "PUBLICADO"
  | "ARCHIVADO"

export type ConsultaDetail = {
  code: string
  title: string
  principle: string
  meaning: string
  why: string
  behaviors: string[]
  signals: string[]
  avoid: string[]
  questions: string[]
  example: string
  indicators: string[]
  sellerLens: string
  managerLens: string
  managementLens: string
  relatedPlaybooks: string[]
}

export const consultaDetailed: ConsultaDetail[] = [
  {
    code: "C",
    title: "Conoce antes de ofrecer",
    principle: "Usa lo que ya sabes y completa solo lo que falta.",
    meaning:
      "La atención consultiva parte antes de recomendar un vehículo. El vendedor debe revisar el origen del lead, modelo consultado, antecedentes disponibles y cualquier interacción previa para no obligar al cliente a comenzar de cero.",
    why:
      "Cuando Ditalcar reconoce el contexto previo, la experiencia se siente continua y profesional. Además, permite dedicar la conversación a comprender necesidades reales en vez de repetir datos administrativos.",
    behaviors: [
      "Revisar origen del contacto, modelo consultado y datos disponibles antes de responder.",
      "Confirmar antecedentes existentes en vez de volver a preguntar todo.",
      "Distinguir claramente qué información ya está validada y qué falta conocer.",
      "Conocer producto, condiciones y disponibilidad antes de afirmarlas.",
      "Usar la información de Pilot como contexto cuando esté disponible, sin duplicar la gestión del CRM.",
    ],
    signals: [
      "El cliente percibe continuidad entre web, teléfono, WhatsApp y sala.",
      "Las primeras preguntas parten desde lo que ya sabemos.",
      "La recomendación no nace de la unidad que conviene vender, sino del contexto del cliente.",
    ],
    avoid: [
      "Preguntar '¿qué auto buscas?' cuando el lead ya identifica un modelo.",
      "Ofrecer una unidad antes de comprender el uso.",
      "Repetir datos personales que ya están registrados.",
      "Afirmar disponibilidad, bonos o fechas sin validación.",
    ],
    questions: [
      "Vi que estabas revisando este modelo. ¿Qué fue lo que más te llamó la atención?",
      "Antes de mostrarte alternativas, ¿qué necesitas principalmente del vehículo?",
      "¿Hay algo de la información que ya recibiste que quieras que aclaremos primero?",
    ],
    example:
      "Vi que estabas revisando el C10 y que consultaste por financiamiento. Antes de recomendarte una versión, quisiera entender qué necesitas principalmente del vehículo.",
    indicators: [
      "% de contactos con antecedentes previos utilizados.",
      "% de oportunidades con datos mínimos completos.",
      "Brechas por duplicidad o información contradictoria.",
    ],
    sellerLens:
      "Antes de contactar, revisa el lead y prepara la conversación. No uses el CRM como una lista de datos: úsalo como contexto.",
    managerLens:
      "Observar si el vendedor utiliza la información existente antes de iniciar el diagnóstico.",
    managementLens:
      "Revisar consistencia entre lead, diagnóstico, cotización y alternativa recomendada por los equipos.",
    relatedPlaybooks: ["Primer contacto", "Orientación y sugerencia"],
  },
  {
    code: "O",
    title: "Observa, escucha y confirma",
    principle: "Entiende antes de concluir.",
    meaning:
      "La exploración no es un cuestionario rígido. Se busca comprender uso, significado, condiciones y momento de compra, escuchando las respuestas completas y validando lo entendido antes de avanzar.",
    why:
      "Una necesidad mal entendida genera recomendaciones genéricas, objeciones innecesarias y una experiencia centrada en producto en vez de cliente.",
    behaviors: [
      "Hacer preguntas abiertas y profundizar según la respuesta.",
      "Escuchar sin interrumpir para hablar de producto.",
      "Detectar prioridades: seguridad, espacio, consumo, comodidad, trabajo, imagen, tecnología u otras.",
      "Observar dudas, entusiasmo, comparación y señales de riesgo.",
      "Resumir y confirmar explícitamente lo comprendido.",
    ],
    signals: [
      "El cliente habla más que el vendedor durante el diagnóstico.",
      "La necesidad queda expresada con palabras del cliente.",
      "Existe una confirmación antes de presentar alternativas.",
    ],
    avoid: [
      "Interrogar siguiendo una lista mecánica.",
      "Asumir necesidades por edad, familia, género o apariencia.",
      "Interrumpir para mostrar un atributo del vehículo.",
      "Dar por entendido algo que el cliente no confirmó.",
    ],
    questions: [
      "¿Para qué usarías principalmente el vehículo?",
      "¿Qué te gustaría mejorar respecto de tu vehículo actual?",
      "¿Qué tres cosas no quieres transar?",
      "Entonces lo principal es espacio y seguridad, sin aumentar demasiado el consumo. ¿Correcto?",
    ],
    example:
      "Entonces lo principal para ti es espacio familiar, pero también quieres mantener un consumo razonable. ¿Correcto?",
    indicators: [
      "% de atenciones con necesidad confirmada.",
      "Calidad de diagnóstico observada por jefatura.",
      "Coherencia entre necesidad y alternativa ofrecida.",
    ],
    sellerLens:
      "No busques completar preguntas; busca comprender una historia de uso y decisión.",
    managerLens:
      "Observar calidad de preguntas, escucha y confirmación explícita del diagnóstico.",
    managementLens:
      "Identificar si los equipos diagnostican o si solo cotizan y presentan producto.",
    relatedPlaybooks: [
      "Primer contacto",
      "Orientación y sugerencia",
      "Reclamos y recuperación",
    ],
  },
  {
    code: "N",
    title: "Convierte necesidades en beneficios",
    principle: "Conecta cada atributo con algo que le importa al cliente.",
    meaning:
      "La ficha técnica por sí sola no orienta. La atención debe transformar una necesidad detectada en atributos relevantes y explicar el beneficio concreto para ese cliente.",
    why:
      "El cliente recuerda mejor aquello que entiende en relación con su vida real. La recomendación gana credibilidad cuando cada argumento responde a una necesidad previamente conversada.",
    behaviors: [
      "Priorizar 2 o 3 necesidades realmente importantes.",
      "Relacionar necesidad → atributo → beneficio.",
      "Usar ejemplos cotidianos y concretos.",
      "Distinguir información relevante de información accesoria.",
      "Confirmar si el beneficio presentado efectivamente agrega valor para el cliente.",
    ],
    signals: [
      "La explicación usa el contexto del cliente.",
      "El cliente entiende por qué una alternativa puede servirle.",
      "La conversación evita sobrecarga técnica.",
    ],
    avoid: [
      "Enumerar equipamiento sin contexto.",
      "Confundir más información con mejor asesoría.",
      "Usar beneficios genéricos para todos.",
      "Presentar atributos que no responden a ninguna necesidad detectada.",
    ],
    questions: [
      "Como me comentabas que viajas con tu familia, ¿qué tan importante es para ti la seguridad activa?",
      "De estos beneficios, ¿cuál tiene más impacto en tu uso diario?",
    ],
    example:
      "Como me comentabas que viajas habitualmente con tus hijos, uno de los puntos fuertes de esta versión es su nivel de seguridad y asistencia a la conducción.",
    indicators: [
      "Coherencia diagnóstico–presentación.",
      "% de observaciones CONSULTA con N en Cumple.",
      "Comprensión de propuesta de valor en evaluaciones.",
    ],
    sellerLens:
      "Presenta menos atributos, pero mejor conectados con la necesidad real.",
    managerLens:
      "Revisar que la presentación de producto se conecte con el diagnóstico realizado.",
    managementLens:
      "Evaluar si la propuesta de valor cambia según el cliente o si existe un discurso único.",
    relatedPlaybooks: ["Orientación y sugerencia", "Test drive"],
  },
  {
    code: "S",
    title: "Sugiere sin imponer",
    principle: "Orienta la decisión; no la reemplaces.",
    meaning:
      "El vendedor organiza alternativas y explica por qué pueden calzar, pero deja espacio para que el cliente compare, pregunte y tome la decisión con autonomía.",
    why:
      "La presión puede acelerar una reserva, pero deteriorar confianza y aumentar arrepentimiento. La orientación transparente fortalece la decisión y la relación.",
    behaviors: [
      "Presentar una alternativa principal y una secundaria cuando aporte valor.",
      "Explicar por qué se recomienda cada opción.",
      "Invitar a comparar sin desacreditar otras marcas.",
      "Ajustar la recomendación si aparece nueva información.",
      "Dar espacio para preguntas y reflexión.",
    ],
    signals: [
      "La sugerencia se entiende y no se siente como presión.",
      "El cliente puede explicar las diferencias entre alternativas.",
      "La recomendación cambia si cambian las prioridades.",
    ],
    avoid: [
      "'Este es el que te conviene'.",
      "Abrumar con demasiadas opciones.",
      "Empujar una unidad solo por disponibilidad o bono.",
      "Desacreditar alternativas o marcas competidoras.",
    ],
    questions: [
      "Por lo que me cuentas veo dos alternativas. ¿Quieres que las comparemos según tus prioridades?",
      "Si tuvieras que priorizar precio o equipamiento, ¿qué pesa más hoy?",
    ],
    example:
      "Por lo que me cuentas, veo dos alternativas que podrían hacer sentido. Te mostraría primero esta por espacio y seguridad, y una segunda si quieres priorizar precio.",
    indicators: [
      "Calidad de recomendación observada.",
      "% de clientes que avanza a cotización/test drive.",
      "Objeciones asociadas a recomendación poco clara.",
    ],
    sellerLens:
      "Tu rol es reducir complejidad y ordenar la decisión, no imponer una respuesta.",
    managerLens:
      "Observar si el vendedor guía o presiona.",
    managementLens:
      "Revisar consistencia de recomendación entre equipos, marcas y locales.",
    relatedPlaybooks: ["Orientación y sugerencia"],
  },
  {
    code: "U",
    title: "Usa información clara y transparente",
    principle: "Que el cliente pueda entender y comparar.",
    meaning:
      "Precio, bonos, financiamiento, disponibilidad, equipamiento y condiciones deben explicarse en lenguaje simple, diferenciando lo confirmado, lo estimado y lo sujeto a aprobación.",
    why:
      "La claridad comercial evita sorpresas, reduce reclamos y permite que la decisión se construya sobre información comparable y verificable.",
    behaviors: [
      "Explicar precio y condiciones completas.",
      "Distinguir bono, financiamiento y requisitos.",
      "Mostrar diferencias de versión de forma comparable.",
      "Confirmar que el cliente comprendió antes de avanzar.",
      "Corregir inmediatamente cualquier información que cambie.",
    ],
    signals: [
      "El cliente puede repetir las condiciones principales.",
      "No aparecen sorpresas al cierre.",
      "Cotización y explicación verbal son coherentes.",
    ],
    avoid: [
      "Ocultar condiciones relevantes.",
      "Presentar solo una cuota sin contexto.",
      "Usar tecnicismos innecesarios.",
      "Cambiar información sin explicar por qué.",
    ],
    questions: [
      "¿Quieres que revisemos el precio final y qué condiciones aplican a cada bono?",
      "¿Hay alguna diferencia entre versiones que quieras comparar antes de avanzar?",
    ],
    example:
      "Este es el valor vigente hoy y estas son las condiciones para acceder al bono. Si cambia alguna condición antes del cierre, te la explicaré antes de avanzar.",
    indicators: [
      "Reclamos por diferencias de precio/condición.",
      "Exactitud de información observada.",
      "Calidad de cotización y explicación comercial.",
    ],
    sellerLens:
      "La transparencia no es entregar más información, sino entregar la correcta de forma comprensible.",
    managerLens:
      "Observar claridad y transparencia de la explicación comercial.",
    managementLens:
      "Revisar reclamos o caídas asociadas a diferencias entre promesa y condición real.",
    relatedPlaybooks: ["Orientación y sugerencia", "Preparación y entrega"],
  },
  {
    code: "L",
    title: "Limita las promesas a lo confirmado",
    principle: "No prometas lo que todavía depende de otro hito.",
    meaning:
      "La experiencia se deteriora rápidamente cuando se promete stock, color, fecha, bono, financiamiento, accesorios o tasación sin respaldo. La transparencia protege la relación.",
    why:
      "Una promesa crea una expectativa concreta. Cuando no se cumple, el cliente no evalúa solo el resultado: evalúa la confianza en Ditalcar.",
    behaviors: [
      "Diferenciar confirmado de estimado.",
      "Validar stock, color y fecha antes de comprometer.",
      "Explicar dependencias cuando existan.",
      "Actualizar al cliente si cambia un compromiso.",
      "Comprometer una próxima actualización cuando la solución todavía no está confirmada.",
    ],
    signals: [
      "Las fechas comunicadas tienen respaldo.",
      "El cliente sabe qué está confirmado y qué está pendiente.",
      "Los cambios se comunican antes de que el cliente tenga que preguntar.",
    ],
    avoid: [
      "Asegurar entrega sin unidad confirmada.",
      "Prometer aprobación financiera.",
      "Comprometer accesorios o beneficios no validados.",
      "Resolver incertidumbre inventando una fecha.",
    ],
    questions: [
      "¿Te parece que confirme primero ese dato y te responda hoy antes de las 17:00?",
      "Esto todavía depende de validación. ¿Quieres que te explique qué hito falta?",
    ],
    example:
      "Prefiero confirmarte ese dato antes de comprometer una fecha. Te respondo hoy antes de las 17:00 con la información validada.",
    indicators: [
      "Reclamos originados en promesas no confirmadas.",
      "Diferencia entre fecha comprometida y fecha real.",
      "Cumplimiento de actualizaciones comprometidas.",
    ],
    sellerLens:
      "Cuando no tengas la respuesta definitiva, compromete la próxima actualización, no una certeza inexistente.",
    managerLens:
      "Detectar promesas comerciales sin respaldo y corregirlas temprano.",
    managementLens:
      "Monitorear reclamos, atrasos y recuperaciones originadas en promesas no confirmadas.",
    relatedPlaybooks: ["Preparación y entrega", "Reclamos y recuperación"],
  },
  {
    code: "T",
    title: "Traza el próximo paso",
    principle: "Toda conversación termina con una acción concreta.",
    meaning:
      "La atención no termina en 'cualquier cosa me avisas'. Ditalcar y cliente deben saber qué ocurrirá después, quién lo hará y cuándo.",
    why:
      "El próximo compromiso transforma una conversación en una relación gestionable y reduce pérdidas por falta de seguimiento.",
    behaviors: [
      "Definir una siguiente acción específica.",
      "Acordar fecha o plazo.",
      "Registrar el compromiso en el sistema correspondiente.",
      "Cumplir el seguimiento acordado.",
      "Si el cliente no responde, mantener trazabilidad sin clasificar artificialmente.",
    ],
    signals: [
      "Las oportunidades tienen próximo paso.",
      "El cliente sabe cuándo volverá a tener noticias.",
      "El seguimiento tiene contexto y propósito.",
    ],
    avoid: [
      "Seguimiento genérico sin fecha.",
      "Contactar repetidamente sin acuerdo.",
      "Dejar tareas sin detalle en Pilot.",
      "Cerrar una interacción con 'cualquier cosa me avisas'.",
    ],
    questions: [
      "¿Te parece que te envíe esto ahora y mañana lo revisamos juntos?",
      "¿Qué día te acomoda que retomemos esta decisión?",
      "¿Cuál sería el siguiente dato que necesitas para avanzar?",
    ],
    example:
      "Yo te confirmo disponibilidad hoy antes de las 17:00 y mañana a las 11:00 revisamos juntos las dos alternativas.",
    indicators: [
      "% de oportunidades con próximo paso.",
      "% de tareas cumplidas en fecha.",
      "Calidad del detalle de gestión en Pilot.",
    ],
    sellerLens:
      "Toda interacción debe dejar un compromiso concreto, incluso si el cliente todavía está explorando.",
    managerLens:
      "Revisar si las oportunidades tienen próximo compromiso claro y cumplido.",
    managementLens:
      "Observar disciplina de seguimiento y calidad de registro en CRM.",
    relatedPlaybooks: [
      "Primer contacto",
      "Orientación y sugerencia",
      "Seguimiento comercial",
    ],
  },
  {
    code: "A",
    title: "Acompaña sin abandonar ni saturar",
    principle: "La relación sigue después de la decisión y de la entrega.",
    meaning:
      "Acompañar significa mantener continuidad durante espera, preparación, entrega y postventa, respetando el canal y momento del cliente y evitando convertir seguimiento en persecución.",
    why:
      "La compra de un vehículo tiene períodos de incertidumbre. Una comunicación oportuna reduce ansiedad, permite recuperar problemas antes y construye una cartera de largo plazo.",
    behaviors: [
      "Actualizar en hitos relevantes.",
      "Respetar canal y frecuencia acordados.",
      "Contactar después de la entrega para confirmar que todo vaya bien.",
      "Mantener un canal útil para consultas, renovación y recompra.",
      "No contactar solo para pedir una encuesta.",
    ],
    signals: [
      "El cliente no necesita perseguir información.",
      "Existe seguimiento post entrega.",
      "La relación puede convertirse en cartera y renovación.",
    ],
    avoid: [
      "Desaparecer después del pago.",
      "Contactar solo para pedir encuesta.",
      "Saturar con mensajes sin valor.",
      "Reaparecer solo cuando se quiere vender nuevamente.",
    ],
    questions: [
      "Quería confirmar que todo vaya bien con tu vehículo. ¿Hay algo que quieras revisar conmigo?",
      "¿Te parece que mantengamos este canal para cualquier consulta futura?",
    ],
    example:
      "Quería confirmar que todo vaya bien con tu vehículo. Si aparece cualquier duda, puedes escribirme directamente y lo revisamos.",
    indicators: [
      "% de contactos post entrega realizados.",
      "Casos recuperados antes de escalar.",
      "Renovación/recompra y crecimiento de cartera.",
    ],
    sellerLens:
      "El seguimiento debe aportar valor y respetar el momento del cliente.",
    managerLens:
      "Observar continuidad después del cierre y calidad del seguimiento post entrega.",
    managementLens:
      "Relacionar acompañamiento con satisfacción, reclamos, renovación y cartera.",
    relatedPlaybooks: [
      "Preparación y entrega",
      "Reclamos y recuperación",
      "Fidelización y renovación",
    ],
  },
]

export const customerJourney = [
  {
    id: "recibir",
    title: "Recibir",
    detail: "Primer contacto, contexto, disponibilidad y bienvenida.",
    consulta: ["C", "O"],
  },
  {
    id: "comprender",
    title: "Comprender",
    detail: "Diagnóstico real de necesidades y prioridades.",
    consulta: ["O"],
  },
  {
    id: "orientar",
    title: "Orientar",
    detail: "Transformar necesidades en alternativas y beneficios.",
    consulta: ["N", "S", "U"],
  },
  {
    id: "experimentar",
    title: "Experimentar",
    detail: "Presentación, demostración y test drive cuando corresponda.",
    consulta: ["N", "U"],
  },
  {
    id: "construir",
    title: "Construir",
    detail: "Cotización, objeciones, alternativas y decisión informada.",
    consulta: ["S", "U", "L"],
  },
  {
    id: "acompanar",
    title: "Acompañar",
    detail: "Compra confirmada, espera, información y preparación.",
    consulta: ["L", "T", "A"],
  },
  {
    id: "cumplir",
    title: "Cumplir",
    detail: "Entrega preparada y coherente con lo comprometido.",
    consulta: ["U", "L", "A"],
  },
  {
    id: "continuar",
    title: "Continuar",
    detail: "Postentrega, fidelización, renovación y cartera.",
    consulta: ["T", "A"],
  },
]

export type SelloPrinciple = {
  code: string
  title: string
  summary: string
  behaviors: string[]
  avoid: string[]
}

export const selloExperiencia: SelloPrinciple[] = [
  {
    code: "E",
    title: "Exactitud",
    summary:
      "Revisar la realidad tal como es, registrar correctamente y no ocultar brechas.",
    behaviors: [
      "Validar datos antes de registrar.",
      "Informar brechas de forma oportuna.",
      "Mantener trazabilidad de lo realizado.",
    ],
    avoid: ["Marcar como cumplido sin revisar.", "Completar información por suposición."],
  },
  {
    code: "C",
    title: "Cuidado",
    summary:
      "Tratar cada unidad, espacio y elemento como parte de la experiencia que recibirá el cliente.",
    behaviors: [
      "Proteger condición de la unidad.",
      "Detectar daños o faltantes temprano.",
      "Mantener orden y presentación del local.",
    ],
    avoid: ["Normalizar daños menores.", "Postergar observaciones evidentes."],
  },
  {
    code: "P",
    title: "Preparación",
    summary:
      "Anticipar lo necesario para que el siguiente hito ocurra sin improvisaciones.",
    behaviors: [
      "Revisar checklist antes de avanzar.",
      "Preparar unidad, documentación y elementos a tiempo.",
      "Escalar pendientes antes de que afecten la entrega.",
    ],
    avoid: ["Esperar al último minuto.", "Transferir un problema sin contexto."],
  },
  {
    code: "C",
    title: "Comunicación",
    summary:
      "Informar a tiempo, con contexto y al responsable correcto.",
    behaviors: [
      "Avisar brechas cuando se detectan.",
      "Registrar quién queda responsable.",
      "Confirmar recepción de información relevante.",
    ],
    avoid: ["Asumir que otra persona ya sabe.", "Enviar mensajes sin contexto."],
  },
  {
    code: "C",
    title: "Cumplimiento",
    summary:
      "Cumplir el estándar y los tiempos comprometidos, separando gestión de traslado/logística.",
    behaviors: [
      "Respetar el plazo de gestión.",
      "Registrar cuándo queda listo para traslado.",
      "Confirmar recepción en local.",
    ],
    avoid: ["Usar el traslado para ocultar atrasos de gestión.", "Cerrar sin confirmar recepción."],
  },
  {
    code: "M",
    title: "Momento memorable",
    summary:
      "Entender que la preparación operacional termina impactando directamente al cliente final.",
    behaviors: [
      "Entregar una unidad limpia, completa y revisada.",
      "Cuidar detalles visibles y no visibles.",
      "Coordinar una entrega ordenada y sin sorpresas.",
    ],
    avoid: ["Aceptar pendientes que el cliente descubrirá en la entrega.", "Reducir la entrega a un trámite."],
  },
]

export type AcademyPlaybookSection = {
  id: string
  title: string
  bullets: string[]
  note?: string
  consulta?: string[]
}

export type AcademyPlaybook = {
  id: string
  order: number
  title: string
  journey: string
  objective: string
  clientState: string
  result: string
  consulta: string[]
  audiences: AcademyAudience[]
  newVsUsed: {
    nuevos: string[]
    usados: string[]
  }
  sections: AcademyPlaybookSection[]
  relatedCourses: string[]
  transversal?: boolean
  status: AcademyContentStatus
  version: number
  updatedAt: string
}

export const salesPlaybooks: AcademyPlaybook[] = [
  {
    id: "primer-contacto",
    order: 1,
    title: "Primer contacto",
    journey: "Interés y entrada",
    objective:
      "Conectar, comprender el motivo del contacto y acordar un siguiente paso útil sin transformar la primera interacción en presión comercial.",
    clientState:
      "Puede estar explorando, comparando, validando precio, buscando disponibilidad o evaluando si vale la pena seguir conversando.",
    result:
      "Cliente comprendido + necesidad inicial registrada + próximo compromiso acordado.",
    consulta: ["C", "O", "L", "T"],
    audiences: [
      "VENTAS",
      "JEFATURA",
      "GERENCIA_MARCA",
      "GERENCIA_VENTAS",
      "EXPERIENCIA",
    ],
    newVsUsed: {
      nuevos: [
        "Validar versión exacta, disponibilidad, color, año/modelo y condición comercial vigente.",
        "Distinguir unidad disponible, en tránsito o todavía por confirmar.",
        "Separar claramente bono, financiamiento y requisitos.",
      ],
      usados: [
        "Trabajar sobre una unidad específica, no sobre un modelo genérico.",
        "Validar año, kilometraje, condición, equipamiento real y antecedentes disponibles.",
        "No generalizar equipamiento: cada unidad usada puede ser distinta.",
      ],
    },
    sections: [
      {
        id: "momento",
        title: "1. Momento del viaje del cliente",
        bullets: [
          "El cliente puede llegar por sala, web, teléfono, WhatsApp, referido u otro canal.",
          "Todavía no necesariamente quiere comprar hoy; puede estar iniciando la exploración.",
          "Ditalcar debe reconocer el contexto anterior y evitar que el cliente repita información.",
          "La primera meta no es cerrar: es lograr una conversación útil y una razón clara para continuar.",
        ],
      },
      {
        id: "objetivo",
        title: "2. Objetivo de la etapa",
        bullets: [
          "Conectar sin presión.",
          "Comprender qué busca y para qué lo necesita.",
          "Identificar qué tan avanzado está en su decisión.",
          "Resolver la primera necesidad de información con claridad.",
          "Cerrar con un próximo compromiso concreto.",
        ],
      },
      {
        id: "cliente",
        title: "3. Qué espera o siente el cliente",
        bullets: [
          "Quiere saber si será escuchado o empujado a comprar.",
          "Necesita una respuesta clara sobre precio, disponibilidad o la consulta que originó el contacto.",
          "Puede temer recibir llamadas o mensajes en exceso.",
          "Evalúa rápidamente si la persona que lo atiende conoce el producto y puede ayudarlo.",
          "Necesita sentir continuidad si ya dejó información en otro canal.",
        ],
      },
      {
        id: "conductas",
        title: "4. Conductas esperadas",
        consulta: ["C", "O", "L", "T"],
        bullets: [
          "Reconocer origen e información ya disponible.",
          "Presentarse con cercanía y propósito.",
          "Hacer pocas preguntas relevantes, no un interrogatorio.",
          "Escuchar la respuesta completa y confirmar lo entendido.",
          "Diferenciar lo confirmado de lo estimado.",
          "Acordar la siguiente acción y registrarla.",
        ],
      },
      {
        id: "pasos",
        title: "5. Pasos de atención",
        bullets: [
          "01 · Reconocer origen y contexto del lead/visita.",
          "02 · Presentarse y generar cercanía.",
          "03 · Entender el motivo inmediato del contacto.",
          "04 · Explorar uso, necesidad principal y timing.",
          "05 · Entregar una primera orientación clara.",
          "06 · Confirmar dudas pendientes antes de prometer.",
          "07 · Acordar próximo paso, responsable y fecha.",
        ],
      },
      {
        id: "frases",
        title: "6. Preguntas y frases sugeridas",
        bullets: [
          "¿Te puedo hacer un par de preguntas para orientarte mejor?",
          "Vi que estabas revisando este modelo. ¿Qué fue lo que más te llamó la atención?",
          "¿Qué es lo más importante para ti en el vehículo?",
          "¿Hay algo de tu auto actual que quieras mejorar sí o sí?",
          "¿Estás recién comparando o piensas hacer el cambio pronto?",
          "Prefiero confirmarte ese dato antes de prometerte algo.",
          "¿Te parece que te envíe esto ahora y acordemos cuándo lo revisamos?",
        ],
        note: "Son orientaciones, no un guion rígido.",
      },
      {
        id: "evitar",
        title: "7. Qué debe evitarse",
        bullets: [
          "Responder únicamente con precio.",
          "Enviar ficha técnica sin contexto.",
          "Prometer stock o entrega sin confirmar.",
          "Preguntar información que ya existe.",
          "Bombardear con modelos o mensajes.",
          "Hablar mal de otra marca.",
          "Llamar repetidamente sin acuerdo.",
          "Cerrar con 'cualquier cosa me avisas'.",
        ],
      },
      {
        id: "registro",
        title: "8. Información que debe registrarse",
        bullets: [
          "Origen del contacto.",
          "Vehículo de interés y Nuevo/Usado.",
          "Necesidad principal y uso esperado.",
          "Timing de compra.",
          "Vehículo para parte de pago, si corresponde.",
          "Canal preferido de contacto.",
          "Próximo compromiso y fecha.",
          "Pilot conserva la gestión oficial; la App solo mostrará contexto/alertas cuando se integre.",
        ],
      },
      {
        id: "compromiso",
        title: "9. Próximo compromiso",
        bullets: [
          "Debe definir qué hará Ditalcar, quién lo hará y cuándo.",
          "Puede ser cotización, disponibilidad, llamada, test drive, visita o parte de pago.",
          "Debe registrarse con suficiente detalle para que otra persona entienda el contexto.",
          "Un buen primer contacto nunca termina solo en 'te aviso'.",
        ],
      },
      {
        id: "indicadores",
        title: "10. Errores críticos e indicadores",
        bullets: [
          "Críticos: promesa no confirmada, cliente sin respuesta, seguimiento incumplido, datos relevantes no registrados, insistencia excesiva y derivación sin contexto.",
          "Indicadores: tiempo de primera respuesta, % con próximo compromiso, % de seguimiento cumplido, avance a cotización/test drive y reclamos originados en primer contacto.",
        ],
      },
    ],
    relatedCourses: ["consulta-fundamentos", "diagnostico", "seguimiento", "pilot"],
    status: "PILOTO",
    version: 1,
    updatedAt: "2026-09-11",
  },
  {
    id: "orientacion",
    order: 2,
    title: "Orientación y sugerencia",
    journey: "Exploración y comparación",
    objective:
      "Convertir el diagnóstico en alternativas relevantes y comparables, usando CONSULTA para recomendar sin imponer.",
    clientState:
      "Está comparando alternativas y puede sentirse sobrecargado por versiones, precio, equipamiento, financiamiento y opiniones externas.",
    result:
      "Cliente entiende por qué una alternativa calza mejor y qué criterios necesita comparar antes de decidir.",
    consulta: ["O", "N", "S", "U", "L", "T"],
    audiences: [
      "VENTAS",
      "JEFATURA",
      "GERENCIA_MARCA",
      "GERENCIA_VENTAS",
      "EXPERIENCIA",
    ],
    newVsUsed: {
      nuevos: [
        "Comparar versiones, motorizaciones, financiamiento, disponibilidad y equipamiento vigente.",
        "Validar diferencias exactas entre versiones y condiciones comerciales.",
      ],
      usados: [
        "Orientar solo sobre unidades realmente disponibles.",
        "Transparentar condición, kilometraje, historial disponible y equipamiento real de la unidad.",
      ],
    },
    sections: [
      {
        id: "momento",
        title: "1. Momento del viaje del cliente",
        bullets: [
          "El cliente ya tiene una necesidad inicial y comienza a comparar alternativas.",
          "Puede venir con una opción en mente que no necesariamente es la que mejor responde a su uso.",
          "La cantidad de información disponible puede aumentar la confusión en vez de resolverla.",
        ],
      },
      {
        id: "objetivo",
        title: "2. Objetivo de la etapa",
        bullets: [
          "Transformar necesidades en criterios de decisión.",
          "Ordenar la comparación.",
          "Recomendar una alternativa principal y otra secundaria solo cuando aporte valor.",
          "Preparar test drive, cotización o siguiente validación.",
        ],
      },
      {
        id: "cliente",
        title: "3. Qué espera o siente el cliente",
        bullets: [
          "Busca claridad entre muchas variables.",
          "Puede sentirse inseguro frente a versiones, financiamiento y equipamiento.",
          "Necesita confiar en que la recomendación no depende solo del stock disponible.",
          "Quiere poder comparar sin sentirse presionado.",
        ],
      },
      {
        id: "conductas",
        title: "4. Conductas esperadas",
        consulta: ["O", "N", "S", "U", "L", "T"],
        bullets: [
          "Confirmar diagnóstico antes de recomendar.",
          "Priorizar 2–3 criterios realmente importantes.",
          "Explicar atributo → beneficio → necesidad.",
          "Mostrar una opción principal y una alternativa útil.",
          "Usar información clara, comparable y vigente.",
          "No prometer aquello que todavía debe validarse.",
        ],
      },
      {
        id: "pasos",
        title: "5. Pasos de atención",
        bullets: [
          "01 · Confirmar necesidades prioritarias.",
          "02 · Definir criterios de comparación.",
          "03 · Sugerir alternativa principal.",
          "04 · Traducir atributos en beneficios concretos.",
          "05 · Comparar con una segunda opción cuando aporte valor.",
          "06 · Resolver dudas y objeciones.",
          "07 · Invitar a experimentar/test drive cuando corresponda.",
          "08 · Trazar próximo compromiso.",
        ],
      },
      {
        id: "frases",
        title: "6. Preguntas y frases sugeridas",
        bullets: [
          "De todo lo que conversamos, ¿qué tres cosas no quieres transar?",
          "Por lo que me cuentas, esta alternativa destaca en…",
          "Si priorizas precio por sobre equipamiento, revisaría esta segunda opción.",
          "¿Qué necesitas validar para sentirte cómodo avanzando?",
          "¿Quieres que revisemos juntos la diferencia real entre estas dos versiones?",
        ],
        note: "La recomendación debe ser explicable y modificarse si cambia la necesidad.",
      },
      {
        id: "evitar",
        title: "7. Qué debe evitarse",
        bullets: [
          "Recitar ficha técnica.",
          "Mostrar demasiadas opciones.",
          "Comparar desacreditando marcas.",
          "Recomendar solo por disponibilidad.",
          "Ocultar diferencias relevantes de precio o condición.",
          "Hablar de cuota sin explicar condiciones.",
        ],
      },
      {
        id: "registro",
        title: "8. Información que debe registrarse",
        bullets: [
          "Criterios prioritarios.",
          "Alternativas presentadas.",
          "Objeciones o dudas relevantes.",
          "Test drive ofrecido/realizado.",
          "Cotización entregada.",
          "Validaciones pendientes.",
          "Próximo compromiso y fecha.",
        ],
      },
      {
        id: "compromiso",
        title: "9. Próximo compromiso",
        bullets: [
          "Cotización comparativa.",
          "Test drive.",
          "Validación de disponibilidad/financiamiento.",
          "Revisión de parte de pago.",
          "Seguimiento con fecha acordada.",
        ],
      },
      {
        id: "indicadores",
        title: "10. Errores críticos e indicadores",
        bullets: [
          "Críticos: recomendación sin diagnóstico, información incorrecta, promesa no validada, presión comercial y comparación poco transparente.",
          "Indicadores: test drive, conversión a cotización, calidad de diagnóstico, observación CONSULTA y reclamos por información comercial.",
        ],
      },
    ],
    relatedCourses: ["diagnostico", "orientacion", "test-drive", "objeciones"],
    status: "PILOTO",
    version: 1,
    updatedAt: "2026-09-11",
  },
  {
    id: "entrega",
    order: 3,
    title: "Preparación y entrega",
    journey: "Compra confirmada y espera",
    objective:
      "Acompañar desde la confirmación de compra hasta una entrega preparada, coherente con lo prometido y capaz de generar confianza.",
    clientState:
      "Después de comprar aumenta la expectativa y también la ansiedad. El cliente necesita saber qué ocurre, qué falta y cuándo volverá a recibir información.",
    result:
      "Cliente informado durante la espera + unidad preparada + entrega sin sorpresas + seguimiento post entrega.",
    consulta: ["U", "L", "T", "A"],
    audiences: [
      "VENTAS",
      "JEFATURA",
      "GERENCIA_MARCA",
      "GERENCIA_VENTAS",
      "JUNIOR",
      "EXPERIENCIA",
    ],
    newVsUsed: {
      nuevos: [
        "Validar NV, VIN/unidad, facturación, patentes/documentación y preparación.",
        "Distinguir gestión interna de tiempos de traslado físico.",
        "Actualizar hitos sin inventar una fecha de entrega.",
      ],
      usados: [
        "Controlar condición real de la unidad específica antes de comprometer entrega.",
        "Validar documentación, preparación, limpieza y observaciones particulares.",
      ],
    },
    sections: [
      {
        id: "momento",
        title: "1. Momento del viaje del cliente",
        bullets: [
          "Comienza cuando la compra queda confirmada, no el día de la entrega.",
          "Incluye espera, hitos internos, preparación, coordinación, entrega física y postentrega inmediata.",
        ],
      },
      {
        id: "objetivo",
        title: "2. Objetivo de la etapa",
        bullets: [
          "Reducir incertidumbre durante la espera.",
          "Cumplir aquello que sí fue confirmado.",
          "Detectar brechas antes de que lleguen al cliente.",
          "Preparar una entrega ordenada y memorable.",
        ],
      },
      {
        id: "cliente",
        title: "3. Qué espera o siente el cliente",
        bullets: [
          "Siente entusiasmo, pero puede aumentar su ansiedad después del pago.",
          "Quiere saber si la fecha, documentación y unidad avanzan correctamente.",
          "Es especialmente sensible a cambios no informados y a detalles visibles en la entrega.",
        ],
      },
      {
        id: "conductas",
        title: "4. Conductas esperadas",
        consulta: ["U", "L", "T", "A"],
        bullets: [
          "Informar hitos relevantes, no mensajes vacíos.",
          "No asegurar fechas hasta que exista respaldo.",
          "Coordinar con áreas internas sin trasladar la complejidad al cliente.",
          "Revisar unidad, documentación y compromisos antes de citar al cliente.",
          "Personalizar la entrega según lo conversado durante la venta.",
        ],
      },
      {
        id: "pasos",
        title: "5. Pasos de atención",
        bullets: [
          "01 · Compra confirmada: validar condiciones y próximos hitos.",
          "02 · Espera: mantener actualización útil según avance real.",
          "03 · Unidad asignada/recibida: confirmar condición y pendientes.",
          "04 · Preparación: revisar unidad, documentación y elementos prometidos.",
          "05 · Control previo: resolver brechas antes de citar.",
          "06 · Coordinar entrega: fecha, lugar, documentación y tiempo necesario.",
          "07 · Entregar: explicar, presentar y cerrar compromisos pendientes.",
          "08 · Postentrega: contactar dentro del estándar definido y mantener canal abierto.",
        ],
      },
      {
        id: "frases",
        title: "6. Preguntas y frases sugeridas",
        bullets: [
          "Tu compra ya está confirmada. El siguiente hito que voy a revisar es…",
          "Todavía no quiero comprometerte una fecha hasta confirmar este paso.",
          "Antes de que vengas, voy a validar unidad, documentación y lo que acordamos.",
          "¿Hay algo que quieras que revisemos especialmente el día de la entrega?",
        ],
      },
      {
        id: "evitar",
        title: "7. Qué debe evitarse",
        bullets: [
          "Desaparecer después de recibir el pago/reserva.",
          "Citar sin control previo.",
          "Prometer fecha por presión del cliente.",
          "Entregar con pendientes no informados.",
          "Hacer una entrega apurada o impersonal.",
        ],
      },
      {
        id: "registro",
        title: "8. Información que debe registrarse",
        bullets: [
          "Compromisos comerciales confirmados.",
          "Hitos y actualizaciones entregadas.",
          "Fecha estimada/confirmada según corresponda.",
          "Pendientes y responsables.",
          "Control previo y evidencia cuando aplique.",
          "Entrega realizada y seguimiento posterior.",
        ],
      },
      {
        id: "compromiso",
        title: "9. Próximo compromiso",
        bullets: [
          "Durante espera: próxima actualización concreta.",
          "Antes de entrega: confirmar que la unidad está lista.",
          "Después de entrega: contacto postentrega y canal de apoyo.",
        ],
      },
      {
        id: "indicadores",
        title: "10. Errores críticos e indicadores",
        bullets: [
          "Críticos: fecha prometida sin respaldo, cliente desinformado, unidad con observaciones, documentación incompleta, entrega sin control previo.",
          "Indicadores: cumplimiento de hitos, calidad entrega, Entrega a Cliente Final Frogmi, reclamos de entrega, postentrega realizado y reaperturas.",
        ],
      },
    ],
    relatedCourses: ["entrega", "seguimiento", "reclamos"],
    status: "PILOTO",
    version: 1,
    updatedAt: "2026-09-11",
  },
  {
    id: "reclamos",
    order: 4,
    title: "Reclamos y recuperación de la experiencia",
    journey: "Transversal a todo el viaje",
    objective:
      "Contener, comprender, gestionar y cerrar una brecha de experiencia recuperando confianza y manteniendo trazabilidad.",
    clientState:
      "Puede llegar confundido, molesto, frustrado o con pérdida de confianza. Antes de una solución, necesita sentirse escuchado y tomado en serio.",
    result:
      "Cliente escuchado + responsable claro + compromiso realista + seguimiento + cierre confirmado.",
    consulta: ["O", "U", "L", "T", "A"],
    audiences: [
      "VENTAS",
      "JEFATURA",
      "GERENCIA_MARCA",
      "GERENCIA_VENTAS",
      "JUNIOR",
      "EXPERIENCIA",
    ],
    newVsUsed: {
      nuevos: [
        "Validar promesas comerciales, estado de unidad, documentación, preparación y áreas involucradas.",
        "No asumir que un atraso tiene una única causa.",
      ],
      usados: [
        "Distinguir condición informada, condición observada y documentación de la unidad específica.",
        "Escalar rápidamente temas de calidad/seguridad que requieran revisión técnica.",
      ],
    },
    sections: [
      {
        id: "momento",
        title: "1. Momento del viaje del cliente",
        bullets: [
          "Puede activarse en primer contacto, orientación, espera, entrega o postventa.",
          "No es una etapa final: es un proceso transversal de recuperación.",
        ],
      },
      {
        id: "objetivo",
        title: "2. Objetivo de la etapa",
        bullets: [
          "Bajar tensión y comprender hechos.",
          "Diferenciar expectativa, promesa y situación real.",
          "Definir responsable y próximo compromiso.",
          "Mantener informado al cliente hasta confirmar recuperación/cierre.",
        ],
      },
      {
        id: "cliente",
        title: "3. Qué espera o siente el cliente",
        bullets: [
          "Puede sentir frustración, desconfianza o cansancio de repetir su historia.",
          "Quiere claridad respecto de quién se hará cargo.",
          "Necesita un compromiso concreto, no una respuesta defensiva.",
        ],
      },
      {
        id: "conductas",
        title: "4. Conductas esperadas",
        consulta: ["O", "U", "L", "T", "A"],
        bullets: [
          "Escuchar sin interrumpir ni discutir.",
          "Confirmar hechos y expectativa.",
          "Reconocer el impacto sin prometer una solución todavía no autorizada.",
          "Tomar responsabilidad por el seguimiento aunque otra área ejecute.",
          "Actualizar antes de que el cliente tenga que perseguir información.",
        ],
      },
      {
        id: "pasos",
        title: "5. Pasos de atención",
        bullets: [
          "01 · Escuchar y contener.",
          "02 · Confirmar hechos y expectativa.",
          "03 · Revisar antecedentes y evidencia.",
          "04 · Definir responsable y plan de acción.",
          "05 · Acordar próxima actualización realista.",
          "06 · Gestionar internamente y mantener informado.",
          "07 · Confirmar solución con el cliente.",
          "08 · Registrar aprendizaje y prevenir recurrencia.",
        ],
      },
      {
        id: "frases",
        title: "6. Preguntas y frases sugeridas",
        bullets: [
          "Quiero entender bien qué ocurrió antes de ofrecerte una respuesta.",
          "Lo que puedo comprometer ahora es revisar esto con el responsable y actualizarte hoy antes de…",
          "Entiendo por qué esto afecta tu experiencia; voy a mantenerte informado del avance.",
          "Antes de cerrar, quiero confirmar contigo que esto efectivamente quedó resuelto.",
        ],
      },
      {
        id: "evitar",
        title: "7. Qué debe evitarse",
        bullets: [
          "Discutir quién tiene la culpa.",
          "Prometer compensaciones o plazos sin aprobación.",
          "Derivar al cliente sin contexto.",
          "Pedir que vuelva a contar todo desde cero.",
          "Cerrar internamente sin confirmar con el cliente.",
        ],
      },
      {
        id: "registro",
        title: "8. Información que debe registrarse",
        bullets: [
          "Momento del viaje.",
          "Hechos y expectativa.",
          "Promesas/compromisos previos.",
          "Evidencia.",
          "Responsable.",
          "Compromiso y fecha.",
          "Actualizaciones entregadas.",
          "Resultado final y confirmación.",
        ],
      },
      {
        id: "compromiso",
        title: "9. Próximo compromiso",
        bullets: [
          "Debe ser específico, realista y trazable.",
          "Si la solución depende de otra área, se compromete la próxima actualización, no una solución inventada.",
          "El responsable de cara al cliente no desaparece al derivar internamente.",
        ],
      },
      {
        id: "indicadores",
        title: "10. Errores críticos e indicadores",
        bullets: [
          "Críticos: cliente sin respuesta, promesa no cumplida, derivación sin contexto, falta de registro y cierre no confirmado.",
          "Indicadores: tiempo de primera respuesta, tiempo de resolución, reaperturas, recuperación, reincidencia y satisfacción posterior.",
        ],
      },
    ],
    relatedCourses: ["reclamos", "seguimiento", "consulta-fundamentos"],
    transversal: true,
    status: "PILOTO",
    version: 1,
    updatedAt: "2026-09-11",
  },
]

export const juniorJourney = [
  {
    id: "recepcion",
    title: "Recepción",
    detail:
      "Recibir la unidad, validar condición, identificar daños/faltantes e ingresar correctamente el hito.",
  },
  {
    id: "stock",
    title: "Stock",
    detail:
      "Mantener control de ubicación, condición y cuidado durante la permanencia de la unidad en local.",
  },
  {
    id: "preparacion",
    title: "Preparación",
    detail:
      "Preparar unidad y elementos requeridos para que el siguiente hito ocurra sin improvisación.",
  },
  {
    id: "control",
    title: "Control previo",
    detail:
      "Validar calidad, documentación, limpieza, pendientes y elementos comprometidos antes de entrega.",
  },
  {
    id: "entrega",
    title: "Entrega",
    detail:
      "Apoyar una entrega ordenada, cuidada y memorable para el cliente final.",
  },
]

export const juniorPlaybooks = [
  {
    id: "junior-recepcion",
    title: "Recepción de unidad",
    journey: "Recepción",
    result: "Unidad recibida con condición y observaciones correctamente registradas.",
    bullets: [
      "Validar identificación de unidad.",
      "Revisar condición visible y faltantes.",
      "Registrar evidencia cuando corresponda.",
      "Informar brechas al responsable correcto.",
      "No corregir ni ocultar una observación sin trazabilidad.",
    ],
  },
  {
    id: "junior-stock",
    title: "Control de stock",
    journey: "Stock",
    result: "Unidad ubicada, cuidada y controlada durante permanencia en local.",
    bullets: [
      "Validar ubicación y condición.",
      "Evitar uso o movimiento sin registro.",
      "Reportar daños o cambios detectados.",
      "Mantener criterios de orden y cuidado.",
    ],
  },
  {
    id: "junior-preparacion",
    title: "Preparación",
    journey: "Preparación",
    result: "Unidad preparada en tiempo y condición esperada para control previo.",
    bullets: [
      "Revisar checklist de preparación.",
      "Resolver o escalar faltantes.",
      "Coordinar tiempos reales, separando gestión de traslado.",
      "No avanzar con brechas invisibilizadas.",
    ],
  },
  {
    id: "junior-control",
    title: "Control previo",
    journey: "Control previo",
    result: "Brechas detectadas antes de citar al cliente.",
    bullets: [
      "Revisar unidad, limpieza, documentación y elementos.",
      "Confirmar pendientes y responsables.",
      "No aceptar como normal un detalle que impactará la entrega.",
      "Escalar con suficiente anticipación.",
    ],
  },
  {
    id: "junior-entrega",
    title: "Apoyo a entrega memorable",
    journey: "Entrega",
    result: "Cliente recibe una unidad cuidada y una experiencia coherente con lo prometido.",
    bullets: [
      "Cuidar presentación final de la unidad.",
      "Coordinar espacio, tiempos y elementos de entrega.",
      "Mantener trato cordial si existe interacción con cliente.",
      "Entender la relevancia de la toma de usado y calidad de la unidad recibida/entregada.",
      "Apoyar al vendedor sin reemplazar su responsabilidad de Entrega a Cliente Final.",
    ],
  },
]

export type CourseModule = {
  id: string
  title: string
  duration: number
  detail: string
  available: boolean
  releaseLabel?: string
  bullets?: string[]
  highlight?: string
  note?: string
  // Video del módulo (YouTube, Vimeo, Microsoft Stream/SharePoint o archivo .mp4). Opcional.
  video?: string
}

export type AcademyCourse = {
  id: string
  title: string
  description: string
  audience: AcademyAudience[]
  duration: number
  mandatoryFor: AcademyAudience[]
  status: AcademyContentStatus
  assignedTo: AcademyAudience[]
  seedProgress: number
  new?: boolean
  updated?: boolean
  releaseMode: "TODO" | "GRADUAL"
  modules: CourseModule[]
  relatedPlaybooks?: string[]
  sourceNote?: string
}

function module(
  id: string,
  title: string,
  duration: number,
  detail: string,
  available = true,
  releaseLabel?: string,
  extra?: Pick<CourseModule, "bullets" | "highlight" | "note" | "video">
): CourseModule {
  return { id, title, duration, detail, available, releaseLabel, ...extra }
}

export const pilotCRMModules: CourseModule[] = [
  module(
    "pilot-1",
    "Contactar Lead Pilot",
    3,
    "Realizar contacto por teléfono, WhatsApp o email según corresponda. La gestión comercial oficial continúa en Pilot; la App no reemplaza ni escribe en el CRM."
  ),
  module(
    "pilot-2",
    "Confirmación de datos",
    3,
    "Si el cotizante responde, validar nombre, apellido, teléfono(s), email y RUT. Si un dato requiere corrección, actualizarlo en Pilot según procedimiento. Si no responde, dejar una tarea de seguimiento."
  ),
  module(
    "pilot-3",
    "Realizar tarea",
    3,
    "Siempre dejar una próxima gestión: llamada, WhatsApp, email u otro contacto acordado. La tarea debe indicar fecha y contexto suficiente."
  ),
  module(
    "pilot-4",
    "Clasificación correcta",
    3,
    "Con contacto y datos válidos, clasificar según corresponda. Sin contacto no se clasifica como Good/Bad Lead. Bad Lead se reserva para causas realmente inválidas definidas por el proceso."
  ),
  module(
    "pilot-5",
    "Nivel de interés",
    3,
    "Cuando existe contacto se registra Alto, Medio, Bajo o Sin interés según conversación. Cuando no existe contacto, se gestiona como Sin contactar según procedimiento."
  ),
  module(
    "pilot-6",
    "Correcto detalle de gestión",
    3,
    "Toda gestión debe quedar en Eventos con detalle real de acciones realizadas o pendientes. Evitar registros vacíos como 'Realizado', 'Contactado', 'Seguimiento', 'Llamado' u 'OK'."
  ),
]

export const PILOT_VISIBLE_COURSE_IDS = [
  "bienvenida-clientes",
  "test-drive-piloto",
  "cotizacion-pilot",
  "convertir-lead",
] as const

export const PILOT_VISIBLE_EVALUATION_IDS = [
  "eval-bienvenida",
  "eval-test-drive",
  "eval-cotizacion",
] as const

export const academyCourses: AcademyCourse[] = [
  {
    id: "bienvenida-clientes",
    title: "Bienvenida y recepción del cliente",
    description:
      "Recibir con rapidez, entender el motivo de visita y ofrecer bebestibles de forma proactiva al cliente y sus acompañantes.",
    audience: ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"],
    duration: 8,
    mandatoryFor: ["VENTAS"],
    status: "PILOTO",
    assignedTo: ["VENTAS"],
    seedProgress: 0,
    new: true,
    releaseMode: "TODO",
    modules: [
      module(
        "bienvenida-1",
        "Recibir dentro del primer minuto",
        2,
        "La experiencia comienza apenas el cliente entra a la sala. El objetivo es que sepa rápidamente que fue visto y será atendido.",
        true,
        undefined,
        {
          bullets: [
            "Acercarse o reconocer al cliente dentro del primer minuto.",
            "Saludar de forma cordial y natural.",
            "Evitar que el cliente quede esperando sin contexto."
          ],
          highlight: "El cliente debe sentirse recibido desde el primer momento."
        }
      ),
      module(
        "bienvenida-2",
        "Entender el motivo de la visita",
        2,
        "Preguntar qué necesita el cliente y, de acuerdo con eso, atender directamente o derivar correctamente.",
        true,
        undefined,
        {
          bullets: [
            "Preguntar el motivo de la visita.",
            "Confirmar si viene por un modelo, cotización, entrega, postventa u otra gestión.",
            "Derivar solo cuando corresponda y explicar quién continuará la atención."
          ]
        }
      ),
      module(
        "bienvenida-3",
        "Bebestibles · gesto proactivo",
        2,
        "Ofrecer agua, café u otro bebestible disponible como parte de la bienvenida, sin esperar a que el cliente lo solicite.",
        true,
        undefined,
        {
          bullets: [
            "Ofrecer el bebestible al cliente.",
            "Considerar también a sus acompañantes.",
            "Hacerlo de forma natural, sin interrumpir la conversación."
          ],
          highlight: "No esperar a que el cliente lo pida."
        }
      ),
      module(
        "bienvenida-4",
        "Cierre de la bienvenida",
        2,
        "La bienvenida termina cuando el cliente ya está atendido, orientado y sabe cuál será el siguiente paso.",
        true,
        undefined,
        {
          bullets: [
            "Cliente recibido.",
            "Motivo identificado.",
            "Atención o derivación definida.",
            "Bebestible ofrecido."
          ]
        }
      )
    ],
    relatedPlaybooks: ["primer-contacto"],
  },
  {
    id: "test-drive-piloto",
    title: "Test Drive",
    description:
      "Preparar, documentar y acompañar una prueba de manejo segura, ordenada y comercialmente útil.",
    audience: ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"],
    duration: 12,
    mandatoryFor: ["VENTAS"],
    status: "PILOTO",
    assignedTo: ["VENTAS"],
    seedProgress: 0,
    new: true,
    releaseMode: "TODO",
    modules: [
      module(
        "tdp-1",
        "Documentación antes de salir",
        3,
        "No se inicia el Test Drive hasta completar la validación del conductor y el documento de responsabilidad.",
        true,
        undefined,
        {
          bullets: [
            "Revisar que el cliente porte licencia de conducir.",
            "Tomar y guardar una fotografía o escaneo de la licencia en el registro definido para Test Drive.",
            "Solicitar la firma del documento de responsabilidad antes de salir.",
            "Guardar respaldo del documento firmado según el procedimiento."
          ],
          highlight: "Licencia respaldada + documento de responsabilidad firmado = requisitos obligatorios antes de iniciar.",
          note: "La imagen de la licencia contiene datos personales: debe quedar en un repositorio restringido y no visible para perfiles que no la necesiten."
        }
      ),
      module(
        "tdp-2",
        "Elegir ruta corta o ruta larga",
        2,
        "Cada sucursal debe trabajar con dos recorridos previamente definidos para evitar improvisaciones.",
        true,
        undefined,
        {
          bullets: [
            "Ruta corta: experiencia breve y controlada.",
            "Ruta larga: permite experimentar más condiciones de conducción.",
            "Informar al cliente qué ruta se realizará antes de comenzar."
          ],
          highlight: "Siempre seleccionar una de las dos rutas definidas por el local: corta o larga."
        }
      ),
      module(
        "tdp-3",
        "Preparar el vehículo",
        2,
        "La unidad debe estar en condiciones que permitan vivir una experiencia representativa del producto.",
        true,
        undefined,
        {
          bullets: [
            "Vehículo limpio y en buenas condiciones.",
            "Combustible siempre en 1/2 estanque o más antes de salir.",
            "Revisar que no existan elementos que interfieran con la experiencia.",
            "Explicar requisitos, ruta y duración antes de comenzar."
          ],
          highlight: "Combustible mínimo para Test Drive: 1/2 estanque."
        }
      ),
      module(
        "tdp-4",
        "Acompañar y guiar la experiencia",
        3,
        "El vendedor acompaña al cliente y conecta la prueba con las necesidades que detectó previamente.",
        true,
        undefined,
        {
          bullets: [
            "Acompañar al cliente durante la prueba.",
            "Resolver dudas técnicas durante el recorrido.",
            "Relacionar atributos con el uso real del cliente.",
            "Como referencia de estándar, considerar una prueba de al menos 15 minutos o 5 km cuando las condiciones lo permitan."
          ]
        }
      ),
      module(
        "tdp-5",
        "Cerrar el Test Drive",
        2,
        "Al volver, recoger la percepción del cliente y transformar la experiencia en un siguiente paso concreto.",
        true,
        undefined,
        {
          bullets: [
            "Preguntar qué le gustó y qué dudas aparecieron.",
            "Aplicar la encuesta de satisfacción mediante QR cuando corresponda.",
            "Acordar el próximo paso: cotización, tasación, otra alternativa o continuidad comercial."
          ]
        }
      )
    ],
    relatedPlaybooks: ["orientacion"],
  },
  {
    id: "cotizacion-pilot",
    title: "Cotización, presentación y seguimiento",
    description:
      "Gestionar la cotización en Pilot, presentar el presupuesto con claridad y retomar contacto dentro de las 24 horas.",
    audience: ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"],
    duration: 12,
    mandatoryFor: ["VENTAS"],
    status: "PILOTO",
    assignedTo: ["VENTAS"],
    seedProgress: 0,
    new: true,
    releaseMode: "TODO",
    modules: [
      module(
        "cot-1",
        "Preparar la cotización en Pilot",
        3,
        "La gestión oficial de la oportunidad y de la cotización se mantiene en Pilot.",
        true,
        undefined,
        {
          bullets: [
            "Validar modelo, versión y alternativa conversada.",
            "Revisar valores y opciones de financiamiento cuando correspondan.",
            "Asegurar que la cotización responda a la conversación previa y no sea un documento genérico."
          ],
          highlight: "La App Ditalcar no reemplaza Pilot: la gestión comercial oficial sigue ocurriendo en el CRM."
        }
      ),
      module(
        "cot-2",
        "Presentar el presupuesto",
        3,
        "Cotizar no es solo enviar un archivo. El vendedor debe explicar el presupuesto y aclarar sus componentes.",
        true,
        undefined,
        {
          bullets: [
            "Explicar qué vehículo y alternativa se están cotizando.",
            "Explicar valores, financiamiento y condiciones relevantes.",
            "Aclarar dudas antes de cerrar la interacción."
          ],
          highlight: "Cotizar ≠ enviar. La cotización debe presentarse y explicarse."
        }
      ),
      module(
        "cot-3",
        "Disponibilidad, reserva y entrega",
        2,
        "Antes de avanzar, informar lo que esté validado respecto de disponibilidad, reservas y tiempos de entrega.",
        true,
        undefined,
        {
          bullets: [
            "Informar disponibilidad real cuando esté confirmada.",
            "Explicar condiciones de reserva cuando apliquen.",
            "No prometer fechas de entrega que todavía no estén validadas."
          ]
        }
      ),
      module(
        "cot-4",
        "Seguimiento dentro de 24 horas",
        4,
        "Una cotización enviada siempre debe tener un seguimiento posterior con propósito.",
        true,
        undefined,
        {
          bullets: [
            "Retomar contacto dentro de las 24 horas siguientes al envío o entrega de la cotización.",
            "Preguntar si pudo revisar la alternativa y qué necesita aclarar.",
            "Buscar un siguiente paso concreto: visita, Test Drive, tasación, otra alternativa, financiamiento o avance del negocio.",
            "Registrar la gestión y el próximo compromiso en Pilot."
          ],
          highlight: "Seguimiento obligatorio dentro de las 24 horas posteriores a la cotización."
        }
      )
    ],
    relatedPlaybooks: ["primer-contacto", "orientacion"],
    sourceNote: "Pilot es el CRM oficial: la App Ditalcar apoya el aprendizaje, pero no registra gestiones comerciales en Pilot.",
  },
  {
    id: "convertir-lead",
    title: "Convertir un lead en una oportunidad",
    description:
      "Recursos prácticos para generar avance comercial sin presionar al cliente.",
    audience: ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"],
    duration: 8,
    mandatoryFor: [],
    status: "PILOTO",
    assignedTo: [],
    seedProgress: 0,
    new: true,
    releaseMode: "TODO",
    modules: [
      module(
        "lead-1",
        "Invitar al piso",
        3,
        "Cuando tenga sentido, mover la conversación desde un contacto remoto hacia una interacción de mayor valor en el local.",
        true,
        undefined,
        { bullets: ["Invitar a conocer el vehículo.", "Comparar alternativas en piso.", "Acordar día y hora cuando el cliente esté disponible."] }
      ),
      module(
        "lead-2",
        "Ofrecer Test Drive",
        2,
        "Usar la prueba de manejo como una forma de transformar interés en experiencia concreta.",
        true,
        undefined,
        { bullets: ["Ofrecerlo de forma proactiva cuando sea pertinente.", "Conectarlo con lo que el cliente quiere validar antes de decidir."] }
      ),
      module(
        "lead-3",
        "Ofrecer tasación en línea",
        3,
        "Si existe vehículo en parte de pago, ofrecer la tasación en línea para avanzar la conversación comercial.",
        true,
        undefined,
        {
          bullets: [
            "Preguntar si considera entregar su vehículo actual como parte de pago.",
            "Ofrecer la tasación en línea cuando corresponda.",
            "Usar el resultado como insumo para avanzar la alternativa, no como presión de cierre."
          ],
          highlight: "Invitación al piso + Test Drive + tasación son herramientas para generar avance, no pasos obligatorios para todos los clientes."
        }
      )
    ],
  },
  {
    id: "consulta-fundamentos",
    title: "Fundamentos CONSULTA",
    description:
      "Lenguaje común de atención Ditalcar y ocho conductas observables durante el viaje del cliente.",
    audience: ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"],
    duration: 24,
    mandatoryFor: ["VENTAS", "JEFATURA"],
    status: "PILOTO",
    assignedTo: ["VENTAS", "JEFATURA"],
    seedProgress: 40,
    releaseMode: "GRADUAL",
    modules: [
      module("consulta-1", "Comprender el modelo", 4, "Qué busca CONSULTA y cómo se conecta con el viaje completo."),
      module("consulta-2", "C + O · conocer y escuchar", 5, "Usar contexto, preguntar, escuchar y confirmar."),
      module("consulta-3", "N + S · orientar", 5, "Convertir necesidades en beneficios y sugerir sin imponer.", false, "Semana 2"),
      module("consulta-4", "U + L · claridad y promesas", 5, "Explicar condiciones y limitar promesas a lo confirmado.", false, "Semana 3"),
      module("consulta-5", "T + A · seguimiento y relación", 5, "Trazar próximos pasos, acompañar y construir cartera.", false, "Semana 4"),
    ],
    relatedPlaybooks: ["primer-contacto", "orientacion", "entrega", "reclamos"],
  },
  {
    id: "diagnostico",
    title: "Diagnóstico de necesidades",
    description:
      "Preguntar, escuchar, confirmar y traducir necesidad en criterios de decisión.",
    audience: ["VENTAS", "JEFATURA", "EXPERIENCIA"],
    duration: 16,
    mandatoryFor: ["VENTAS"],
    status: "PILOTO",
    assignedTo: ["VENTAS"],
    seedProgress: 0,
    new: true,
    releaseMode: "TODO",
    modules: [
      module("diag-1", "Uso y contexto", 4, "Comprender para qué necesita el vehículo y en qué situaciones lo utilizará."),
      module("diag-2", "Significado y prioridades", 4, "Detectar qué representa el cambio y qué atributos no quiere transar."),
      module("diag-3", "Condiciones y momento", 4, "Explorar timing, presupuesto, parte de pago y criterios de decisión."),
      module("diag-4", "Confirmar antes de sugerir", 4, "Resumir la necesidad y obtener confirmación antes de avanzar."),
    ],
    relatedPlaybooks: ["primer-contacto", "orientacion"],
  },
  {
    id: "orientacion",
    title: "Orientación y recomendación",
    description:
      "Convertir necesidades en beneficios, comparar alternativas y sugerir sin imponer.",
    audience: ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "EXPERIENCIA"],
    duration: 15,
    mandatoryFor: ["VENTAS"],
    status: "PILOTO",
    assignedTo: [],
    seedProgress: 0,
    releaseMode: "TODO",
    modules: [
      module("ori-1", "Criterios de decisión", 4, "Reducir la comparación a variables relevantes para el cliente."),
      module("ori-2", "Beneficio vs. característica", 4, "Transformar ficha técnica en valor para el uso real."),
      module("ori-3", "Comparación clara", 4, "Mostrar diferencias sin sobrecargar ni desacreditar."),
      module("ori-4", "Siguiente paso", 3, "Conectar recomendación con test drive, cotización o validación."),
    ],
    relatedPlaybooks: ["orientacion"],
  },
  {
    id: "objeciones",
    title: "Manejo de objeciones",
    description:
      "Comprender la objeción, responder con claridad y mantener la autonomía del cliente.",
    audience: ["VENTAS", "JEFATURA", "EXPERIENCIA"],
    duration: 15,
    mandatoryFor: ["VENTAS"],
    status: "BORRADOR",
    assignedTo: [],
    seedProgress: 0,
    releaseMode: "TODO",
    modules: [
      module("obj-1", "Qué hay detrás de la objeción", 3, "Distinguir duda, riesgo, comparación y falta de información."),
      module("obj-2", "Precio", 3, "Explorar valor, condiciones y alternativas sin defenderse."),
      module("obj-3", "Comparación", 3, "Responder con criterios y transparencia."),
      module("obj-4", "Timing", 3, "Respetar el momento del cliente y mantener un próximo paso."),
      module("obj-5", "Cierre sin presión", 3, "Avanzar cuando existe claridad, no por insistencia."),
    ],
  },
  {
    id: "test-drive",
    title: "Test drive",
    description:
      "Transformar la prueba en una experiencia conectada con la necesidad del cliente.",
    audience: ["VENTAS", "JEFATURA", "EXPERIENCIA"],
    duration: 12,
    mandatoryFor: ["VENTAS"],
    status: "BORRADOR",
    assignedTo: [],
    seedProgress: 0,
    releaseMode: "TODO",
    modules: [
      module("td-1", "Preparación", 3, "Preparar unidad y objetivo de la prueba."),
      module("td-2", "Experiencia", 3, "Conectar sensaciones con necesidades detectadas."),
      module("td-3", "Preguntas post prueba", 3, "Recoger percepción y nuevas prioridades."),
      module("td-4", "Registro y siguiente paso", 3, "Registrar resultado y acordar continuidad."),
    ],
  },
  {
    id: "entrega",
    title: "Entrega memorable",
    description:
      "Desde compra confirmada hasta postentrega, con calidad, cumplimiento y coordinación.",
    audience: ["VENTAS", "JEFATURA", "JUNIOR", "EXPERIENCIA"],
    duration: 22,
    mandatoryFor: ["VENTAS", "JUNIOR"],
    status: "PILOTO",
    assignedTo: ["VENTAS", "JUNIOR"],
    seedProgress: 0,
    updated: true,
    releaseMode: "GRADUAL",
    modules: [
      module("ent-1", "Compra confirmada", 4, "Alinear condiciones, hitos y expectativas."),
      module("ent-2", "Espera y comunicación", 4, "Informar avance real y evitar promesas no validadas."),
      module("ent-3", "Preparación y control previo", 5, "Detectar brechas antes de citar al cliente."),
      module("ent-4", "Entrega al cliente final", 5, "Coordinar una entrega clara, cuidada y memorable.", false, "Semana 2"),
      module("ent-5", "Postentrega", 4, "Confirmar que todo vaya bien y mantener canal abierto.", false, "Semana 3"),
    ],
    relatedPlaybooks: ["entrega"],
  },
  {
    id: "reclamos",
    title: "Manejo de reclamos",
    description:
      "Escucha, recuperación, trazabilidad y cierre confirmado de una brecha de experiencia.",
    audience: ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "JUNIOR", "EXPERIENCIA"],
    duration: 16,
    mandatoryFor: ["VENTAS", "JEFATURA"],
    status: "PILOTO",
    assignedTo: [],
    seedProgress: 0,
    new: true,
    releaseMode: "TODO",
    modules: [
      module("rec-1", "Escuchar y contener", 3, "Bajar tensión sin discutir ni prometer."),
      module("rec-2", "Diagnosticar", 3, "Separar hechos, expectativa y promesa previa."),
      module("rec-3", "Comprometer", 3, "Definir responsable y próxima actualización realista."),
      module("rec-4", "Gestionar", 4, "Coordinar internamente sin abandonar al cliente."),
      module("rec-5", "Cerrar y aprender", 3, "Confirmar solución y registrar aprendizaje."),
    ],
    relatedPlaybooks: ["reclamos"],
  },
  {
    id: "fidelizacion",
    title: "Fidelización y renovación",
    description:
      "Postentrega, construcción de cartera, recompra y relación de largo plazo.",
    audience: ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"],
    duration: 15,
    mandatoryFor: ["VENTAS"],
    status: "BORRADOR",
    assignedTo: [],
    seedProgress: 0,
    releaseMode: "TODO",
    modules: [
      module("fid-1", "Postentrega útil", 4, "Contactar para ayudar, no solo para pedir encuesta."),
      module("fid-2", "Construcción de cartera", 4, "Mantener contexto e hitos relevantes."),
      module("fid-3", "Momentos de contacto", 3, "Definir contactos con propósito."),
      module("fid-4", "Renovación", 4, "Detectar oportunidad de recompra desde la relación construida."),
    ],
  },
  {
    id: "seguimiento",
    title: "Seguimiento comercial",
    description:
      "Seguimiento con contexto, propósito, fecha y próximo compromiso.",
    audience: ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "EXPERIENCIA"],
    duration: 12,
    mandatoryFor: ["VENTAS"],
    status: "PILOTO",
    assignedTo: [],
    seedProgress: 0,
    releaseMode: "TODO",
    modules: [
      module("seg-1", "Trazar", 2, "Definir qué ocurre después de cada interacción."),
      module("seg-2", "Cadencia", 3, "Acordar cuándo contactar sin saturar."),
      module("seg-3", "Canal", 2, "Respetar preferencia y contexto."),
      module("seg-4", "Registro", 3, "Dejar tarea/evento con detalle útil."),
      module("seg-5", "Cliente sin respuesta", 2, "Mantener trazabilidad sin clasificar artificialmente."),
    ],
  },
  {
    id: "pilot",
    title: "Uso efectivo de CRM Pilot",
    description:
      "Contacto, clasificación, nivel de interés, tareas y detalle correcto de gestión según el instructivo operativo actual.",
    audience: ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"],
    duration: 18,
    mandatoryFor: ["VENTAS", "JEFATURA"],
    status: "PILOTO",
    assignedTo: ["VENTAS", "JEFATURA"],
    seedProgress: 0,
    new: true,
    releaseMode: "TODO",
    modules: pilotCRMModules,
    sourceNote:
      "Adaptado del instructivo impreso 'PILOT - Ejecutivos de Ventas'. La App Ditalcar no escribe en Pilot: la gestión oficial permanece en el CRM.",
  },
  {
    id: "observa-consulta",
    title: "Cómo observar CONSULTA",
    description:
      "Herramientas para observar conductas, registrar evidencia, entregar feedback y definir refuerzos.",
    audience: ["JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"],
    duration: 15,
    mandatoryFor: ["JEFATURA"],
    status: "PILOTO",
    assignedTo: ["JEFATURA"],
    seedProgress: 0,
    releaseMode: "TODO",
    modules: [
      module("obs-1", "Qué observar", 3, "Conductas visibles por letra CONSULTA."),
      module("obs-2", "Evidencia", 3, "Registrar hechos y no impresiones vagas."),
      module("obs-3", "Cumple / Parcial / No cumple", 3, "Usar una escala simple y accionable."),
      module("obs-4", "Feedback", 3, "Convertir observación en conversación de desarrollo."),
      module("obs-5", "Refuerzo", 3, "Relacionar brecha con contenido específico."),
    ],
  },
  {
    id: "coaching",
    title: "Coaching comercial",
    description:
      "Conversaciones breves para desarrollar habilidades y dar seguimiento a acuerdos.",
    audience: ["JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"],
    duration: 20,
    mandatoryFor: ["JEFATURA"],
    status: "BORRADOR",
    assignedTo: [],
    seedProgress: 0,
    releaseMode: "TODO",
    modules: [
      module("coach-1", "Observar", 5, "Partir desde evidencia concreta."),
      module("coach-2", "Preguntar", 5, "Ayudar a la persona a interpretar su propia conducta."),
      module("coach-3", "Acordar", 5, "Definir una conducta específica a probar."),
      module("coach-4", "Dar seguimiento", 5, "Revisar avance y sostener la mejora."),
    ],
  },
  {
    id: "tablero-semanal",
    title: "Liderazgo de reunión comercial / Tablero Semanal",
    description:
      "Preparar la reunión breve, revisar estándares, acuerdos, brechas, aprendizaje y prioridades del equipo.",
    audience: ["JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"],
    duration: 14,
    mandatoryFor: ["JEFATURA"],
    status: "PILOTO",
    assignedTo: ["JEFATURA"],
    seedProgress: 0,
    releaseMode: "TODO",
    modules: [
      module("tab-1", "Preparar", 3, "Llegar con indicadores, brechas y personas a reforzar."),
      module("tab-2", "15 minutos", 3, "Mantener foco y ritmo."),
      module("tab-3", "Brechas", 3, "Priorizar pocas acciones concretas."),
      module("tab-4", "Acuerdos", 3, "Definir responsable y fecha."),
      module("tab-5", "Seguimiento", 2, "Abrir la reunión siguiente revisando compromisos anteriores."),
    ],
  },
  {
    id: "marca-indicadores",
    title: "Gestión de experiencia por marca",
    description:
      "Lectura comparativa de locales, consistencia de experiencia y desarrollo de jefaturas.",
    audience: ["GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"],
    duration: 20,
    mandatoryFor: [],
    status: "PILOTO",
    assignedTo: [],
    seedProgress: 0,
    releaseMode: "TODO",
    modules: [
      module("gm-1", "Indicadores", 4, "Leer avance de Academia junto con indicadores de operación."),
      module("gm-2", "Comparación de locales", 4, "Buscar consistencia y brechas relevantes."),
      module("gm-3", "Desarrollo de jefaturas", 4, "Usar resultados para orientar coaching."),
      module("gm-4", "Observación CONSULTA", 4, "Bajar a una atención concreta cuando se requiera."),
      module("gm-5", "Plan de acción", 4, "Convertir evidencia en acciones con responsable y plazo."),
    ],
  },
  {
    id: "estandares-junior",
    title: "Estándares Operacionales Ditalcar",
    description:
      "Sello de Experiencia y ejecución operacional en Recepción, Stock, Preparación, Control previo y Entrega.",
    audience: ["JUNIOR", "JEFATURA", "EXPERIENCIA"],
    duration: 22,
    mandatoryFor: ["JUNIOR"],
    status: "PILOTO",
    assignedTo: ["JUNIOR"],
    seedProgress: 0,
    releaseMode: "GRADUAL",
    modules: [
      module("jun-1", "Sello de Experiencia", 4, "Exactitud, cuidado, preparación, comunicación y cumplimiento."),
      module("jun-2", "Recepción", 4, "Ingreso correcto y detección temprana de brechas."),
      module("jun-3", "Stock", 4, "Control y cuidado de unidades.", false, "Semana 2"),
      module("jun-4", "Preparación y control previo", 5, "Prevenir problemas antes de entrega.", false, "Semana 3"),
      module("jun-5", "Entrega memorable", 5, "Calidad de unidad, toma de usados y apoyo al cliente final.", false, "Semana 4"),
    ],
  },
  {
    id: "atencion-junior",
    title: "Atención básica al cliente para Junior",
    description:
      "Cómo recibir, orientar y apoyar a un cliente sin interferir con la responsabilidad comercial del vendedor.",
    audience: ["JUNIOR", "JEFATURA", "EXPERIENCIA"],
    duration: 12,
    mandatoryFor: ["JUNIOR"],
    status: "BORRADOR",
    assignedTo: [],
    seedProgress: 0,
    releaseMode: "TODO",
    modules: [
      module("aj-1", "Recepción básica", 3, "Saludar, orientar y evitar dejar al cliente sin contexto."),
      module("aj-2", "Toma de usados", 3, "Cuidado y claridad en la recepción física de una unidad."),
      module("aj-3", "Calidad de entrega", 3, "Qué detalles impactan directamente en el cliente final."),
      module("aj-4", "Experiencia memorable", 3, "Cómo apoyar un momento importante sin convertirlo en un trámite."),
    ],
  },
]

export type AcademyEvaluation = {
  id: string
  title: string
  type: "CONOCIMIENTO" | "CASOS" | "OBSERVADA"
  passing: number
  attempts: number
  questionsPerAttempt: number
  bankSize: number
  audience: AcademyAudience[]
  assignedTo: AcademyAudience[]
  duration: number
  relatedCourseIds: string[]
}

export const academyEvaluations: AcademyEvaluation[] = [
  {
    id: "eval-bienvenida",
    title: "Evaluación · Bienvenida y recepción",
    type: "CASOS",
    passing: 80,
    attempts: 3,
    questionsPerAttempt: 5,
    bankSize: 15,
    audience: ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"],
    assignedTo: ["VENTAS"],
    duration: 5,
    relatedCourseIds: ["bienvenida-clientes"],
  },
  {
    id: "eval-test-drive",
    title: "Evaluación · Test Drive",
    type: "CASOS",
    passing: 80,
    attempts: 3,
    questionsPerAttempt: 5,
    bankSize: 15,
    audience: ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"],
    assignedTo: ["VENTAS"],
    duration: 5,
    relatedCourseIds: ["test-drive-piloto"],
  },
  {
    id: "eval-cotizacion",
    title: "Evaluación · Cotización y seguimiento",
    type: "CASOS",
    passing: 80,
    attempts: 3,
    questionsPerAttempt: 5,
    bankSize: 15,
    audience: ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"],
    assignedTo: ["VENTAS"],
    duration: 5,
    relatedCourseIds: ["cotizacion-pilot"],
  },
  {
    id: "eval-consulta",
    title: "Evaluación CONSULTA",
    type: "CONOCIMIENTO",
    passing: 80,
    attempts: 3,
    questionsPerAttempt: 8,
    bankSize: 24,
    audience: ["VENTAS", "JEFATURA"],
    assignedTo: ["VENTAS", "JEFATURA"],
    duration: 8,
    relatedCourseIds: ["consulta-fundamentos"],
  },
  {
    id: "eval-pilot",
    title: "Caso práctico CRM Pilot",
    type: "CASOS",
    passing: 80,
    attempts: 3,
    questionsPerAttempt: 6,
    bankSize: 18,
    audience: ["VENTAS", "JEFATURA"],
    assignedTo: ["VENTAS", "JEFATURA"],
    duration: 7,
    relatedCourseIds: ["pilot"],
  },
  {
    id: "obs-consulta",
    title: "Observación CONSULTA",
    type: "OBSERVADA",
    passing: 80,
    attempts: 1,
    questionsPerAttempt: 8,
    bankSize: 8,
    audience: ["JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"],
    assignedTo: [],
    duration: 10,
    relatedCourseIds: ["observa-consulta"],
  },
]

export type AcademyUpdate = {
  id: string
  title: string
  detail: string
  kind: "NUEVO" | "ACTUALIZADO" | "ASIGNADO"
  tab: AcademyTab
  audiences: AcademyAudience[]
  date: string
  contentId?: string
}

export const academyUpdates: AcademyUpdate[] = [
  {
    id: "upd-bienvenida-piloto",
    title: "Bienvenida y recepción del cliente",
    detail: "Curso asignado del piloto: atención inicial, motivo de visita y ofrecimiento proactivo de bebestibles.",
    kind: "ASIGNADO",
    tab: "CURSOS",
    audiences: ["VENTAS"],
    date: "2026-09-21",
    contentId: "bienvenida-clientes",
  },
  {
    id: "upd-test-drive-piloto",
    title: "Test Drive",
    detail: "Curso asignado con documentación, rutas corta/larga, preparación de unidad y cierre de experiencia.",
    kind: "ASIGNADO",
    tab: "CURSOS",
    audiences: ["VENTAS"],
    date: "2026-09-21",
    contentId: "test-drive-piloto",
  },
  {
    id: "upd-cotizacion-pilot",
    title: "Cotización, presentación y seguimiento",
    detail: "Curso asignado: cotización en Pilot, explicación del presupuesto y seguimiento dentro de 24 horas.",
    kind: "ASIGNADO",
    tab: "CURSOS",
    audiences: ["VENTAS"],
    date: "2026-09-21",
    contentId: "cotizacion-pilot",
  },
  {
    id: "upd-convertir-lead",
    title: "Convertir un lead en una oportunidad",
    detail: "Nuevo recurso opcional con invitación a piso, Test Drive y tasación en línea de parte de pago.",
    kind: "NUEVO",
    tab: "CURSOS",
    audiences: ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"],
    date: "2026-09-21",
    contentId: "convertir-lead",
  },
  {
    id: "upd-pilot",
    title: "Uso efectivo de CRM Pilot",
    detail: "Nuevo microcurso adaptado desde el instructivo operativo de Ejecutivos de Ventas.",
    kind: "NUEVO",
    tab: "CURSOS",
    audiences: ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"],
    date: "2026-09-11",
    contentId: "pilot",
  },
  {
    id: "upd-entrega",
    title: "Preparación y entrega",
    detail: "Playbook actualizado: ahora comienza desde compra confirmada y cubre espera, preparación, entrega y postentrega.",
    kind: "ACTUALIZADO",
    tab: "PLAYBOOKS",
    audiences: ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "JUNIOR", "EXPERIENCIA"],
    date: "2026-09-11",
    contentId: "entrega",
  },
  {
    id: "upd-diagnostico",
    title: "Diagnóstico de necesidades",
    detail: "Mini módulo asignado al equipo de Ventas con avance inicial 0%.",
    kind: "ASIGNADO",
    tab: "CURSOS",
    audiences: ["VENTAS"],
    date: "2026-09-11",
    contentId: "diagnostico",
  },
  {
    id: "upd-junior",
    title: "Estándares Operacionales Ditalcar",
    detail: "Ruta Junior preparada para Recepción, Stock, Preparación, Control previo y Entrega.",
    kind: "NUEVO",
    tab: "CURSOS",
    audiences: ["JUNIOR", "JEFATURA", "EXPERIENCIA"],
    date: "2026-09-11",
    contentId: "estandares-junior",
  },
]

export type LibraryResource = {
  id: string
  title: string
  description: string
  category:
    | "PRODUCTO"
    | "ACCESORIOS"
    | "COMERCIAL"
    | "CRM"
    | "PROCESOS"
    | "OPERACIONES"
    | "ENTREGA"
    | "OTROS"
  documentType: string
  brand?: string
  model?: string
  variant?: string
  route: "NUEVOS" | "USADOS" | "AMBOS"
  audiences: AcademyAudience[]
  status: AcademyContentStatus
  documentState: "VIGENTE" | "ACTUALIZADO" | "POR_PUBLICAR"
  version: string
  validFrom?: string
  validTo?: string
  tags: string[]
  favoriteSeed?: boolean
  new?: boolean
  updated?: boolean
  sharePointPath?: string
  url?: string
}

export const academyLibraryResources: LibraryResource[] = [
  {
    id: "lib-c10",
    title: "Ficha Técnica Leapmotor C10",
    description: "Ficha de producto para consulta comercial por versión y motorización.",
    category: "PRODUCTO",
    documentType: "Ficha técnica",
    brand: "Leapmotor",
    model: "C10",
    route: "NUEVOS",
    audiences: ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA", "CASA_MATRIZ"],
    status: "PILOTO",
    documentState: "POR_PUBLICAR",
    version: "2026",
    tags: ["c10", "leapmotor", "ficha técnica", "producto"],
    favoriteSeed: true,
    sharePointPath: "Academia/Biblioteca/Producto/Leapmotor/C10",
  },
  {
    id: "lib-b10",
    title: "Ficha Técnica Leapmotor B10",
    description: "Ficha de producto para consulta comercial.",
    category: "PRODUCTO",
    documentType: "Ficha técnica",
    brand: "Leapmotor",
    model: "B10",
    route: "NUEVOS",
    audiences: ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA", "CASA_MATRIZ"],
    status: "PILOTO",
    documentState: "POR_PUBLICAR",
    version: "2026",
    tags: ["b10", "leapmotor", "ficha técnica", "producto"],
    sharePointPath: "Academia/Biblioteca/Producto/Leapmotor/B10",
  },
  {
    id: "lib-c3",
    title: "Ficha Técnica Citroën C3",
    description: "Documento técnico vigente para apoyar orientación y comparación.",
    category: "PRODUCTO",
    documentType: "Ficha técnica",
    brand: "Citroën",
    model: "C3",
    route: "NUEVOS",
    audiences: ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"],
    status: "PILOTO",
    documentState: "POR_PUBLICAR",
    version: "2026",
    tags: ["c3", "citroen", "ficha técnica"],
    sharePointPath: "Academia/Biblioteca/Producto/Citroen/C3",
  },
  {
    id: "lib-3008",
    title: "Ficha Técnica Peugeot 3008",
    description: "Ficha de producto y versiones para apoyo comercial.",
    category: "PRODUCTO",
    documentType: "Ficha técnica",
    brand: "Peugeot",
    model: "3008",
    route: "NUEVOS",
    audiences: ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"],
    status: "PILOTO",
    documentState: "POR_PUBLICAR",
    version: "2025/2026",
    tags: ["3008", "peugeot", "ficha técnica"],
    sharePointPath: "Academia/Biblioteca/Producto/Peugeot/3008",
  },
  {
    id: "lib-accesorios",
    title: "Catálogos de accesorios",
    description: "Categoría preparada para catálogos por marca/modelo desde Biblioteca de documentos SharePoint.",
    category: "ACCESORIOS",
    documentType: "Catálogo",
    route: "AMBOS",
    audiences: ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA", "CASA_MATRIZ"],
    status: "PILOTO",
    documentState: "POR_PUBLICAR",
    version: "Base",
    tags: ["accesorios", "catálogo"],
    new: true,
    sharePointPath: "Academia/Biblioteca/Accesorios",
  },
  {
    id: "lib-pilot",
    title: "Instructivo CRM Pilot · Ejecutivos de Ventas",
    description: "Material fuente del curso de contacto, clasificación, tareas y detalle de gestión.",
    category: "CRM",
    documentType: "Instructivo",
    route: "AMBOS",
    audiences: ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"],
    status: "PILOTO",
    documentState: "POR_PUBLICAR",
    version: "1",
    tags: ["pilot", "crm", "lead", "seguimiento"],
    updated: true,
    sharePointPath: "Academia/Biblioteca/CRM/Pilot",
  },
  {
    id: "lib-estandares",
    title: "Estándares Operacionales Ditalcar",
    description: "Documentos de apoyo para ejecución y control en el local.",
    category: "OPERACIONES",
    documentType: "Manual / checklist",
    route: "AMBOS",
    audiences: ["JUNIOR", "JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"],
    status: "PILOTO",
    documentState: "POR_PUBLICAR",
    version: "1",
    tags: ["estándares", "recepción", "stock", "preparación", "control previo"],
    sharePointPath: "Academia/Biblioteca/Operaciones/Estándares",
  },
  {
    id: "lib-entrega",
    title: "Recursos de preparación y entrega",
    description: "Checklists, documentos y material de apoyo asociado a preparación y entrega final.",
    category: "ENTREGA",
    documentType: "Checklist / guía",
    route: "AMBOS",
    audiences: ["VENTAS", "JEFATURA", "JUNIOR", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"],
    status: "PILOTO",
    documentState: "POR_PUBLICAR",
    version: "1",
    tags: ["entrega", "preparación", "control previo", "cliente final"],
    sharePointPath: "Academia/Biblioteca/Entrega",
  },
]

export type AcademyTeamProgress = {
  id: string
  name: string
  role: string
  brand: string
  local: string
  mandatoryProgress: number
  evaluationPass: number
  consultaObserved: number
  pendingEvaluations: number
  reinforcement: boolean
}

export const academyTeamProgress: AcademyTeamProgress[] = [
  {
    id: "team-01",
    name: "Equipo Ventas Vespucio",
    role: "Vendedores",
    brand: "Chery",
    local: "Vespucio",
    mandatoryProgress: 76,
    evaluationPass: 86,
    consultaObserved: 79,
    pendingEvaluations: 2,
    reinforcement: false,
  },
  {
    id: "team-02",
    name: "Equipo Ventas Vespucio · Renault",
    role: "Vendedores",
    brand: "Renault",
    local: "Vespucio",
    mandatoryProgress: 68,
    evaluationPass: 82,
    consultaObserved: 74,
    pendingEvaluations: 3,
    reinforcement: true,
  },
  {
    id: "team-03",
    name: "Equipo Geely Tobalaba",
    role: "Vendedores",
    brand: "Geely",
    local: "Geely Tobalaba",
    mandatoryProgress: 81,
    evaluationPass: 89,
    consultaObserved: 83,
    pendingEvaluations: 1,
    reinforcement: false,
  },
  {
    id: "team-04",
    name: "Equipo Astara Costanera",
    role: "Vendedores",
    brand: "Mitsubishi",
    local: "Astara Costanera",
    mandatoryProgress: 73,
    evaluationPass: 80,
    consultaObserved: 77,
    pendingEvaluations: 2,
    reinforcement: true,
  },
  {
    id: "team-05",
    name: "Junior Vespucio",
    role: "Junior",
    brand: "Multimarca",
    local: "Vespucio",
    mandatoryProgress: 61,
    evaluationPass: 84,
    consultaObserved: 0,
    pendingEvaluations: 2,
    reinforcement: true,
  },
]
