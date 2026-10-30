import { ditalcarLocals } from "../data/requestConfig"

// Locales de la red. Base en el código; Experiencia/PM pueden reemplazarla desde Gestión › Datos › Locales.
export type LocalDef = { name: string; brands: string[]; operation: "GENERAL" | "GEELY" | "STELLANTIS"; active: boolean }

let runtime: LocalDef[] = ditalcarLocals.map((local) => ({
  name: local.name,
  brands: [...local.brands],
  operation: local.operation as LocalDef["operation"],
  active: true,
}))

export function getLocals(includeInactive = false) {
  return includeInactive ? runtime : runtime.filter((local) => local.active)
}

export function getBaseLocals() {
  return ditalcarLocals.map((local) => ({ name: local.name, brands: [...local.brands], operation: local.operation as LocalDef["operation"], active: true }))
}

async function apiJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { credentials: "include", ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.message || `Error ${response.status}`)
  return payload as T
}

export async function loadLocals() {
  try {
    const result = await apiJson<{ locales: LocalDef[] }>("/api/catalogo/locales")
    if (result.locales?.length) runtime = result.locales
  } catch {
    // sin conexión: se mantiene la base
  }
  return runtime
}

export async function saveLocals(locales: LocalDef[]) {
  const result = await apiJson<{ message: string; locales: LocalDef[] }>("/api/catalogo/locales", {
    method: "POST",
    body: JSON.stringify({ locales }),
  })
  runtime = result.locales
  return result
}
