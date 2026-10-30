// Catálogo de modelos (desde las listas de precios que sube Experiencia en Datos)
// y enlaces de Recursos de Academia. Se guardan en la tabla de configuración.
import { getAppConfig, setAppConfig } from "./store.js"
import { readSheets } from "./datosParsers.js"

const MODELS_KEY = "CATALOGO_MODELOS"
const RESOURCES_KEY = "ACADEMIA_RECURSOS"

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim()
}
function key(value) {
  return clean(value).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()
}

// Lista de precios: los modelos están en la primera columna de la primera hoja.
// Se omiten encabezados, filas vacías, números sueltos y textos de notas largas.
export async function parsePriceList(buffer, fileName) {
  const sheets = await readSheets(buffer, fileName)
  const sheet = sheets.find((s) => s.rows.length) || { rows: [] }
  const seen = new Map()
  let skipped = 0
  for (const row of sheet.rows) {
    const raw = clean(Array.isArray(row) ? row[0] : "")
    const k = key(raw)
    if (!raw) { skipped++; continue }
    if (/^(MODELO|MODELOS|VERSION|VERSIONES|LISTA DE PRECIOS?|PRECIOS?)$/.test(k)) { skipped++; continue }
    if (/^[\d\s.,$%-]+$/.test(raw) || raw.length > 90) { skipped++; continue }
    if (!seen.has(k)) seen.set(k, raw)
  }
  return { modelos: [...seen.values()], leidos: sheet.rows.length, skipped }
}

export async function readModelCatalog() {
  const stored = await getAppConfig(MODELS_KEY)
  try { return JSON.parse(String(stored?.value || "{}")) || {} } catch { return {} }
}

export async function saveBrandModels(marca, modelos, meta) {
  const catalog = await readModelCatalog()
  const brand = clean(marca)
  const brandKey = key(brand)
  const previous = Object.keys(catalog).find((k) => key(k) === brandKey)
  if (previous && previous !== brand) delete catalog[previous]
  catalog[brand] = { modelos, ...meta }
  await setAppConfig(MODELS_KEY, JSON.stringify(catalog))
  return catalog
}

export async function removeBrand(marca) {
  const catalog = await readModelCatalog()
  const brandKey = key(marca)
  for (const k of Object.keys(catalog)) if (key(k) === brandKey) delete catalog[k]
  await setAppConfig(MODELS_KEY, JSON.stringify(catalog))
  return catalog
}

export async function readResources() {
  const stored = await getAppConfig(RESOURCES_KEY)
  try {
    const value = JSON.parse(String(stored?.value || "{}")) || {}
    return { carpetaUrl: "", items: [], ...value }
  } catch { return { carpetaUrl: "", items: [] } }
}

const CATEGORIES = new Set(["GENERAL", "FICHAS", "INSTRUCTIVOS"])

// Recursos de Academia: enlaces (SharePoint u otros) por categoría, con destacados fijados arriba.
export function cleanResourceItems(items) {
  if (!Array.isArray(items)) throw new Error("Lista de recursos no válida.")
  if (items.length > 300) throw new Error("Máximo 300 recursos.")
  return items.map((item, index) => {
    const title = clean(item?.title).slice(0, 140)
    if (!title) throw new Error(`El recurso ${index + 1} no tiene título.`)
    const url = validUrl(item?.url)
    if (!url) throw new Error(`"${title}" no tiene enlace.`)
    const category = CATEGORIES.has(String(item?.category)) ? String(item.category) : "GENERAL"
    return {
      id: clean(item?.id).slice(0, 60) || `R${Date.now().toString(36)}${index}`,
      title,
      url,
      category,
      brand: clean(item?.brand).slice(0, 40),
      pinned: Boolean(item?.pinned),
    }
  })
}

export async function saveResources(patch, userEmail) {
  const current = await readResources()
  const next = { ...current, ...patch, updatedAt: new Date().toISOString(), updatedBy: userEmail }
  await setAppConfig(RESOURCES_KEY, JSON.stringify(next))
  return next
}

export function validUrl(value) {
  const text = clean(value)
  if (!text) return ""
  let url
  try { url = new URL(text) } catch { throw new Error("El enlace no es válido. Debe comenzar con https://") }
  if (url.protocol !== "https:") throw new Error("El enlace debe comenzar con https://")
  return url.toString()
}

// Locales de la red administrados desde Datos (Experiencia/PM). Vacío = la app usa su lista base.
const LOCALS_KEY = "CATALOGO_LOCALES"
export async function readLocals() {
  const stored = await getAppConfig(LOCALS_KEY)
  try { return JSON.parse(String(stored?.value || "[]")) || [] } catch { return [] }
}
export async function saveLocals(list, userEmail) {
  if (!Array.isArray(list)) throw new Error("Lista de locales no válida.")
  const seen = new Set()
  const clean = list.map((item) => {
    const name = String(item?.name || "").replace(/\s+/g, " ").trim().slice(0, 60)
    if (!name) throw new Error("Hay un local sin nombre.")
    const k = key(name)
    if (seen.has(k)) throw new Error(`"${name}" está repetido.`)
    seen.add(k)
    const brands = [...new Set((Array.isArray(item?.brands) ? item.brands : []).map((b) => String(b).trim()).filter(Boolean))]
    const operation = ["GENERAL", "GEELY", "STELLANTIS"].includes(item?.operation) ? item.operation : "GENERAL"
    return { name, brands, operation, active: item?.active !== false }
  })
  await setAppConfig(LOCALS_KEY, JSON.stringify(clean), { updatedBy: userEmail })
  return clean
}
