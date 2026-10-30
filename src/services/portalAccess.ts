// Inicio para todos los perfiles que no son Experiencia/PM: solo "Tus tableros" y
// "Tus accesos". Cada tarjeta tiene valores por defecto; Experiencia puede cambiar
// nombre, descripción, enlace (por ejemplo, a una interfaz separada) o desactivarla,
// y agregar accesos a otros sistemas (Gestión › Datos › Accesos del inicio).
import type { UserScope } from "../types"
import { canAccessContabilidad } from "./contabilidadAccess"
import { isDitoAdminUser } from "./ditoAccess"

export type PortalSection = "TABLEROS" | "ACCESOS"
export type BadgeKey = "solicitudes" | "bandeja" | "academia" | "seguimiento" | "miLocal" | "frogmi" | "ruta"

export type PortalPermissions = {
  kpi: boolean
  miLocal: boolean
  solicitudes: boolean
  bandeja: boolean
  academia: boolean
  formularios: boolean
}

export type PortalCardDef = {
  id: string
  seccion: PortalSection
  nombre: string
  descripcion: string
  url: string
  icon: "kpi" | "ventas" | "seguimiento" | "frogmi" | "local" | "solicitudes" | "bandeja" | "academia" | "ruta" | "externo"
  badge?: BadgeKey
  /** Interfaz con link propio: se abre en otra pestaña aunque sea una ruta de la misma app. */
  newTab?: boolean
  visible: (user: UserScope, perms: PortalPermissions) => boolean
}

// Grupos de perfiles para los accesos que agrega Experiencia.
export const ROLE_GROUPS: { id: string; label: string; roles: string[] }[] = [
  { id: "VENTAS", label: "Vendedores", roles: ["VENDEDOR"] },
  { id: "JEFATURAS", label: "Jefaturas de sucursal", roles: ["JEFATURA_LOCAL"] },
  { id: "GERENCIAS", label: "Gerencias y jefaturas de marca", roles: ["GERENCIA_MARCA", "JEFATURA_MARCA", "JEFATURA_ZONAL", "GERENCIA_VENTAS", "GERENCIA_COMERCIAL", "GERENCIA_GENERAL", "GERENCIA_ADMINISTRACION"] },
  { id: "JUNIOR", label: "Asistentes junior", roles: ["ASISTENTE_JUNIOR"] },
  { id: "CASA_MATRIZ", label: "Casa matriz y apoyo", roles: ["ASISTENTE_GERENCIA", "EQUIPO_COMERCIAL", "ADMINISTRATIVO", "JEFATURA_MARKETING", "JEFATURA_OPERACIONES_COMERCIALES", "JEFATURA_ADMINISTRACION", "JEFATURA_COMERCIAL_CLIENTES"] },
]

export function roleGroupsFor(user: UserScope) {
  return ROLE_GROUPS.filter((g) => g.roles.includes(user.role)).map((g) => g.id)
}

const notJunior = (user: UserScope) => user.role !== "ASISTENTE_JUNIOR"

export const DEFAULT_CARDS: PortalCardDef[] = [
  // ---------- Tableros ----------
  { id: "ventas", seccion: "TABLEROS", nombre: "Mis ventas", descripcion: "Dónde va cada NV: VIN, llegada, recepción, factura y entrega.", url: "/ventas", icon: "ventas", visible: () => true },
  { id: "seguimiento", seccion: "TABLEROS", nombre: "Seguimiento de clientes", descripcion: "Cómo avanzan tus clientes en cada etapa, entregas y reclamos.", url: "/seguimiento", icon: "seguimiento", badge: "seguimiento", visible: notJunior },
  { id: "kpi", seccion: "TABLEROS", nombre: "KPI comercial", descripcion: "Ventas, facturación y cumplimiento de la meta.", url: "/kpi", icon: "kpi", visible: (_u, p) => p.kpi },
  { id: "frogmi", seccion: "TABLEROS", nombre: "Frogmi", descripcion: "Formularios de tu local por VIN y cumplimiento del corte.", url: "/frogmi", icon: "frogmi", badge: "frogmi", visible: (u) => u.role === "ASISTENTE_JUNIOR" || u.role === "JEFATURA_LOCAL" },
  { id: "mi-local", seccion: "TABLEROS", nombre: "Mi local", descripcion: "Resultados de la Ruta y la Auditoría de tu sucursal.", url: "/mi-local", icon: "local", badge: "miLocal", visible: (_u, p) => p.miLocal },
  // ---------- Accesos ----------
  { id: "solicitudes", seccion: "ACCESOS", nombre: "Solicitudes", descripcion: "Pide lo que necesitas y revisa en qué va cada solicitud.", url: "/showroom", newTab: true, icon: "solicitudes", badge: "solicitudes", visible: (_u, p) => p.solicitudes },
  { id: "bandeja", seccion: "ACCESOS", nombre: "Por revisar", descripcion: "Solicitudes que esperan tu aprobación o tu gestión.", url: "/aprobaciones", icon: "bandeja", badge: "bandeja", visible: (_u, p) => p.bandeja },
  { id: "academia", seccion: "ACCESOS", nombre: "Academia", descripcion: "Cursos, modelo CONSULTA, playbooks y material de consulta.", url: "/academia-ditalcar", newTab: true, icon: "academia", badge: "academia", visible: (_u, p) => p.academia },
  { id: "contabilidad", seccion: "ACCESOS", nombre: "Contabilidad", descripcion: "Listas de precio de marca, bonos por cobrar y seguimiento de notas de venta.", url: "/contabilidad", newTab: true, icon: "bandeja", visible: (u) => canAccessContabilidad(u) },
  { id: "dito-admin", seccion: "ACCESOS", nombre: "Administración de DITO", descripcion: "Interruptor de la Ruta, respaldo y vaciado, evolutivos anteriores (solo administradores).", url: "/dito-admin", icon: "externo", visible: (u) => isDitoAdminUser(u) },
  { id: "ruta", seccion: "ACCESOS", nombre: "Ruta de Experiencia", descripcion: "Formulario semanal de la sucursal y auditorías.", url: "/formularios", icon: "ruta", badge: "ruta", visible: (_u, p) => p.formularios },
  { id: "seguimiento-comercial", seccion: "ACCESOS", nombre: "Seguimiento Comercial", descripcion: "Ventas, créditos, seguros, tasaciones y leads por local.", url: "https://lolivares284.github.io/seguimiento-comercial/", icon: "externo", visible: notJunior },
]

export type PortalOverride = {
  id: string
  seccion: PortalSection
  nombre?: string
  descripcion?: string
  url?: string
  activo?: boolean
  custom?: boolean
  grupos?: string[]
}

export type PortalCard = Omit<PortalCardDef, "visible"> & { external: boolean }

export async function getPortalConfig(): Promise<{ items: PortalOverride[]; updatedAt?: string }> {
  try {
    const response = await fetch("/api/portal/accesos", { credentials: "include" })
    if (!response.ok) return { items: [] }
    return await response.json()
  } catch {
    return { items: [] }
  }
}

export async function savePortalConfig(items: PortalOverride[]) {
  const response = await fetch("/api/portal/accesos", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.message || `Error ${response.status}`)
  return payload as { items: PortalOverride[]; message: string }
}

export const isExternalUrl = (url: string) => /^https?:\/\//i.test(url)

export function resolvePortalCards(user: UserScope, perms: PortalPermissions, overrides: PortalOverride[]): PortalCard[] {
  const byId = new Map(overrides.map((o) => [o.id, o]))
  const groups = roleGroupsFor(user)
  const cards: PortalCard[] = []
  for (const def of DEFAULT_CARDS) {
    if (!def.visible(user, perms)) continue
    const o = byId.get(def.id)
    if (o?.activo === false) continue
    const url = o?.url || def.url
    const { visible: _visible, ...rest } = def
    cards.push({ ...rest, nombre: o?.nombre || def.nombre, descripcion: o?.descripcion || def.descripcion, url, external: isExternalUrl(url) || Boolean(def.newTab) })
  }
  for (const o of overrides.filter((item) => item.custom && item.activo !== false && item.url)) {
    if (o.grupos?.length && !o.grupos.some((g) => groups.includes(g))) continue
    cards.push({ id: o.id, seccion: o.seccion, nombre: o.nombre || "Acceso", descripcion: o.descripcion || "", url: o.url!, icon: "externo", external: isExternalUrl(o.url!) })
  }
  return cards
}
