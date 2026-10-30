// Lectura de las planillas de "Datos". Cada parser recibe el archivo tal como se
// descarga (SIGA, Control de unidades, planilla T, consolidado y seguimiento
// operativo) y devuelve registros normalizados. Formatos validados con los
// archivos reales entregados por Experiencia el 08-10-2026.
// Sólo se extraen las columnas necesarias: la información financiera de SIGA
// (márgenes, costos, comisiones, precios) NO se lee ni se guarda.

import ExcelJS from "exceljs"
import JSZip from "jszip"
import crypto from "node:crypto"
import {
  cleanText, normKey, normNv, normPhone, normRut, normText, normVin, parseDate, parseExpectedMonth,
} from "./segNormalize.js"

// ---------- lectura genérica ----------

function decodeText(buffer) {
  const utf8 = buffer.toString("utf8")
  // Archivos exportados desde Excel en Windows suelen venir en Latin-1.
  return utf8.includes("�") ? buffer.toString("latin1") : utf8
}

function parseCsv(text) {
  const firstLine = text.slice(0, text.indexOf("\n") >= 0 ? text.indexOf("\n") : text.length)
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ","
  const rows = []
  let row = []
  let field = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === delimiter) { row.push(field); field = "" }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++
      row.push(field); field = ""
      if (row.some((c) => c.trim() !== "")) rows.push(row)
      row = []
    } else field += ch
  }
  row.push(field)
  if (row.some((c) => c.trim() !== "")) rows.push(row)
  return rows
}

function cellValue(value) {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value
  if (typeof value === "object") {
    if (value.result !== undefined) return value.result
    if (Array.isArray(value.richText)) return value.richText.map((p) => p.text || "").join("")
    if (value.text !== undefined) return value.text
    if (value.error) return null
  }
  return value
}

function columnName(index) {
  let name = ""
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name
  return name
}

function addCellRefs(xml) {
  let rowNumber = 0
  return xml.replace(/<row\b([^>]*?)(\/?)>(?:([\s\S]*?)<\/row>)?/g, (match, attrs, selfClose, inner) => {
    const existing = attrs.match(/\sr="(\d+)"/)
    rowNumber = existing ? Number(existing[1]) : rowNumber + 1
    const rowAttrs = existing ? attrs : `${attrs} r="${rowNumber}"`
    if (selfClose) return `<row${rowAttrs}/>`
    let col = 0
    const cells = String(inner || "").replace(/<c\b([^>]*?)(\/?)>/g, (cell, cellAttrs, cellClose) => {
      const ref = cellAttrs.match(/\sr="([A-Z]+)\d+"/)
      if (ref) { col = ref[1].split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0); return cell }
      const tag = `<c r="${columnName(col)}${rowNumber}"${cellAttrs}${cellClose}>`
      col += 1
      return tag
    })
    return `<row${rowAttrs}>${cells}</row>`
  })
}

// Algunos Excel generados por Power Automate/.NET usan rutas absolutas ("/xl/...")
// en sus relaciones internas; ExcelJS no las entiende. Se reescriben a relativas.
async function normalizeXlsxPackage(buffer) {
  const zip = await JSZip.loadAsync(buffer)
  let changed = false
  for (const path of Object.keys(zip.files)) {
    if (zip.files[path].dir || !/\.(rels|xml)$/i.test(path)) continue
    const raw = await zip.file(path).async("string")
    let xml = raw.replace(/^\uFEFF/, "")
    // Elementos con prefijo ("<x:workbook>") para el namespace principal: se quitan.
    const prefix = xml.match(/xmlns:(\w+)="http:\/\/schemas\.openxmlformats\.org\/spreadsheetml\/2006\/main"/)
    if (prefix) {
      const p = prefix[1]
      xml = xml
        .replace(new RegExp(`<(/?)${p}:`, "g"), "<$1")
        .replace(`xmlns:${p}="http://schemas.openxmlformats.org/spreadsheetml/2006/main"`, 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"')
    }
    // Hojas exportadas sin referencias de fila/celda (r="…"), como la exportación de Frogmi:
    // ExcelJS las rechaza, así que se numeran en orden.
    if (/worksheets\/[^/]+\.xml$/i.test(path) && /<row(?![^>]*\sr=)[\s>\/]/.test(xml)) xml = addCellRefs(xml)
    if (xml !== raw) { changed = true; zip.file(path, xml) }
    if (!path.endsWith(".rels")) continue
    const baseDir = path.replace(/_rels\/[^/]+$/, "") // "xl/" o "" o "xl/worksheets/"
    const fixed = xml.replace(/^\uFEFF/, "").replace(/Target="\/([^"]+)"/g, (_, target) => {
      changed = true
      const from = baseDir.split("/").filter(Boolean)
      const to = target.split("/")
      while (from.length && to.length > 1 && from[0] === to[0]) { from.shift(); to.shift() }
      return `Target="${"../".repeat(from.length)}${to.join("/")}"`
    })
    if (fixed !== xml) { changed = true; zip.file(path, fixed) }
  }
  return changed ? zip.generateAsync({ type: "nodebuffer" }) : buffer
}

// Devuelve [{ name, rows: any[][] }] (rows sin filas vacías).
export async function readSheets(buffer, fileName = "") {
  const lower = String(fileName).toLowerCase()
  const isZip = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b
  if (lower.endsWith(".csv") || !isZip) {
    return [{ name: "csv", rows: parseCsv(decodeText(buffer)) }]
  }
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await normalizeXlsxPackage(buffer))
  return workbook.worksheets.map((ws) => {
    const rows = []
    ws.eachRow({ includeEmpty: false }, (row) => {
      const values = []
      row.eachCell({ includeEmpty: true }, (cell, col) => { values[col - 1] = cellValue(cell.value) })
      if (values.some((v) => v !== null && v !== undefined && String(v).trim() !== "")) rows.push(values)
    })
    return { name: ws.name, rows }
  })
}

// Encuentra la fila de encabezados que contiene todas las columnas pedidas.
export function findHeader(rows, required, maxScan = 15) {
  for (let i = 0; i < Math.min(rows.length, maxScan); i++) {
    const keys = (rows[i] || []).map((c) => normKey(c))
    if (required.every((r) => keys.includes(normKey(r)))) return i
  }
  return -1
}

// Índice por nombre normalizado; con nombres repetidos guarda la primera aparición.
export function headerIndex(row) {
  const index = {}
  ;(row || []).forEach((cell, i) => {
    const key = normKey(cell)
    if (key && index[key] === undefined) index[key] = i
  })
  return (name) => index[normKey(name)]
}

const get = (row, col) => (col === undefined ? null : row[col] ?? null)
const text = (row, col) => cleanText(get(row, col))

function missingColumns(col, names) {
  return names.filter((n) => col(n) === undefined)
}

// ---------- 1. SIGA (exportación de notas de venta) ----------
export async function parseSiga(buffer, fileName) {
  const [sheet] = await readSheets(buffer, fileName)
  const h = findHeader(sheet.rows, ["N°", "Chassis", "Local", "Vendedor", "Cliente"])
  if (h < 0) throw new Error("No reconozco el formato SIGA: faltan las columnas N°, Chassis, Local, Vendedor o Cliente.")
  const col = headerIndex(sheet.rows[h])
  const missing = missingColumns(col, ["Fecha", "Marca", "Modelo", "R.U.T.", "Teléfono", "Fecha Factura", "Fecha Recepción"])
  if (missing.length) throw new Error(`Al archivo SIGA le faltan columnas: ${missing.join(", ")}.`)

  const records = []
  let errors = 0
  for (const row of sheet.rows.slice(h + 1)) {
    const nv = normNv(get(row, col("N°")))
    if (!nv) { errors++; continue }
    const precioLista = text(row, col("Precio de Lista"))
    records.push({
      key: nv,
      nv,
      fechaNV: parseDate(get(row, col("Fecha"))),
      marca: text(row, col("Marca")).replace(/\.$/, ""),
      modelo: text(row, col("Modelo")),
      vin: normVin(get(row, col("Chassis"))),
      anio: text(row, col("Año")),
      color: text(row, col("Color")),
      local: text(row, col("Local")),
      vendedor: text(row, col("Vendedor")),
      rutVendedor: normRut(get(row, col("R.U.T. Vendedor"))),
      nula: /nula/i.test(precioLista),
      fechaAsigMarca: parseDate(get(row, col("Fecha Asig.Marca"))),
      fechaRecepcion: parseDate(get(row, col("Fecha Recepción"))),
      localRecepcion: text(row, col("Local Recepción")),
      cliente: text(row, col("Cliente")),
      rut: normRut(get(row, col("R.U.T."))),
      telefono: text(row, col("Teléfono")),
      celular: text(row, col("Teléfono Celular")),
      email: text(row, col("E-MAIL")).toLowerCase(),
      comuna: text(row, col("Comuna")),
      nFactura: text(row, col("N° Factura")),
      fechaFactura: parseDate(get(row, col("Fecha Factura"))),
      institucionCredito: text(row, col("Institución Crédito")),
      tipoCredito: text(row, col("Tipo de Crédito")),
      nCotCRM: text(row, col("N° Cot. CRM")),
      origenCliente: text(row, col("Origen Cliente")),
      estadoVehiculo: text(row, col("Estado Vehículo")),
      ubicacion: text(row, col("Ubicación Vehiculo")),
      patente: text(row, col("Patente")),
    })
  }
  return { records, errors, sheet: sheet.name }
}

// ---------- 2. Control de unidades nuevo (Astara / Stellantis) ----------
export async function parseControl(buffer, fileName) {
  const [sheet] = await readSheets(buffer, fileName)
  const h = findHeader(sheet.rows, ["ESTADO", "VIN", "FECHA LLEGADA", "DESTINO"])
  if (h < 0) throw new Error("No reconozco el formato del Control de unidades: faltan ESTADO, VIN, FECHA LLEGADA o DESTINO.")
  const col = headerIndex(sheet.rows[h])
  const cutoff = new Date(Date.now() - 548 * 86400000).toISOString().slice(0, 10) // ~18 meses

  const records = []
  let skipped = 0
  for (const row of sheet.rows.slice(h + 1)) {
    const estado = text(row, col("ESTADO"))
    const nv = normNv(estado)
    const vin = normVin(get(row, col("VIN")))
    if (!nv && !vin) { skipped++; continue }
    const llegadaRaw = get(row, col("FECHA LLEGADA"))
    const fechaLlegada = parseDate(llegadaRaw)
    const llegadaMes = fechaLlegada ? "" : parseExpectedMonth(llegadaRaw)
    const fechaAsignacion = parseDate(get(row, col("FECHADEASIGNACIÓN")) ?? get(row, col("FECHA ASIGNACION")))
    const recent = llegadaMes || [fechaLlegada, fechaAsignacion].some((d) => d && d >= cutoff)
    if (!recent) { skipped++; continue }
    records.push({
      key: nv || `VIN:${vin}`,
      nv,
      vin,
      estadoTexto: nv ? "" : estado,
      fechaAsignacion,
      fechaLlegada,
      llegadaMes,
      destino: text(row, col("DESTINO")),
      marca: text(row, col("MARCA")),
      modelo: text(row, col("MODELO")),
      pedidoPor: text(row, col("PEDIDOPOR")),
    })
  }
  return { records, errors: 0, skipped, sheet: sheet.name }
}

// ---------- 3. Planilla T (traslados) ----------
export async function parseTraslados(buffer, fileName) {
  const sheets = await readSheets(buffer, fileName)
  const records = []
  let skipped = 0
  let recognized = false
  for (const sheet of sheets) {
    const h = findHeader(sheet.rows, ["NV", "FECHA TRASLADO", "VIN", "DESTINO"])
    if (h < 0) continue
    recognized = true
    const col = headerIndex(sheet.rows[h])
    for (const row of sheet.rows.slice(h + 1)) {
      const nvRaw = text(row, col("NV"))
      const nv = normNv(get(row, col("NV")))
      const vin = normVin(get(row, col("VIN")))
      const fechaRaw = get(row, col("FECHA TRASLADO"))
      const fecha = parseDate(fechaRaw)
      if (!nv && !vin) { skipped++; continue }
      const fechaTexto = fecha ? "" : cleanText(fechaRaw)
      // Fila sin fecha legible (por ejemplo "10-09-206"): se guarda marcada para revisión
      // en vez de descartarse o sumarse a un mes en silencio.
      if (!fecha && !fechaTexto) { skipped++; continue }
      const destino = text(row, col("DESTINO"))
      records.push({
        key: `${vin || `NV${nv}`}|${fecha || `SINFECHA:${normKey(fechaTexto)}`}|${normKey(destino)}`,
        fechaIlegible: !fecha,
        fechaTexto,
        nv,
        tipo: nv ? "NV" : normText(nvRaw) || "SIN NV",
        vin,
        fecha,
        retiro: text(row, col("RETIRO")),
        destino,
        solicitadoPor: text(row, col("SOLICITADO POR")),
        estado: text(row, col("ESTADO")),
        marca: text(row, col("MARCA")),
        modelo: text(row, col("MODELO")),
      })
    }
  }
  if (!recognized) throw new Error("No reconozco el formato de la planilla T: faltan NV, FECHA TRASLADO, VIN o DESTINO.")
  return { records, errors: 0, skipped }
}

// ---------- 4 y 5. Historial de contactos (consolidado y operativo) ----------

export function stageFromText(value) {
  const t = normText(value)
  const m = t.match(/^\s*(\d)\s*[.)-]?/)
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 4) return Number(m[1])
  if (t.includes("NUEVA VENTA") || t.includes("COMPRA CONFIRMADA")) return 1
  if (t.includes("EN CAMINO")) return 2
  if (t.includes("FALTA POCO") || t.includes("RECIBIDO") || t.includes("PREPARACION")) return 3
  if (t.includes("ENTREGADO") || t.includes("ENCUESTA")) return 4
  return 0
}

function resultFromText(value) {
  const t = normText(value)
  if (t.startsWith("RESPOND")) return "RESPONDIDO"
  if (t.startsWith("DERIVAD")) return "DERIVADO_EXPERIENCIA"
  if (t.startsWith("ENVIAD")) return "ENVIADO"
  if (t.includes("SIN RESPUESTA")) return "SIN_RESPUESTA"
  return ""
}

function importId(parts) {
  return crypto.createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 24)
}

function phoneIssue(text) {
  const t = normText(text)
  return t.includes("SIN WHATSAPP") || t.includes("NO CORRESPONDE") || t.includes("OTRO CLIENTE") || t.includes("NUMERO INCORRECTO")
}

export async function parseConsolidado(buffer, fileName) {
  const sheets = await readSheets(buffer, fileName)
  const contacts = []
  let recognized = false
  for (const sheet of sheets) {
    const h = findHeader(sheet.rows, ["Cliente", "RUT", "Teléfono", "Historial por etapa"])
    if (h < 0) continue
    recognized = true
    const col = headerIndex(sheet.rows[h])
    for (const row of sheet.rows.slice(h + 1)) {
      const nvs = (text(row, col("NV contactada(s)")).match(/\d{4,7}/g) || [])
      const rut = normRut(get(row, col("RUT")))
      const phone = normPhone(get(row, col("Teléfono"))).phone
      const historial = text(row, col("Historial por etapa"))
      const entries = [...historial.matchAll(/(\d)\.\s*[^()→]*?\((\d{2}-\d{2}-\d{4})\)/g)]
      if (!entries.length || (!nvs.length && !rut)) continue
      const lastState = resultFromText(text(row, col("Último estado"))) || "ENVIADO"
      const lastAnswer = text(row, col("Última respuesta / comentario"))
      entries.forEach((entry, i) => {
        const stage = Number(entry[1])
        const at = parseDate(entry[2])
        const isLast = i === entries.length - 1
        for (const nv of nvs.length ? nvs : [""]) {
          contacts.push({
            id: importId(["CONS", nv, rut, stage, at]),
            nv, rut, phone, stage, at,
            result: isLast ? lastState : "ENVIADO",
            observacion: isLast ? lastAnswer : "",
            responsable: "Historial importado (consolidado)",
            source: "IMPORT_CONSOLIDADO",
          })
        }
      })
    }
  }
  if (!recognized) throw new Error("No reconozco el formato del consolidado: faltan Cliente, RUT, Teléfono o Historial por etapa.")
  return { records: contacts, errors: 0 }
}

export async function parseOperativo(buffer, fileName) {
  const sheets = await readSheets(buffer, fileName)
  const contacts = []
  let corte = ""
  for (const sheet of sheets) {
    for (const row of sheet.rows.slice(0, 3)) {
      const m = text(row, 0).match(/CORTE\s+(\d{2}-\d{2}-\d{4})/i)
      if (m) corte = parseDate(m[1])
    }
  }
  let recognized = false
  for (const sheet of sheets) {
    const h = findHeader(sheet.rows, ["Mensaje a enviar", "NV", "Estado contacto"])
    if (h < 0) continue
    recognized = true
    const col = headerIndex(sheet.rows[h])
    for (const row of sheet.rows.slice(h + 1)) {
      const nv = normNv(get(row, col("NV")))
      const stage = stageFromText(get(row, col("Mensaje a enviar")))
      const result = resultFromText(get(row, col("Estado contacto")))
      if (!nv || !stage) continue
      const rut = normRut(get(row, col("RUT")))
      const phone = normPhone(get(row, col("Teléfono — copiar"))).phone
      const at = parseDate(get(row, col("Fecha envío"))) || corte
      const comentario = text(row, col("Comentarios"))
      const respuesta = text(row, col("Respuesta cliente"))
      if (result) {
        contacts.push({
          id: importId(["OPER", nv, stage, at, result]),
          nv, rut, phone, stage, at, result,
          observacion: [respuesta, comentario].filter(Boolean).join(" — "),
          derivadoA: text(row, col("Área derivación")),
          responsable: text(row, col("Responsable / destinatario")) || "Historial importado (operativo)",
          source: "IMPORT_OPERATIVO",
        })
      }
      if (phoneIssue(comentario)) {
        contacts.push({
          id: importId(["OPER-TEL", nv, rut]),
          nv, rut, phone, stage, at, result: "NUMERO_INCORRECTO",
          observacion: comentario,
          responsable: "Historial importado (operativo)",
          source: "IMPORT_OPERATIVO",
        })
      }
    }
  }
  if (!recognized) throw new Error("No reconozco el formato del seguimiento operativo: falta la hoja \"Enviar a clientes\".")
  return { records: contacts, errors: 0 }
}

// ---------- 6. Extranet del transportista (Gespark) ----------
// Columnas: VIN, Estado Color (32768 = Gespark realizado) y, si vienen, FECHA, MARCA, MODELO,
// DESTINO y Estado Chasis. Si un VIN aparece varias veces, vale la fila con 32768.
export const GESPARK_OK = 32768

export async function parseExtranet(buffer, fileName) {
  const sheets = await readSheets(buffer, fileName)
  for (const sheet of sheets) {
    const h = findHeader(sheet.rows, ["VIN", "ESTADO COLOR"], 25)
    if (h < 0) continue
    const col = headerIndex(sheet.rows[h])
    const byVin = new Map()
    let skipped = 0
    for (const row of sheet.rows.slice(h + 1)) {
      const vin = normKey(get(row, col("VIN")))
      if (vin.length < 6) { skipped++; continue }
      const color = Number(String(get(row, col("ESTADO COLOR")) ?? "").replace(/\D/g, "")) || 0
      const record = {
        key: vin, vin, color,
        fecha: parseDate(get(row, col("FECHA"))),
        marca: text(row, col("MARCA")), modelo: text(row, col("MODELO")),
        destino: text(row, col("DESTINO")), chasis: text(row, col("ESTADO CHASIS")),
      }
      const prev = byVin.get(vin)
      if (!prev || color === GESPARK_OK) byVin.set(vin, record)
    }
    return { records: [...byVin.values()], errors: 0, skipped, sheet: sheet.name }
  }
  throw new Error("No reconozco el listado de la extranet: necesita las columnas VIN y Estado Color.")
}

// ---------- 7. Frogmi (exportación "data 2", hoja Export) ----------
export function frogmiActivity(value) {
  const t = normText(value)
  if (t.includes("RECEPCION")) return "RECEPCION"
  if (t.includes("STOCK")) return "STOCK"
  if (t.includes("CONTROL PREVIO")) return "CONTROL"
  if (t.includes("PREPARACION")) return "PREPARACION"
  if (t.includes("ENTREGA A CLIENTE") || t.includes("ENTREGA CLIENTE")) return "ENTREGA"
  return ""
}

// Local "corto" usado en Frogmi y en la medición junior.
export function frogmiLocal(value) {
  const k = normKey(value)
  if (!k || k.includes("FLOTA") || k.includes("USADO") || k.includes("ADMINISTRACION")) return ""
  if (k.includes("TOBALABA")) return "TOBALABA"
  if (k.includes("NORTE")) return "NORTE"
  if (k.includes("CANTAGALLO")) return "CANTAGALLO"
  if (k.includes("ALAMEDA")) return "ALAMEDA"
  if (k.includes("VESPUCIO")) return "VESPUCIO"
  if (k.includes("COSTANERA")) return "COSTANERA"
  if (k.includes("FLORIDA")) return "FLORIDA"
  return ""
}

export async function parseFrogmi(buffer, fileName) {
  const sheets = await readSheets(buffer, fileName)
  for (const sheet of sheets) {
    const h = findHeader(sheet.rows, ["Tienda", "Actividad", "ID Evento"], 10)
    if (h < 0) continue
    const col = headerIndex(sheet.rows[h])
    const vinCol = sheet.rows[h].findIndex((c) => normKey(c).includes("VINDELVEHICULO"))
    const pick = (row, prefix) => {
      const i = sheet.rows[h].findIndex((c) => normKey(c).includes(prefix))
      return i >= 0 ? cleanText(row[i]) : ""
    }
    const records = []
    let skipped = 0
    for (const row of sheet.rows.slice(h + 1)) {
      const id = text(row, col("ID Evento"))
      const form = frogmiActivity(get(row, col("Actividad")))
      if (!id || !form) { skipped++; continue }
      records.push({
        key: id, id, form,
        fecha: parseDate(get(row, col("Fecha"))),
        tienda: text(row, col("Tienda")),
        local: frogmiLocal(get(row, col("Tienda"))),
        vinDigitado: vinCol >= 0 ? normKey(row[vinCol]) : "",
        marca: pick(row, "MARCADELVEHICULO"),
        modelo: pick(row, "MODELODELVEHICULO"),
      })
    }
    return { records, errors: 0, skipped, sheet: sheet.name }
  }
  throw new Error("No reconozco la exportación de Frogmi: necesita las columnas Tienda, Actividad e ID Evento (formato \"data 2\").")
}

// ---------- 8. Informe de Notificación de Venta (Chile) ----------
// Encabezados en la fila que contiene "Vehículo: VIN". Se ignoran Subtotal, Total y pie del reporte.
// No se guardan datos de contacto del cliente: solo el RUT normalizado, como respaldo del cruce.
export async function parseNotificados(buffer, fileName) {
  const sheets = await readSheets(buffer, fileName)
  for (const sheet of sheets) {
    const h = findHeader(sheet.rows, ["Vehículo: VIN", "Vehículo: Fecha Venta"], 60)
    if (h < 0) continue
    const col = headerIndex(sheet.rows[h])
    const records = []
    let skipped = 0
    for (const row of sheet.rows.slice(h + 1)) {
      const vin = normVin(get(row, col("Vehículo: VIN")))
      const fechaVenta = parseDate(get(row, col("Vehículo: Fecha Venta")))
      if (!vin || !fechaVenta) { skipped++; continue }
      const notificado = normText(get(row, col("Vehículo: Notificado")))
      records.push({
        key: vin, vin, fechaVenta,
        marcaSharing: text(row, col("Vehículo: MarcaSharing")),
        fechaEntrega: parseDate(get(row, col("Vehículo: Fecha Entrega"))),
        notificado: !notificado || ["TRUE", "VERDADERO", "SI", "1"].includes(notificado),
        estado: text(row, col("Vehículo: Estado")),
        tipoVenta: text(row, col("Vehículo: Tipo Venta: Nombre de Tipo Venta")),
        exposicion: text(row, col("Vehículo: Exposición: Direccion Envio Name")),
        vendedorPortal: text(row, col("Vehículo: Pedido venta: Oportunidad: Propietario de oportunidad: Nombre completo")),
        rutCliente: normRut(get(row, col("Cliente: Cuenta personal: Numero Documento")) || get(row, col("Cliente: RUT"))),
      })
    }
    return { records, errors: 0, skipped, sheet: sheet.name }
  }
  throw new Error("No reconozco el Informe de Notificación de Venta: falta la fila de encabezados con \"Vehículo: VIN\" y \"Vehículo: Fecha Venta\".")
}

export const DATA_KINDS = {
  siga: { label: "SIGA · notas de venta", parse: parseSiga, store: "master" },
  control: { label: "Control de unidades nuevo", parse: parseControl, store: "master" },
  traslados: { label: "Planilla T · traslados", parse: parseTraslados, store: "master" },
  consolidado: { label: "Consolidado de contactados (historial)", parse: parseConsolidado, store: "contacts" },
  operativo: { label: "Seguimiento operativo (historial)", parse: parseOperativo, store: "contacts" },
  extranet: { label: "Extranet transportista · Gespark", parse: parseExtranet, store: "master" },
  frogmi: { label: "Frogmi · formularios (data 2)", parse: parseFrogmi, store: "master" },
  notificados: { label: "Informe de Notificación de Venta", parse: parseNotificados, store: "master" },
}
