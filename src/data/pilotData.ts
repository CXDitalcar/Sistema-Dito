import type { UserScope } from "../types"
import { hasExperienceAccess } from "../services/experienceAccess"

export type KPIState = "OK" | "WATCH" | "ALERT"

export type KPIItem = {
  id: string
  label: string
  value: number
  unit: "%" | "count"
  target?: number
  note: string
  state: KPIState
}

export type PilotLocal = {
  name: string
  zone: string
  operation: "GENERAL" | "GEELY" | "STELLANTIS"
  brands: string[]
  kpis: KPIItem[]
}

export const networkKPIs: KPIItem[] = [
  { id: "ruta", label: "Ruta realizada", value: 91, unit: "%", target: 95, note: "Realización semanal de la Ruta de Experiencia.", state: "WATCH" },
  { id: "exactitud", label: "Exactitud de revisión", value: 88, unit: "%", target: 90, note: "Coincidencia entre revisión del local y auditoría interna.", state: "WATCH" },
  { id: "consulta", label: "Avance CONSULTA", value: 72, unit: "%", target: 80, note: "Adopción del modelo de atención consultiva.", state: "WATCH" },
  { id: "sla", label: "Solicitudes a tiempo", value: 84, unit: "%", target: 90, note: "Solicitudes gestionadas dentro del plazo vigente.", state: "ALERT" },
]

export const pilotLocals: PilotLocal[] = [
  {
    name: "Stellantis Nueva Tobalaba",
    zone: "Santiago",
    operation: "STELLANTIS",
    brands: ["Jeep", "RAM", "Fiat"],
    kpis: [
      { id: "ruta", label: "Ruta realizada", value: 100, unit: "%", target: 100, note: "Ruta semanal del piloto Stellantis Nueva Tobalaba.", state: "OK" },
      { id: "exactitud", label: "Exactitud de revisión", value: 90, unit: "%", target: 90, note: "Dato demostrativo hasta conectar resultados reales.", state: "OK" },
      { id: "estandares", label: "Cumplimiento estándares", value: 88, unit: "%", target: 90, note: "Dato demostrativo para validar la vista del piloto.", state: "WATCH" },
      { id: "consulta", label: "Avance CONSULTA", value: 75, unit: "%", target: 80, note: "Dato demostrativo para validar la vista del piloto.", state: "WATCH" },
      { id: "sla", label: "Solicitudes a tiempo", value: 90, unit: "%", target: 90, note: "Seguimiento de solicitudes del piloto.", state: "OK" },
      { id: "brechas", label: "Brechas abiertas", value: 3, unit: "count", note: "Brechas de ejemplo asociadas a la Ruta de Experiencia.", state: "WATCH" },
    ],
  },
  {
    name: "Vespucio",
    zone: "Santiago",
    operation: "GENERAL",
    brands: ["Chery", "Renault"],
    kpis: [
      { id: "ruta", label: "Ruta realizada", value: 100, unit: "%", target: 100, note: "Ruta semanal completada.", state: "OK" },
      { id: "exactitud", label: "Exactitud de revisión", value: 92, unit: "%", target: 90, note: "Última comparación con auditoría.", state: "OK" },
      { id: "estandares", label: "Cumplimiento estándares", value: 86, unit: "%", target: 90, note: "Cumplimiento de ítems revisados.", state: "WATCH" },
      { id: "consulta", label: "Avance CONSULTA", value: 78, unit: "%", target: 80, note: "Adopción del modelo consultivo.", state: "WATCH" },
      { id: "sla", label: "Solicitudes a tiempo", value: 90, unit: "%", target: 90, note: "Gestiones cerradas dentro de plazo.", state: "OK" },
      { id: "brechas", label: "Brechas abiertas", value: 2, unit: "count", note: "Brechas activas de la última Ruta.", state: "WATCH" },
    ],
  },
  {
    name: "Geely Tobalaba",
    zone: "Santiago",
    operation: "GEELY",
    brands: ["Geely"],
    kpis: [
      { id: "ruta", label: "Ruta realizada", value: 100, unit: "%", target: 100, note: "Ruta semanal completada.", state: "OK" },
      { id: "exactitud", label: "Exactitud de revisión", value: 89, unit: "%", target: 90, note: "Comparación con auditoría.", state: "WATCH" },
      { id: "estandares", label: "Cumplimiento estándares", value: 91, unit: "%", target: 90, note: "Cumplimiento de ítems revisados.", state: "OK" },
      { id: "sla", label: "Solicitudes a tiempo", value: 87, unit: "%", target: 90, note: "Gestiones dentro de plazo.", state: "WATCH" },
    ],
  },
  {
    name: "Stellantis Costanera",
    zone: "Santiago",
    operation: "STELLANTIS",
    brands: ["Peugeot", "Citroën", "Leapmotor"],
    kpis: [
      { id: "ruta", label: "Ruta realizada", value: 100, unit: "%", target: 100, note: "Ruta semanal completada.", state: "OK" },
      { id: "exactitud", label: "Exactitud de revisión", value: 86, unit: "%", target: 90, note: "Comparación con auditoría.", state: "WATCH" },
      { id: "estandares", label: "Cumplimiento estándares", value: 88, unit: "%", target: 90, note: "Cumplimiento de ítems revisados.", state: "WATCH" },
      { id: "sla", label: "Solicitudes a tiempo", value: 82, unit: "%", target: 90, note: "Gestiones dentro de plazo.", state: "ALERT" },
    ],
  },
  {
    name: "Cantagallo",
    zone: "Santiago",
    operation: "GENERAL",
    brands: ["Chery", "JMC", "Mitsubishi"],
    kpis: [
      { id: "ruta", label: "Ruta realizada", value: 100, unit: "%", target: 100, note: "Ruta semanal completada.", state: "OK" },
      { id: "exactitud", label: "Exactitud de revisión", value: 94, unit: "%", target: 90, note: "Comparación con auditoría.", state: "OK" },
      { id: "estandares", label: "Cumplimiento estándares", value: 93, unit: "%", target: 90, note: "Cumplimiento de ítems revisados.", state: "OK" },
      { id: "sla", label: "Solicitudes a tiempo", value: 92, unit: "%", target: 90, note: "Gestiones dentro de plazo.", state: "OK" },
    ],
  },
]

export const pilotFlow = {
  localApprovalHours: 24,
  managerAcceptanceHours: 24,
  resolutionConfirmationHours: 48,
  budgetApproverRole: "GERENCIA_COMERCIAL" as const,
  infrastructureFinalApproverRole: "GERENCIA_COMERCIAL" as const,
}

export function getPilotLocal(name?: string) {
  if (!name) return undefined
  return pilotLocals.find((local) => local.name.toLowerCase() === name.toLowerCase())
}

export function getVisiblePilotLocals(user: UserScope) {
  if (user.role === "GERENCIA_VENTAS" || user.role === "GERENCIA_GENERAL" || user.role === "GERENCIA_COMERCIAL" || user.role === "JEFATURA_COMERCIAL_CLIENTES" || hasExperienceAccess(user)) {
    return pilotLocals
  }

  if (user.role === "GERENCIA_MARCA") {
    const assigned = new Set(
      (user.assignedLocals ?? []).map((local) => local.toLowerCase())
    )
    if (assigned.size) {
      return pilotLocals.filter((local) => assigned.has(local.name.toLowerCase()))
    }

    const brands = new Set(
      (user.brands ?? []).map((brand) => brand.toLowerCase())
    )
    if (brands.size) {
      return pilotLocals.filter((local) =>
        local.brands.some((brand) => brands.has(brand.toLowerCase()))
      )
    }

    return []
  }

  if (user.role === "JEFATURA_MARCA") {
    return pilotLocals.filter((local) => local.operation === "GEELY")
  }

  if (user.role === "JEFATURA_ZONAL") {
    return pilotLocals.filter((local) => local.operation !== "GEELY" && local.operation !== "STELLANTIS")
  }

  if (user.local) {
    return pilotLocals.filter((local) => local.name === user.local)
  }

  return []
}
