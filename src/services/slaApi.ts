import type { ProcessConfig } from "../types"

export type SlaResolved = {
  review?: { code: string; hours?: number }
  acceptance?: { code: string; hours?: number }
  resolution?: { code: string; hours?: number }
  confirmation?: { code: string; hours?: number }
  source: "SHAREPOINT_LIST" | "CACHE" | "FALLBACK"
  listName?: string | null
  checkedAt?: string
  warning?: string
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

export async function resolveProcessSla(process: ProcessConfig, force = false) {
  return apiJson<SlaResolved>("/api/sla/resolve", {
    method: "POST",
    body: JSON.stringify({
      reviewCode: process.slaReviewCode,
      acceptanceCode: process.slaAcceptanceCode,
      resolutionCode: process.slaResolutionCode,
      confirmationCode: process.slaConfirmationCode,
      confirmationFallbackHours: process.confirmationHours,
      force,
    }),
  })
}
