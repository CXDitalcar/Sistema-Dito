// Compara nombres de local escritos distinto en cada fuente:
// 02_Usuarios ("Vespucio", "JMC-KGM Nueva Tobalaba", "Mitsubishi Tobalaba"),
// Ruta ("Chery-Renault Vespucio", "KGM-JMC Nueva Tobalaba", "Chery-MMC Tobalaba") y SIGA.
// Calza si es el mismo sector y, si el local del usuario nombra marcas, comparten al menos una.
const SITES = ["NUEVA TOBALABA", "TOBALABA", "NORTE", "ALAMEDA", "VESPUCIO", "COSTANERA", "CANTAGALLO", "FLORIDA"]
const BRANDS = ["CHERY", "GEELY", "MITSUBISHI", "STELLANTIS", "ASTARA", "JMC", "KGM", "GAC", "SEMINUEVOS", "USADOS", "EXEED", "NISSAN", "RENAULT"]

function text(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim()
}

function parse(value: string) {
  const t = text(String(value ?? "").replace(/^\s*veh[ií]culos\s+/i, ""))
    .replace(/\bCFC\b/g, "STELLANTIS").replace(/CANTA GALLO/g, "CANTAGALLO").replace(/SSANGYONG/g, "KGM").replace(/\bMMC\b/g, "MITSUBISHI")
  const site = SITES.find((s) => t.includes(s)) ?? ""
  const brands = BRANDS.filter((b) => new RegExp(`\\b${b}\\b`).test(t))
  if (brands.includes("USADOS")) brands.push("SEMINUEVOS")
  return { site, brands, key: t.replace(/ /g, "") }
}

export function localMatches(userLocal?: string, otherLocal?: string) {
  if (!userLocal || !otherLocal) return false
  const u = parse(userLocal)
  const o = parse(otherLocal)
  if (!u.key || !o.key) return false
  if (u.key === o.key) return true
  if (u.site && o.site) {
    if (u.site !== o.site) return false
    if (!u.brands.length) return true
    return u.brands.some((b) => o.brands.includes(b))
  }
  return o.key.includes(u.key) || u.key.includes(o.key)
}
