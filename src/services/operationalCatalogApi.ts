import type { ProcessAssignment, ProcessConfig, ProcessFieldDefinition, UserScope } from "../types"

export type OperationalCatalogMeta = {
  source: "SHAREPOINT_LIST" | "CACHE" | "FALLBACK"
  checkedAt?: string
  warning?: string
  lists?: {
    processes?: string
    fields?: string
    assignments?: string
  }
  counts?: {
    processes?: number
    fields?: number
    assignments?: number
  }
}

export type UsersCatalogMeta = {
  source?: "SHAREPOINT_LIST" | "EXCEL_FALLBACK" | "FALLBACK"
  listName?: string
  checkedAt?: string
  warning?: string
}

export type OperationalCatalogResponse = {
  processes: ProcessConfig[]
  fields: ProcessFieldDefinition[]
  assignments: ProcessAssignment[]
  users?: UserScope[]
  usersMeta?: UsersCatalogMeta
  meta: OperationalCatalogMeta
}

export type OperationsStatus = {
  users: { source?: string; listName?: string; count?: number; checkedAt?: string; warning?: string }
  processes: { source?: string; listName?: string; count?: number }
  fields: { source?: string; listName?: string; count?: number }
  assignments: { source?: string; listName?: string; count?: number }
  sla: {
    source?: string
    listName?: string
    count?: number
    requiredCount?: number
    resolvedCount?: number
    missingCodes?: string[]
    diagnostics?: {
      totalRows?: number
      activeRows?: number
      validTechnicalRows?: number
      missingTechnicalCodeRows?: number
      invalidHoursRows?: number
    } | null
    warning?: string
  }
  requestStorage?: {
    source?: string
    requestsTable?: string
    timelineTable?: string
    futureSharePointLists?: string[]
  }
  checkedAt?: string
}

async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.message || `Error ${response.status}`)
  return payload as T
}

export async function fetchOperationalCatalog(force = false) {
  return apiJson<OperationalCatalogResponse>(`/api/operations/catalog${force ? "?force=1" : ""}`)
}

export async function fetchOperationsStatus() {
  return apiJson<OperationsStatus>("/api/operations/status")
}
