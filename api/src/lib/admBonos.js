// Contabilidad · bonos por cobrar a la marca por cada NV (solo listas RETAIL; flota va aparte).
// La NV recibe el bono de la lista vigente a la fecha de su factura de venta. Montos de concepto en neto;
// "por cobrar" = suma neta × 1,19, redondeada a la centena.
//
// CHERY (reglas del paquete de Administración de Ventas, validadas con la planilla de cruce):
//   Bono marca  = "Uso CES · Bono CHERY" ÷ 1,19                 siempre
//   SCF         = bono financiamiento ÷ 1,19                     si la NV financió con SCF (Forum)
//   VPP         = (bono VPP ÷ 1,19) × (1 − margen)               si la NV tuvo retoma
// GEELY (propuesta, por validar con Contabilidad):
//   Bono marca  = "Bono Marca GMC" ÷ 1,19                        siempre (el "Bono Marca Dealer" lo pone el concesionario)
//   Financiamiento = "Bono Financiamiento" ÷ 1,19                si la NV financió con crédito
// STELLANTIS · Peugeot, Citroën, Jeep, Fiat, RAM, Leapmotor (propuesta, por validar):
//   Bono marca  = "Aporte Stellantis" del canal de la NV         (el "Aporte CE" lo pone el concesionario)
//   Financiamiento = "Aporte Financiera" del canal               crédito convencional o compra inteligente
import { STELLANTIS } from "./admLectores.js"

const IVA = 1.19
const sinTildes = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
const aBruto = (neto) => Math.round((neto * IVA) / 100) * 100
const neto = (bruto) => Math.round((bruto || 0) / IVA)

/* ---------------- Enlace de modelos ---------------- */
// Chery: mismo enlace del paquete (parecido de palabras dentro de la familia; bajo 60 % no se enlaza).
const SIN_CHERY = { "4WD": "4X4", "2WD": "4X2", AT: "AUT", CVT: "AUT", DCT: "AUT", MT: "MT" }
// SIGA agrega la norma al nombre ("TIGGO 2 PRO MAX GLX MT (EURO 6C)"): no es parte del modelo.
const sinNorma = (n) => sinTildes(n).toUpperCase().replace(/\(?\bEURO\s*\w+\)?/g, " ")
const tokensChery = (n) => new Set(sinNorma(n).replace(/[()]/g, " ").split(/\s+/)
  .filter((t) => t && !/^\d\.\d+T?D?$/.test(t) && t !== "ORIGINAL").map((t) => SIN_CHERY[t] || t))
const familiaChery = (n) => sinTildes(n).toUpperCase().match(/^(TIGGO \d( PRO MAX| PRO)?|HIMLA|ARRIZO \d( PRO)?)/)?.[1] || null

function enlazarChery(modeloSistema, filas) {
  const familia = familiaChery(modeloSistema)
  if (!familia) return null
  const tm = tokensChery(modeloSistema)
  const candidatos = []
  for (const fila of filas) {
    if (familiaChery(fila.modelo) !== familia) continue
    const tl = tokensChery(fila.modelo)
    const inter = [...tm].filter((x) => tl.has(x)).length
    candidatos.push({ puntaje: inter / new Set([...tm, ...tl]).size, fila })
  }
  if (!candidatos.length) return null
  candidatos.sort((a, b) => b.puntaje - a.puntaje || b.fila.linea - a.fila.linea)
  const mejor = candidatos[0]
  if (mejor.puntaje < 0.6) return null
  const empate = candidatos.length > 1 && Math.abs(candidatos[1].puntaje - mejor.puntaje) < 1e-9
  return { fila: mejor.fila, puntaje: Math.round(mejor.puntaje * 1000) / 1000, porConfirmar: empate || mejor.puntaje < 1 }
}

// Resto de las marcas: la familia de la lista debe estar en el modelo de SIGA; luego se compara cuánto de cada
// nombre está en el otro. Se ignoran la marca y palabras que SIGA y las listas escriben distinto (MCA, NEW, GF…).
const SIN = { "+": "PLUS", "4WD": "4X4", "2WD": "4X2", CVT: "AUT", DCT: "AUT", AT: "AUT", DDCT6: "AUT", AT6: "AUT", MT6: "MT", CD: "CREW", "EM-I": "EMI" }
const RUIDO = new Set(["NEW", "MCA", "GF", "GK", "GL", "ORIGINAL", "CAB", "FWD", "MY26", "MY27",
  "CHERY", "GEELY", "PEUGEOT", "CITROEN", "JEEP", "FIAT", "RAM", "LEAPMOTOR", "OPEL"])
const tokens = (n) => [...new Set(sinNorma(n).replace(/[()]/g, " ").replace(/\+/g, " + ").split(/\s+/)
  .filter(Boolean).map((t) => SIN[t] || t).filter((t) => !/^\d\.\dT?D?$/.test(t) && !RUIDO.has(t)))]

function enlazarGeneral(modeloSistema, filas) {
  const ts = tokens(modeloSistema)
  if (!ts.length) return null
  const set = new Set(ts)
  const candidatos = []
  for (const fila of filas) {
    const familia = tokens(fila.familia || "")
    if (familia.length && !familia.every((t) => set.has(t))) continue
    const tl = tokens(fila.modelo)
    if (!tl.length) continue
    const inter = tl.filter((t) => set.has(t)).length
    candidatos.push({ puntaje: (inter / tl.length + inter / ts.length) / 2, cubre: inter === ts.length, fila })
  }
  if (!candidatos.length) return null
  candidatos.sort((a, b) => b.puntaje - a.puntaje || a.fila.linea - b.fila.linea)
  const mejor = candidatos[0]
  if (mejor.puntaje < 0.5) return null
  // Empate solo si otra versión distinta tiene el mismo puntaje (filas repetidas de la misma versión no cuentan).
  const clave = (f) => tokens(f.modelo).sort().join(" ")
  const empate = candidatos.some((c) => c !== mejor && Math.abs(c.puntaje - mejor.puntaje) < 1e-9 && clave(c.fila) !== clave(mejor.fila))
  // SIGA suele omitir la transmisión ("Coolray Lite Pop" ↔ "Coolray Lite Pop MT"): si todas sus palabras
  // están en una sola versión de la lista, el enlace es firme.
  return { fila: mejor.fila, puntaje: Math.round(mejor.puntaje * 1000) / 1000, porConfirmar: empate || !mejor.cubre }
}

export function enlazarModelo(marca, modeloSistema, filas) {
  return marca === "CHERY" ? enlazarChery(modeloSistema, filas) : enlazarGeneral(modeloSistema, filas)
}

/* ---------------- Condiciones de la NV ---------------- */
// SCF: la institución de crédito de SIGA nombra a Forum / SCF. Sin crédito informado, no se sabe.
export function financiaConScf(institucion) {
  const t = sinTildes(institucion).toUpperCase().trim()
  if (!t) return null
  return /FORUM|\bSCF\b/.test(t)
}

// Canal Stellantis: compra inteligente o crédito convencional según SIGA; sin crédito informado, no se sabe.
export function canalStellantis(institucion, tipoCredito) {
  const tipo = sinTildes(tipoCredito).toUpperCase()
  if (/INTELIGENTE/.test(tipo)) return "CI"
  if (sinTildes(institucion).trim() || tipo.trim()) return "CC"
  return null
}

// Qué confirma Contabilidad por NV en cada marca (lo usa la pantalla para mostrar los botones).
export function condicionesDe(marca) {
  if (marca === "CHERY") return ["financia", "retoma"]
  if (STELLANTIS.has(marca)) return ["canal"]
  return ["financia"]
}

/* ---------------- Bono por marca ---------------- */
// Devuelve { marca, financiamiento, vpp, neto, bruto } (montos de concepto en neto) y si falta algún dato.
export function bonoDeFila(marca, fila, cond) {
  let b = { marca: 0, financiamiento: 0, vpp: 0 }
  let falta = false
  if (marca === "CHERY") {
    b.marca = neto(fila.bonoMarcaPago)
    if (cond.financia) b.financiamiento = neto(fila.bonoFinanciamiento)
    if (cond.retoma) b.vpp = Math.round(neto(fila.bonoVpp) * (1 - (fila.margen || 0)))
    falta = cond.financia == null || cond.retoma == null
  } else if (STELLANTIS.has(marca)) {
    // Sin canal confirmado se calcula con "todo medio de pago" (solo aporte Stellantis) y queda por completar.
    const canal = fila.canales?.[cond.canal || "TMP"] || {}
    b.marca = canal.aporteMarca || 0
    b.financiamiento = cond.canal && cond.canal !== "TMP" ? canal.aporteFinanciera || 0 : 0
    falta = !cond.canal
  } else if (marca === "GEELY") {
    b.marca = neto(fila.bonoMarcaGmc)
    if (cond.financia) b.financiamiento = neto(fila.bonoFinanciamiento)
    falta = cond.financia == null
  }
  const total = b.marca + b.financiamiento + b.vpp
  return { bono: { ...b, neto: total, bruto: aBruto(total) }, falta }
}

const enVigencia = (fecha, lista) => Boolean(fecha) && lista.desde <= fecha && fecha <= lista.hasta

// Entre listas vigentes de la misma marca para una fecha manda la más reciente (la que empieza más tarde,
// p. ej. "SEPT PRE CYBER" desde el 21 reemplaza a "SEPT" desde el 1); luego la más completa.
function listaVigente(listas, marca, fecha) {
  return listas
    .filter((l) => l.marca === marca && enVigencia(fecha, l))
    .sort((a, b) => String(b.desde).localeCompare(String(a.desde)) || b.filas.length - a.filas.length || String(b.cargadoEn).localeCompare(String(a.cargadoEn)))[0]
}

// Ventas que no son retail de vehículo nuevo: usados, flota (va aparte) y ventas internas de administración.
export function tipoVenta(local) {
  const t = sinTildes(local).toUpperCase()
  if (/USADO|SEMINUEVO/.test(t)) return "USADO"
  if (/FLOTA/.test(t)) return "FLOTA"
  if (/ADMINISTRACION/.test(t)) return "INTERNA"
  return "RETAIL"
}

// nvs: [{ nv, marca, modelo, fechaFactura, fechaNV, nFactura, local, institucionCredito, tipoCredito, nula }]
// condiciones: { [nv]: { financiaScf?, tieneRetoma?, canal? } } (lo que confirma Contabilidad)
export function calcularBonos({ listas, nvs, condiciones = {}, marca }) {
  const marcaKey = sinTildes(marca).toUpperCase()
  const filas = []
  const sinLista = []
  const excluidas = { USADO: 0, FLOTA: 0, INTERNA: 0 }
  for (const nv of nvs) {
    if (nv.nula || !sinTildes(nv.marca).toUpperCase().replace(/\.$/, "").includes(marcaKey)) continue
    const tipo = tipoVenta(nv.local)
    if (tipo !== "RETAIL") { excluidas[tipo]++; continue }
    const fecha = nv.fechaFactura || nv.fechaNV
    const lista = listaVigente(listas, marcaKey, fecha)
    if (!lista) {
      if (fecha) sinLista.push({ nv: nv.nv, fecha, modelo: nv.modelo, local: nv.local, mes: fecha.slice(0, 7) })
      continue
    }
    const manual = condiciones[nv.nv] || {}
    const cond = {
      financia: manual.financiaScf ?? (marcaKey === "CHERY" ? financiaConScf(nv.institucionCredito) : (sinTildes(nv.institucionCredito).trim() ? true : null)),
      retoma: manual.tieneRetoma ?? null,
      canal: manual.canal ?? (STELLANTIS.has(marcaKey) ? canalStellantis(nv.institucionCredito, nv.tipoCredito) : null),
    }
    const enlace = enlazarModelo(marcaKey, nv.modelo, lista.filas)
    const calculo = enlace ? bonoDeFila(marcaKey, enlace.fila, cond) : null
    const revision = !enlace ? "SIN_MODELO" : enlace.porConfirmar ? "MODELO_POR_CONFIRMAR" : calculo.falta ? "SOLO_MARCA" : "CALCULADO"
    filas.push({
      nv: nv.nv,
      fecha,
      factura: nv.nFactura || "",
      local: nv.local || "",
      modeloSistema: nv.modelo,
      modeloLista: enlace?.fila.modelo || null,
      puntaje: enlace?.puntaje ?? null,
      lista: lista.sha,
      financiaScf: cond.financia,
      tieneRetoma: cond.retoma,
      canal: cond.canal,
      bono: calculo?.bono || null,
      revision,
    })
  }
  filas.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || String(a.nv).localeCompare(String(b.nv)))
  const conBono = filas.filter((f) => f.bono)
  return {
    condiciones: condicionesDe(marcaKey),
    filas,
    sinLista,
    totales: {
      nv: conBono.length,
      neto: conBono.reduce((s, f) => s + f.bono.neto, 0),
      bruto: conBono.reduce((s, f) => s + f.bono.bruto, 0),
      porRevision: filas.reduce((acc, f) => ({ ...acc, [f.revision]: (acc[f.revision] || 0) + 1 }), {}),
      sinLista: sinLista.length,
      excluidas,
    },
  }
}
