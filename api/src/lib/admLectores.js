// Contabilidad · lectores de listas de precio por marca (PDF y Excel).
// Cada archivo de la carpeta mensual se clasifica por marca y tipo:
//   RETAIL   lista de precios de venta a público → calcula bonos
//   FLOTA    flota, flotillas, B2B → se guarda aparte, nunca se mezcla con retail
//   CIRCULAR acciones comerciales, circulares, lanzamientos → se guarda como respaldo
// Si una marca todavía no tiene lector, el archivo queda guardado como "Falta lector".
import ExcelJS from "exceljs"
import { textoPaginas, itemsPaginas } from "./admPdf.js"

const sinTildes = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "")
const MESES = { ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6, JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, SETIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12 }
const diasMes = (anio, mes) => new Date(anio, mes, 0).getDate()
const p2 = (n) => String(n).padStart(2, "0")
const pesos = (t) => {
  const s = String(t ?? "").trim()
  if (!s || s === "-" || s === "$") return 0
  return parseInt(s.replace(/[^\d]/g, ""), 10) || 0
}

// Marcas conocidas (carpeta o nombre del archivo). Las de Stellantis comparten el mismo formato de Excel.
const MARCAS = ["CHERY", "GEELY", "PEUGEOT", "CITROEN", "JEEP", "FIAT", "RAM", "LEAPMOTOR", "OPEL", "MITSUBISHI", "JMC", "KGM", "NISSAN", "EXEED", "RENAULT", "GAC"]
export const STELLANTIS = new Set(["PEUGEOT", "CITROEN", "JEEP", "FIAT", "RAM", "LEAPMOTOR", "OPEL"])

export function clasificar(ruta) {
  const t = sinTildes(ruta).toUpperCase().replace(/[_\-]+/g, " ")
  const partes = t.split(/[\\/]/)
  const carpeta = partes.length > 1 ? partes[partes.length - 2] : ""
  const nombre = partes[partes.length - 1]
  const alias = { MMC: "MITSUBISHI", SSANGYONG: "KGM" }
  const buscar = (s) => MARCAS.find((m) => new RegExp(`\\b${m}\\b`).test(s)) || Object.entries(alias).find(([a]) => new RegExp(`\\b${a}\\b`).test(s))?.[1]
  const marca = buscar(carpeta) || buscar(nombre) || null
  const tipo = /FLOTA|FLOTILLA|B2B/.test(nombre)
    ? "FLOTA"
    : /ACCIONES COMERCIALES|AA\.?CC|CIRCULAR|INFORMATIVO|LANZAMIENTO|POLITICA|AUTODAY|BOLETIN|PROCEDIMIENTO|FICHA TECNICA|MANTENCION|PAUTA|COMPARATIVO|TOP ?5|WELCOME|\b(AP|AC|FT|JEEP|RAM|LPM|GPV)\s?0\d\d\b/.test(nombre)
      ? "CIRCULAR"
      : "RETAIL"
  return { marca, tipo }
}

/* ---------------- Chery · Canal Tradicional (PDF) ---------------- */
function leerCheryRetail(paginas) {
  const t = sinTildes(paginas.join("\n")).toUpperCase()
  const meta = periodoDesdeTitulo(t)
  if (t.includes("CANAL TRADICIONAL")) meta.canal = "Tradicional"
  const re = /^\s*([A-Z0-9][A-Za-z0-9 .\-()/]+?)\s{2,}(CY[0-9A-Z]+-\d)\s+(Euro\s?\w+)\s+(\d+)\s?%\s+(.*)$/
  const filas = []
  let familia = null
  paginas.forEach((pagina, i) => pagina.split("\n").forEach((linea) => {
    const r = linea.match(re)
    if (!r) {
      const s = linea.trim()
      const cand = s.split("   ")[0].trim()
      if (s && /^[A-Z0-9 ]{3,40}$/.test(cand) && !s.includes("$") && !s.includes("CIT") && /^(TIGGO|HIMLA|ARRIZO|EXEED|OMODA|JAECOO|[A-Z]+ ?\d)/.test(cand)) familia = cand
      return
    }
    const ms = [...r[5].matchAll(/\$\s*([\d,.]+|-)/g)].map((x) => pesos(x[1]))
    if (ms.length !== 9 && ms.length !== 10) {
      meta.observaciones.push(`Fila no reconocida (${ms.length} montos): ${linea.trim().slice(0, 80)}`)
      return
    }
    const fila = {
      linea: filas.length + 1, pagina: i + 1, familia,
      modelo: r[1].replace(/\s+/g, " ").trim(), cit: r[2], norma: r[3].replace(" ", ""), margen: +r[4] / 100,
      precioConcesionario: ms[0], precioPublico: ms[1], bonoMarcaCliente: ms[2], bonoFinanciamiento: ms[4], bonoVpp: ms[6],
      precioFinal: ms[7], netoSinVpp: ms.length === 10 ? ms[8] : null, bonoMarcaPago: ms[ms.length - 1],
    }
    if (ms[1] - ms[2] !== ms[3]) meta.observaciones.push(`${fila.modelo}: precio público − bono no cuadra con "precio c/bonos".`)
    filas.push(fila)
  }))
  return { meta, filas }
}

// "Lista de Precios 21 OCTUBRE 2026" → vigente del 21 al último día del mes (o hasta la fecha que diga el PDF).
// Sin día ("Lista de Precios AGOSTO 2026") → desde el 1.
function periodoDesdeTitulo(t) {
  const meta = { titulo: null, canal: null, desde: null, hasta: null, observaciones: [], avisos: [] }
  const m = t.match(/LISTA DE PRECIOS?\s+(?:(\d{1,2})\s+)?([A-Z]+)/)
  const y = t.match(/\b(20\d\d)\b/)
  if (m && y && MESES[m[2]]) {
    const mes = MESES[m[2]]
    const anio = +y[1]
    const ultimo = diasMes(anio, mes)
    const dia = m[1] ? +m[1] : 1
    meta.titulo = `Lista de Precios ${m[1] ? `${m[1]} ` : ""}${m[2][0] + m[2].slice(1).toLowerCase()} ${anio}`
    meta.desde = `${anio}-${p2(mes)}-${p2(dia)}`
    meta.hasta = `${anio}-${p2(mes)}-${p2(ultimo)}`
    const v = t.match(/HASTA EL (\d{1,2}) DE ([A-Z]+)/)
    if (v && MESES[v[2]] && +v[1] > diasMes(anio, MESES[v[2]])) meta.avisos.push(`El PDF dice vigencia hasta el ${v[1]} de ${v[2].toLowerCase()}; se usó el último día real del mes (${ultimo}).`)
    else if (v && MESES[v[2]]) meta.hasta = `${anio}-${p2(MESES[v[2]])}-${p2(+v[1])}`
  }
  return meta
}

/* ---------------- Geely (PDF): columnas por posición ---------------- */
// Las celdas vacías no aparecen en el texto, así que cada monto se asigna a la columna más cercana del encabezado.
function leerGeely(itemsPorPagina, paginas) {
  const t = sinTildes(paginas.join("\n")).toUpperCase()
  const meta = { titulo: null, canal: null, desde: null, hasta: null, observaciones: [], avisos: [] }
  const m = t.match(/LISTA DE PRECIOS DE ([A-Z]+) (20\d\d)/)
  if (m && MESES[m[1]]) {
    const mes = MESES[m[1]]
    const anio = +m[2]
    const d = t.match(/VIGENTE DESDE EL (\d{1,2})/)
    meta.titulo = `Lista de Precios ${m[1][0] + m[1].slice(1).toLowerCase()} ${anio}`
    meta.desde = `${anio}-${p2(mes)}-${p2(d ? +d[1] : 1)}`
    meta.hasta = `${anio}-${p2(mes)}-${p2(diasMes(anio, mes))}`
  }
  const filas = []
  itemsPorPagina.forEach((lineas, pagina) => {
    // Columnas: se toman de las palabras del encabezado de esta página.
    const x = (re) => lineas.flatMap((l) => l.items).find((i) => re.test(sinTildes(i.s).toUpperCase()))?.x
    const anchors = {
      precioLista: x(/^PRECIO DE LISTA$/), bonoMarcaGmc: x(/^GMC$/), bonoMarcaDealer: x(/^DEALER$/),
      precioContado: x(/^PRECIO CONTADO$/), bonoFinanciamiento: x(/^FINANCIAMIENTO$/), precioFinal: x(/^PRECIO FINAL$/),
      margen: x(/^CONCESIONARIO$/), incentivoVariable: x(/^VARIABLE$/), incentivoWholesale: x(/^WHOLESALE$/),
    }
    const cols = Object.entries(anchors).filter(([, v]) => v !== undefined)
    if (cols.length < 5) return
    let familia = null
    for (const linea of lineas) {
      const [primero, ...resto] = linea.items
      const valores = resto.filter((i) => /^\$?[\d.]+%?$|^\$[\d.]+$/.test(i.s.replace(/\s/g, "")))
      if (!valores.length) {
        const s = linea.items.map((i) => i.s).join(" ").trim()
        // Títulos de familia sin montos ("GX3", "COOLRAY LITE", "EX5 EM-i"; pueden traer minúsculas).
        if (/^[A-Z0-9][A-Za-z0-9 \-+]{1,30}$/.test(s) && !/LISTA|VIGENTE|PRECIO|BONO|GMC|VEHICULOS|INCENTIVO|COMBUSTION|ENERGIAS/.test(sinTildes(s).toUpperCase())) familia = s
        continue
      }
      if (!familia || !primero) continue
      const fila = { linea: filas.length + 1, pagina: pagina + 1, familia, modelo: "" }
      const version = primero.s.replace(/\s+/g, " ").trim()
      fila.modelo = sinTildes(version).toUpperCase().startsWith(sinTildes(familia).toUpperCase().split(" ")[0]) ? version : `${familia} ${version}`
      for (const v of valores) {
        const [campo] = cols.reduce((best, c) => (Math.abs(c[1] - (v.x + v.w / 2)) < Math.abs(best[1] - (v.x + v.w / 2)) ? c : best))
        fila[campo] = v.s.includes("%") ? parseFloat(v.s) / 100 : pesos(v.s)
      }
      if (!fila.precioLista) continue
      filas.push(fila)
    }
  })
  return { meta, filas }
}

/* ---------------- Stellantis (Excel): columnas por nombre ---------------- */
const valor = (v) => (v && typeof v === "object" ? (v.result ?? v.text ?? v.richText?.map((t) => t.text).join("") ?? "") : v)
// Encabezados en mayúsculas, sin tildes y sin saltos de línea ("BONO \nCON IVA" → "BONO CON IVA").
const titulo = (v) => sinTildes(valor(v)).toUpperCase().replace(/\s+/g, " ").trim()
const CANALES = { "TODO MEDIO DE PAGO": "TMP", "CREDITO CONVENCIONAL": "CC", "COMPRA INTELIGENTE": "CI", "CREDITO INTELIGENTE": "CI" }
const CAMPOS = { BONO: "bono", "BONO CON IVA": "bono", "APORTE CE": "aporteConcesionario", "APORTE RED": "aporteConcesionario", "APORTE STELLANTIS": "aporteMarca", "APORTE FINANCIERA": "aporteFinanciera", "PRECIO PROMO": "precioPromo", "APORTE STELLANTIS SIN": "aporteMarca", "APORTE FINANCIERA SIN": "aporteFinanciera" }

async function leerStellantis(buffer) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  const meta = { titulo: null, canal: null, desde: null, hasta: null, observaciones: [], avisos: [] }
  const filas = []
  for (const ws of wb.worksheets) {
    if (/CUOTA|LEGAL|STORE|MESES|RESERVA|TRAMITE/i.test(sinTildes(ws.name))) continue
    // Fila de encabezado: la que dice "BONO CON IVA"; la de arriba trae el canal.
    let h = 0
    for (let r = 1; r <= Math.min(20, ws.rowCount); r++) {
      const vals = ws.getRow(r).values.map(titulo)
      if (vals.includes("BONO CON IVA")) { h = r; break }
    }
    if (!h) continue
    if (!meta.titulo) {
      for (let r = 1; r < h; r++) {
        const s = ws.getRow(r).values.map(valor).join(" ")
        const n = sinTildes(s).match(/N[º°o]\s*(\d{1,2})\s*-\s*(20\d\d)/i)
        if (n) {
          const mes = +n[1]
          const anio = +n[2]
          meta.titulo = `Lista de Precios N° ${mes} - ${anio}`
          meta.desde = `${anio}-${p2(mes)}-01`
          meta.hasta = `${anio}-${p2(mes)}-${p2(diasMes(anio, mes))}`
          break
        }
      }
    }
    const top = ws.getRow(h - 1)
    const head = ws.getRow(h)
    const columnas = {}
    let canal = null
    for (let c = 1; c <= ws.columnCount; c++) {
      const sup = titulo(top.getCell(c).value)
      if (CANALES[sup]) canal = CANALES[sup]
      else if (sup) canal = null
      const nombre = titulo(head.getCell(c).value)
      if (nombre === "CON IVA" && /PRECIO LISTA/.test(sup)) columnas.precioLista = c
      if (nombre === "MARGEN RED") columnas.margen = c
      if (nombre === "LCDV") columnas.codigo = c
      if (nombre === "CIT") columnas.cit = c
      // "APORTE STELLANTIS" (con IVA, pasajeros) o "APORTE STELLANTIS SIN IVA" (comerciales, como RAM).
      const sinIva = /\bSIN IVA$/.test(nombre)
      const base = nombre.replace(/\s*(CON|SIN) IVA$/, "").trim() || nombre
      const campo = CAMPOS[base] || CAMPOS[nombre]
      const esMonto = campo === "bono" || campo === "precioPromo"
      if (canal && campo && !(esMonto && sinIva)) (columnas.canales ||= {})[`${canal}.${campo}`] = { c, conIva: !sinIva }
    }
    let familia = null
    for (let r = h + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r)
      // Nombre del modelo: el más completo entre la columna de clave y la de vehículos.
      const nombres = [1, 3].map((c) => String(valor(row.getCell(c).value) ?? "").replace(/\s+/g, " ").trim())
      const modelo = nombres[1] && nombres[0].length > nombres[1].length && !/^\d+$/.test(nombres[0]) ? nombres[0] : nombres[1]
      const precio = Number(valor(row.getCell(columnas.precioLista || 7).value))
      if (!modelo) continue
      if (!Number.isFinite(precio) || precio <= 0) {
        if (modelo.length < 40 && !/^\*|NOTA|VALORES|PRECIOS/i.test(modelo)) familia = modelo
        continue
      }
      const canales = {}
      // Bono y precio promo quedan con IVA; los aportes se guardan siempre en neto.
      for (const [k, { c, conIva }] of Object.entries(columnas.canales || {})) {
        const [canal, campo] = k.split(".")
        const v = Number(valor(row.getCell(c).value))
        const monto = Number.isFinite(v) ? v : 0
        const neto = campo.startsWith("aporte") && conIva ? monto / 1.19 : monto
        ;(canales[canal] ||= {})[campo] = Math.round(neto)
      }
      filas.push({
        linea: filas.length + 1, hoja: ws.name, familia, modelo,
        codigo: String(valor(row.getCell(columnas.codigo || 4).value) ?? ""),
        cit: String(valor(row.getCell(columnas.cit || 5).value) ?? ""),
        precioLista: Math.round(precio),
        margen: columnas.margen ? Number(valor(row.getCell(columnas.margen).value)) || null : null,
        canales,
      })
    }
  }
  return { meta, filas }
}

/* ---------------- Entrada ---------------- */
// Lee un archivo de la carpeta mensual. ruta = "OCTUBRE 2026/GEELY/archivo.pdf" (o solo el nombre).
export async function leerArchivo(buffer, ruta) {
  const { marca, tipo } = clasificar(ruta)
  const base = { marca, tipo, lector: null, meta: { titulo: null, canal: null, desde: null, hasta: null, observaciones: [], avisos: [] }, filas: [] }
  const esPdf = buffer.subarray(0, 5).toString("latin1") === "%PDF-"
  const esXlsx = buffer.subarray(0, 2).toString("latin1") === "PK"
  if (tipo === "CIRCULAR") return { ...base, estado: "GUARDADO" }
  try {
    let lectura = null
    if (esPdf) {
      const paginas = await textoPaginas(buffer)
      const t = sinTildes(paginas.join("\n")).toUpperCase()
      if (tipo === "RETAIL" && t.includes("BONO CHERY") && t.includes("CODIGO CIT") && t.includes("CANAL TRADICIONAL")) {
        lectura = { lector: "chery_retail_v1", marca: "CHERY", ...leerCheryRetail(paginas) }
      } else if (tipo === "RETAIL" && (marca === "GEELY" || t.includes("BONO MARCA") && t.includes("GMC"))) {
        lectura = { lector: "geely_v1", marca: "GEELY", ...leerGeely(await itemsPaginas(buffer), paginas) }
      }
    } else if (esXlsx && tipo === "RETAIL" && (STELLANTIS.has(marca) || !marca)) {
      const r = await leerStellantis(buffer)
      if (r.filas.length) lectura = { lector: "stellantis_v1", marca: marca || null, ...r }
    }
    if (!lectura) return { ...base, estado: tipo === "FLOTA" ? "GUARDADO" : "FALTA_LECTOR" }
    const estado = lectura.filas.length && lectura.meta.desde && lectura.meta.hasta ? "OK" : "REVISAR"
    return { ...base, ...lectura, tipo, estado }
  } catch (error) {
    return { ...base, estado: "REVISAR", meta: { ...base.meta, observaciones: [`No se pudo leer: ${error?.message || "error"}`] } }
  }
}
