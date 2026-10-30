// Gespark (mismas reglas que la calculadora de Experiencia):
// - Base: unidades Astara (Chery, JMC, Mitsubishi, KGM/SsangYong, Nissan, Renault, Exeed)
//   que llegan según la planilla T a CASONA, TOBALABA o PUENTE ALTO, sin traslados
//   internos (NV con "INTERNO"); el mes se toma de la fecha de traslado.
// - Una fila por VIN (la primera llegada del mes); VIN solo letras y números.
// - Cruce por VIN con el listado de la extranet: Gespark realizado = Estado Color 32768.
// - Los VIN que no están en la extranet van aparte y no entran al %.
// - Fechas ilegibles en la T se muestran para revisión (no se suman a ningún mes).

import { GESPARK_OK } from "./datosParsers.js"
import { normKey, normText, titleCase } from "./segNormalize.js"

const ASTARA = /CHERY|^JM|MITSUBISHI|KGM|SSANGYONG|NISSAN|RENAULT|EXEED/
const DESTINOS = /CASONA|TOBALABA|PUENTE ALTO/

// Histórico de la calculadora (cierres abril–septiembre 2026).
export const GESPARK_BASE = [
  { mes: "2026-04", total: 72, ok: 53, nota: "Cierre oficial abril · Puente Alto (el informe decía 74,0% por redondeo)" },
  { mes: "2026-05", total: 35, ok: 9, nota: "Base disponible (otro formato)" },
  { mes: "2026-06", total: 51, ok: 50, nota: "Cierre oficial junio · Casona" },
  { mes: "2026-07", total: 127, ok: 124, nota: "Cierre oficial julio · Casona + Tobalaba" },
  { mes: "2026-08", total: 133, ok: 112, paTotal: 46, paOk: 44, nota: "Cierre mensual previo · Casona + Tobalaba" },
  { mes: "2026-09", total: 24, ok: 22, paTotal: 24, paOk: 22, nota: "Calculadora · desde marca a Casona + Tobalaba" },
]

const pct = (ok, total) => (total ? Math.round((ok * 1000) / total) / 10 : null)

function monthEnd(mes) {
  const [y, m] = mes.split("-").map(Number)
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}

function isInterno(t) {
  return normText(t.tipo).includes("INTERNO") || normText(t.nvTexto).includes("INTERNO")
}

export function computeGespark({ traslados, extranet }, mesParam = "") {
  const tras = Object.values(traslados?.records || {})
  const ext = Object.values(extranet?.records || {})
  const byVin = new Map(ext.map((e) => [normKey(e.vin), e]))
  const candidates = tras.filter((t) => t.vin && !isInterno(t) && DESTINOS.test(normText(t.destino)) && ASTARA.test(normText(t.marca)))

  const ilegibles = candidates.filter((t) => !t.fecha).map((t) => ({ vin: t.vin, marca: titleCase(t.marca), modelo: t.modelo, fechaTexto: t.fechaTexto || "", destino: titleCase(t.destino), retiro: titleCase(t.retiro) }))
  const months = [...new Set(candidates.filter((t) => t.fecha).map((t) => t.fecha.slice(0, 7)))].sort()
  const baseMonths = new Set(GESPARK_BASE.map((b) => b.mes))
  const mes = /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : months[months.length - 1] || new Date().toISOString().slice(0, 7)

  const detailFor = (m) => {
    const arrivals = new Map()
    for (const t of candidates.filter((x) => x.fecha && x.fecha.slice(0, 7) === m).sort((a, b) => a.fecha.localeCompare(b.fecha))) {
      const vin = normKey(t.vin)
      if (!arrivals.has(vin)) arrivals.set(vin, { vin, marca: titleCase(t.marca), modelo: t.modelo, fecha: t.fecha, retiro: titleCase(t.retiro), destino: titleCase(t.destino) })
    }
    const evaluadas = []
    const sinExtranet = []
    for (const a of arrivals.values()) {
      const e = byVin.get(a.vin)
      if (!e) { sinExtranet.push(a); continue }
      evaluadas.push({ ...a, ok: e.color === GESPARK_OK, estado: e.chasis || "", color: e.color, modelo: e.modelo || a.modelo })
    }
    const ok = evaluadas.filter((u) => u.ok).length
    const pa = evaluadas.filter((u) => /PUENTE ALTO/i.test(u.destino))
    return {
      mes: m, total: evaluadas.length, ok, pct: pct(ok, evaluadas.length),
      paTotal: pa.length, paOk: pa.filter((u) => u.ok).length,
      pendientes: evaluadas.filter((u) => !u.ok), realizadas: evaluadas.filter((u) => u.ok), sinExtranet,
    }
  }

  // Cobertura del listado de la extranet: avisa si no cubre el mes completo.
  const extDates = ext.map((e) => e.fecha).filter(Boolean).sort()
  const detalle = detailFor(mes)
  const today = new Date().toISOString().slice(0, 10)
  const from = `${mes}-01`
  const to = monthEnd(mes) < today ? monthEnd(mes) : today
  let cobertura = ""
  if (!ext.length) cobertura = "Aún no se carga el listado de la extranet."
  else if (extDates.length && (extDates[0] > from || extDates[extDates.length - 1] < to)) {
    cobertura = `El listado de la extranet cubre del ${extDates[0]} al ${extDates[extDates.length - 1]}: no alcanza el mes completo (${from} al ${to}). Descarga un rango más amplio para que no queden unidades sin registro.`
  }

  const evolutivo = [
    ...GESPARK_BASE.map((b) => ({ ...b, pct: pct(b.ok, b.total), paPct: b.paTotal ? pct(b.paOk, b.paTotal) : null, fuente: "Histórico de la calculadora" })),
    ...months.filter((m) => !baseMonths.has(m) && m > GESPARK_BASE[GESPARK_BASE.length - 1].mes).map((m) => {
      const d = detailFor(m)
      return { mes: m, total: d.total, ok: d.ok, pct: d.pct, paTotal: d.paTotal, paOk: d.paOk, paPct: d.paTotal ? pct(d.paOk, d.paTotal) : null, nota: d.sinExtranet.length ? `${d.sinExtranet.length} sin registro en la extranet` : "", fuente: "Datos cargados" }
    }),
  ]

  return {
    mes, meses: months, detalle, ilegibles, cobertura, evolutivo,
    extranet: { registros: ext.length, desde: extDates[0] || "", hasta: extDates[extDates.length - 1] || "" },
    baseHistorica: baseMonths.has(mes),
  }
}
