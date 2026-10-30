import {
  appendDemoTimeline,
  createDemoRequest,
  getDemoRequests,
  getDemoTimeline,
  nextDemoRequestId,
  updateDemoRequest,
} from "./demoStore"
import { getFieldDefinition, isDemoUser } from "./requestCatalog"
import { prepareUploadFile } from "./fileUtils"
import type {
  RequestAttachment,
  RequestFieldValue,
  RequestItem,
  RequestStatus,
  RequestTimelineItem,
  RequestTimelineType,
  UserScope,
} from "../types"

// ======================================================
// Solicitudes · persistencia en la API de DitalApp (Azure Table + Blob).
// Mientras TI no habilite Graph/Sites.Selected, la API es la fuente oficial.
// Los perfiles demo siguen usando el almacenamiento local del navegador.
// ======================================================

const activeStatuses = new Set<RequestStatus>([
  "RECIBIDA",
  "INFORMACION_REQUERIDA",
  "PENDIENTE_APROBACION",
  "APROBADA",
  "APROBADA_CON_AJUSTE",
  "EN_GESTION",
  "RESUELTA_POR_CONFIRMAR",
])

export type RequestPersistResult = {
  request: RequestItem
  warnings: string[]
}

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

function formatFieldValue(field: RequestFieldValue, processCode: string) {
  const definition = getFieldDefinition(field.fieldId, processCode)
  const label = definition?.label ?? field.fieldId.replace(/__(\d+)$/, "")
  const requested = field.requestedValue || "—"
  if (field.approvedValue && field.approvedValue.trim() && field.approvedValue.trim() !== field.requestedValue.trim()) {
    return `${label}: ${requested} → aprobado ${field.approvedValue}`
  }
  return `${label}: ${requested}`
}

export function buildRequestSummary(request: RequestItem) {
  const content = request.fields.map((field) => formatFieldValue(field, request.processCode)).join(" | ")
  const origin = request.originBreachId ? `Origen brecha ${request.originBreachId}` : ""
  return [content, origin].filter(Boolean).join(" | ").slice(0, 12000)
}

export async function listRequests(user: UserScope): Promise<RequestItem[]> {
  if (isDemoUser(user)) return getDemoRequests()
  const result = await apiJson<{ requests: RequestItem[] }>("/api/requests")
  return result.requests
}

export async function getRequestById(user: UserScope, requestId: string) {
  if (isDemoUser(user)) return getDemoRequests().find((request) => request.id === requestId)
  const result = await apiJson<{ request: RequestItem }>(`/api/requests/${encodeURIComponent(requestId)}`)
  return result.request
}

export async function findActiveRequestByBreach(user: UserScope, breachId: string) {
  if (!breachId) return undefined
  const requests = await listRequests(user)
  return requests.find((request) => request.originBreachId === breachId && activeStatuses.has(request.status))
}

export async function createRequest(user: UserScope, input: Omit<RequestItem, "id">): Promise<RequestPersistResult> {
  if (isDemoUser(user)) {
    const request: RequestItem = { ...input, id: nextDemoRequestId() }
    createDemoRequest(request)
    return { request, warnings: [] }
  }
  return apiJson<RequestPersistResult>("/api/requests", { method: "POST", body: JSON.stringify({ request: input }) })
}

export async function saveRequestTransition(
  user: UserScope,
  _previous: RequestItem,
  next: RequestItem,
  type: RequestTimelineType,
  title: string,
  detail?: string,
  attachmentIds?: string[]
): Promise<RequestPersistResult> {
  if (isDemoUser(user)) {
    const timeline: RequestTimelineItem = {
      id: `${next.id}-${type}-${Date.now()}`,
      requestId: next.id,
      type,
      authorEmail: user.email,
      authorName: user.name,
      createdAt: new Date().toISOString(),
      comment: detail ? `${title} · ${detail}` : title,
      attachmentIds,
    }
    const { id: _id, ...patch } = next
    updateDemoRequest(next.id, patch)
    appendDemoTimeline(timeline)
    return { request: next, warnings: [] }
  }
  return apiJson<RequestPersistResult>(`/api/requests/${encodeURIComponent(next.id)}`, {
    method: "PUT",
    body: JSON.stringify({ request: next, type, title, detail, attachmentIds }),
  })
}

export async function getRequestHistory(user: UserScope, requestId: string) {
  if (isDemoUser(user)) return getDemoTimeline(requestId)
  const result = await apiJson<{ history: RequestTimelineItem[] }>(`/api/requests/${encodeURIComponent(requestId)}/history`)
  return result.history
}

// Sube un adjunto (las imágenes se comprimen antes de enviar). Devuelve el adjunto y la solicitud actualizada.
export async function uploadRequestAttachment(user: UserScope, requestId: string, file: File, stage: string) {
  if (isDemoUser(user)) throw new Error("Los perfiles demo no guardan adjuntos.")
  const prepared = await prepareUploadFile(file)
  return apiJson<{ attachment: RequestAttachment; request: RequestItem }>(`/api/requests/${encodeURIComponent(requestId)}/attachments`, {
    method: "POST",
    body: JSON.stringify({ fileName: prepared.name, contentType: prepared.type, dataBase64: prepared.base64, stage }),
  })
}

export function attachmentUrl(requestId: string, attachmentId: string) {
  return `/api/requests/${encodeURIComponent(requestId)}/attachments/${encodeURIComponent(attachmentId)}`
}

export function parseUserListValue(value: unknown) {
  return String(value ?? "")
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}
