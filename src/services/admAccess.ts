// Acceso a Contabilidad según la API (fuente de verdad): ver (administradores y gerentes) y gestionar (solo administradores).
export type AdmAccess = { allowed: boolean; canManage: boolean }

export async function getAdmAccess(): Promise<AdmAccess> {
  try {
    const response = await fetch("/api/adm/acceso", { credentials: "include" })
    if (!response.ok) return { allowed: false, canManage: false }
    return await response.json()
  } catch {
    return { allowed: false, canManage: false }
  }
}
