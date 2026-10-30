// Normalización compartida para Datos y Seguimiento de clientes (autos nuevos).
// Reglas confirmadas por Experiencia (08-10-2026):
// - CFC = Stellantis (se muestra siempre como "Stellantis").
// - MG no se vende nuevo; GAC quedan unidades (reciben Aviso 5).
// - Flota, Usados y Administración quedan fuera del seguimiento por ahora.

export function normText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
}

export function normKey(value) {
  return normText(value).replace(/[^A-Z0-9]/g, "")
}

export function cleanText(value) {
  if (value === undefined || value === null) return ""
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) return value.richText.map((p) => p.text || "").join("").trim()
    if (value.text !== undefined) return String(value.text).trim()
    if (value.result !== undefined) return String(value.result ?? "").trim()
    return ""
  }
  return String(value).replace(/\s+/g, " ").trim()
}

export function normRut(value) {
  const raw = String(value ?? "").toUpperCase().replace(/[^0-9K]/g, "")
  if (raw.length < 2) return ""
  return `${raw.slice(0, -1).replace(/^0+/, "")}-${raw.slice(-1)}`
}

// WhatsApp: sólo celulares chilenos (9 dígitos que empiezan con 9).
export function normPhone(...candidates) {
  for (const candidate of candidates) {
    let digits = String(candidate ?? "").replace(/\D/g, "")
    if (!digits) continue
    if (digits.startsWith("56") && digits.length === 11) digits = digits.slice(2)
    if (digits.length === 9 && digits.startsWith("9")) return { phone: `+56${digits}`, valid: true }
  }
  const first = candidates.map((c) => String(c ?? "").trim()).find(Boolean) || ""
  return { phone: first, valid: false }
}

export function normVin(value) {
  const vin = String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "")
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin) ? vin : ""
}

export function normNv(value) {
  const text = String(value ?? "").trim()
  if (/^\d{4,7}$/.test(text)) return text
  if (typeof value === "number" && Number.isInteger(value) && value > 999) return String(value)
  return ""
}

const pad = (n) => String(n).padStart(2, "0")

// Devuelve "YYYY-MM-DD" o "" (acepta Date, serial Excel, dd-mm-aaaa, dd/mm/aaaa, aaaa-mm-dd).
export function parseDate(value) {
  if (value === undefined || value === null || value === "") return ""
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`
  }
  if (typeof value === "number" && value > 20000 && value < 80000) {
    const date = new Date(Math.round((value - 25569) * 86400000))
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
  }
  const text = String(value).trim()
  let m = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/)
  if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`
  m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`
  return ""
}

const MONTHS = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]

// "OCTUBRE(2026)" -> "2026-10"
export function parseExpectedMonth(value) {
  const text = normText(value)
  const m = text.match(/^([A-Z]+)\s*\(?\s*(\d{4})\s*\)?$/)
  if (!m) return ""
  const index = MONTHS.indexOf(m[1] === "SETIEMBRE" ? "SEPTIEMBRE" : m[1])
  return index >= 0 ? `${m[2]}-${pad(index + 1)}` : ""
}

export function daysBetween(fromIso, toIso = new Date().toISOString().slice(0, 10)) {
  if (!fromIso) return null
  const a = Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`)
  const b = Date.parse(`${toIso.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.floor((b - a) / 86400000)
}

// ---------- Marcas ----------
const STELLANTIS = new Set(["CFC", "JEEP", "RAM", "PEUGEOT", "FIAT", "CITROEN", "LEAPMOTOR", "STELLANTIS", "OPEL", "DS"])
const ASTARA = new Set(["CHERY", "EXEED", "MITSUBISHI", "JMC", "KGM", "SSANGYONG", "NISSAN", "RENAULT"])

export function brandInfo(marca) {
  const key = normKey(marca)
  if (!key) return { brand: "", group: "SIN_MARCA", excluded: "Sin marca informada" }
  if (STELLANTIS.has(key)) return { brand: key === "CFC" ? "Stellantis" : titleCase(key), group: "STELLANTIS" }
  if (ASTARA.has(key)) return { brand: key === "SSANGYONG" ? "KGM" : titleCase(key), group: "ASTARA" }
  if (key === "GEELY") return { brand: "Geely", group: "GEELY" }
  if (key === "GAC") return { brand: "GAC", group: "OTRA" }
  if (key === "MG") return { brand: "MG", group: "OTRA", excluded: "MG ya no se vende nuevo" }
  return { brand: titleCase(key), group: "OTRA", excluded: "Marca no comercializada como auto nuevo" }
}

export function titleCase(value) {
  const text = String(value ?? "").trim().toLowerCase()
  const keepUpper = new Set(["jmc", "kgm", "gac", "mg", "ram", "byd", "ds", "suv"])
  return text.replace(/[a-záéíóúñü0-9]+/gi, (word) => (keepUpper.has(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)))
}

// ---------- Locales ----------
export function localDisplay(local) {
  const text = String(local ?? "")
    .replace(/^\s*veh[ií]culos\s+/i, "")
    .replace(/\bCFC\b/gi, "Stellantis")
    .replace(/\s+/g, " ")
    .trim()
  return titleCase(text).replace(/\bAstara\b/i, "Astara")
}

// Locales fuera del seguimiento de autos nuevos ("letra chica" visible en la app).
export function localExclusion(local) {
  const key = normKey(local)
  if (key.includes("FLOTA")) return "Venta flota: fuera del seguimiento por ahora"
  if (key.includes("USADO")) return "Local de usados: el seguimiento es sólo para autos nuevos"
  if (key.includes("ADMINISTRACION")) return "Registrado en Administración: fuera del seguimiento por ahora"
  return ""
}

// Bodegas y centros logísticos: una llegada aquí NO es "recibido en el local de venta".
const BODEGAS = ["CASONA", "RENCA", "CORRAL", "NOVICIADO", "KARLOGISTIC", "MITTA", "BODENOR", "CAMINOELOLIVO", "SITIODETOBAR", "AEROPUERTO", "ECONORENT", "VALLEGRANDE", "PARQUEENEA", "LOGAUTO"]

// Excepción: CASONA está junto a Tobalaba, así que para ventas de un local
// "Tobalaba" o "Nueva Tobalaba" la llegada a CASONA cuenta como recibido.
export function isBodega(destino, saleLocal = "") {
  const key = normKey(destino)
  if (!key) return true
  if (key.includes("CASONA") && normKey(saleLocal).includes("TOBALABA")) return false
  return BODEGAS.some((b) => key.includes(b))
}

export function destinoDisplay(destino) {
  return titleCase(String(destino ?? "").replace(/\s+/g, " ").trim())
}

// ---------- Personas ----------
export function nameKey(value) {
  return normText(value).replace(/[^A-Z ]/g, "").trim()
}

// "NATALIA SILVA" coincide con "Natalia Silva Pérez" (todas las palabras del nombre más corto).
export function namesMatch(a, b) {
  const ta = nameKey(a).split(" ").filter(Boolean)
  const tb = nameKey(b).split(" ").filter(Boolean)
  if (ta.length < 2 || tb.length < 2) return false
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta]
  return short.every((t) => long.includes(t))
}

export function firstName(value) {
  const first = nameKey(value).split(" ")[0] || ""
  return titleCase(first)
}

// Un local de 02_Usuarios ("Chery Norte", "JMC-KGM Nueva Tobalaba", "Vespucio") contra el local de
// SIGA ("Vehiculos Chery Plaza Norte", "Vehiculos JMC Nueva Tobalaba", "Vehiculos Chery Plaza Vespucio").
// Calza si es el mismo sector y, cuando el local del usuario nombra marcas, comparten al menos una.
const SITES = ["NUEVA TOBALABA", "TOBALABA", "NORTE", "ALAMEDA", "VESPUCIO", "COSTANERA", "CANTAGALLO", "FLORIDA"]
const LOCAL_BRANDS = ["CHERY", "GEELY", "MITSUBISHI", "STELLANTIS", "ASTARA", "JMC", "KGM", "GAC", "SEMINUEVOS", "USADOS", "EXEED", "NISSAN", "RENAULT"]

function parseLocal(value) {
  const t = normText(String(value ?? "").replace(/^\s*veh[ií]culos\s+/i, ""))
    .replace(/\bCFC\b/g, "STELLANTIS").replace(/CANTA\s+GALLO/g, "CANTAGALLO").replace(/SSANGYONG/g, "KGM").replace(/\bMMC\b/g, "MITSUBISHI")
  const site = SITES.find((s) => t.includes(s)) || ""
  const brands = LOCAL_BRANDS.filter((b) => new RegExp(`\\b${b}\\b`).test(t))
  if (brands.includes("USADOS")) brands.push("SEMINUEVOS")
  return { site, brands, key: normKey(t) }
}

export function localMatches(userLocal, nvLocal) {
  const u = parseLocal(userLocal)
  const n = parseLocal(nvLocal)
  if (!u.key || !n.key || u.key.length < 4) return false
  if (u.site && n.site) {
    if (u.site !== n.site) return false
    if (!u.brands.length) return true
    return u.brands.some((b) => n.brands.includes(b))
  }
  return n.key.includes(u.key) || u.key.includes(n.key)
}
