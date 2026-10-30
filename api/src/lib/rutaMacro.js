// Indicadores de "Mi local" y su historial macro (números por semana y mes).
//
//  1. Adherencia: 1 Ruta de Experiencia por semana, hecha por la jefatura del local. Solo cuenta mientras la
//     implementación está ACTIVA y desde la semana en que se activó (interruptor en Gestión, solo administradores).
//  2. Cumplimiento de estándares: % de puntos "Cumple" en las Rutas.
//  3. Cumplimiento de la auditoría: % de puntos "Cumple" en las Auditorías Ruta.
//  4. Exactitud de la revisión: coincidencia punto a punto entre cada Auditoría y la Ruta más cercana en fecha;
//     la brecha son los puntos porcentuales de diferencia entre sus cumplimientos.
//
// Todo se calcula en registros SEMANALES por local (solo números). Esos registros se guardan aparte
// ("snapshot") antes de vaciar el detalle, así los evolutivos sobreviven sin guardar cada Ruta.

import { readJsonBlob, writeJsonBlob } from "./datosStore.js"
import { getAppConfig, setAppConfig } from "./store.js"

const SNAPSHOT = "datos/macro/ruta-semanal.json"
const IMPLEMENTACION = "RUTA_IMPLEMENTACION"
const WEEKS_VISIBLE = 13 // ~3 meses por semana; antes de eso, solo por mes
const round1 = (n) => Math.round(n * 10) / 10

const dateOf = (item) => item?.submittedAt || item?.updatedAt || item?.createdAt || ""
const time = (item) => { const t = new Date(dateOf(item)).getTime(); return Number.isNaN(t) ? 0 : t }
const pad = (n) => String(n).padStart(2, "0")
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Lunes (AAAA-MM-DD) de la semana de una fecha. */
export function weekKey(value) {
  const d = value instanceof Date ? value : new Date(value)
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return ymd(x)
}
const monthOfWeek = (week) => week.slice(0, 7)

/* ---------------- Interruptor de implementación ---------------- */
export async function getImplementacion() {
  const stored = await getAppConfig(IMPLEMENTACION).catch(() => null)
  try {
    const v = JSON.parse(String(stored?.value || "{}"))
    return { active: v.active === true, activatedAt: v.activatedAt || null, updatedAt: v.updatedAt || null, updatedBy: v.updatedBy || null, history: Array.isArray(v.history) ? v.history : [] }
  } catch {
    return { active: false, activatedAt: null, updatedAt: null, updatedBy: null, history: [] }
  }
}

export async function setImplementacion(active, by) {
  const prev = await getImplementacion()
  const now = new Date().toISOString()
  const next = {
    active: Boolean(active),
    // La fecha de activación se conserva si ya estaba activa; al reactivar, empieza de nuevo.
    activatedAt: active ? (prev.active ? prev.activatedAt || now : now) : prev.activatedAt,
    updatedAt: now,
    updatedBy: by,
    history: [{ at: now, by, active: Boolean(active) }, ...prev.history].slice(0, 50),
  }
  await setAppConfig(IMPLEMENTACION, JSON.stringify(next))
  return next
}

/* ---------------- Registros semanales ---------------- */
function newRecord(local, week) {
  return { local, week, rutas: 0, rutasJefe: 0, rutaOk: 0, rutaTotal: 0, audOk: 0, audTotal: 0, pairs: 0, matches: 0, compared: 0, brechaSum: 0 }
}
const totalOf = (e) => Number(e.compliant || 0) + Number(e.nonCompliant || 0) + Number(e.requested || 0)

function compareAnswers(route, audit) {
  const r = new Map((route.answers || []).filter((a) => a?.itemId && a.status).map((a) => [a.itemId, a.status]))
  let compared = 0
  let matches = 0
  for (const a of audit.answers || []) {
    if (!a?.itemId || !a.status || !r.has(a.itemId)) continue
    compared += 1
    if (r.get(a.itemId) === a.status) matches += 1
  }
  return { compared, matches }
}
const pctOf = (e) => (totalOf(e) ? (Number(e.compliant || 0) / totalOf(e)) * 100 : null)

/** Registros semanales por local calculados desde las Rutas y Auditorías enviadas (detalle vigente). */
export function recordsFromExecutions(executions, isJefe) {
  const sent = executions.filter((e) => e.status === "SUBMITTED" && e.local)
  const out = new Map()
  const rec = (local, week) => { const k = `${local}|${week}`; if (!out.has(k)) out.set(k, newRecord(local, week)); return out.get(k) }
  const routesByLocal = new Map()
  for (const e of sent) if (e.mode === "RUTA") (routesByLocal.get(e.local) || routesByLocal.set(e.local, []).get(e.local)).push(e)
  for (const e of sent) {
    const r = rec(e.local, weekKey(dateOf(e)))
    if (e.mode === "RUTA") {
      r.rutas += 1
      if (isJefe(e)) r.rutasJefe += 1
      r.rutaOk += Number(e.compliant || 0)
      r.rutaTotal += totalOf(e)
    } else if (e.mode === "AUDITORIA") {
      r.audOk += Number(e.compliant || 0)
      r.audTotal += totalOf(e)
      const routes = routesByLocal.get(e.local) || []
      const near = routes.reduce((best, x) => (!best || Math.abs(time(x) - time(e)) < Math.abs(time(best) - time(e)) ? x : best), null)
      if (near) {
        const { compared, matches } = compareAnswers(near, e)
        if (compared) {
          r.pairs += 1
          r.compared += compared
          r.matches += matches
          const a = pctOf(near)
          const b = pctOf(e)
          if (a !== null && b !== null) r.brechaSum += Math.abs(a - b)
        }
      }
    }
  }
  return out
}

/* ---------------- Snapshot ---------------- */
export async function readSnapshot() {
  const v = await readJsonBlob(SNAPSHOT).catch(() => null)
  return { updatedAt: v?.updatedAt || null, detailFrom: v?.detailFrom || null, weeks: v?.weeks || {}, manual: v?.manual || {} }
}

/** Guarda los registros semanales (fusionados con lo ya guardado). Con `detailFrom`, marca desde qué semana hay detalle. */
export async function saveSnapshot(liveRecords, { detailFrom, manual } = {}) {
  const snap = await readSnapshot()
  for (const [k, r] of liveRecords) snap.weeks[k] = r
  const next = {
    updatedAt: new Date().toISOString(),
    detailFrom: detailFrom ?? snap.detailFrom,
    weeks: snap.weeks,
    manual: manual ? { ...snap.manual, ...manual } : snap.manual,
  }
  await writeJsonBlob(SNAPSHOT, next)
  return next
}

/** Registros vigentes = snapshot para semanas anteriores al detalle + registros calculados del detalle que queda. */
function effectiveRecords(live, snap, canSeeLocal) {
  const out = new Map()
  for (const [k, r] of Object.entries(snap.weeks || {})) if (snap.detailFrom && r.week < snap.detailFrom && canSeeLocal(r.local)) out.set(k, r)
  for (const [k, r] of live) out.set(k, r)
  return out
}

/* ---------------- Series y KPI ---------------- */
function agg(records) {
  const a = { done: 0, expected: 0, rutaOk: 0, rutaTotal: 0, audOk: 0, audTotal: 0, pairs: 0, matches: 0, compared: 0, brechaSum: 0 }
  for (const r of records) {
    a.rutaOk += r.rutaOk; a.rutaTotal += r.rutaTotal; a.audOk += r.audOk; a.audTotal += r.audTotal
    a.pairs += r.pairs; a.matches += r.matches; a.compared += r.compared; a.brechaSum += r.brechaSum
    if (r.expected) { a.expected += 1; if (r.rutasJefe > 0) a.done += 1 }
  }
  const pct = (x, y) => (y ? round1((x / y) * 100) : null)
  return {
    done: a.done, expected: a.expected,
    adherencia: a.expected ? round1((a.done / a.expected) * 100) : null,
    cumplimientoEstandares: pct(a.rutaOk, a.rutaTotal),
    cumplimientoAuditoria: pct(a.audOk, a.audTotal),
    exactitud: pct(a.matches, a.compared),
    brecha: a.pairs ? round1(a.brechaSum / a.pairs) : null,
  }
}

/**
 * Devuelve { kpis, weekly, monthly } para un local (o para toda la red si `local` no viene).
 * `impl` = estado del interruptor; `manual` = cifras mensuales cargadas a mano (solo para un local).
 */
export function buildLocalKpis(records, impl, { local, now = new Date(), manual = {} } = {}) {
  const actWeek = impl?.active && impl.activatedAt ? weekKey(impl.activatedAt) : null
  const currentWeek = weekKey(now)
  const list = [...records.values()].filter((r) => !local || r.local === local)

  // Semanas esperadas: desde la activación hasta la semana actual, por cada local con actividad.
  const locals = [...new Set(list.map((r) => r.local))]
  const byKey = new Map(list.map((r) => [`${r.local}|${r.week}`, r]))
  const weeksSet = new Set(list.map((r) => r.week))
  if (actWeek) {
    for (let d = new Date(`${actWeek}T12:00:00`); weekKey(d) <= currentWeek; d.setDate(d.getDate() + 7)) weeksSet.add(weekKey(d))
  }
  const allWeeks = [...weeksSet].sort()
  const weekRows = allWeeks.map((week) => {
    const rows = locals.map((l) => ({ ...(byKey.get(`${l}|${week}`) || newRecord(l, week)) }))
    for (const r of rows) r.expected = Boolean(actWeek && week >= actWeek && week <= currentWeek)
    return { week, ...agg(rows), rows }
  })

  const first = new Date(`${currentWeek}T12:00:00`)
  first.setDate(first.getDate() - 7 * (WEEKS_VISIBLE - 1))
  const windowStart = weekKey(first)
  const weekly = weekRows.filter((w) => w.week >= windowStart).map(({ rows, ...rest }) => rest)

  const months = [...new Set(weekRows.map((w) => monthOfWeek(w.week)).concat(Object.keys(manual).map((k) => k.split("|")[1])))].sort()
  const monthly = months.map((period) => {
    const rows = weekRows.filter((w) => monthOfWeek(w.week) === period).flatMap((w) => w.rows)
    const a = agg(rows)
    const m = local ? manual[`${local}|${period}`] : undefined
    const hasData = rows.some((r) => r.rutas || r.audTotal || r.expected)
    if (!hasData && m) {
      return { period, done: 0, expected: 0, adherencia: m.adherencia ?? null, cumplimientoEstandares: m.estandares ?? null, cumplimientoAuditoria: m.auditoria ?? null, exactitud: m.exactitud ?? null, brecha: null, manual: true }
    }
    return { period, ...a }
  }).filter((m) => m.adherencia !== null || m.cumplimientoEstandares !== null || m.cumplimientoAuditoria !== null || m.exactitud !== null)

  // Cifras de cabecera: lo último registrado de cada cosa.
  const lastWith = (fn) => [...weekRows].reverse().find((w) => fn(w))
  const wRuta = lastWith((w) => w.rows.some((r) => r.rutaTotal))
  const wAud = lastWith((w) => w.rows.some((r) => r.audTotal))
  const wPair = lastWith((w) => w.rows.some((r) => r.compared))
  const currentMonth = monthOfWeek(currentWeek)
  const cur = monthly.find((m) => m.period === currentMonth)
  const kpis = {
    enImplementacion: !impl?.active,
    adherencia: impl?.active ? { value: cur?.adherencia ?? null, done: cur?.done ?? 0, expected: cur?.expected ?? 0, period: currentMonth, desde: impl.activatedAt } : null,
    cumplimientoEstandares: wRuta ? { value: agg(wRuta.rows).cumplimientoEstandares, date: wRuta.week } : null,
    cumplimientoAuditoria: wAud ? { value: agg(wAud.rows).cumplimientoAuditoria, date: wAud.week } : null,
    exactitud: wPair ? { value: agg(wPair.rows).exactitud, brecha: agg(wPair.rows).brecha, date: wPair.week } : null,
  }
  return { kpis, weekly, monthly: monthly.slice(-24), windowStart }
}

export function buildKpisByLocal(records, impl, opts = {}) {
  const locals = [...new Set([...records.values()].map((r) => r.local))]
  return Object.fromEntries(locals.map((l) => [l, buildLocalKpis(records, impl, { ...opts, local: l }).kpis]))
}

/** Respuesta completa de /api/route/metrics para los indicadores. */
export async function buildMacroPayload({ executions, isJefe, local, canSeeLocal = () => true, now = new Date() }) {
  const [impl, snap] = await Promise.all([getImplementacion(), readSnapshot()])
  const records = effectiveRecords(recordsFromExecutions(executions, isJefe), snap, canSeeLocal)
  const manual = Object.fromEntries(Object.entries(snap.manual || {}).filter(([k]) => canSeeLocal(k.split("|")[0])))
  const body = buildLocalKpis(records, impl, { local, now, manual })
  const sent = executions.filter((e) => e.status === "SUBMITTED" && e.mode === "RUTA" && (!local || e.local === local)).sort((a, b) => time(b) - time(a))[0]
  const ultimaRuta = sent && local ? { date: dateOf(sent), answers: (sent.answers || []).map((a) => ({ itemId: a.itemId, status: a.status, detail: a.detail || "" })) } : null
  return {
    kpis: body.kpis,
    evolutivo: { weekly: body.weekly, monthly: body.monthly, windowStart: body.windowStart },
    implementacion: { active: impl.active, activatedAt: impl.activatedAt },
    ultimaRuta,
    ...(local ? {} : { byLocal: buildKpisByLocal(records, impl, { now, manual }) }),
  }
}
