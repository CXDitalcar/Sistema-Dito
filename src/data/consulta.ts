export type ConsultaStep = {
  code: string
  title: string
  subtitle: string
  meaning: string
  actions: string[]
  avoid: string[]
  example: string
}

export const consultaSteps: ConsultaStep[] = [
  {code:"C",title:"Conectar",subtitle:"Recibir y generar confianza",meaning:"La experiencia comienza antes de hablar del vehículo. El cliente debe sentirse recibido, orientado y cómodo.",actions:["Saludar y presentarte","Ofrecer café o agua","Acomodar al cliente y su familia"],avoid:["Ir directo al precio","Dejar esperando sin contexto"],example:"Bienvenido. Antes de ver opciones, cuéntame qué estás buscando y para qué lo necesitas."},
  {code:"O",title:"Observar",subtitle:"Entender contexto y señales",meaning:"No basta con preguntar qué auto quiere. Hay que entender su realidad, uso y limitaciones.",actions:["Preguntar uso principal","Detectar comodidad, espacio, consumo o seguridad","Observar señales del cliente"],avoid:["Asumir necesidades","Mostrar demasiadas opciones"],example:"Si transporta a un adulto mayor, puede valorar acceso cómodo y una conducción más suave."},
  {code:"N",title:"Necesidad",subtitle:"Traducir contexto en recomendación",meaning:"La recomendación debe conectar la realidad del cliente con atributos concretos del vehículo.",actions:["Resumir lo entendido","Priorizar 2 o 3 atributos","Explicar por qué una opción calza mejor"],avoid:["Recitar ficha técnica","Recomendar solo por disponibilidad"],example:"Por lo que me contaste, priorizaría automático, buen acceso y cámara."},
  {code:"S",title:"Sugerir",subtitle:"Mostrar la mejor alternativa",meaning:"Presentar opciones de forma consultiva, simple y comparable.",actions:["Una opción principal + una alternativa","Guiar recorrido","Invitar al puesto piloto"],avoid:["Abrumar con opciones","Hablar solo de descuento"],example:"Primero muestra la opción que mejor cumple la necesidad y luego una alternativa."},
  {code:"U",title:"Usar",subtitle:"Llevar la decisión a la experiencia",meaning:"El test drive refuerza la decisión desde la experiencia real.",actions:["Ofrecer test drive ante interés","Usar modelo de la marca si corresponde","Conectar sensaciones con necesidades"],avoid:["Esperar que el cliente lo pida","Tratarlo como trámite"],example:"Probémoslo para que puedas sentir la altura, dirección y comodidad que conversamos."},
  {code:"L",title:"Lograr acuerdo",subtitle:"Condiciones claras y sin sorpresas",meaning:"Precio, pie, financiamiento y condiciones deben quedar entendibles.",actions:["Explicar condiciones","Validar dudas","Gestionar alternativas financieras"],avoid:["Prometer aprobación","Dejar costos para el final"],example:"Estas son las condiciones reales hoy. Si cambia algo, te lo explico primero."},
  {code:"T",title:"Trazar",subtitle:"Acompañar hasta la entrega",meaning:"Después del pago el cliente sigue necesitando información y acompañamiento.",actions:["Informar estado","Coordinar preparación y entrega","No asegurar fechas sin confirmación"],avoid:["Desaparecer después del pago","Informar sin validar"],example:"Compra registrada → en camino → falta poco → entregado."},
  {code:"A",title:"Acompañar",subtitle:"Cerrar bien y abrir la relación futura",meaning:"La entrega no termina la relación. El seguimiento permite corregir, fidelizar y abrir recompra.",actions:["Contactar post entrega","Confirmar que todo vaya bien","Dejar canal abierto"],avoid:["Contactar solo para pedir encuesta","Esperar meses"],example:"Quería confirmar que todo vaya bien con tu vehículo. Si necesitas algo, escríbeme directamente."}
]
