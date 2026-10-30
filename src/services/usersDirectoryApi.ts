import type { UserScope } from "../types"

export type UsersDirectoryMeta = {
  source?: "SHAREPOINT_LIST" | "EXCEL_FALLBACK" | "FALLBACK"
  listName?: string
  warning?: string
  sourceUrl?: string
  finalUrl?: string
  sheet: string
  rowCount: number
  activeCount: number
  inactiveCount: number
  checkedAt: string
  lastModified?: string
}

async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.message || `Error ${response.status}`)
  return payload as T
}

export async function getUsersSource() {
  return apiJson<{ configured: boolean; url: string; sheet: string }>("/api/users/source")
}

export async function saveUsersSource(url: string) {
  return apiJson<{ message: string; meta: UsersDirectoryMeta }>("/api/users/source", {
    method: "POST",
    body: JSON.stringify({ url }),
  })
}

export async function getUsersDirectory() {
  return apiJson<{ users: UserScope[]; meta: UsersDirectoryMeta }>("/api/users/directory")
}
