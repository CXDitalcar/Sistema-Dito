// Medición Frogmi (estándar acordado con Experiencia, 07-09 / 30-09 / 08-10-2026).
//
// - Universo = VIN del "Informe de Notificación de Venta (Chile)", corte del 16 al 15
//   (el corte "2026-09" va del 16/08 al 15/09), deduplicado por VIN.
// - Local y vendedor oficiales: cruce con SIGA por VIN. Sin cruce = fuera (se informa).
// - Exclusiones: Flota (local o tipo de venta), Usados, Administración y NV nula.
// - Junior oficial: 4 formularios (Recepción, Stock, Control previo, Preparación)
//   sobre los VIN de locales activos. Entrega se mide aparte, por vendedor, sobre
//   todos los VIN evaluables (1 entrega por VIN; sobre el 80% entra al sorteo).
// - Un formulario cuenta aunque se haya hecho antes del corte, si es del mismo VIN.
// - El VIN digitado se cruza por los últimos caracteres del VIN completo, tolerando
//   O/0 e I/1. Si el cruce no es exacto (1 carácter distinto u omitido, o varios
//   candidatos), queda pendiente de aprobación de Experiencia/PM; lo aprobado se
//   guarda y se reutiliza. Solo cruces exactos o aprobados suman.
// - Lectura operativa ajustada: Recepción contra traslados reales al local
//   (planilla T); Stock igual que la oficial (sin planilla de stock); Control y
//   Preparación con arrastres (no se exige a unidades que llegaron después del
//   corte y se suman las del corte anterior que llegaron en este).

import { frogmiLocal } from "./datosParsers.js"
import { isBodega, normKey, normText, titleCase } from "./segNormalize.js"

export const JUNIOR_FORMS = [
  { key: "RECEPCION", label: "Recepción" },
  { key: "STOCK", label: "Stock" },
  { key: "CONTROL", label: "Control previo" },
  { key: "PREPARACION", label: "Preparación" },
]
export const ENTREGA_FORM = { key: "ENTREGA", label: "Entrega a cliente final" }

export const JUNIOR_LOCALS = [
  { key: "TOBALABA", label: "Tobalaba" },
  { key: "NORTE", label: "Norte" },
  { key: "CANTAGALLO", label: "Cantagallo" },
  { key: "ALAMEDA", label: "Alameda" },
  { key: "VESPUCIO", label: "Vespucio" },
  { key: "COSTANERA", label: "Costanera" },
  { key: "FLORIDA", label: "Florida" },
]
export const DEFAULT_ACTIVE = { TOBALABA: true, NORTE: true, CANTAGALLO: true, ALAMEDA: true, VESPUCIO: false, COSTANERA: false, FLORIDA: false }

// Tour Manager: 2 formularios por local al mes (1 por quincena). NT FJR Stellantis excluido.
export const TM_LOCALS = [
  { key: "CANTAGALLO", label: "Cantagallo", junior: "CANTAGALLO" },
  { key: "ALAMEDA", label: "MP Alameda", junior: "ALAMEDA" },
  { key: "NORTE", label: "MP Norte", junior: "NORTE" },
  { key: "TOBALABA_CHERY", label: "MPT Chery/Exeed", junior: "TOBALABA" },
  { key: "TOBALABA_MMC", label: "MPT MMC", junior: "TOBALABA" },
  { key: "VESPUCIO", label: "Vespucio", junior: "VESPUCIO" },
  { key: "COSTANERA", label: "Astara Costanera", junior: "COSTANERA" },
]

export const UMBRAL = 0.8

// Cierres anteriores (PDF "Evolutivo de mediciones Frogmi v3", 30-09-2026).
export const EVOLUTIVO_BASE = [
  { corte: "2026-01", estado: "SIN_CIERRE", nota: "Sin cierre consolidado localizado" },
  { corte: "2026-02", estado: "SIN_CIERRE", nota: "Sin cierre consolidado localizado" },
  { corte: "2026-03", estado: "SIN_CIERRE", nota: "Sin cierre consolidado localizado" },
  { corte: "2026-04", estado: "SIN_CIERRE", nota: "Sin cierre consolidado localizado" },
  { corte: "2026-05", estado: "INICIO", nota: "Inicio del primer período (15/05 al 15/06)" },
  { corte: "2026-06", estado: "CIERRE", periodo: "15/05-15/06", notificados: 85, evaluados: 70, junior: 33.9, juniorTxt: "95/280", entrega: 45.7, entregaTxt: "32/70", tourManager: 75.0, tourManagerTxt: "9/12", nota: "Tour Manager homologado sin NT FJR (original 9/16)" },
  { corte: "2026-07", estado: "CIERRE", periodo: "15/06-15/07", notificados: 102, evaluados: 77, junior: 39.9, juniorTxt: "39,9%", entrega: 44.2, entregaTxt: "34/77", tourManager: 75.0, tourManagerTxt: "9/12", nota: "Mejor cierre oficial comparable" },
  { corte: "2026-08", estado: "CIERRE", periodo: "15/07-15/08", notificados: 159, evaluados: 107, junior: 32.2, juniorTxt: "32,2%", juniorAjustado: 41.6, entrega: 41.1, entregaTxt: "44/107", tourManager: 66.7, tourManagerTxt: "8/12", nota: "Junior ajustado 170/409 = 41,6%" },
  { corte: "2026-09", estado: "CIERRE", periodo: "15/08-15/09", notificados: 215, evaluados: 73, junior: 30.5, juniorTxt: "89/292", entrega: 22.3, entregaTxt: "21/94", tourManager: 80.0, tourManagerTxt: "8/10", nota: "Costanera y Vespucio fuera (Frogmi no activo)" },
]

const pad = (n) => String(n).padStart(2, "0")

export function corteOf(date) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(date || ""))) return ""
  let [y, m, d] = date.slice(0, 10).split("-").map(Number)
  if (d > 15) { m += 1; if (m > 12) { m = 1; y += 1 } }
  return `${y}-${pad(m)}`
}

export function corteRange(corte) {
  const [y, m] = corte.split("-").map(Number)
  const py = m === 1 ? y - 1 : y
  const pm = m === 1 ? 12 : m - 1
  return { desde: `${py}-${pad(pm)}-16`, hasta: `${y}-${pad(m)}-15`, label: `15/${pad(pm)}/${py} al 15/${pad(m)}/${y}` }
}

export function prevCorte(corte) {
  const [y, m] = corte.split("-").map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`
}

// O/0, Q/0 e I/1 se tratan como iguales al comparar.
export function canonVin(value) {
  return normKey(value).replace(/[OQ]/g, "0").replace(/I/g, "1")
}

function levenshtein(a, b) {
  if (a === b) return 0
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let last = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, last + (a[i - 1] === b[j - 1] ? 0 : 1))
      last = tmp
    }
  }
  return prev[b.length]
}

export function approvalKey(local, digitado) {
  return `${local || "SIN_LOCAL"}|${normKey(digitado)}`
}

/**
 * Cruza un VIN digitado con el pool de VIN conocidos.
 * @returns {{status:"EXACTO"|"MINI"|"APROBADO"|"PENDIENTE"|"RECHAZADO"|"SIN_CRUCE", vin?:string, candidatos?:{vin:string,score:number}[], metodo:string}}
 */
export function matchVin(digitado, local, pool, approvals = {}) {
  const d = canonVin(digitado)
  const approval = approvals[approvalKey(local, digitado)]
  if (approval?.decision === "APROBADO" && approval.vin) return { status: "APROBADO", vin: approval.vin, metodo: "Cruce aprobado" }
  if (d.length < 5) return { status: "SIN_CRUCE", metodo: d ? "VIN digitado incompleto" : "Sin VIN digitado" }
  if (d.length >= 17) {
    const exact = pool.byCanon.get(d)
    if (exact) return { status: "EXACTO", vin: exact.vin, metodo: "VIN completo" }
  }
  const suffix = pool.list.filter((p) => p.canon.endsWith(d))
  const sameLocal = suffix.filter((p) => !local || !p.local || p.local === local)
  const unique = sameLocal.length === 1 ? sameLocal : suffix.length === 1 ? suffix : null
  if (unique && d.length < 17) return { status: "MINI", vin: unique[0].vin, metodo: "Mini VIN único" }
  if (approval?.decision === "RECHAZADO") return { status: "RECHAZADO", metodo: "Cruce rechazado" }

  // Similitud: 1 carácter distinto u omitido (mini VIN) o hasta 2 en VIN largos.
  let candidatos = []
  if (sameLocal.length > 1) {
    candidatos = sameLocal.map((p) => ({ vin: p.vin, score: 0.95 }))
  } else {
    const scope = pool.list.filter((p) => !local || !p.local || p.local === local)
    for (const p of scope) {
      let dist
      if (d.length >= 15) dist = levenshtein(d, p.canon)
      else dist = Math.min(levenshtein(d, p.canon.slice(-d.length)), levenshtein(d, p.canon.slice(-(d.length + 1))))
      const max = d.length >= 15 ? 2 : 1
      if (dist <= max) candidatos.push({ vin: p.vin, score: Math.round((1 - dist / Math.max(d.length, 1)) * 100) / 100 })
    }
  }
  candidatos = candidatos.sort((a, b) => b.score - a.score).slice(0, 4)
  if (candidatos.length) {
    return { status: "PENDIENTE", candidatos, metodo: sameLocal.length > 1 ? "Varios VIN posibles" : "VIN similar (1 carácter)" }
  }
  return { status: "SIN_CRUCE", metodo: "Sin VIN que calce" }
}

function arrivalFor(vin, local, trasByVin, siga) {
  const list = (trasByVin.get(vin) || []).filter((t) => t.fecha && !isBodega(t.destino, siga?.local || "")).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const own = list.find((t) => !local || frogmiLocal(t.destino) === local) || list[0]
  return own?.fecha || siga?.fechaRecepcion || ""
}

function exclusionFor(n, siga) {
  const local = normKey(siga?.local)
  if (normText(n.tipoVenta).includes("FLOTA") || local.includes("FLOTA")) return "Flota"
  if (local.includes("USADO")) return "Usados"
  if (local.includes("ADMINISTRACION")) return "Administración"
  if (siga?.nula) return "NV nula"
  if (!siga) return "Sin cruce con SIGA"
  if (!frogmiLocal(siga.local)) return "Local sin medición Frogmi"
  return ""
}

const pct = (ok, total) => (total ? Math.round((ok * 1000) / total) / 10 : null)

/**
 * Calcula la medición de un corte.
 * @param masters { notificados, frogmi, siga, traslados }
 * @param config  { activos: {corte:{LOCAL:bool}}, aprobaciones: {key:{vin,decision}}, tourManager: {corte:{TMLOCAL:[fecha]}} }
 */
export function computeFrogmi(masters, config = {}, corteParam = "") {
  const notifAll = Object.values(masters.notificados?.records || {}).filter((n) => n.notificado !== false)
  const forms = Object.values(masters.frogmi?.records || {})
  const sigaList = Object.values(masters.siga?.records || {})
  const sigaByVin = new Map(sigaList.filter((s) => s.vin).map((s) => [s.vin, s]))
  const trasList = Object.values(masters.traslados?.records || {}).filter((t) => t.vin)
  const trasByVin = new Map()
  for (const t of trasList) { if (!trasByVin.has(t.vin)) trasByVin.set(t.vin, []); trasByVin.get(t.vin).push(t) }
  const approvals = config.aprobaciones || {}

  const cortes = [...new Set(notifAll.map((n) => corteOf(n.fechaVenta)).filter(Boolean))].sort()
  const corte = corteParam && /^\d{4}-\d{2}$/.test(corteParam) ? corteParam : cortes[cortes.length - 1] || corteOf(new Date().toISOString())
  const range = corteRange(corte)
  const activos = { ...DEFAULT_ACTIVE, ...(config.activos?.[corte] || {}) }

  // Pool de VIN conocidos para cruzar lo digitado en Frogmi.
  const poolMap = new Map()
  const addPool = (vin, local) => {
    if (!vin || vin.length !== 17) return
    const prev = poolMap.get(vin)
    if (!prev) poolMap.set(vin, { vin, canon: canonVin(vin), local: local || "" })
    else if (!prev.local && local) prev.local = local
  }
  for (const n of notifAll) addPool(n.vin, frogmiLocal(sigaByVin.get(n.vin)?.local))
  for (const s of sigaList) addPool(s.vin, frogmiLocal(s.local))
  for (const t of trasList) addPool(t.vin, isBodega(t.destino) ? "" : frogmiLocal(t.destino))
  const pool = { list: [...poolMap.values()], byCanon: new Map([...poolMap.values()].map((p) => [p.canon, p])) }

  // Formularios cruzados por VIN.
  const formsByVin = new Map()
  const pendientes = new Map()
  let ultimoFormulario = ""
  for (const f of forms) {
    if (f.fecha > ultimoFormulario) ultimoFormulario = f.fecha
    const m = matchVin(f.vinDigitado, f.local, pool, approvals)
    const entry = { form: f.form, fecha: f.fecha, local: f.local, vinDigitado: f.vinDigitado, metodo: m.metodo, status: m.status, id: f.id }
    if (m.vin) {
      if (!formsByVin.has(m.vin)) formsByVin.set(m.vin, [])
      formsByVin.get(m.vin).push(entry)
    } else if (m.status === "PENDIENTE") {
      const key = approvalKey(f.local, f.vinDigitado)
      const prev = pendientes.get(key) || { key, local: f.local, vinDigitado: f.vinDigitado, formularios: [], candidatos: m.candidatos, metodo: m.metodo }
      prev.formularios.push({ form: f.form, fecha: f.fecha })
      pendientes.set(key, prev)
      for (const c of m.candidatos) {
        if (!formsByVin.has(`?${c.vin}`)) formsByVin.set(`?${c.vin}`, [])
        formsByVin.get(`?${c.vin}`).push(entry)
      }
    }
  }
  const doneFor = (vin, form) => (formsByVin.get(vin) || []).filter((e) => e.form === form).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))[0] || null
  const pendingFor = (vin, form) => (formsByVin.get(`?${vin}`) || []).find((e) => e.form === form) || null

  // Universo del corte.
  const universe = []
  const exclusiones = {}
  for (const n of notifAll) {
    if (corteOf(n.fechaVenta) !== corte) continue
    const siga = sigaByVin.get(n.vin) || null
    const excl = exclusionFor(n, siga)
    const local = frogmiLocal(siga?.local)
    const row = {
      vin: n.vin, nv: siga?.nv || "", fechaVenta: n.fechaVenta, marca: siga?.marca || n.marcaSharing.replace(/_Chile$/i, ""),
      modelo: siga?.modelo || "", local, localSiga: siga?.local || "", vendedor: titleCase(siga?.vendedor || n.vendedorPortal || ""),
      exclusion: excl, activo: Boolean(local && activos[local]),
      llegada: arrivalFor(n.vin, local, trasByVin, siga),
      forms: {}, pendientes: {},
    }
    for (const f of [...JUNIOR_FORMS, ENTREGA_FORM]) {
      row.forms[f.key] = doneFor(n.vin, f.key)
      const pend = row.forms[f.key] ? null : pendingFor(n.vin, f.key)
      if (pend) row.pendientes[f.key] = pend
    }
    row.juniorOk = JUNIOR_FORMS.filter((f) => row.forms[f.key]).length
    row.otroLocal = JUNIOR_FORMS.filter((f) => row.forms[f.key] && row.forms[f.key].local && local && row.forms[f.key].local !== local)
      .map((f) => `${f.label} ${row.forms[f.key].local}`)
    if (excl) exclusiones[excl] = (exclusiones[excl] || 0) + 1
    universe.push(row)
  }
  const evaluables = universe.filter((r) => !r.exclusion)
  const juniorRows = evaluables.filter((r) => r.activo)

  const porLocal = JUNIOR_LOCALS.map((l) => {
    const rows = juniorRows.filter((r) => r.local === l.key)
    return {
      local: l.key, label: l.label, activo: Boolean(activos[l.key]),
      notificados: evaluables.filter((r) => r.local === l.key).length,
      vin: rows.length,
      forms: JUNIOR_FORMS.map((f) => {
        const ok = rows.filter((r) => r.forms[f.key]).length
        return { key: f.key, label: f.label, ok, total: rows.length, pct: pct(ok, rows.length) }
      }),
      completos: rows.filter((r) => r.juniorOk === 4).length,
    }
  })

  const formTotals = JUNIOR_FORMS.map((f) => {
    const ok = juniorRows.filter((r) => r.forms[f.key]).length
    return { key: f.key, label: f.label, ok, total: juniorRows.length, pct: pct(ok, juniorRows.length), cumple: juniorRows.length > 0 && ok / juniorRows.length >= UMBRAL }
  })
  const juniorOk = formTotals.reduce((s, f) => s + f.ok, 0)

  // Entrega por vendedor.
  const vend = new Map()
  for (const r of evaluables) {
    const k = r.vendedor || "Sin vendedor"
    const v = vend.get(k) || { vendedor: k, local: r.local, vin: 0, entregas: 0 }
    v.vin += 1
    if (r.forms.ENTREGA) v.entregas += 1
    vend.set(k, v)
  }
  const ranking = [...vend.values()].map((v) => ({ ...v, pct: pct(v.entregas, v.vin), sorteo: v.vin > 0 && v.entregas / v.vin >= UMBRAL }))
    .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0) || b.vin - a.vin)
  const entregaOk = evaluables.filter((r) => r.forms.ENTREGA).length

  // Lectura operativa ajustada.
  const inCorte = (d) => d && d >= range.desde && d <= range.hasta
  const recepUniverse = new Map()
  for (const t of trasList) {
    if (!inCorte(t.fecha) || isBodega(t.destino)) continue
    const local = frogmiLocal(t.destino)
    if (!local || !activos[local] || recepUniverse.has(t.vin)) continue
    recepUniverse.set(t.vin, local)
  }
  const recepOk = [...recepUniverse.keys()].filter((vin) => doneFor(vin, "RECEPCION")).length
  const prev = prevCorte(corte)
  const prevRows = notifAll.filter((n) => corteOf(n.fechaVenta) === prev).map((n) => {
    const siga = sigaByVin.get(n.vin) || null
    const local = frogmiLocal(siga?.local)
    return { vin: n.vin, local, excl: exclusionFor(n, siga), llegada: arrivalFor(n.vin, local, trasByVin, siga) }
  }).filter((r) => !r.excl && r.local && activos[r.local] && inCorte(r.llegada))
  const tardias = juniorRows.filter((r) => r.llegada && r.llegada > range.hasta)
  const ajustadoFor = (form) => {
    const base = juniorRows.filter((r) => !(r.llegada && r.llegada > range.hasta)).map((r) => r.vin)
    const vins = [...new Set([...base, ...prevRows.map((r) => r.vin)])]
    const ok = vins.filter((v) => doneFor(v, form)).length
    return { ok, total: vins.length, pct: pct(ok, vins.length) }
  }
  const stockOk = formTotals[1]
  const control = ajustadoFor("CONTROL")
  const prep = ajustadoFor("PREPARACION")
  const ajustOk = recepOk + stockOk.ok + control.ok + prep.ok
  const ajustTotal = recepUniverse.size + stockOk.total + control.total + prep.total
  const ajustada = {
    forms: [
      { key: "RECEPCION", label: "Recepción (vs traslados al local)", ok: recepOk, total: recepUniverse.size, pct: pct(recepOk, recepUniverse.size) },
      { key: "STOCK", label: "Stock (vs notificados)", ok: stockOk.ok, total: stockOk.total, pct: stockOk.pct },
      { key: "CONTROL", label: "Control previo (con arrastres)", ...control },
      { key: "PREPARACION", label: "Preparación (con arrastres)", ...prep },
    ],
    total: { ok: ajustOk, total: ajustTotal, pct: pct(ajustOk, ajustTotal) },
    arrastres: prevRows.length,
    llegadasTardias: tardias.length,
  }

  // Tour Manager del mes del corte.
  const tmData = config.tourManager?.[corte] || {}
  const tmRows = TM_LOCALS.map((l) => {
    const fechas = [...new Set((tmData[l.key] || []).filter(Boolean))].sort()
    const activo = Boolean(activos[l.junior])
    const q1 = fechas.some((f) => Number(f.slice(8, 10)) <= 15)
    const q2 = fechas.some((f) => Number(f.slice(8, 10)) > 15)
    const validos = (q1 ? 1 : 0) + (q2 ? 1 : 0)
    return { key: l.key, label: l.label, activo, planificados: activo ? 2 : 0, validos: activo ? validos : 0, pendientes: activo ? 2 - validos : 0, fechas, extra: Math.max(0, fechas.length - validos), pct: activo ? pct(validos, 2) : null }
  })
  const tmActive = tmRows.filter((r) => r.activo)
  const tm = {
    planificados: tmActive.reduce((s, r) => s + r.planificados, 0),
    validos: tmActive.reduce((s, r) => s + r.validos, 0),
    pendientes: tmActive.reduce((s, r) => s + r.pendientes, 0),
    registros: tmActive.reduce((s, r) => s + r.fechas.length, 0),
    rows: tmRows,
  }
  tm.pct = pct(tm.validos, tm.planificados)

  return {
    corte, range, cortes, activos, ultimoFormulario,
    universo: { notificados: universe.length, evaluables: evaluables.length, junior: juniorRows.length, exclusiones },
    porLocal, formTotals,
    junior: { ok: juniorOk, total: juniorRows.length * 4, pct: pct(juniorOk, juniorRows.length * 4), completos: juniorRows.filter((r) => r.juniorOk === 4).length, cumplen: formTotals.filter((f) => f.cumple).length },
    entrega: { ok: entregaOk, total: evaluables.length, pct: pct(entregaOk, evaluables.length), ranking },
    ajustada, tourManager: tm,
    pendientesAprobacion: [...pendientes.values()],
    rows: universe,
    formsByVin,
  }
}

export function formsSummary(formsByVin, vin) {
  const list = formsByVin.get(vin) || []
  const pending = formsByVin.get(`?${vin}`) || []
  return [...JUNIOR_FORMS, ENTREGA_FORM].map((f) => {
    const done = list.filter((e) => e.form === f.key).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))[0]
    const pend = done ? null : pending.find((e) => e.form === f.key)
    return { key: f.key, label: f.label, hecho: Boolean(done), fecha: done?.fecha || "", vinDigitado: done?.vinDigitado || pend?.vinDigitado || "", metodo: done?.metodo || "", pendienteAprobacion: Boolean(pend) }
  })
}
