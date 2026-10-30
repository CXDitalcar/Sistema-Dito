// Contabilidad (interfaz /contabilidad): listas de precio de marca y bonos por cobrar por NV.
// - La carpeta mensual de listas se sube en Contabilidad › Cargar archivos (solo los 3 administradores de DITO):
//   alimenta el catálogo de modelos y Contabilidad. Flota y circulares se guardan aparte.
// - Contabilidad la ven los 3 administradores (con carga y edición) y los cargos de Gerente (solo lectura).
//   Reglas en lib/accessRules.js; debe coincidir con src/services/ditoAccess.ts.
import { json, body } from "./lib/http.js"
import { canViewContabilidad, isDitoAdmin } from "./lib/accessRules.js"
import { getAppConfig, setAppConfig } from "./lib/store.js"
import { readMaster } from "./lib/datosStore.js"
import { sha256 } from "./lib/admPdf.js"
import { leerArchivo } from "./lib/admLectores.js"
import { calcularBonos } from "./lib/admBonos.js"
import { readModelCatalog, saveBrandModels } from "./lib/catalogoDatos.js"
import { getLista, listCondiciones, listListas, listasConFilas, readOriginal, saveCondicion, saveLista } from "./lib/admStore.js"

const MAX_BYTES = 15 * 1024 * 1024
const MESES = { ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6, JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, SETIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12 }
// Nombre de la marca en el catálogo de modelos (el mismo que usan las solicitudes).
const NOMBRE_MARCA = { CHERY: "Chery", GEELY: "Geely", PEUGEOT: "Peugeot", CITROEN: "Citroën", JEEP: "Jeep", FIAT: "Fiat", RAM: "RAM", LEAPMOTOR: "Leapmotor", OPEL: "Opel", MITSUBISHI: "Mitsubishi", JMC: "JMC", KGM: "KGM", NISSAN: "Nissan", EXEED: "Exeed", RENAULT: "Renault", GAC: "GAC" }

// "OCTUBRE 2026/GEELY/archivo.pdf" → "2026-10" (para archivos sin vigencia leída, como circulares).
function mesDeRuta(ruta) {
  const t = String(ruta || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()
  const m = t.match(/\b([A-Z]+)\s+(20\d\d)\b/)
  return m && MESES[m[1]] ? `${m[2]}-${String(MESES[m[1]]).padStart(2, "0")}` : ""
}

export function registerAdmRoutes({ app, currentUser, isExperienceUser }) {
  const canAccess = canViewContabilidad
  const canManage = isDitoAdmin
  const handle = (allowed, fn) => async (request) => {
    try {
      const user = await currentUser(request)
      if (!user) return json(401, { message: "Sesión no válida." })
      if (!(await allowed(user))) return json(403, { message: "Esta sección no está disponible para tu cargo." })
      return await fn(request, user)
    } catch (error) {
      console.error("admRoutes", error?.message)
      return json(500, { message: error?.message || "Error inesperado." })
    }
  }

  // Quién puede entrar a Contabilidad y qué puede hacer: la portada lo consulta antes de mostrar nada.
  app.http("adm-acceso", {
    methods: ["GET"], authLevel: "anonymous", route: "adm/acceso",
    handler: async (request) => {
      try {
        const user = await currentUser(request)
        if (!user) return json(401, { message: "Sesión no válida." })
        const manage = await canManage(user)
        return json(200, { allowed: manage || (await canAccess(user)), canManage: manage })
      } catch (error) {
        return json(500, { message: error?.message || "Error inesperado." })
      }
    },
  })

  // Registro de cargas (quién subió qué y con qué resultado): base del resumen acumulado.
  async function registrarCarga(entry) {
    const stored = await getAppConfig("ADM_CARGAS_LOG").catch(() => null)
    let log = []
    try { log = JSON.parse(String(stored?.value || "[]")) } catch { log = [] }
    log.unshift({ ...entry, en: new Date().toISOString() })
    await setAppConfig("ADM_CARGAS_LOG", JSON.stringify(log.slice(0, 300)))
  }

  // El catálogo de modelos de una marca solo se reemplaza con una lista igual o más nueva que la que tiene
  // (al subir varios meses juntos no debe quedar una lista antigua). Entradas antiguas sin vigencia se comparan por mes.
  async function actualizarCatalogoSiEsNueva({ marca, desde, filas, archivo, user }) {
    const nombre = NOMBRE_MARCA[marca] || marca
    const catalogo = await readModelCatalog()
    const actual = Object.entries(catalogo).find(([k]) => k.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase() === marca)?.[1]
    const vigente = actual?.desde || String(actual?.at || "").slice(0, 7)
    if (vigente && String(desde) < vigente) return 0
    const modelos = [...new Set(filas.map((f) => f.modelo).filter(Boolean))]
    await saveBrandModels(nombre, modelos, { fileName: archivo, at: new Date().toISOString(), by: user.email, desde })
    return modelos.length
  }

  // Lee un archivo, lo guarda y, si es una lista retail leída, actualiza el catálogo de modelos.
  async function procesar({ sha, buffer, archivo, ruta, user, original = true }) {
    const lectura = await leerArchivo(buffer, ruta || archivo)
    lectura.mes = mesDeRuta(ruta)
    const lista = await saveLista({ sha, buffer, archivo, ruta, lectura, cargadoPor: user.email, original })
    let catalogo = 0
    if (lectura.estado === "OK" && lectura.tipo === "RETAIL" && lectura.marca && lectura.filas.length) {
      catalogo = await actualizarCatalogoSiEsNueva({ marca: lectura.marca, desde: lectura.meta.desde, filas: lectura.filas, archivo, user })
    }
    return { lista, catalogo }
  }

  // Deja en el catálogo, por marca, los modelos de su lista retail más reciente.
  async function restaurarCatalogo(user) {
    const listas = await listasConFilas()
    const marcas = [...new Set(listas.map((l) => l.marca).filter(Boolean))]
    for (const marca of marcas) {
      const nueva = listas.filter((l) => l.marca === marca).sort((a, b) => String(b.desde).localeCompare(String(a.desde)) || b.filas.length - a.filas.length)[0]
      const nombre = NOMBRE_MARCA[marca] || marca
      const modelos = [...new Set(nueva.filas.map((f) => f.modelo).filter(Boolean))]
      await saveBrandModels(nombre, modelos, { fileName: nueva.archivo, at: new Date().toISOString(), by: user.email, desde: nueva.desde })
    }
    return marcas.length
  }

  // Gestión › Datos: un archivo de la carpeta mensual por llamada (PDF o Excel), con su ruta en la carpeta.
  app.http("datos-listas-precio", {
    methods: ["POST"], authLevel: "anonymous", route: "datos/listas-precio",
    handler: handle(canManage, async (request, user) => {
      const declared = Number(request.headers.get("content-length") || 0)
      if (declared > MAX_BYTES) return json(413, { message: "Cada archivo puede pesar como máximo 15 MB." })
      const buffer = Buffer.from(await request.arrayBuffer())
      if (!buffer.length) return json(400, { message: "El archivo está vacío." })
      if (buffer.length > MAX_BYTES) return json(413, { message: "Cada archivo puede pesar como máximo 15 MB." })
      const firma = buffer.subarray(0, 5).toString("latin1")
      if (firma !== "%PDF-" && !firma.startsWith("PK")) return json(400, { message: "Solo se aceptan PDF o Excel (.xlsx)." })
      const decode = (v, d) => { try { return decodeURIComponent(v || d) } catch { return v || d } }
      const archivo = decode(request.headers.get("x-file-name"), "lista")
      const ruta = decode(request.headers.get("x-file-path"), archivo)

      const sha = sha256(buffer)
      const existente = await getLista(sha)
      if (existente) {
        await registrarCarga({ por: user.email, archivo, resultado: "YA_ESTABA", marca: existente.marca || "", mes: existente.mes || "" }).catch(() => {})
        return json(200, { lista: existente, duplicado: true, message: `${archivo}: ya estaba cargado.` })
      }
      const { lista, catalogo } = await procesar({ sha, buffer, archivo, ruta, user })
      await registrarCarga({ por: user.email, archivo, resultado: lista?.estado || "GUARDADO", marca: lista?.marca || "", mes: lista?.mes || "", filas: lista?.filas || 0 }).catch(() => {})
      return json(200, { lista, duplicado: false, catalogo })
    }),
  })

  // Vuelve a leer los archivos guardados que no tenían lector o quedaron para revisar (al agregar un lector nuevo).
  app.http("adm-listas-releer", {
    methods: ["POST"], authLevel: "anonymous", route: "adm/listas/releer",
    handler: handle(canManage, async (_request, user) => {
      const pendientes = (await listListas()).filter((l) => l.estado === "FALTA_LECTOR" || l.estado === "REVISAR")
      let leidas = 0
      for (const meta of pendientes) {
        const buffer = await readOriginal(meta).catch(() => null)
        if (!buffer) continue
        const { lista } = await procesar({ sha: meta.sha, buffer, archivo: meta.archivo, ruta: meta.ruta, user, original: false })
        if (lista.estado === "OK") leidas++
      }
      const marcas = await restaurarCatalogo(user)
      return json(200, { revisadas: pendientes.length, leidas, message: `${leidas} de ${pendientes.length} archivos pendientes se leyeron. Catálogo actualizado con la lista más reciente de ${marcas} marcas.` })
    }),
  })

  app.http("adm-listas", {
    methods: ["GET"], authLevel: "anonymous", route: "adm/listas",
    handler: handle(canAccess, async () => json(200, { listas: await listListas() })),
  })

  // Resumen acumulado hasta el momento: listas cargadas por marca y mes, estado de lectura y últimas cargas.
  app.http("adm-resumen", {
    methods: ["GET"], authLevel: "anonymous", route: "adm/resumen",
    handler: handle(canAccess, async () => {
      const listas = await listListas()
      const porMarca = {}
      for (const l of listas) {
        const k = `${l.marca || "Sin marca"}|${l.mes || "Sin mes"}`
        const row = porMarca[k] || (porMarca[k] = { marca: l.marca || "Sin marca", mes: l.mes || "Sin mes", archivos: 0, leidas: 0, porRevisar: 0, filas: 0 })
        row.archivos += 1
        row.filas += Number(l.filas || 0)
        if (l.estado === "OK") row.leidas += 1
        else row.porRevisar += 1
      }
      const stored = await getAppConfig("ADM_CARGAS_LOG").catch(() => null)
      let cargas = []
      try { cargas = JSON.parse(String(stored?.value || "[]")) } catch { cargas = [] }
      return json(200, {
        generado: new Date().toISOString(),
        totalListas: listas.length,
        listas: Object.values(porMarca).sort((a, b) => String(b.mes).localeCompare(String(a.mes)) || a.marca.localeCompare(b.marca)),
        cargas: cargas.slice(0, 100),
      })
    }),
  })

  app.http("adm-bonos", {
    methods: ["GET"], authLevel: "anonymous", route: "adm/bonos",
    handler: handle(canAccess, async () => {
      const [listas, todas, siga, condiciones] = await Promise.all([listasConFilas(), listListas(), readMaster("siga"), listCondiciones()])
      // Solo lo que el cálculo necesita: sin nombre, RUT ni contacto del cliente.
      const nvs = Object.values(siga.records || {}).map((r) => ({
        nv: r.nv, marca: r.marca, modelo: r.modelo, fechaFactura: r.fechaFactura, fechaNV: r.fechaNV, nFactura: r.nFactura,
        local: r.local, institucionCredito: r.institucionCredito, tipoCredito: r.tipoCredito, nula: r.nula,
      }))
      const marcas = [...new Set(listas.map((l) => l.marca).filter(Boolean))]
      // Solo marcas con ventas: una lista sin NV vendidas no suma nada al resumen.
      const resultados = marcas.map((marca) => ({ marca, ...calcularBonos({ listas, nvs, condiciones, marca }) }))
        .filter((r) => r.filas.length || r.sinLista.length)
        .sort((a, b) => b.totales.bruto - a.totales.bruto)
      return json(200, { marcas: resultados, siga: { actualizado: siga.updatedAt || null, nv: nvs.length }, listas: todas })
    }),
  })

  app.http("adm-condiciones", {
    methods: ["POST"], authLevel: "anonymous", route: "adm/condiciones",
    handler: handle(canManage, async (request, user) => {
      const data = await body(request)
      const nv = String(data.nv || "").trim()
      if (!/^\d{3,10}$/.test(nv)) return json(400, { message: "Falta el número de NV." })
      const flag = (value) => (value === true || value === false ? value : undefined)
      const canal = ["TMP", "CC", "CI"].includes(data.canal) ? data.canal : undefined
      await saveCondicion(nv, { financiaScf: flag(data.financiaScf), tieneRetoma: flag(data.tieneRetoma), canal }, user.email)
      return json(200, { message: `NV ${nv} actualizada.` })
    }),
  })
}
