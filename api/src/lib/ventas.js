// Sección "Ventas": estado de cada NV sin datos personales del cliente.
// Usa los mismos datos de Datos (SIGA, Control de unidades, planilla T) y el motor
// del Seguimiento. Nunca devuelve nombre, RUT, teléfono ni correo del cliente.

import { trasladosForRow } from "./seguimiento.js"
import { canonVin } from "./frogmi.js"
import { daysBetween, normKey } from "./segNormalize.js"

function monthEnd(ym) {
  const [y, m] = ym.split("-").map(Number)
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}

export function expectedDate(llegadaEsperada) {
  if (!llegadaEsperada) return ""
  return /^\d{4}-\d{2}$/.test(llegadaEsperada) ? monthEnd(llegadaEsperada) : llegadaEsperada
}

const controlIndexes = new WeakMap()
function controlIndex(control) {
  if (!control) return { byNv: new Map(), byVin: new Map() }
  let idx = controlIndexes.get(control)
  if (!idx) {
    const list = Object.values(control.records || {})
    idx = { byNv: new Map(list.filter((c) => c.nv).map((c) => [c.nv, c])), byVin: new Map(list.filter((c) => c.vin).map((c) => [c.vin, c])) }
    controlIndexes.set(control, idx)
  }
  return idx
}

export function buildVenta(row, masters, today = new Date().toISOString().slice(0, 10)) {
  const siga = masters.siga?.records?.[row.nv] || {}
  const idx = controlIndex(masters.control)
  const control = idx.byNv.get(row.nv) || (row.vin ? idx.byVin.get(row.vin) : null) || null
  const traslados = trasladosForRow(row, masters.traslados)
  const eventos = []
  eventos.push({ tipo: "NV", fecha: row.fechaNV, titulo: "NV generada", detalle: `${row.local}${row.vendedor ? ` · ${row.vendedor}` : ""}` })
  if (row.vin) eventos.push({ tipo: "VIN", fecha: siga.fechaAsigMarca || control?.fechaAsignacion || "", titulo: "VIN asignado", detalle: row.vin })
  if (row.llegadaEsperada) {
    eventos.push({ tipo: "ESPERADA", fecha: row.llegadaEsperada, titulo: "Llegada esperada", detalle: `Según Control de unidades${row.destinoControl ? ` · destino ${row.destinoControl}` : ""}`, estimada: true })
  }
  for (const t of traslados) {
    eventos.push({ tipo: t.llegadaLocal ? "RECEPCION" : "TRASLADO", fecha: t.fecha, titulo: t.llegadaLocal ? "Recibido en el local" : "Traslado", detalle: `${t.retiro ? `${t.retiro} → ` : ""}${t.destino}` })
  }
  if (row.fechaRecepcion && !traslados.some((t) => t.llegadaLocal && t.fecha === row.fechaRecepcion)) {
    eventos.push({ tipo: "RECEPCION", fecha: row.fechaRecepcion, titulo: "Recibido en el local", detalle: row.recepcionFuente || "SIGA" })
  }
  if (row.fechaFactura) eventos.push({ tipo: "FACTURA", fecha: row.fechaFactura, titulo: "Facturada", detalle: "" })
  if (row.entrega?.entregado) eventos.push({ tipo: "ENTREGA", fecha: row.entrega.fechaEntrega, titulo: "Entrega confirmada", detalle: row.entrega.confirmadoPor ? `Confirmó ${row.entrega.confirmadoPor}` : "" })
  eventos.sort((a, b) => String(a.fecha || "9999").localeCompare(String(b.fecha || "9999")))

  const alertas = []
  const entregado = Boolean(row.entrega?.entregado)
  const esperada = expectedDate(row.llegadaEsperada)
  // Sin recepción ni factura (si ya se facturó, la unidad normalmente ya llegó) y NV de los últimos 6 meses.
  if (!entregado && !siga.nula && !row.fechaRecepcion && !row.fechaFactura && esperada && esperada < today && (daysBetween(row.fechaNV, today) ?? 999) <= 180) {
    alertas.push({ tipo: "LLEGADA", texto: `Debería haber llegado (esperada ${/^\d{4}-\d{2}$/.test(row.llegadaEsperada) ? "en el mes" : "el"} ${row.llegadaEsperada}) y no hay recepción registrada` })
  }
  if (!row.vin && !siga.nula && row.bucket !== "fuera" && (daysBetween(row.fechaNV, today) ?? 0) > 30 && (daysBetween(row.fechaNV, today) ?? 0) <= 180) alertas.push({ tipo: "VIN", texto: "Más de 30 días sin VIN asignado" })
  // Dentro de la ventana para confirmar entrega (misma regla del Seguimiento).
  if (!entregado && row.confirmarEntrega && row.fechaFactura && row.fechaRecepcion && (daysBetween(row.fechaFactura, today) ?? 0) > 15 && (daysBetween(row.fechaRecepcion, today) ?? 0) > 15) {
    alertas.push({ tipo: "ENTREGA", texto: "Facturada y en el local hace más de 15 días: falta confirmar la entrega" })
  }

  return {
    nv: row.nv, fechaNV: row.fechaNV, marca: row.marca, modelo: row.modelo, color: row.color, vin: row.vin,
    local: row.local, localOriginal: row.localOriginal, vendedor: row.vendedor,
    etapa: row.etapa, etapaLabel: row.etapaLabel, nula: Boolean(siga.nula), letraChica: row.bucket === "fuera" ? row.letraChica : "",
    entregado, eventos, alertas,
  }
}

// Búsqueda por NV, VIN completo o mini VIN (últimos caracteres; tolera O/0 e I/1).
export function matchesQuery(row, q) {
  const text = String(q || "").trim()
  if (!text) return true
  const key = normKey(text)
  if (/^\d{4,7}$/.test(text) && row.nv === text) return true
  if (!row.vin) return false
  const vin = canonVin(row.vin)
  const c = canonVin(key)
  return c.length >= 4 && vin.endsWith(c)
}
