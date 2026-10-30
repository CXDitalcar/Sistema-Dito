import type { RouteAnswerStatus } from "../data/routeExperience"

export type RouteEvidence = {
  id: string
  fileName: string
  size: number
  uploadedAt: string
  itemId: string
}

export type RouteLocalAction = {
  owner: string
  dueDate: string
  note: string
  status: "OPEN" | "DONE"
}

export type RouteAnswer = {
  itemId: string
  status?: RouteAnswerStatus
  detail?: string
  missing?: string[]
  evidence?: RouteEvidence[]
  linkedRequestId?: string
  resolutionMode?: "LOCAL_ACTION" | "REQUEST"
  localAction?: RouteLocalAction
}

export type RouteExecution = {
  id: string
  mode: "RUTA" | "AUDITORIA"
  local: string
  status: "DRAFT" | "SUBMITTED"
  completedByEmail: string
  completedByName: string
  createdAt: string
  updatedAt: string
  submittedAt?: string
  answers: RouteAnswer[]
  walkAdjustments?: string
  pendingActions?: string
  additionalComment?: string
  compliant: number
  nonCompliant: number
  requested: number
}

export type RouteDifference = {
  itemId: string
  routeStatus?: RouteAnswerStatus
  auditStatus?: RouteAnswerStatus
  routeDetail?: string
  auditDetail?: string
}

export type RouteComparison = {
  local: string
  period: string
  routeId: string
  auditId: string
  routeDate: string
  auditDate: string
  compared: number
  matches: number
  differences: RouteDifference[]
  exactitude: number
}

export type LocalKpis = {
  enImplementacion: boolean
  adherencia: { value: number | null; done: number; expected: number; period: string; desde?: string } | null
  cumplimientoEstandares: { value: number | null; date: string } | null
  cumplimientoAuditoria: { value: number | null; date: string } | null
  exactitud: { value: number | null; brecha: number | null; date: string } | null
}

export type MacroPoint = {
  done: number
  expected: number
  adherencia: number | null
  cumplimientoEstandares: number | null
  cumplimientoAuditoria: number | null
  exactitud: number | null
  brecha: number | null
  manual?: boolean
}
export type MacroWeek = MacroPoint & { week: string }
export type MacroMonth = MacroPoint & { period: string }

export type RouteMetrics = {
  kpis?: LocalKpis
  evolutivo?: { weekly: MacroWeek[]; monthly: MacroMonth[]; windowStart: string }
  implementacion?: { active: boolean; activatedAt: string | null }
  ultimaRuta?: { date: string; answers: { itemId: string; status?: RouteAnswerStatus; detail: string }[] } | null
  byLocal?: Record<string, LocalKpis>
  local?: string
  latest: RouteComparison | null
  monthly: RouteComparison[]
  generatedAt: string
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

export async function listRouteExecutions() {
  return apiJson<{ executions: RouteExecution[] }>("/api/route/executions")
}

export async function getRouteExecution(id: string) {
  return apiJson<{ execution: RouteExecution }>(`/api/route/executions/${encodeURIComponent(id)}`)
}

export async function getRouteMetrics(local?: string) {
  const query = local ? `?local=${encodeURIComponent(local)}` : ""
  return apiJson<RouteMetrics>(`/api/route/metrics${query}`)
}

export async function saveRouteExecution(execution: Partial<RouteExecution> & { local: string; mode: "RUTA" | "AUDITORIA"; answers: RouteAnswer[]; status: "DRAFT" | "SUBMITTED" }) {
  return apiJson<{ execution: RouteExecution; message: string }>("/api/route/executions", {
    method: "POST",
    body: JSON.stringify(execution),
  })
}

export async function uploadRouteEvidence(executionId: string, itemId: string, file: File) {
  const response = await fetch(`/api/route/evidence?executionId=${encodeURIComponent(executionId)}&itemId=${encodeURIComponent(itemId)}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "x-file-name": encodeURIComponent(file.name),
    },
    body: file,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.message || `Error ${response.status}`)
  return payload as { evidence: RouteEvidence }
}
