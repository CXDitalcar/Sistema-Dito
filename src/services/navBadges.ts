// Avisos del menú lateral (números o "Nuevo"):
// - Inicio: solo si hay pendientes (acciones por hacer, pendientes abiertos y avisos del Seguimiento).
// - Academia: solo si hay cursos o evaluaciones asignados pendientes.
// - Mi local: cuando llega una Ruta o Auditoría nueva desde la última visita.
// - Seguimiento: contactos por enviar, reintentar o revisar (solo quien hace el seguimiento).
import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import type { UserScope } from "../types"
import { listRequests } from "./requestRepository"
import { getPendientes } from "./seguimientoApi"
import { getFrogmi } from "./opsApi"
import { getRouteMetrics } from "./routeExperienceApi"
import { canSeeSeguimiento } from "./experienceAccess"
import { canAccessPilotModule } from "../data/pilotStellantis"
import { academyPendingCount, computeHomeActivities, miLocalLastSeen } from "./homeActivities"

export type NavBadges = { inicio: number; academia: number; miLocal: boolean; seguimiento: number; solicitudes: number; bandeja: number; frogmi: number; ruta: number }
const EMPTY: NavBadges = { inicio: 0, academia: 0, miLocal: false, seguimiento: 0, solicitudes: 0, bandeja: 0, frogmi: 0, ruta: 0 }

async function safe<T>(promise: Promise<T>): Promise<T | null> {
  try { return await promise } catch { return null }
}

export async function loadNavBadges(user: UserScope): Promise<NavBadges> {
  const viewAs = user.testingView ? user : null
  const fullSeg = canSeeSeguimiento(user)
  const [requests, pend, frogmi, metrics] = await Promise.all([
    safe(listRequests(user)),
    safe(getPendientes(viewAs)),
    user.role === "ASISTENTE_JUNIOR" && !user.testingView ? safe(getFrogmi()) : Promise.resolve(null),
    user.local && canAccessPilotModule(user, "MI_LOCAL") ? safe(getRouteMetrics(user.local)) : Promise.resolve(null),
  ])

  const home = computeHomeActivities(user, requests ?? [])
  let inicio = home.badgeCount
  if (pend) inicio += pend.entregas.length + pend.derivaciones.length + pend.reclamos.length + pend.ayuda.length
  const frogmiCount = frogmi ? frogmi.rows.filter((r) => r.activo && !r.exclusion && frogmi.forms.some((f) => !r.forms[f.key])).length : 0
  inicio += frogmiCount

  const c = pend?.contactos
  const seguimiento = fullSeg && c ? c.enviar + c.reintentar + c.revisar : 0

  const latest = metrics?.latest ? [metrics.latest.routeDate, metrics.latest.auditDate].filter(Boolean).sort().pop() || "" : ""
  const seen = miLocalLastSeen(user.email)
  const miLocal = Boolean(latest && (!seen || latest > seen))

  // En el inicio por tarjetas, Seguimiento muestra lo que el ejecutivo debe hacer (confirmar entregas, derivaciones, reclamos).
  const seguimientoPropio = pend ? pend.entregas.length + pend.derivaciones.length + pend.reclamos.length + pend.ayuda.length : 0
  return {
    inicio, academia: academyPendingCount(user), miLocal,
    seguimiento: fullSeg ? seguimiento : seguimientoPropio,
    solicitudes: home.solicitudesCount, bandeja: home.bandejaCount, frogmi: frogmiCount, ruta: 0,
  }
}

export function useNavBadges(user?: UserScope): NavBadges {
  const [badges, setBadges] = useState<NavBadges>(EMPTY)
  const { pathname } = useLocation()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    window.addEventListener("ditalapp-badges", bump)
    const timer = window.setInterval(bump, 180_000)
    return () => { window.removeEventListener("ditalapp-badges", bump); window.clearInterval(timer) }
  }, [])

  useEffect(() => {
    if (!user) return
    let active = true
    loadNavBadges(user).then((value) => { if (active) setBadges(value) }).catch(() => undefined)
    return () => { active = false }
  }, [user?.email, user?.role, user?.local, user?.testingView, pathname, tick])

  return user ? badges : EMPTY
}
