// Motor del Seguimiento de clientes (SOLO AUTOS NUEVOS).
// Cruza SIGA + Control de unidades + planilla T + registros de la app y decide,
// para cada NV, si corresponde enviar un aviso, revisar, no enviar o esperar.
// Criterios: "Guía general de seguimiento de clientes" (sept. 2026) y
// "Guía de mensajes por WhatsApp v5", más las definiciones de Experiencia (08-10-2026).

import {
  brandInfo, daysBetween, firstName, isBodega, localDisplay, localExclusion, localMatches, namesMatch,
  normKey, normPhone, normVin, titleCase, destinoDisplay,
} from "./segNormalize.js"
import { buildMessage, messageKind, MESSAGE_CARE, MESSAGE_TITLES, STAGE_LABELS } from "./segMessages.js"

export const DEFAULT_RULES = {
  // Indicado por Experiencia: en Stellantis se busca la encuesta de marca sólo con promotores.
  stellantisSoloPromotores: true,
  // "Compra confirmada" aplica a compras registradas recientemente.
  diasCompraReciente: 15,
  // "Recibido y en preparación": si la llegada al local tiene más días que esto, se revisa antes de avisar.
  diasVigenciaRecibido: 10,
  // Sólo se pide confirmar entregas con factura o recepción dentro de esta ventana.
  diasVentanaEntrega: 45,
  // Reintento tras "Sin respuesta": días hábiles de espera y máximo de intentos por etapa.
  diasReintento: 1,
  maxIntentos: 2,
}

const SENT = new Set(["ENVIADO", "LEIDO", "RESPONDIDO", "SIN_RESPUESTA", "REAGENDAR", "DERIVADO_EJECUTIVO", "DERIVADO_EXPERIENCIA", "DERIVADO_SUCURSAL", "GESTION_CERRADA"])
const EXPERIENCE_ROLES = new Set(["EXPERIENCIA_CLIENTES", "PROJECT_MANAGER"])
const NETWORK_VIEW_ROLES = new Set(["GERENCIA_COMERCIAL", "GERENCIA_VENTAS", "GERENCIA_GENERAL", "JEFATURA_COMERCIAL_CLIENTES"])

const MODEL_CODES = new Set(["GL", "GLS", "GLX", "MT", "AT", "CVT", "DCT", "DHT", "PHEV", "HEV", "EV", "LX", "XM", "GF", "GK", "SUV", "AWD", "2WD", "4WD", "TD", "DSS", "SLT", "SE", "LE", "GT", "RS", "XLT", "LTD", "KML"])

// "TIGGO 2 PRO MAX GL MT (EURO 6C)" -> "Tiggo 2 Pro Max GL MT" (sin la norma de emisiones entre paréntesis).
export function vehicleName(brand, modelo) {
  const clean = String(modelo || "").replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim()
  const pretty = clean.split(" ").map((w) => (MODEL_CODES.has(w.toUpperCase()) || /\d/.test(w) ? w.toUpperCase() : titleCase(w))).join(" ")
  return `${brand} ${pretty}`.trim()
}

export const BUCKETS = {
  enviar: "Enviar hoy",
  reintentar: "Reintentar",
  revisar: "Revisar antes de enviar",
  no_enviar: "No enviar",
  al_dia: "Al día",
  en_espera: "En espera de avance",
  fuera: "Fuera del seguimiento",
}

function businessDaysSince(iso) {
  if (!iso) return 99
  const start = new Date(`${iso.slice(0, 10)}T12:00:00Z`)
  const end = new Date()
  let days = 0
  const d = new Date(start)
  while (d < end) {
    d.setUTCDate(d.getUTCDate() + 1)
    if (d > end) break
    const day = d.getUTCDay()
    if (day !== 0 && day !== 6) days++
  }
  return days
}

function indexBy(records, keyFn) {
  const map = new Map()
  for (const r of records) {
    const k = keyFn(r)
    if (!k) continue
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(r)
  }
  return map
}

export function isFullViewer(user) {
  return EXPERIENCE_ROLES.has(user?.role) || user?.role === "ASISTENTE_GERENCIA"
}

export function canRegisterContacts(user) {
  return isFullViewer(user)
}

function userLocals(user) {
  return [user?.local, user?.localPrincipal, ...(Array.isArray(user?.assignedLocals) ? user.assignedLocals : [])].filter(Boolean)
}

export function brandMatchesUser(user, row) {
  const brands = (Array.isArray(user?.brands) ? user.brands : []).map(normKey)
  if (!brands.length) return false
  return brands.includes(normKey(row.marcaOriginal)) || brands.includes(normKey(row.marca)) ||
    (row.grupo === "STELLANTIS" && brands.includes("STELLANTIS")) || (row.grupo === "ASTARA" && brands.includes("ASTARA"))
}

export function isSellerOf(user, row) {
  return namesMatch(user?.name, row.vendedor)
}

export function isBranchHeadOf(user, row) {
  return user?.role === "JEFATURA_LOCAL" && userLocals(user).some((l) => localMatches(l, row.localOriginal))
}

// Detalle de clientes (09-10): sólo Experiencia, PM y Asistente de Gerencia.
// Con el interruptor "detallePropio", vendedores y jefaturas ven el detalle de sus propias NV.
export function canSeeRow(user, row, rules = {}) {
  if (isFullViewer(user)) return true
  if (rules.detallePropio && (isSellerOf(user, row) || isBranchHeadOf(user, row))) return true
  return false
}

// Ámbito de la vista "macro" (totales sin datos de clientes).
const MACRO_NETWORK_ROLES = new Set([
  "GERENCIA_COMERCIAL", "GERENCIA_VENTAS", "GERENCIA_GENERAL", "GERENCIA_ADMINISTRACION",
  "JEFATURA_OPERACIONES_COMERCIALES", "JEFATURA_MARKETING", "JEFATURA_ADMINISTRACION",
])
export function inMacroScope(user, row) {
  if (isFullViewer(user) || MACRO_NETWORK_ROLES.has(user?.role)) return true
  // Con locales asignados en 02_Usuarios, cada perfil queda limitado a ellos (vendedor de Vespucio = Vespucio).
  // Sin locales y con Alcance Red (por ejemplo, supervisión o call center), ve la red.
  if (user?.role !== "VENDEDOR" && !userLocals(user).length && user?.scope === "RED") return true
  if (["GERENCIA_MARCA", "JEFATURA_MARCA", "JEFATURA_ZONAL"].includes(user?.role)) {
    return brandMatchesUser(user, row) || userLocals(user).some((l) => localMatches(l, row.localOriginal))
  }
  if (["JEFATURA_LOCAL", "ASISTENTE_JUNIOR", "ADMINISTRATIVO"].includes(user?.role)) {
    return userLocals(user).some((l) => localMatches(l, row.localOriginal))
  }
  if (user?.role === "VENDEDOR") return isSellerOf(user, row)
  return false
}

// ---------- reclamos: quién atiende cada nivel ----------
export const CLAIM_LEVELS = ["SUCURSAL", "MARCA", "COMERCIAL"]
export const CLAIM_LEVEL_LABELS = { SUCURSAL: "Jefatura de sucursal", MARCA: "Gerencia de marca", COMERCIAL: "Gerencia comercial" }

export function canActOnClaim(user, claim) {
  const row = { localOriginal: claim.local, marca: claim.marca, marcaOriginal: claim.marca, grupo: claim.grupo }
  if (claim.nivel === "SUCURSAL") return isBranchHeadOf(user, row)
  if (claim.nivel === "MARCA") return ["GERENCIA_MARCA", "JEFATURA_MARCA"].includes(user?.role) && brandMatchesUser(user, row)
  if (claim.nivel === "COMERCIAL") return ["GERENCIA_COMERCIAL", "GERENCIA_VENTAS", "GERENCIA_GENERAL"].includes(user?.role)
  return false
}

export function canSeeClaim(user, claim) {
  if (isFullViewer(user) || NETWORK_VIEW_ROLES.has(user?.role)) return true
  if (String(claim.creadoPorEmail).toLowerCase() === String(user?.email).toLowerCase()) return true
  const row = { localOriginal: claim.local, marca: claim.marca, marcaOriginal: claim.marca, grupo: claim.grupo }
  if (isBranchHeadOf(user, row)) return true
  if (["GERENCIA_MARCA", "JEFATURA_MARCA"].includes(user?.role) && brandMatchesUser(user, row) && claim.nivel !== "SUCURSAL") return true
  return false
}

// Experiencia ve todos los reclamos, pero sólo opina cuando le piden ayuda.
export function canCommentClaim(user, claim) {
  if (EXPERIENCE_ROLES.has(user?.role)) return claim.ayudaSolicitada
  return canActOnClaim(user, claim) || user?.role === "ASISTENTE_GERENCIA" ||
    String(claim.creadoPorEmail).toLowerCase() === String(user?.email).toLowerCase()
}

// ---------- motor ----------
export function computeSeguimiento({ siga, control, traslados }, seg, rules = DEFAULT_RULES, { remitente = "" } = {}) {
  const today = new Date().toISOString().slice(0, 10)
  const controlRecords = Object.values(control?.records || {})
  const controlByNv = new Map(controlRecords.filter((r) => r.nv).map((r) => [r.nv, r]))
  const controlByVin = new Map(controlRecords.filter((r) => r.vin).map((r) => [r.vin, r]))
  const trasladoRecords = Object.values(traslados?.records || {}).filter((r) => r.fecha)
  const trasByVin = indexBy(trasladoRecords, (r) => r.vin)
  const trasByNv = indexBy(trasladoRecords, (r) => r.nv)

  const contactsByNv = indexBy(seg.contactos, (c) => c.nv)
  const contactsByRut = indexBy(seg.contactos, (c) => c.rut)
  const blockedRut = new Map()
  const blockedPhone = new Map()
  for (const c of seg.contactos) {
    if (c.result === "NO_CONTACTAR") {
      if (c.rut) blockedRut.set(c.rut, "El cliente pidió no recibir mensajes")
      if (c.phone) blockedPhone.set(c.phone, "El cliente pidió no recibir mensajes")
    }
    if (c.result === "NUMERO_INCORRECTO" && c.phone && !blockedPhone.has(c.phone)) {
      blockedPhone.set(c.phone, "Teléfono marcado como incorrecto o sin WhatsApp")
    }
  }
  const openClaims = seg.reclamos.filter((r) => r.estado !== "CERRADO")
  const openClaimByNv = new Map(openClaims.filter((r) => r.nv).map((r) => [r.nv, r]))
  const openClaimByRut = new Map(openClaims.filter((r) => r.rut).map((r) => [r.rut, r]))

  const rows = []
  for (const s of Object.values(siga?.records || {})) {
    const nv = s.nv
    const info = brandInfo(s.marca)
    const vin = normVin(s.vin) || normVin(controlByNv.get(nv)?.vin)
    const ctrl = controlByNv.get(nv) || (vin ? controlByVin.get(vin) : null) || null
    const trasList = [...(vin ? trasByVin.get(vin) || [] : []), ...(trasByNv.get(nv) || [])]
      .filter((t, i, arr) => arr.findIndex((x) => x.fecha === t.fecha && x.destino === t.destino) === i)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
    const llegadaLocal = trasList.find((t) => !isBodega(t.destino, s.local))
    const fechaRecepcion = llegadaLocal?.fecha || s.fechaRecepcion || ""
    const enCamino = Boolean(vin && ctrl && (ctrl.fechaLlegada || ctrl.llegadaMes))
    const entrega = seg.entregas[nv] || null
    const phone = normPhone(s.celular, s.telefono)

    let stage = 1
    if (enCamino) stage = 2
    if (fechaRecepcion) stage = 3
    if (entrega?.entregado) stage = 4

    const contactos = [...(contactsByNv.get(nv) || []), ...((contactsByRut.get(s.rut) || []).filter((c) => !c.nv))]
      .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    const sentStages = contactos.filter((c) => SENT.has(c.result)).map((c) => c.stage)
    const maxContacted = sentStages.length ? Math.max(...sentStages) : 0
    const kind = messageKind(stage, info.group)

    const row = {
      nv,
      fechaNV: s.fechaNV,
      marca: info.brand,
      marcaOriginal: s.marca,
      grupo: info.group,
      modelo: vehicleName("", s.modelo),
      vin,
      color: titleCase(s.color),
      localOriginal: s.local,
      local: localDisplay(s.local),
      vendedor: titleCase(s.vendedor),
      cliente: titleCase(s.cliente),
      rut: s.rut,
      telefono: phone.phone,
      telefonoValido: phone.valid,
      email: s.email,
      fechaFactura: s.fechaFactura,
      fechaRecepcion,
      recepcionFuente: llegadaLocal ? `Planilla T · ${destinoDisplay(llegadaLocal.destino)}` : s.fechaRecepcion ? "SIGA" : "",
      llegadaEsperada: ctrl ? (ctrl.fechaLlegada || ctrl.llegadaMes || "") : "",
      destinoControl: ctrl ? destinoDisplay(ctrl.destino) : "",
      entrega,
      etapa: stage,
      etapaLabel: STAGE_LABELS[stage],
      maxContactada: maxContacted,
      ultimoContacto: contactos[0] || null,
      totalContactos: contactos.length,
      bucket: "",
      motivo: "",
      letraChica: "",
      mensajeTipo: "",
      confirmarEntrega: false,
      entregaPrioritaria: false,
    }

    // ¿Debe el ejecutivo confirmar la entrega? (Fec.Entrega Real de SIGA no es confiable)
    const df = daysBetween(s.fechaFactura, today)
    const dr = daysBetween(fechaRecepcion, today)
    const entregaProbable = df !== null && dr !== null && df >= 7 && dr >= 7 // regla 7 + 7
    const ultimoHito = Math.min(...[df, dr].filter((d) => d !== null), 9999)
    if (!s.nula && !entrega && (fechaRecepcion || s.fechaFactura) && ultimoHito <= rules.diasVentanaEntrega) {
      row.confirmarEntrega = true
      row.entregaPrioritaria = entregaProbable
    }
    const review = seg.revisiones[`${nv}_${stage}`]

    const exclusion = localExclusion(s.local) || info.excluded
    if (exclusion) {
      row.bucket = "fuera"
      row.letraChica = exclusion
      row.confirmarEntrega = false
    } else if (s.nula) {
      row.bucket = "no_enviar"
      row.motivo = "NV nula en SIGA"
      row.confirmarEntrega = false
    } else if (openClaimByNv.get(nv) || openClaimByRut.get(s.rut)) {
      const claim = openClaimByNv.get(nv) || openClaimByRut.get(s.rut)
      row.bucket = "no_enviar"
      row.motivo = `Reclamo abierto (${claim.id}): no se envían avances mientras esté pendiente`
    } else if (stage <= maxContacted) {
      const lastForStage = contactos.find((c) => c.stage === stage)
      const attempts = contactos.filter((c) => c.stage === stage && SENT.has(c.result)).length
      if (lastForStage?.result === "SIN_RESPUESTA" && attempts < rules.maxIntentos && businessDaysSince(lastForStage.at) >= rules.diasReintento) {
        row.bucket = "reintentar"
        row.motivo = `Sin respuesta al ${MESSAGE_TITLES[messageKind(stage, info.group)] || STAGE_LABELS[stage]}`
        row.mensajeTipo = messageKind(stage, info.group)
      } else {
        row.bucket = "al_dia"
        row.motivo = stage === maxContacted ? `Ya contactado en “${STAGE_LABELS[stage]}”` : `Ya se contactó una etapa posterior (“${STAGE_LABELS[maxContacted]}”)`
      }
    } else if (stage === 1 && daysBetween(s.fechaNV, today) > rules.diasCompraReciente) {
      row.bucket = "en_espera"
      row.motivo = `Compra de hace más de ${rules.diasCompraReciente} días sin nuevo hito: se espera “En camino”`
    } else if (stage === 3 && entregaProbable) {
      row.bucket = "en_espera"
      row.motivo = "Entrega probable (7 días desde factura y recepción): falta que el ejecutivo la confirme para enviar la encuesta"
    } else if (review?.decision === "NO_ENVIAR") {
      row.bucket = "no_enviar"
      row.motivo = `Revisión manual: no enviar${review.nota ? ` (${review.nota})` : ""}`
    } else {
      row.mensajeTipo = kind
      const claim = openClaimByNv.get(nv) || openClaimByRut.get(s.rut)
      if (claim) { row.bucket = "no_enviar"; row.motivo = `Reclamo abierto (${claim.id}): no se envían avances mientras esté pendiente` }
      else if (blockedRut.get(s.rut) || blockedPhone.get(phone.phone)) { row.bucket = "no_enviar"; row.motivo = blockedRut.get(s.rut) || blockedPhone.get(phone.phone) }
      else if (!phone.valid) { row.bucket = "no_enviar"; row.motivo = "Teléfono no apto para WhatsApp (fijo, incompleto o vacío)" }
      else if (!s.cliente) { row.bucket = "revisar"; row.motivo = "Faltan datos del cliente" }
      else if (stage === 4 && info.group === "GEELY" && review?.decision !== "APROBADO") {
        row.bucket = "revisar"; row.motivo = "Geely: el aviso de entrega requiere revisión manual"
      } else if (stage === 3 && daysBetween(fechaRecepcion > s.fechaNV ? fechaRecepcion : s.fechaNV, today) > rules.diasVigenciaRecibido && review?.decision !== "APROBADO") {
        const dias = daysBetween(fechaRecepcion > s.fechaNV ? fechaRecepcion : s.fechaNV, today)
        row.bucket = "revisar"; row.motivo = `Está en el local hace ${dias} días y no se ha avisado: confirmar que sigue en preparación antes de enviar`
      } else if (stage === 4 && info.group === "STELLANTIS" && rules.stellantisSoloPromotores && entrega?.percepcion !== "PROMOTOR") {
        row.bucket = "no_enviar"
        row.motivo = "Regla Stellantis: el Aviso 4 se envía sólo cuando el ejecutivo marcó al cliente como promotor"
      } else {
        row.bucket = "enviar"
        row.motivo = maxContacted > 0 && maxContacted < stage - 1 ? "Se avisa la etapa más avanzada respaldada (se omiten etapas intermedias)" : ""
      }
    }

    if (row.mensajeTipo && ["enviar", "reintentar"].includes(row.bucket)) {
      row.mensajeTitulo = MESSAGE_TITLES[row.mensajeTipo]
      row.mensajeCuidado = MESSAGE_CARE[row.mensajeTipo]
      row.mensaje = buildMessage(row.mensajeTipo, {
        clienteNombre: firstName(s.cliente),
        remitente: firstName(remitente),
        sucursal: row.local,
        vehiculo: vehicleName(info.brand, s.modelo),
      })
    }
    rows.push(row)
  }

  // Anti-duplicados: un mismo cliente (RUT o teléfono) recibe un solo aviso por corte.
  const groups = indexBy(rows.filter((r) => r.bucket === "enviar"), (r) => r.rut || r.telefono)
  for (const list of groups.values()) {
    if (list.length < 2) continue
    list.sort((a, b) => b.etapa - a.etapa || String(b.fechaNV).localeCompare(String(a.fechaNV)))
    for (const dup of list.slice(1)) {
      dup.bucket = "no_enviar"
      dup.motivo = `Mismo cliente: se contacta por la NV ${list[0].nv} (etapa más avanzada)`
      dup.mensaje = ""
    }
  }

  rows.sort((a, b) => String(b.fechaNV).localeCompare(String(a.fechaNV)))
  const counts = Object.fromEntries(Object.keys(BUCKETS).map((k) => [k, rows.filter((r) => r.bucket === k).length]))
  return { rows, counts, generatedAt: new Date().toISOString() }
}

export function trasladosForRow(row, traslados) {
  const list = Object.values(traslados?.records || {}).filter((t) => t.fecha).filter((t) => (row.vin && t.vin === row.vin) || (t.nv && t.nv === row.nv))
  return list.sort((a, b) => a.fecha.localeCompare(b.fecha)).map((t) => ({
    fecha: t.fecha, retiro: destinoDisplay(t.retiro), destino: destinoDisplay(t.destino),
    llegadaLocal: !isBodega(t.destino, row.localOriginal), tipo: t.tipo, estado: t.estado,
  }))
}
