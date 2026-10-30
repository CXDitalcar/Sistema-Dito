// Rutas de Datos, Seguimiento de clientes y claves temporales.
// Se registran desde index.js para no seguir creciendo ese archivo.

import { json, body } from "./lib/http.js"
import { appFilesContainer, getDataFileState } from "./lib/dataFiles.js"
import { DATA_KINDS } from "./lib/datosParsers.js"
import { cleanResourceItems, parsePriceList, readLocals, saveLocals, readModelCatalog, readResources, removeBrand, saveBrandModels, saveResources, validUrl } from "./lib/catalogoDatos.js"
import { appendImportLog, getImportLog, mergeMaster, readAllMasters, readMaster } from "./lib/datosStore.js"
import {
  CONTACT_RESULTS, addContact, confirmDelivery, getClaim, importContacts, readSegData, saveClaim, saveReview,
} from "./lib/segStore.js"
import {
  BUCKETS, CLAIM_LEVELS, CLAIM_LEVEL_LABELS, DEFAULT_RULES, canActOnClaim, canCommentClaim, canRegisterContacts,
  canSeeClaim, canSeeRow, computeSeguimiento, inMacroScope, isBranchHeadOf, isFullViewer, isSellerOf, trasladosForRow,
} from "./lib/seguimiento.js"
import { QUICK_RESPONSES, RECLAMO_MESSAGE } from "./lib/segMessages.js"
import { normRut } from "./lib/segNormalize.js"
import { getAppConfig, setAppConfig, getUser, upsertUser, createSession } from "./lib/store.js"
import { hashPassword, normalizeEmail, sessionCookie, validCorporateEmail, validPassword } from "./lib/security.js"
import { consumeTempKey, createTempKey, deactivateTempKey, listTempKeys } from "./lib/tempKeys.js"
import { loadUsersFromList } from "./lib/usersList.js"
import { loadUsersFromExcel } from "./lib/usersExcel.js"
import { getUsersExcelUrl } from "./lib/usersSource.js"

const RULES_KEY = "SEG_REGLAS"
const PERCEPCIONES = ["PROMOTOR", "NEUTRO", "DETRACTOR"]

async function getRules() {
  const stored = await getAppConfig(RULES_KEY)
  try { return { ...DEFAULT_RULES, ...JSON.parse(String(stored?.value || "{}")) } } catch { return { ...DEFAULT_RULES } }
}

async function loadAll(user) {
  const [masters, seg, rules] = await Promise.all([readAllMasters(), readSegData(), getRules()])
  const result = computeSeguimiento(masters, seg, rules, { remitente: user?.name || "" })
  return { masters, seg, rules, result }
}

function sourcesMeta(masters) {
  return Object.fromEntries(Object.entries(masters).map(([k, m]) => [k, { updatedAt: m.updatedAt, registros: Object.keys(m.records || {}).length }]))
}

async function findDirectoryUser(email) {
  const target = normalizeEmail(email)
  try {
    const list = await loadUsersFromList()
    const found = list.users.find((u) => u.email === target)
    if (found) return found
  } catch { /* LIST no disponible: se intenta con el Excel temporal */ }
  try {
    const url = await getUsersExcelUrl()
    if (url) {
      const excel = await loadUsersFromExcel(url)
      const found = excel.users.find((u) => u.email === target)
      if (found) return found
    }
  } catch { /* sin Excel temporal */ }
  // Usuario creado dentro de la app (Usuarios › Agregar usuario).
  const local = await getUser(target).catch(() => null)
  if (local?.source === "APP" && local.active !== false) return publicUserFromEntity(local)
  return null
}

function publicUserFromEntity(entity) {
  const parse = (value) => { try { return JSON.parse(value || "[]") } catch { return [] } }
  return {
    email: entity.email, name: entity.name, role: entity.role, local: entity.local, localPrincipal: entity.localPrincipal,
    assignedLocals: parse(entity.assignedLocals), scope: entity.scope, zone: entity.zone, brands: parse(entity.brands),
    areaFunctional: entity.areaFunctional, active: entity.active !== false,
  }
}

function profileEntity(dirUser, existing) {
  return {
    ...(existing || {}),
    email: dirUser.email,
    name: dirUser.name || existing?.name || dirUser.email,
    role: dirUser.role || existing?.role || "VENDEDOR",
    local: dirUser.local || "",
    localPrincipal: dirUser.localPrincipal || "",
    assignedLocals: JSON.stringify(dirUser.assignedLocals || []),
    scope: dirUser.scope || "LOCAL",
    zone: dirUser.zone || "",
    brands: JSON.stringify(dirUser.brands || []),
    areaFunctional: dirUser.areaFunctional || "",
    active: dirUser.active !== false,
  }
}

export function registerSegRoutes({ app, currentUser, isExperienceUser, publicUser, sessionDays }) {
  const forbidden = () => json(403, { message: "No tienes acceso a esta sección." })
  const handle = (fn) => async (request) => {
    try { return await fn(request) } catch (error) {
      console.error("segRoutes", error?.message)
      return json(500, { message: error?.message || "Error inesperado." })
    }
  }

  // ================= LISTAS DE PRECIOS · MODELOS =================
  async function procesarPrecios(user, data) {
    const marca = String(data.marca || "").replace(/\s+/g, " ").trim()
    if (!marca) return json(400, { message: "Elige la marca de la lista de precios." })
    const state = await getDataFileState("precios")
    if (!state.blobName) return json(400, { message: "Primero sube el archivo." })
    const container = await appFilesContainer()
    const buffer = await container.getBlobClient(state.blobName).downloadToBuffer()
    const entry = { kind: "precios", label: `Lista de precios · ${marca}`, fileName: state.fileName, by: user.email, byName: user.name, at: new Date().toISOString() }
    try {
      const parsed = await parsePriceList(buffer, state.fileName)
      if (!parsed.modelos.length) throw new Error("No encontré modelos en la primera columna de la primera hoja.")
      const before = (await readModelCatalog())[marca]?.modelos || []
      await saveBrandModels(marca, parsed.modelos, { fileName: state.fileName, at: entry.at, by: user.email })
      const prev = new Set(before.map((m) => m.toUpperCase()))
      const nuevos = parsed.modelos.filter((m) => !prev.has(m.toUpperCase())).length
      const summary = { leidos: parsed.leidos, nuevos, actualizados: 0, sinCambios: parsed.modelos.length - nuevos, duplicados: Math.max(0, parsed.leidos - parsed.skipped - parsed.modelos.length), errores: 0, omitidos: parsed.skipped }
      const ok = { ...entry, ok: true, summary, modelos: parsed.modelos.length }
      await appendImportLog(ok)
      return json(200, { message: `Lista de ${marca} cargada: ${parsed.modelos.length} modelos.`, ...ok })
    } catch (error) {
      await appendImportLog({ ...entry, ok: false, error: error?.message || "Error al procesar." })
      return json(400, { message: error?.message || "No fue posible procesar la lista." })
    }
  }

  app.http("catalogo-modelos", {
    methods: ["GET", "DELETE"], authLevel: "anonymous", route: "catalogo/modelos",
    handler: handle(async (request) => {
      const user = await currentUser(request)
      if (!user) return json(401, { message: "Sesión no válida." })
      if (request.method === "DELETE") {
        if (!isExperienceUser(user)) return forbidden()
        await removeBrand(String(request.query.get("marca") || ""))
      }
      const catalog = await readModelCatalog()
      const marcas = Object.entries(catalog)
        .map(([marca, info]) => ({ marca, modelos: info.modelos || [], fileName: info.fileName, at: info.at }))
        .sort((a, b) => a.marca.localeCompare(b.marca, "es"))
      return json(200, { marcas })
    }),
  })

  // ================= LOCALES =================
  app.http("catalogo-locales", {
    methods: ["GET", "POST"], authLevel: "anonymous", route: "catalogo/locales",
    handler: handle(async (request) => {
      const user = await currentUser(request)
      if (!user) return json(401, { message: "Sesión no válida." })
      if (request.method === "GET") return json(200, { locales: await readLocals() })
      if (!isExperienceUser(user)) return forbidden()
      try {
        const locales = await saveLocals((await body(request)).locales, user.email)
        return json(200, { message: "Locales guardados.", locales })
      } catch (error) {
        return json(400, { message: error?.message || "No fue posible guardar los locales." })
      }
    }),
  })

  // ================= RECURSOS DE ACADEMIA (link a carpeta) =================
  app.http("academia-recursos", {
    methods: ["GET", "POST"], authLevel: "anonymous", route: "academia/recursos",
    handler: handle(async (request) => {
      const user = await currentUser(request)
      if (!user) return json(401, { message: "Sesión no válida." })
      if (request.method === "GET") return json(200, await readResources())
      if (!isExperienceUser(user)) return forbidden()
      const data = await body(request)
      try {
        const patch = {}
        if (data.carpetaUrl !== undefined) patch.carpetaUrl = validUrl(data.carpetaUrl)
        if (data.items !== undefined) patch.items = cleanResourceItems(data.items)
        const saved = await saveResources(patch, user.email)
        const message = data.items !== undefined ? "Recursos guardados." : saved.carpetaUrl ? "Enlace guardado." : "Enlace eliminado."
        return json(200, { message, ...saved })
      } catch (error) {
        return json(400, { message: error?.message || "Enlace no válido." })
      }
    }),
  })

  // ================= DATOS =================
  app.http("datos-estado", {
    methods: ["GET"], authLevel: "anonymous", route: "datos/estado",
    handler: handle(async (request) => {
      const user = await currentUser(request)
      if (!isExperienceUser(user)) return forbidden()
      const masterKinds = Object.entries(DATA_KINDS).filter(([, def]) => def.store === "master").map(([kind]) => kind)
      const [log, masterList, seg] = await Promise.all([getImportLog(), Promise.all(masterKinds.map((k) => readMaster(k))), readSegData()])
      const meta = sourcesMeta(Object.fromEntries(masterKinds.map((k, i) => [k, masterList[i]])))
      const fuentes = Object.entries(DATA_KINDS).map(([kind, def]) => ({
        kind, label: def.label,
        registros: def.store === "master" ? meta[kind]?.registros || 0 : seg.contactos.filter((c) => c.source === (kind === "consolidado" ? "IMPORT_CONSOLIDADO" : "IMPORT_OPERATIVO")).length,
        ultimaCarga: log.find((l) => l.kind === kind && l.ok) || null,
      }))
      return json(200, { fuentes, log: log.slice(0, 30) })
    }),
  })

  app.http("datos-procesar", {
    methods: ["POST"], authLevel: "anonymous", route: "datos/procesar",
    handler: handle(async (request) => {
      const user = await currentUser(request)
      if (!isExperienceUser(user)) return forbidden()
      const data = await body(request)
      const kind = String(data.kind || "")
      if (kind === "precios") return procesarPrecios(user, data)
      const def = DATA_KINDS[kind]
      if (!def) return json(400, { message: "Tipo de archivo no reconocido." })
      const state = await getDataFileState(kind)
      if (!state.blobName) return json(400, { message: "Primero sube el archivo." })
      const container = await appFilesContainer()
      const buffer = await container.getBlobClient(state.blobName).downloadToBuffer()
      const started = Date.now()
      const entry = { kind, label: def.label, fileName: state.fileName, by: user.email, byName: user.name, at: new Date().toISOString() }
      try {
        const parsed = await def.parse(buffer, state.fileName)
        let summary
        if (def.store === "master") {
          summary = await mergeMaster(kind, parsed.records, { fileName: state.fileName, userEmail: user.email })
        } else {
          const before = new Set((await readSegData()).contactos.map((c) => `${c.nv}|${c.id}`))
          const unique = new Map(parsed.records.map((c) => [`${c.nv}|${c.id}`, c]))
          await importContacts([...unique.values()])
          const nuevos = [...unique.keys()].filter((k) => !before.has(k)).length
          summary = { leidos: parsed.records.length, nuevos, actualizados: 0, sinCambios: unique.size - nuevos, duplicados: parsed.records.length - unique.size }
        }
        summary.errores = parsed.errors || 0
        summary.omitidos = parsed.skipped || 0
        const ok = { ...entry, ok: true, summary, ms: Date.now() - started }
        await appendImportLog(ok)
        return json(200, { message: "Archivo procesado.", ...ok })
      } catch (error) {
        await appendImportLog({ ...entry, ok: false, error: error?.message || "Error al procesar." })
        return json(400, { message: error?.message || "No fue posible procesar el archivo." })
      }
    }),
  })

  // ================= SEGUIMIENTO =================
  app.http("seg-lista", {
    methods: ["GET"], authLevel: "anonymous", route: "seguimiento/lista",
    handler: handle(async (request) => {
      const user = await currentUser(request)
      if (!isFullViewer(user)) return forbidden()
      const { masters, rules, result } = await loadAll(user)
      return json(200, { ...result, buckets: BUCKETS, rules, fuentes: sourcesMeta(masters), quickResponses: QUICK_RESPONSES, reclamoMensaje: RECLAMO_MESSAGE })
    }),
  })

  app.http("seg-ficha", {
    methods: ["GET"], authLevel: "anonymous", route: "seguimiento/ficha",
    handler: handle(async (request) => {
      const user = await currentUser(request)
      if (!user) return json(401, { message: "Sesión no válida." })
      const nv = String(request.query.get("nv") || "")
      const rutParam = normRut(request.query.get("rut") || "")
      const { masters, seg, rules, result } = await loadAll(user)
      const anchor = result.rows.find((r) => r.nv === nv) || result.rows.find((r) => rutParam && r.rut === rutParam)
      if (!anchor) return json(404, { message: "No encontré esa NV o ese cliente en los datos cargados." })
      const rut = anchor.rut
      // Quien tiene a cargo un reclamo de este cliente puede abrir la ficha para gestionarlo.
      const claimNvs = new Set(seg.reclamos.filter((c) => c.estado !== "CERRADO" && canActOnClaim(user, c)).map((c) => c.nv))
      const rows = result.rows.filter((r) => (rut ? r.rut === rut : r.nv === anchor.nv)).filter((r) => canSeeRow(user, r, rules) || claimNvs.has(r.nv))
      if (!rows.length) return forbidden()
      const nvs = new Set(rows.map((r) => r.nv))
      const unidades = rows.map((r) => ({
        ...r,
        traslados: trasladosForRow(r, masters.traslados),
        cambiosSiga: (masters.siga.records[r.nv]?._changes || []).filter((c) => !["telefono", "celular", "email"].includes(c.field)),
        primeraVezSiga: masters.siga.records[r.nv]?._firstSeen || "",
        puedeConfirmarEntrega: r.confirmarEntrega && (isSellerOf(user, r) || isBranchHeadOf(user, r) || isExperienceUser(user)),
      }))
      // Solo contactos de las NV que la persona puede ver (o generales del cliente, sin NV):
      // no se exponen gestiones de compras del mismo cliente en otros locales.
      const contactos = seg.contactos.filter((c) => nvs.has(c.nv) || (rut && c.rut === rut && !c.nv)).sort((a, b) => String(b.at).localeCompare(String(a.at)))
      const reclamos = seg.reclamos.filter((c) => (nvs.has(c.nv) || (rut && c.rut === rut)) && canSeeClaim(user, c))
        .map((c) => ({ ...c, puedeActuar: canActOnClaim(user, c), puedeComentar: canCommentClaim(user, c), nivelLabel: CLAIM_LEVEL_LABELS[c.nivel] }))
      const first = rows[0]
      return json(200, {
        cliente: { nombre: first.cliente, rut: first.rut, telefono: first.telefono, telefonoValido: first.telefonoValido, email: first.email },
        unidades, contactos, reclamos,
        permisos: { registrarContacto: canRegisterContacts(user), crearReclamo: canRegisterContacts(user) || rows.some((r) => isSellerOf(user, r) || isBranchHeadOf(user, r)) },
        quickResponses: QUICK_RESPONSES, reclamoMensaje: RECLAMO_MESSAGE, resultados: CONTACT_RESULTS,
      })
    }),
  })

  app.http("seg-contacto", {
    methods: ["POST"], authLevel: "anonymous", route: "seguimiento/contacto",
    handler: handle(async (request) => {
      const user = await currentUser(request)
      if (!canRegisterContacts(user)) return forbidden()
      const data = await body(request)
      const { result } = await loadAll(user)
      const row = result.rows.find((r) => r.nv === String(data.nv || ""))
      if (!row) return json(404, { message: "NV no encontrada." })
      const quick = QUICK_RESPONSES.find((q) => q.id === data.quickId)
      const res = quick?.result || String(data.result || "")
      if (!CONTACT_RESULTS.includes(res)) return json(400, { message: "Resultado de contacto no válido." })
      const observacion = [quick?.observacion, String(data.observacion || "").trim()].filter(Boolean).join(" — ")
      const id = await addContact({
        nv: row.nv, rut: row.rut, phone: row.telefono, stage: Number(data.stage || row.etapa), result: res,
        observacion, derivadoA: quick?.derivadoA || data.derivadoA || "", proximaAccion: quick?.proximaAccion || data.proximaAccion || "",
        responsable: user.name, responsableEmail: user.email, source: "APP",
      })
      return json(200, { message: "Contacto registrado.", id })
    }),
  })

  app.http("seg-entrega", {
    methods: ["POST"], authLevel: "anonymous", route: "seguimiento/entrega",
    handler: handle(async (request) => {
      const user = await currentUser(request)
      if (!user) return json(401, { message: "Sesión no válida." })
      const data = await body(request)
      const { result } = await loadAll(user)
      const row = result.rows.find((r) => r.nv === String(data.nv || ""))
      if (!row) return json(404, { message: "NV no encontrada." })
      if (!(isSellerOf(user, row) || isBranchHeadOf(user, row) || isExperienceUser(user))) return forbidden()
      const percepcion = String(data.percepcion || "").toUpperCase()
      if (!PERCEPCIONES.includes(percepcion)) return json(400, { message: "Indica si el cliente quedó promotor, neutro o detractor." })
      await confirmDelivery(row.nv, {
        entregado: true, fechaEntrega: String(data.fechaEntrega || "").slice(0, 10), percepcion,
        comentario: data.comentario, confirmadoPor: user.name, confirmadoPorEmail: user.email,
      })
      return json(200, { message: "Entrega confirmada." })
    }),
  })

  app.http("seg-revision", {
    methods: ["POST"], authLevel: "anonymous", route: "seguimiento/revision",
    handler: handle(async (request) => {
      const user = await currentUser(request)
      if (!isFullViewer(user)) return forbidden()
      const data = await body(request)
      const decision = String(data.decision || "")
      if (!["APROBADO", "NO_ENVIAR"].includes(decision)) return json(400, { message: "Decisión no válida." })
      await saveReview(String(data.nv), Number(data.stage || 4), { decision, nota: data.nota, por: user.name, porEmail: user.email })
      return json(200, { message: decision === "APROBADO" ? "Revisión aprobada: el aviso queda disponible para enviar." : "Marcado como no enviar." })
    }),
  })

  app.http("seg-reglas", {
    methods: ["GET", "POST"], authLevel: "anonymous", route: "seguimiento/reglas",
    handler: handle(async (request) => {
      const user = await currentUser(request)
      if (!isFullViewer(user)) return forbidden()
      if (request.method === "GET") return json(200, await getRules())
      if (!isExperienceUser(user)) return forbidden()
      const data = await body(request)
      const rules = await getRules()
      const next = {
        ...rules,
        stellantisSoloPromotores: data.stellantisSoloPromotores !== undefined ? Boolean(data.stellantisSoloPromotores) : rules.stellantisSoloPromotores,
        diasCompraReciente: Math.min(Math.max(Number(data.diasCompraReciente ?? rules.diasCompraReciente) || 15, 1), 90),
        detallePropio: data.detallePropio !== undefined ? Boolean(data.detallePropio) : Boolean(rules.detallePropio),
      }
      await setAppConfig(RULES_KEY, JSON.stringify(next), { updatedBy: user.email })
      return json(200, next)
    }),
  })

  // ---------- vista macro (todos los perfiles, sin datos de clientes) ----------
  app.http("seg-macro", {
    methods: ["GET"], authLevel: "anonymous", route: "seguimiento/macro",
    handler: handle(async (request) => {
      const user = await currentUser(request)
      if (!user) return json(401, { message: "Sesión no válida." })
      const { seg, rules, result } = await loadAll(user)
      const rows = result.rows.filter((r) => r.bucket !== "fuera" && inMacroScope(user, r))
      const nvs = new Set(rows.map((r) => r.nv))
      const contacted = rows.filter((r) => r.totalContactos > 0)
      const respondidos = rows.filter((r) => seg.contactos.some((c) => c.nv === r.nv && ["RESPONDIDO", "DERIVADO_EJECUTIVO", "DERIVADO_EXPERIENCIA"].includes(c.result)))
      const entregas = rows.filter((r) => r.entrega)
      const percep = (p) => entregas.filter((r) => r.entrega?.percepcion === p).length
      const reclamos = seg.reclamos.filter((c) => c.estado !== "CERRADO" && nvs.has(c.nv))
      const byLocal = {}
      for (const r of rows) {
        const k = r.local || "Sin local"
        byLocal[k] = byLocal[k] || { local: k, total: 0, contactados: 0, entregados: 0, etapas: [0, 0, 0, 0] }
        byLocal[k].total += 1
        if (r.totalContactos > 0) byLocal[k].contactados += 1
        if (r.entrega) byLocal[k].entregados += 1
        byLocal[k].etapas[(r.etapa || 1) - 1] += 1
      }
      const detalle = rules.detallePropio && !isFullViewer(user)
        ? rows.filter((r) => isSellerOf(user, r) || isBranchHeadOf(user, r)).slice(0, 200)
          .map((r) => ({ nv: r.nv, cliente: r.cliente, marca: r.marca, modelo: r.modelo, local: r.local, etapaLabel: r.etapaLabel, ultimoContacto: r.ultimoContacto ? { result: r.ultimoContacto.result, at: r.ultimoContacto.at } : null }))
        : null
      return json(200, {
        total: rows.length,
        etapas: [1, 2, 3, 4].map((e) => ({ etapa: e, total: rows.filter((r) => r.etapa === e).length })),
        contactados: contacted.length,
        respondidos: respondidos.length,
        entregasConfirmadas: entregas.length,
        promotores: percep("PROMOTOR"), neutros: percep("NEUTRO"), detractores: percep("DETRACTOR"),
        reclamosAbiertos: { total: reclamos.length, SUCURSAL: reclamos.filter((c) => c.nivel === "SUCURSAL").length, MARCA: reclamos.filter((c) => c.nivel === "MARCA").length, COMERCIAL: reclamos.filter((c) => c.nivel === "COMERCIAL").length },
        porLocal: Object.values(byLocal).sort((a, b) => b.total - a.total),
        detalle,
        actualizado: result.generatedAt,
      })
    }),
  })

  // ---------- reclamos ----------
  app.http("seg-reclamos", {
    methods: ["GET", "POST"], authLevel: "anonymous", route: "seguimiento/reclamos",
    handler: handle(async (request) => {
      const user = await currentUser(request)
      if (!user) return json(401, { message: "Sesión no válida." })
      if (request.method === "GET") {
        const seg = await readSegData()
        const list = seg.reclamos.filter((c) => canSeeClaim(user, c))
          .map((c) => ({ ...c, puedeActuar: canActOnClaim(user, c), puedeComentar: canCommentClaim(user, c), nivelLabel: CLAIM_LEVEL_LABELS[c.nivel] }))
          .sort((a, b) => String(b.actualizadoAt).localeCompare(String(a.actualizadoAt)))
        return json(200, { reclamos: list })
      }
      const data = await body(request)
      const { result } = await loadAll(user)
      const row = result.rows.find((r) => r.nv === String(data.nv || ""))
      if (!row) return json(404, { message: "NV no encontrada." })
      if (!(canRegisterContacts(user) || isSellerOf(user, row) || isBranchHeadOf(user, row))) return forbidden()
      const motivo = String(data.motivo || "").trim()
      if (!motivo) return json(400, { message: "Indica el motivo del reclamo." })
      const now = new Date().toISOString()
      const id = await saveClaim({
        nv: row.nv, rut: row.rut, cliente: row.cliente, marca: row.marca, grupo: row.grupo, local: row.localOriginal,
        motivo, urgencia: data.urgencia === "ALTA" ? "ALTA" : "NORMAL", detalle: data.detalle, estado: "ABIERTO", nivel: "SUCURSAL",
        creadoPor: user.name, creadoPorEmail: user.email, creadoAt: now,
        historial: [{ at: now, por: user.name, tipo: "CREADO", texto: `Reclamo ingresado. Queda a cargo de ${CLAIM_LEVEL_LABELS.SUCURSAL}.` }],
      })
      if (data.registrarContacto && canRegisterContacts(user)) {
        await addContact({ nv: row.nv, rut: row.rut, phone: row.telefono, stage: row.etapa, result: "DERIVADO_SUCURSAL",
          observacion: `Reclamo ${id}: ${motivo}`, derivadoA: "Jefe de sucursal", responsable: user.name, responsableEmail: user.email, reclamoId: id })
      }
      return json(200, { message: "Reclamo creado. Se avisó a la jefatura de sucursal.", id })
    }),
  })

  app.http("seg-reclamo-accion", {
    methods: ["POST"], authLevel: "anonymous", route: "seguimiento/reclamos/accion",
    handler: handle(async (request) => {
      const user = await currentUser(request)
      if (!user) return json(401, { message: "Sesión no válida." })
      const data = await body(request)
      const claim = await getClaim(String(data.id || ""))
      if (!claim || !canSeeClaim(user, claim)) return json(404, { message: "Reclamo no encontrado." })
      if (claim.estado === "CERRADO") return json(400, { message: "El reclamo ya está cerrado." })
      const texto = String(data.texto || "").trim()
      const accion = String(data.accion || "")
      const now = new Date().toISOString()
      if (accion === "COMENTAR") {
        if (!canCommentClaim(user, claim)) return json(403, { message: isExperienceUser(user) ? "Experiencia puede opinar sólo cuando la jefatura solicita ayuda." : "No puedes comentar este reclamo." })
        if (!texto) return json(400, { message: "Escribe el comentario." })
        claim.historial.push({ at: now, por: user.name, tipo: "COMENTARIO", texto })
      } else if (accion === "ESCALAR") {
        if (!canActOnClaim(user, claim)) return forbidden()
        const next = CLAIM_LEVELS[CLAIM_LEVELS.indexOf(claim.nivel) + 1]
        if (!next) return json(400, { message: "Ya está en el último nivel de escalamiento." })
        claim.nivel = next
        claim.estado = "ESCALADO"
        claim.historial.push({ at: now, por: user.name, tipo: "ESCALADO", texto: `Traspasado a ${CLAIM_LEVEL_LABELS[next]}.${texto ? ` ${texto}` : ""}` })
      } else if (accion === "PEDIR_AYUDA") {
        if (!canActOnClaim(user, claim)) return forbidden()
        claim.ayudaSolicitada = true
        claim.historial.push({ at: now, por: user.name, tipo: "AYUDA", texto: `Solicita apoyo de Experiencia de Clientes.${texto ? ` ${texto}` : ""}` })
      } else if (accion === "CERRAR") {
        if (!canActOnClaim(user, claim)) return forbidden()
        if (!texto) return json(400, { message: "Describe cómo se resolvió el reclamo." })
        claim.estado = "CERRADO"
        claim.historial.push({ at: now, por: user.name, tipo: "CERRADO", texto })
      } else return json(400, { message: "Acción no válida." })
      await saveClaim(claim)
      return json(200, { message: "Reclamo actualizado." })
    }),
  })

  // ---------- pendientes del usuario (Inicio) ----------
  app.http("seg-pendientes", {
    methods: ["GET"], authLevel: "anonymous", route: "seguimiento/pendientes",
    handler: handle(async (request) => {
      const realUser = await currentUser(request)
      if (!realUser) return json(401, { message: "Sesión no válida." })
      let user = realUser
      // "Ver como": sólo Experiencia/PM pueden simular el perfil de otra persona.
      const asEmail = request.query.get("asEmail")
      if (asEmail && isExperienceUser(realUser) && normalizeEmail(asEmail) !== realUser.email) {
        user = {
          email: normalizeEmail(asEmail), name: request.query.get("asName") || "", role: request.query.get("asRole") || "VENDEDOR",
          local: request.query.get("asLocal") || "", brands: String(request.query.get("asBrands") || "").split(",").filter(Boolean),
        }
      }
      const { masters, seg, result } = await loadAll(realUser)
      if (!Object.keys(masters.siga.records || {}).length) return json(200, { entregas: [], derivaciones: [], reclamos: [], ayuda: [], contactos: null })
      // Contactos de seguimiento pendientes (Asistente de Gerencia, Experiencia y PM).
      const contactos = isFullViewer(user)
        ? { enviar: result.counts.enviar || 0, reintentar: result.counts.reintentar || 0, revisar: isExperienceUser(user) ? result.counts.revisar || 0 : 0 }
        : null
      const entregas = result.rows.filter((r) => r.confirmarEntrega && r.bucket !== "fuera" && (isSellerOf(user, r) || isBranchHeadOf(user, r)))
        .map((r) => ({ nv: r.nv, cliente: r.cliente, marca: r.marca, modelo: r.modelo, local: r.local, vendedor: r.vendedor, fechaFactura: r.fechaFactura, fechaRecepcion: r.fechaRecepcion, prioritaria: r.entregaPrioritaria }))
      const derivaciones = result.rows.filter((r) => r.ultimoContacto?.result === "DERIVADO_EJECUTIVO" && isSellerOf(user, r))
        .map((r) => ({ nv: r.nv, cliente: r.cliente, telefono: r.telefono, marca: r.marca, modelo: r.modelo, observacion: r.ultimoContacto.observacion, at: r.ultimoContacto.at }))
      const reclamos = seg.reclamos.filter((c) => c.estado !== "CERRADO" && canActOnClaim(user, c))
        .map((c) => ({ id: c.id, nv: c.nv, cliente: c.cliente, motivo: c.motivo, urgencia: c.urgencia, nivel: c.nivel, nivelLabel: CLAIM_LEVEL_LABELS[c.nivel], creadoAt: c.creadoAt }))
      const ayuda = isExperienceUser(user) ? seg.reclamos.filter((c) => c.estado !== "CERRADO" && c.ayudaSolicitada)
        .map((c) => ({ id: c.id, nv: c.nv, cliente: c.cliente, motivo: c.motivo, nivelLabel: CLAIM_LEVEL_LABELS[c.nivel] })) : []
      return json(200, { entregas, derivaciones, reclamos, ayuda, contactos })
    }),
  })

  app.http("seg-derivacion-atendida", {
    methods: ["POST"], authLevel: "anonymous", route: "seguimiento/derivacion-atendida",
    handler: handle(async (request) => {
      const user = await currentUser(request)
      if (!user) return json(401, { message: "Sesión no válida." })
      const data = await body(request)
      const { result } = await loadAll(user)
      const row = result.rows.find((r) => r.nv === String(data.nv || ""))
      if (!row) return json(404, { message: "NV no encontrada." })
      if (!(isSellerOf(user, row) || isExperienceUser(user))) return forbidden()
      await addContact({ nv: row.nv, rut: row.rut, phone: row.telefono, stage: row.ultimoContacto?.stage || row.etapa, result: "GESTION_CERRADA",
        observacion: `Ejecutivo atendió la solicitud del cliente.${data.nota ? ` ${String(data.nota).slice(0, 500)}` : ""}`, responsable: user.name, responsableEmail: user.email })
      return json(200, { message: "Listo, quedó registrado." })
    }),
  })

  // ================= CLAVES TEMPORALES =================
  app.http("auth-temp-keys", {
    methods: ["GET", "POST"], authLevel: "anonymous", route: "auth/temp-keys",
    handler: handle(async (request) => {
      const user = await currentUser(request)
      if (!isExperienceUser(user)) return forbidden()
      if (request.method === "GET") return json(200, { claves: await listTempKeys() })
      const data = await body(request)
      const email = normalizeEmail(data.email)
      if (!validCorporateEmail(email)) return json(400, { message: "El correo debe ser corporativo Ditalcar." })
      const dirUser = await findDirectoryUser(email)
      const existing = await getUser(email)
      if (!dirUser && !existing) return json(404, { message: "Ese correo no está en el directorio de usuarios (02_Usuarios o Excel temporal)." })
      if (dirUser && dirUser.active === false) return json(400, { message: "La persona está inactiva en el directorio." })
      if (dirUser) await upsertUser(profileEntity(dirUser, existing))
      const clave = await createTempKey({ email, nombre: dirUser?.name || existing?.name || "", createdBy: user.email, days: data.dias })
      return json(200, { message: "Clave temporal creada. Se muestra una sola vez.", clave, email })
    }),
  })

  app.http("auth-temp-keys-off", {
    methods: ["POST"], authLevel: "anonymous", route: "auth/temp-keys/desactivar",
    handler: handle(async (request) => {
      const user = await currentUser(request)
      if (!isExperienceUser(user)) return forbidden()
      const data = await body(request)
      const ok = await deactivateTempKey(data.email, user.email)
      return ok ? json(200, { message: "Clave desactivada." }) : json(404, { message: "No hay clave para ese correo." })
    }),
  })

  app.http("auth-activate-temp", {
    methods: ["POST"], authLevel: "anonymous", route: "auth/activate-temp",
    handler: handle(async (request) => {
      const data = await body(request)
      const email = normalizeEmail(data.email)
      if (!validCorporateEmail(email)) return json(400, { message: "Correo o clave temporal incorrectos." })
      if (!validPassword(data.password)) return json(400, { message: "La contraseña debe tener al menos 10 caracteres, letras y números." })
      const check = await consumeTempKey(email, data.clave)
      if (!check.ok) return json(400, { message: check.message })
      const existing = await getUser(email)
      if (!existing) return json(403, { message: "Usuario no habilitado." })
      const updated = await upsertUser({ ...existing, passwordHash: await hashPassword(data.password), activatedAt: existing.activatedAt || new Date().toISOString(),
        passwordChangedAt: new Date().toISOString(), failedLoginCount: 0, lockedUntil: undefined })
      const session = await createSession(email, sessionDays)
      return json(200, { user: publicUser(updated), message: "Cuenta activada." }, { "Set-Cookie": sessionCookie(session, sessionDays * 86400) })
    }),
  })
}

