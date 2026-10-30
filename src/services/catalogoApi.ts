// Catálogo de modelos (listas de precios cargadas en Datos) y enlace de Recursos de Academia.

export type ModelBrand = { marca: string; modelos: string[]; fileName?: string; at?: string }

// Marcas nuevas que vende Ditalcar. Se usan si aún no hay lista de precios cargada para la marca.
export const DEFAULT_BRANDS = [
  "Chery", "Exeed", "Mitsubishi", "JMC", "KGM", "Nissan", "Renault", "Geely",
  "Jeep", "RAM", "Peugeot", "Fiat", "Citroën", "Leapmotor", "GAC", "BYD",
]

export const OTHER_MODEL_PREFIX = "Otro · "

async function apiJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.message || `Error ${response.status}`)
  return payload as T
}

let cache: { at: number; value: Promise<ModelBrand[]> } | null = null

export function getModelCatalog(force = false): Promise<ModelBrand[]> {
  if (!force && cache && Date.now() - cache.at < 60_000) return cache.value
  const value = apiJson<{ marcas: ModelBrand[] }>("/api/catalogo/modelos")
    .then((result) => result.marcas)
    .catch(() => [] as ModelBrand[])
  cache = { at: Date.now(), value }
  return value
}

export async function removeModelBrand(marca: string) {
  cache = null
  return apiJson<{ marcas: ModelBrand[] }>(`/api/catalogo/modelos?marca=${encodeURIComponent(marca)}`, { method: "DELETE" })
}

export function brandOptions(catalog: ModelBrand[]) {
  const seen = new Map<string, string>()
  for (const brand of [...catalog.map((item) => item.marca), ...DEFAULT_BRANDS]) {
    const key = brand.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    if (!seen.has(key)) seen.set(key, brand)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "es"))
}

export type ResourceCategory = "GENERAL" | "FICHAS" | "INSTRUCTIVOS"
export type AcademyResourceItem = { id: string; title: string; url: string; category: ResourceCategory; brand?: string; pinned?: boolean }
export type AcademyResources = { carpetaUrl: string; items?: AcademyResourceItem[]; updatedAt?: string; updatedBy?: string }

export function getAcademyResources() {
  return apiJson<AcademyResources>("/api/academia/recursos")
}

export function saveAcademyResources(carpetaUrl: string) {
  return apiJson<AcademyResources & { message: string }>("/api/academia/recursos", {
    method: "POST",
    body: JSON.stringify({ carpetaUrl }),
  })
}

export function saveAcademyResourceItems(items: AcademyResourceItem[]) {
  return apiJson<AcademyResources & { message: string }>("/api/academia/recursos", {
    method: "POST",
    body: JSON.stringify({ items }),
  })
}
