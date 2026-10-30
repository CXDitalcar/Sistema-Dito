import { mockRequests, mockRequestTimeline } from "../data/mockData"
import type { RequestItem, RequestTimelineItem } from "../types"

const REQUESTS_KEY = "ditalcar-pilot-stellantis-nt-requests-v2"
const TIMELINE_KEY = "ditalcar-pilot-stellantis-nt-timeline-v2"

function cloneSeed(): RequestItem[] {
  return JSON.parse(JSON.stringify(mockRequests)) as RequestItem[]
}

export function getDemoRequests(): RequestItem[] {
  try {
    const raw = localStorage.getItem(REQUESTS_KEY)
    if (!raw) return cloneSeed()
    const parsed = JSON.parse(raw) as RequestItem[]
    return Array.isArray(parsed) ? parsed : cloneSeed()
  } catch {
    return cloneSeed()
  }
}

export function saveDemoRequests(requests: RequestItem[]) {
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests))
}

export function createDemoRequest(request: RequestItem) {
  const requests = getDemoRequests()
  saveDemoRequests([request, ...requests.filter((item) => item.id !== request.id)])
  appendDemoTimeline({
    id: `${request.id}-created-${Date.now()}`,
    requestId: request.id,
    type: "CREATED",
    authorEmail: request.requesterEmail,
    authorName: request.requesterName,
    createdAt: request.createdAt,
    comment: "Solicitud ingresada en DITO.",
  })
}

export function updateDemoRequest(id: string, patch: Partial<RequestItem>) {
  const requests = getDemoRequests().map((request) =>
    request.id === id ? { ...request, ...patch } : request
  )
  saveDemoRequests(requests)
}

export function getDemoTimeline(requestId: string): RequestTimelineItem[] {
  try {
    const raw = localStorage.getItem(TIMELINE_KEY)
    const items = raw
      ? (JSON.parse(raw) as RequestTimelineItem[])
      : (JSON.parse(JSON.stringify(mockRequestTimeline)) as RequestTimelineItem[])
    return items
      .filter((item) => item.requestId === requestId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch {
    return mockRequestTimeline
      .filter((item) => item.requestId === requestId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
}

export function appendDemoTimeline(item: RequestTimelineItem) {
  let items: RequestTimelineItem[] = JSON.parse(JSON.stringify(mockRequestTimeline))
  try {
    const raw = localStorage.getItem(TIMELINE_KEY)
    if (raw) items = JSON.parse(raw) as RequestTimelineItem[]
  } catch {
    items = JSON.parse(JSON.stringify(mockRequestTimeline))
  }
  localStorage.setItem(TIMELINE_KEY, JSON.stringify([item, ...items]))
}

export function resetDemoRequests() {
  localStorage.removeItem(REQUESTS_KEY)
  localStorage.removeItem(TIMELINE_KEY)
}

export function nextDemoRequestId() {
  const max = getDemoRequests().reduce((current, request) => {
    const value = Number(request.id.replace(/\D/g, ""))
    return Number.isFinite(value) ? Math.max(current, value) : current
  }, 0)
  return `SOL-${String(max + 1).padStart(3, "0")}`
}
