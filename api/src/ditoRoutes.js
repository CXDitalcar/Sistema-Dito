// Herramientas de administración de DITO (solo los administradores definidos en lib/accessRules.js):
//  - Interruptor de implementación de la Ruta (adherencia).
//  - Respaldo completo (zip) y vaciado del detalle antiguo, conservando solo números macro (Lanu).
//  - Plantilla de Excel para cargar Rutas/Auditorías anteriores y cifras mensuales a mano (con foto de respaldo).
import crypto from "node:crypto"
import ExcelJS from "exceljs"
import JSZip from "jszip"
import { json, body } from "./lib/http.js"
import { isDitoAdmin } from "./lib/accessRules.js"
import { getAppConfig, setAppConfig } from "./lib/store.js"
import { deleteRouteExecutions, listRouteExecutions, saveRouteExecution } from "./lib/routeStore.js"
import { listRequestsStored } from "./lib/requestStore.js"
import { appFilesContainer } from "./lib/dataFiles.js"
import { jefaturaPredicate } from "./lib/rutaJefatura.js"
import { getImplementacion, readSnapshot, recordsFromExecutions, saveSnapshot, setImplementacion, weekKey } from "./lib/rutaMacro.js"
import { routeLocals, routeQuestions } from "./lib/routeQuestions.js"

const STATUS_LABEL = { CUMPLE: "Cumple", NO_CUMPLE: "No cumple", SOLICITADO: "Solicitado" }
const STATUS_FROM_LABEL = { "cumple": "CUMPLE", "no cumple": "NO_CUMPLE", "solicitado": "SOLICITADO" }
const norm = (v) => String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase()
const MIN_DIAS_DETALLE = 30 // el vaciado deja siempre al menos el último mes de detalle
const RESPALDOS_KEY = "DITO_RESPALDOS"
const VACIADOS_KEY = "DITO_VACIADOS"

async function readList(key) {
  const stored = await getAppConfig(key).catch(() => null)
  try { return JSON.parse(String(stored?.value || "[]")) } catch { return [] }
}
async function pushList(key, entry, max = 100) {
  const list = await readList(key)
  list.unshift(entry)
  await setAppConfig(key, JSON.stringify(list.slice(0, max)))
}
const dateOf = (e) => e?.submittedAt || e?.updatedAt || e?.createdAt || ""
const countsOf = (answers) => answers.reduce((acc, a) => {
  if (a.status === "CUMPLE") acc.compliant += 1
  if (a.status === "NO_CUMPLE") acc.nonCompliant += 1
  if (a.status === "SOLICITADO") acc.requested += 1
  return acc
}, { compliant: 0, nonCompliant: 0, requested: 0 })

export function registerDitoRoutes({ app, currentUser }) {
  const admin = (fn) => async (request) => {
    try {
      const user = await currentUser(request)
      if (!user) return json(401, { message: "Sesión no válida." })
      if (!(await isDitoAdmin(user))) return json(403, { message: "Esta herramienta es solo para los administradores de DITO." })
      return await fn(request, user)
    } catch (error) {
      console.error("ditoRoutes", error?.message)
      return json(500, { message: error?.message || "Error inesperado." })
    }
  }

  /* ---------------- Interruptor de implementación ---------------- */
  app.http("route-implementacion", {
    methods: ["GET", "POST"], authLevel: "anonymous", route: "route/implementacion",
    handler: async (request) => {
      try {
        const user = await currentUser(request)
        if (!user) return json(401, { message: "Sesión no válida." })
        const manage = await isDitoAdmin(user)
        if (request.method === "GET") {
          const impl = await getImplementacion()
          return json(200, { active: impl.active, activatedAt: impl.activatedAt, canManage: manage, ...(manage ? { updatedAt: impl.updatedAt, updatedBy: impl.updatedBy, history: impl.history } : {}) })
        }
        if (!manage) return json(403, { message: "Solo los administradores de DITO pueden cambiar la implementación." })
        const data = await body(request)
        const impl = await setImplementacion(data.active === true, user.email)
        return json(200, { active: impl.active, activatedAt: impl.activatedAt, canManage: true, updatedAt: impl.updatedAt, updatedBy: impl.updatedBy, history: impl.history,
          message: impl.active ? "Implementación activada: la adherencia cuenta desde esta semana." : "Implementación desactivada: Mi local mostrará \"En implementación\"." })
      } catch (error) {
        return json(500, { message: error?.message || "Error inesperado." })
      }
    },
  })

  /* ---------------- Respaldo y vaciado ---------------- */
  function corteInfo(raw) {
    const corte = String(raw || "")
    if (!/^\d{4}-\d{2}-\d{2}$/.test(corte)) return null
    const limite = new Date(); limite.setDate(limite.getDate() - MIN_DIAS_DETALLE)
    const fecha = new Date(`${corte}T12:00:00`)
    if (Number.isNaN(fecha.getTime())) return null
    return { corte, semana: weekKey(fecha), valida: fecha <= limite, limite: weekKey(limite) }
  }

  app.http("dito-respaldo-resumen", {
    methods: ["GET"], authLevel: "anonymous", route: "dito/respaldo/resumen",
    handler: admin(async (request) => {
      const url = new URL(request.url)
      const info = corteInfo(url.searchParams.get("corte"))
      const rows = await listRouteExecutions()
      const requests = await listRequestsStored().catch(() => [])
      const snap = await readSnapshot()
      const aVaciar = info ? rows.filter((e) => dateOf(e) && weekKey(dateOf(e)) < info.semana) : []
      const evidencias = aVaciar.reduce((s, e) => s + (e.answers || []).reduce((n, a) => n + (a.evidence?.length || 0), 0), 0)
      return json(200, {
        rutas: { total: rows.length, enviadas: rows.filter((e) => e.status === "SUBMITTED").length, aVaciar: aVaciar.length, evidenciasSinVaciar: evidencias },
        solicitudes: { total: requests.length },
        macro: { semanasGuardadas: Object.keys(snap.weeks).length, detalleDesde: snap.detailFrom, actualizado: snap.updatedAt },
        corte: info ? { corte: info.corte, semana: info.semana, valida: info.valida, mensaje: info.valida ? "" : `Debe ser al menos ${MIN_DIAS_DETALLE} días atrás: el último mes de detalle se conserva.` } : null,
        ultimosRespaldos: (await readList(RESPALDOS_KEY)).slice(0, 5),
        ultimosVaciados: (await readList(VACIADOS_KEY)).slice(0, 5),
      })
    }),
  })

  async function excelDeRutas(rows, isJefe) {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet("Rutas y auditorías")
    const ids = routeQuestions.map((q) => q.id)
    ws.addRow(["ID", "Local", "Tipo", "Estado", "Fecha", "Enviada por", "Por jefatura", "Cumple", "No cumple", "Solicitado", ...ids])
    for (const e of rows) {
      const by = new Map((e.answers || []).map((a) => [a.itemId, a.status]))
      ws.addRow([e.id, e.local, e.mode === "AUDITORIA" ? "Auditoría" : "Ruta", e.status === "SUBMITTED" ? "Enviada" : "Borrador", dateOf(e), e.completedByName || e.completedByEmail || "",
        e.mode === "RUTA" ? (isJefe(e) ? "Sí" : "No") : "", e.compliant || 0, e.nonCompliant || 0, e.requested || 0, ...ids.map((id) => STATUS_LABEL[by.get(id)] || "")])
    }
    ws.getRow(1).font = { bold: true }
    const det = wb.addWorksheet("Detalle por punto")
    det.addRow(["ID", "Local", "Tipo", "Fecha", "Punto", "Pregunta", "Estado", "Detalle", "Falta", "Evidencias", "Solicitud vinculada"])
    const text = new Map(routeQuestions.map((q) => [q.id, q.question]))
    for (const e of rows) for (const a of e.answers || []) {
      det.addRow([e.id, e.local, e.mode === "AUDITORIA" ? "Auditoría" : "Ruta", dateOf(e), a.itemId, text.get(a.itemId) || "", STATUS_LABEL[a.status] || "", a.detail || "", (a.missing || []).join(" · "),
        (a.evidence || []).map((x) => x.fileName).join(" · "), a.linkedRequestId || ""])
    }
    det.getRow(1).font = { bold: true }
    return Buffer.from(await wb.xlsx.writeBuffer())
  }

  app.http("dito-respaldo", {
    methods: ["POST"], authLevel: "anonymous", route: "dito/respaldo",
    handler: admin(async (_request, user) => {
      const rows = await listRouteExecutions()
      const isJefe = await jefaturaPredicate(rows)
      // Los números macro se guardan primero: el respaldo y el vaciado dependen de ellos.
      const snap = await saveSnapshot(recordsFromExecutions(rows, isJefe))
      const requests = await listRequestsStored().catch(() => [])
      const zip = new JSZip()
      const now = new Date().toISOString()
      zip.file("rutas_auditorias.xlsx", await excelDeRutas(rows, isJefe))
      zip.file("rutas_auditorias.json", JSON.stringify(rows, null, 1))
      zip.file("macro_semanal.json", JSON.stringify({ generado: now, detalleDesde: snap.detailFrom, semanas: snap.weeks, cifrasManuales: snap.manual }, null, 1))
      zip.file("solicitudes.json", JSON.stringify(requests, null, 1))
      const evidencias = rows.flatMap((e) => (e.answers || []).flatMap((a) => (a.evidence || []).map((x) => ({ ruta: e.id, local: e.local, punto: a.itemId, archivo: x.fileName, subido: x.uploadedAt, tamano: x.size }))))
      zip.file("evidencias_lista.json", JSON.stringify(evidencias, null, 1))
      zip.file("LEEME.txt", [
        `Respaldo de DITO (Lanu) · ${now}`, `Generado por ${user.email}`, "",
        `Rutas y auditorías: ${rows.length} (${rows.filter((e) => e.status === "SUBMITTED").length} enviadas)`,
        `Semanas macro guardadas: ${Object.keys(snap.weeks).length}`, `Solicitudes: ${requests.length} (solo respaldo; no se vacían)`, `Evidencias (fotos): ${evidencias.length}, solo su lista; los archivos no van en este zip.`, "",
        "Guarda este archivo en SharePoint u OneDrive. Después de vaciar el detalle, esta es la única copia de las Rutas y Auditorías anteriores.",
      ].join("\n"))
      const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
      const sha256 = crypto.createHash("sha256").update(buffer).digest("hex")
      const id = `RESP-${now.replace(/[-:TZ.]/g, "").slice(0, 14)}`
      await pushList(RESPALDOS_KEY, { id, at: now, by: user.email, sha256, bytes: buffer.length, rutas: rows.length })
      return {
        status: 200,
        body: buffer,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="respaldo-dito-${now.slice(0, 10)}.zip"`,
          "Cache-Control": "no-store",
          "x-respaldo-id": id,
          "x-respaldo-sha256": sha256,
        },
      }
    }),
  })

  app.http("dito-vaciar", {
    methods: ["POST"], authLevel: "anonymous", route: "dito/vaciar",
    handler: admin(async (request, user) => {
      const data = await body(request)
      if (String(data.confirmacion || "").trim().toUpperCase() !== "VACIAR") return json(400, { message: "Escribe VACIAR para confirmar." })
      const info = corteInfo(data.corte)
      if (!info || !info.valida) return json(400, { message: `Elige una fecha de corte de al menos ${MIN_DIAS_DETALLE} días atrás.` })
      // El respaldo debe existir, ser de este mismo administrador, reciente, y haberse descargado completo (mismo hash).
      const respaldo = (await readList(RESPALDOS_KEY)).find((r) => r.id === String(data.respaldoId || ""))
      if (!respaldo || respaldo.by !== user.email) return json(400, { message: "Primero descarga un respaldo desde esta pantalla." })
      if (Date.now() - new Date(respaldo.at).getTime() > 24 * 3600 * 1000) return json(400, { message: "El respaldo tiene más de 24 horas. Descarga uno nuevo." })
      if (String(data.sha256 || "").toLowerCase() !== respaldo.sha256) return json(400, { message: "La descarga no coincide con el respaldo. Descárgalo de nuevo antes de vaciar." })

      const rows = await listRouteExecutions()
      const isJefe = await jefaturaPredicate(rows)
      const objetivo = rows.filter((e) => dateOf(e) && weekKey(dateOf(e)) < info.semana)
      const semanas = [...new Set(objetivo.filter((e) => e.status === "SUBMITTED").map((e) => `${e.local}|${weekKey(dateOf(e))}`))]
      // 1) Guardar los números macro de todo, marcando desde qué semana queda detalle. 2) Verificar. 3) Recién entonces vaciar.
      const previo = await readSnapshot()
      const detailFrom = previo.detailFrom && previo.detailFrom > info.semana ? previo.detailFrom : info.semana
      await saveSnapshot(recordsFromExecutions(rows, isJefe), { detailFrom })
      const verificado = await readSnapshot()
      const faltan = semanas.filter((k) => !verificado.weeks[k])
      if (faltan.length) return json(500, { message: `No se vació nada: no se pudieron guardar ${faltan.length} semanas de números macro.` })
      const borradas = await deleteRouteExecutions(objetivo.map((e) => e.id))
      await pushList(VACIADOS_KEY, { at: new Date().toISOString(), by: user.email, corte: info.corte, semanaCorte: info.semana, respaldoId: respaldo.id, rutasEliminadas: borradas, semanasMacro: semanas.length })
      return json(200, { eliminadas: borradas, semanasMacro: semanas.length, detalleDesde: detailFrom, message: `Listo: ${borradas} Rutas y Auditorías anteriores al ${info.semana} salieron del detalle. Los números macro de ${semanas.length} semanas quedaron guardados.` })
    }),
  })

  /* ---------------- Plantilla e importación de históricos ---------------- */
  app.http("route-plantilla-historico", {
    methods: ["GET"], authLevel: "anonymous", route: "route/plantilla-historico",
    handler: admin(async () => {
      const wb = new ExcelJS.Workbook()
      const info = wb.addWorksheet("Instrucciones")
      info.columns = [{ width: 110 }]
      for (const line of [
        "PLANTILLA DE RUTAS Y AUDITORÍAS ANTERIORES · DITO",
        "",
        "1. Completa la hoja \"Datos\": una fila por cada Ruta o Auditoría Ruta que ya hiciste.",
        "2. Local: elige de la lista. Fecha: día en que se hizo (dd-mm-aaaa). Tipo: Ruta o Auditoría.",
        "3. Hecha por jefatura: solo para las Rutas; indica si la hizo la jefatura del local (cuenta para la adherencia).",
        "4. Cada columna con código (por ejemplo RUTA-SALA-01) es un punto de la Ruta: elige Cumple, No cumple o Solicitado. Los textos están en la hoja \"Preguntas\".",
        "5. Puedes dejar puntos en blanco si no se midieron. No agregues ni cambies columnas.",
        "6. Sube el archivo en Gestión › Respaldo y evolutivos. Si hay errores, no se guarda nada y se te dice qué fila corregir.",
        "7. Volver a subir la misma fila (mismo local, fecha y tipo) la reemplaza, no la duplica.",
      ]) info.addRow([line])
      info.getRow(1).font = { bold: true, size: 14 }
      const ws = wb.addWorksheet("Datos")
      const header = ["Local", "Fecha", "Tipo", "Hecha por jefatura", ...routeQuestions.map((q) => q.id)]
      ws.addRow(header)
      ws.getRow(1).font = { bold: true }
      ws.columns = header.map((h, i) => ({ width: i === 0 ? 30 : i < 4 ? 18 : 16 }))
      ws.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }]
      routeQuestions.forEach((q, i) => { ws.getCell(1, 5 + i).note = q.question })
      const list = (items) => ({ type: "list", allowBlank: true, formulae: [`"${items.join(",")}"`] })
      const lp = wb.addWorksheet("Locales")
      routeLocals.forEach((l) => lp.addRow([l]))
      for (let r = 2; r <= 600; r += 1) {
        ws.getCell(r, 1).dataValidation = { type: "list", allowBlank: true, formulae: [`Locales!$A$1:$A$${routeLocals.length}`] }
        ws.getCell(r, 2).numFmt = "dd-mm-yyyy"
        ws.getCell(r, 3).dataValidation = list(["Ruta", "Auditoría"])
        ws.getCell(r, 4).dataValidation = list(["Sí", "No"])
        for (let c = 5; c < 5 + routeQuestions.length; c += 1) ws.getCell(r, c).dataValidation = list(["Cumple", "No cumple", "Solicitado"])
      }
      const pq = wb.addWorksheet("Preguntas")
      pq.addRow(["Código", "Sección", "Pregunta"])
      pq.getRow(1).font = { bold: true }
      pq.columns = [{ width: 18 }, { width: 22 }, { width: 110 }]
      routeQuestions.forEach((q) => pq.addRow([q.id, q.section, q.question]))
      const buffer = Buffer.from(await wb.xlsx.writeBuffer())
      return { status: 200, body: buffer, headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="plantilla-rutas-anteriores.xlsx"', "Cache-Control": "no-store" } }
    }),
  })

  function parseFecha(v) {
    if (v instanceof Date && !Number.isNaN(v.getTime())) return new Date(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate(), 12)
    const t = String(v ?? "").trim()
    let m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/)
    if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12)
    m = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)
    return null
  }
  const cellText = (c) => (c && typeof c === "object" && "result" in c ? c.result : c && typeof c === "object" && "richText" in c ? c.richText.map((x) => x.text).join("") : c)

  app.http("route-importar-historico", {
    methods: ["POST"], authLevel: "anonymous", route: "route/importar-historico",
    handler: admin(async (request, user) => {
      const buffer = Buffer.from(await request.arrayBuffer())
      if (!buffer.length || buffer.length > 8 * 1024 * 1024) return json(400, { message: "El archivo está vacío o pesa más de 8 MB." })
      if (!buffer.subarray(0, 2).toString("latin1").startsWith("PK")) return json(400, { message: "Sube la plantilla en formato Excel (.xlsx)." })
      const wb = new ExcelJS.Workbook()
      try { await wb.xlsx.load(buffer) } catch { return json(400, { message: "No se pudo leer el Excel. Usa la plantilla descargada desde DITO." }) }
      const ws = wb.getWorksheet("Datos")
      if (!ws) return json(400, { message: "No encontré la hoja \"Datos\". Usa la plantilla descargada desde DITO." })
      const header = ws.getRow(1).values.slice(1).map((v) => String(cellText(v) ?? "").trim())
      const col = (name) => header.findIndex((h) => norm(h) === norm(name)) + 1
      const cLocal = col("Local"), cFecha = col("Fecha"), cTipo = col("Tipo"), cJefe = col("Hecha por jefatura")
      if (!cLocal || !cFecha || !cTipo) return json(400, { message: "Faltan columnas (Local, Fecha, Tipo). Usa la plantilla sin cambiar los encabezados." })
      const qCols = routeQuestions.map((q) => ({ id: q.id, c: col(q.id) })).filter((x) => x.c)
      const localByNorm = new Map(routeLocals.map((l) => [norm(l), l]))
      const errores = []
      const items = []
      const vistos = new Set()
      const hoy = new Date()
      ws.eachRow((row, n) => {
        if (n === 1) return
        const get = (c) => cellText(row.getCell(c).value)
        const vacia = [cLocal, cFecha, cTipo, ...qCols.map((q) => q.c)].every((c) => String(get(c) ?? "").trim() === "")
        if (vacia) return
        const fila = (msg) => errores.push({ fila: n, mensaje: msg })
        const local = localByNorm.get(norm(get(cLocal)))
        if (!local) return fila(`Local "${get(cLocal) ?? ""}" no es válido: elígelo de la lista.`)
        const fecha = parseFecha(get(cFecha))
        if (!fecha) return fila("La fecha no es válida (usa dd-mm-aaaa).")
        if (fecha > hoy) return fila("La fecha no puede ser futura.")
        const tipoTxt = norm(get(cTipo))
        const mode = tipoTxt === "ruta" ? "RUTA" : tipoTxt === "auditoria" ? "AUDITORIA" : ""
        if (!mode) return fila("El tipo debe ser Ruta o Auditoría.")
        let byJefatura
        if (mode === "RUTA") {
          const j = cJefe ? norm(get(cJefe)) : ""
          if (!["si", "no"].includes(j)) return fila("Indica si la Ruta la hizo la jefatura (Sí o No).")
          byJefatura = j === "si"
        }
        const answers = []
        for (const q of qCols) {
          const raw = String(get(q.c) ?? "").trim()
          if (!raw) continue
          const status = STATUS_FROM_LABEL[norm(raw)]
          if (!status) return fila(`${q.id}: "${raw}" no es válido (Cumple, No cumple o Solicitado).`)
          answers.push({ itemId: q.id, status })
        }
        if (!answers.length) return fila("La fila no tiene ningún punto evaluado.")
        const dia = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`
        const key = `${local}|${dia}|${mode}`
        if (vistos.has(key)) return fila("Esta fila repite el mismo local, fecha y tipo de otra fila.")
        vistos.add(key)
        items.push({ local, mode, fecha, dia, byJefatura, answers, key })
      })
      if (errores.length) return json(400, { message: `Hay ${errores.length} filas por corregir. No se guardó nada.`, errores: errores.slice(0, 50) })
      if (!items.length) return json(400, { message: "La plantilla no tiene filas con datos." })
      const now = new Date().toISOString()
      for (const it of items) {
        const id = `HIST-${crypto.createHash("sha1").update(it.key).digest("hex").slice(0, 10).toUpperCase()}`
        const iso = it.fecha.toISOString()
        await saveRouteExecution({
          id, mode: it.mode, local: it.local, status: "SUBMITTED", completedByEmail: `historico:${user.email}`, completedByName: "Carga histórica",
          createdAt: iso, updatedAt: iso, submittedAt: iso, answers: it.answers, ...countsOf(it.answers),
          ...(it.byJefatura !== undefined ? { byJefatura: it.byJefatura } : {}), imported: true, importedBy: user.email, importedAt: now,
        })
      }
      return json(200, { importadas: items.length, message: `Listo: ${items.length} Rutas y Auditorías anteriores cargadas. El evolutivo ya las incluye.` })
    }),
  })

  /* ---------------- Cifras mensuales a mano (con foto de respaldo) ---------------- */
  const pct = (v) => { if (v === "" || v === null || v === undefined) return null; const n = Number(String(v).replace(",", ".")); return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 10) / 10 : NaN }

  app.http("route-macro-manual", {
    methods: ["GET", "POST"], authLevel: "anonymous", route: "route/macro-manual",
    handler: admin(async (request, user) => {
      if (request.method === "GET") {
        const snap = await readSnapshot()
        return json(200, { items: Object.entries(snap.manual).map(([k, v]) => ({ local: k.split("|")[0], periodo: k.split("|")[1], ...v })).sort((a, b) => b.periodo.localeCompare(a.periodo)) })
      }
      const form = await request.formData()
      const local = routeLocals.find((l) => norm(l) === norm(form.get("local")))
      const periodo = String(form.get("periodo") || "")
      if (!local) return json(400, { message: "Elige el local." })
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) return json(400, { message: "Elige el mes (aaaa-mm)." })
      const valores = { adherencia: pct(form.get("adherencia")), estandares: pct(form.get("estandares")), auditoria: pct(form.get("auditoria")), exactitud: pct(form.get("exactitud")) }
      if (Object.values(valores).some((v) => Number.isNaN(v))) return json(400, { message: "Los porcentajes deben estar entre 0 y 100." })
      if (Object.values(valores).every((v) => v === null)) return json(400, { message: "Escribe al menos una cifra." })
      let imagen = ""
      const file = form.get("imagen")
      if (file && typeof file === "object" && file.size) {
        if (file.size > 6 * 1024 * 1024) return json(400, { message: "La imagen puede pesar como máximo 6 MB." })
        const ext = /png/i.test(file.type) ? "png" : /jpe?g/i.test(file.type) ? "jpg" : /webp/i.test(file.type) ? "webp" : ""
        if (!ext) return json(400, { message: "La imagen debe ser PNG, JPG o WebP." })
        imagen = `datos/macro/imagenes/${periodo}-${crypto.randomBytes(4).toString("hex")}.${ext}`
        const container = await appFilesContainer()
        await container.getBlockBlobClient(imagen).uploadData(Buffer.from(await file.arrayBuffer()), { blobHTTPHeaders: { blobContentType: file.type } })
      }
      await saveSnapshot(new Map(), { manual: { [`${local}|${periodo}`]: { ...valores, nota: String(form.get("nota") || "").slice(0, 300), imagen, cargadoPor: user.email, cargadoEn: new Date().toISOString() } } })
      return json(200, { message: `Cifras de ${local} · ${periodo} guardadas.` })
    }),
  })
}
