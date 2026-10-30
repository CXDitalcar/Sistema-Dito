import type { UserScope } from "../types"

// Locales de la persona, limpiando valores múltiples de SharePoint ("A;#B").
export function userLocalList(user: UserScope) {
  const raw = [user.local, user.localPrincipal, ...(user.assignedLocals ?? [])].filter(Boolean) as string[]
  return [...new Set(raw.flatMap((value) => value.split(/;#|;/)).map((value) => value.replace(/^#/, "").trim()).filter(Boolean))]
}
