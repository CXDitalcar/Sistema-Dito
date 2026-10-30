// Otros formularios de Gestión de Showroom: Tour Manager (Forms) y Frogmi, con las cuentas por local.
import type { UserScope } from "../types"
import { userLocalList } from "./userLocals"

export type FrogmiAccount = { local: string; usuario: string; clave?: string }
export type ShowroomAccess = { tourManagerUrl: string; frogmiUrl: string; clave: string; cuentas: FrogmiAccount[]; updatedAt?: string }

export async function getShowroomAccess(): Promise<ShowroomAccess | null> {
  try {
    const response = await fetch("/api/showroom/accesos", { credentials: "include" })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

export async function saveShowroomAccess(data: Partial<ShowroomAccess>) {
  const response = await fetch("/api/showroom/accesos", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.message || `Error ${response.status}`)
  return payload as ShowroomAccess & { message: string }
}

const key = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()

// Cuenta Frogmi que corresponde a un local (por palabra clave; "Nueva Tobalaba" antes que "Tobalaba").
function accountMatches(account: FrogmiAccount, local: string) {
  const a = key(account.local)
  const l = key(local)
  const words = ["NUEVA TOBALABA", "CANTAGALLO", "CANTA GALLO", "NORTE", "ALAMEDA", "VESPUCIO", "COSTANERA", "TOBALABA"]
  const word = words.find((w) => l.includes(w))
  if (!word) return false
  if (word === "TOBALABA") return a.includes("TOBALABA") && !a.includes("NUEVA")
  if (word === "CANTA GALLO") return a.includes("CANTAGALLO")
  return a.includes(word)
}

export function accountsForUser(user: UserScope, cuentas: FrogmiAccount[]) {
  const locals = userLocalList(user)
  const mine = cuentas.filter((c) => locals.some((l) => accountMatches(c, l)))
  const others = cuentas.filter((c) => !mine.includes(c))
  return { mine, others }
}
