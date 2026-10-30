// Datos de "Gestión de Showroom": solicitudes de procesos de Experiencia y lo que le toca a la persona.
import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import type { RequestItem, UserScope } from "../types"
import { listRequests } from "./requestRepository"
import { getRequestPermissions } from "./permissions"
import { getAllRequestAssignments, isExperienceProcess } from "./requestCatalog"

const norm = (value?: string) => (value ?? "").trim().toLowerCase()

export type ShowroomTask = { request: RequestItem; action: string }

export function showroomTasks(user: UserScope, requests: RequestItem[]): ShowroomTask[] {
  const assignments = getAllRequestAssignments()
  const tasks: ShowroomTask[] = []
  for (const request of requests) {
    if (!isExperienceProcess(request.processCode)) continue
    const p = getRequestPermissions(user, request, assignments)
    if (!p.canView) continue
    const mine = norm(request.requesterEmail) === norm(user.email)
    if (request.status === "RECIBIDA" && p.canManage) tasks.push({ request, action: "Tomar gestión" })
    else if (request.status === "PENDIENTE_APROBACION" && p.canApprove) tasks.push({ request, action: request.approvalContext === "JEFATURA_LOCAL" ? "Revisar y aprobar" : "Aprobar" })
    else if (request.status === "INFORMACION_REQUERIDA" && mine) tasks.push({ request, action: "Completar información" })
    else if (request.status === "RESUELTA_POR_CONFIRMAR" && p.canConfirmResolution) tasks.push({ request, action: "Confirmar resolución" })
  }
  return tasks
}

export function useShowroomRequests(user?: UserScope) {
  const [requests, setRequests] = useState<RequestItem[] | null>(null)
  const { pathname } = useLocation()
  useEffect(() => {
    if (!user) return
    let active = true
    listRequests(user)
      .then((items) => { if (active) setRequests(items.filter((r) => isExperienceProcess(r.processCode))) })
      .catch(() => { if (active) setRequests([]) })
    return () => { active = false }
  }, [user?.email, user?.role, pathname])
  return requests
}
