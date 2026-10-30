// Mensajes de WhatsApp: textos oficiales de la "Guía de mensajes por WhatsApp v5"
// (Experiencia de Clientes, julio 2026). No modificar el sentido de los mensajes.

export const ENCUESTA_DITALCAR_URL = "https://forms.cloud.microsoft/r/J3H8RyYiLh"

export const STAGE_LABELS = {
  1: "Compra confirmada",
  2: "En camino",
  3: "Recibido y en preparación",
  4: "Entregado",
}

export function messageKind(stage, group) {
  if (stage === 4) return group === "STELLANTIS" ? "ENCUESTA_MARCA" : "ENCUESTA_DITALCAR"
  return ["", "COMPRA_CONFIRMADA", "EN_CAMINO", "RECIBIDO"][stage] || ""
}

export const MESSAGE_TITLES = {
  COMPRA_CONFIRMADA: "Aviso 1 · Compra confirmada",
  EN_CAMINO: "Aviso 2 · Vehículo en camino",
  RECIBIDO: "Aviso 3 · Vehículo recibido y en preparación",
  ENCUESTA_MARCA: "Aviso 4 · Encuesta de marca y Ditalcar Rewards",
  ENCUESTA_DITALCAR: "Aviso 5 · Encuesta de experiencia Ditalcar",
}

const BODIES = {
  COMPRA_CONFIRMADA: (v) => `Queremos contarte que la compra de tu ${v.vehiculo} ya está confirmada ✅\n\nDesde ahora comenzamos a coordinar los pasos necesarios para su llegada, preparación y entrega. Durante el proceso te iremos manteniendo informado sobre los avances.\n\n¡Gracias por confiar en Ditalcar!`,
  EN_CAMINO: (v) => `Tenemos una buena noticia: tu ${v.vehiculo} ya viene en camino hacia nuestras instalaciones 🚗\n\nCuando llegue, comenzaremos con su recepción, revisión, documentación y preparación para la entrega. Todavía quedan algunos pasos, pero queríamos mantenerte al tanto de este avance.\n\nApenas tengamos novedades sobre su llegada, te volveremos a contactar.`,
  RECIBIDO: (v) => `Te contamos que tu ${v.vehiculo} ya llegó a nuestra sucursal ✅\n\nAhora estamos realizando la recepción, revisión, preparación final y los trámites necesarios para su entrega.\n\nCuando todo esté completamente listo, tu ejecutivo de venta se comunicará contigo para coordinar el día y horario. ¡Cada vez falta menos!`,
  ENCUESTA_MARCA: (v) => `Esperamos que estés disfrutando tu nuevo ${v.vehiculo}, o que ya estés próximo a recibirlo.\n\nDurante los próximos días podrías recibir una encuesta enviada por la marca. Tu respuesta es muy importante porque nos ayuda a seguir mejorando la experiencia de nuestros clientes.\n\nDespués de responderla, puedes enviarnos un comprobante para acceder a los beneficios informados de Ditalcar Rewards 🎁\n\nNos interesa que respondas de acuerdo con tu experiencia real.`,
  ENCUESTA_DITALCAR: (v) => `Esperamos que estés disfrutando tu nuevo ${v.vehiculo} 🚗\n\nQueremos conocer cómo fue tu experiencia de compra y entrega con Ditalcar. Te enviaremos una encuesta muy breve, que toma menos de un minuto:\n${ENCUESTA_DITALCAR_URL}\n\nTu respuesta nos ayuda a mantener lo que hacemos bien y a mejorar aquellos aspectos en que todavía podemos avanzar.\n\nMuchas gracias por tu tiempo.`,
}

export const MESSAGE_CARE = {
  COMPRA_CONFIRMADA: "Si pregunta por una fecha de entrega: “Aún no contamos con una fecha definitiva confirmada. Apenas tengamos un avance validado, te lo informaremos.”",
  EN_CAMINO: "Si pregunta cuándo llegará: “El vehículo se encuentra en traslado y la fecha puede variar por la operación logística. Te confirmaremos cuando haya llegado efectivamente.”",
  RECIBIDO: "Si solicita retirarlo de inmediato: “Aún se encuentra en preparación. Para evitar que vengas antes de que esté listo, espera la confirmación de tu ejecutivo.”",
  ENCUESTA_MARCA: "Nunca pedir una calificación específica ni relacionar el beneficio con una nota positiva. El beneficio corresponde a responder y enviar el comprobante.",
  ENCUESTA_DITALCAR: "Si el cliente informa un problema, no insistir con la encuesta. Registrar el caso y derivarlo antes de continuar.",
}

export const RECLAMO_MESSAGE = "Lamentamos lo que nos comentas. Gracias por informarnos. Vamos a dejar registrada la situación para que sea revisada por el área correspondiente. ¿Podrías contarnos brevemente qué ocurrió y desde cuándo?"

export function buildMessage(kind, { clienteNombre, remitente, sucursal, vehiculo }) {
  const body = BODIES[kind]
  if (!body) return ""
  return `Hola, ${clienteNombre || "[Nombre]"} 👋\nSoy ${remitente || "[Nombre]"}, del equipo de Ditalcar ${sucursal || "[Sucursal]"}.\n\n${body({ vehiculo: vehiculo || "[Marca y modelo]" })}\n\nQuedamos atentos si tienes alguna duda.`
}

// Respuestas predeterminadas (guía v5, "Cómo responder situaciones frecuentes").
export const QUICK_RESPONSES = [
  { id: "ENVIADO", label: "Mensaje enviado", result: "ENVIADO" },
  { id: "AGRADECE", label: "El cliente agradece", result: "RESPONDIDO", observacion: "Contactado – informado", sugerencia: "¡Gracias a ti! Seguiremos manteniéndote informado." },
  { id: "SIN_RESPUESTA", label: "No responde", result: "SIN_RESPUESTA", observacion: "Intento sin respuesta", proximaAccion: "Volver a contactar otro día hábil" },
  { id: "PIDE_EJECUTIVO", label: "Pide hablar con su ejecutivo", result: "DERIVADO_EJECUTIVO", derivadoA: "Ejecutivo", sugerencia: "Le comentaremos a tu ejecutivo para que se comunique contigo." },
  { id: "PREGUNTA_FECHA", label: "Pregunta por fecha de entrega", result: "RESPONDIDO", observacion: "Preguntó por fecha de entrega", sugerencia: "Responder sólo con información confirmada; no estimar ni prometer fechas." },
  { id: "RECLAMO", label: "Tiene un reclamo o problema", result: "DERIVADO_SUCURSAL", derivadoA: "Jefe de sucursal", sugerencia: RECLAMO_MESSAGE, abreReclamo: true },
  { id: "NUMERO_INCORRECTO", label: "Número incorrecto", result: "NUMERO_INCORRECTO", observacion: "Número incorrecto" },
  { id: "NO_CONTACTAR", label: "Pide no recibir mensajes", result: "NO_CONTACTAR", observacion: "Pidió no recibir mensajes", sugerencia: "Confirmar que se respetará su solicitud." },
]
