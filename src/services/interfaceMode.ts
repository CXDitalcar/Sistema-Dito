// Interfaces separadas por tema, con su propio link y el mismo ingreso/usuarios.
// Al entrar por su ruta (o por un dominio propio que empiece con su nombre), la pestaña
// queda en esa interfaz hasta salir con "Ir a DITO".
export type InterfaceId = "showroom" | "academia" | "contabilidad"

export const INTERFACES: Record<InterfaceId, { name: string; description: string; home: string; host: RegExp }> = {
  showroom: {
    name: "Gestión de Showroom",
    description: "Solicitudes de experiencia del local y Ruta de Experiencia.",
    home: "/showroom",
    host: /^showroom\./i,
  },
  academia: {
    name: "Academia DITALCAR",
    description: "Cursos, modelo CONSULTA y material para tu día a día.",
    home: "/academia-ditalcar",
    host: /^academia\./i,
  },
  contabilidad: {
    name: "Contabilidad",
    description: "Listas de precio de marca, bonos por cobrar por NV y seguimiento de ventas.",
    home: "/contabilidad",
    host: /^(contabilidad|adm|administracion)\./i,
  },
}

const KEY = "ditalapp-interfaz"
const IDS = Object.keys(INTERFACES) as InterfaceId[]

export function currentInterface(): InterfaceId | null {
  const path = window.location.pathname
  const byHost = IDS.find((id) => INTERFACES[id].host.test(window.location.hostname))
  if (byHost) return byHost
  const byPath = IDS.find((id) => path === INTERFACES[id].home || path.startsWith(`${INTERFACES[id].home}/`))
  try {
    if (byPath) {
      sessionStorage.setItem(KEY, byPath)
      return byPath
    }
    const stored = sessionStorage.getItem(KEY) as InterfaceId | null
    return stored && IDS.includes(stored) ? stored : null
  } catch {
    return byPath ?? null
  }
}

export function leaveInterface() {
  try { sessionStorage.removeItem(KEY) } catch { /* sin almacenamiento */ }
  // Desde un dominio propio se vuelve al dominio principal de DitalApp si está configurado.
  const main = import.meta.env.VITE_MAIN_APP_URL as string | undefined
  if (IDS.some((id) => INTERFACES[id].host.test(window.location.hostname)) && main) window.location.assign(main)
  else window.location.assign("/")
}

// Entra a una interfaz desde otra (por ejemplo, de Contabilidad a Showroom) y abre la ruta indicada.
export function enterInterface(id: InterfaceId, path: string) {
  try { sessionStorage.setItem(KEY, id) } catch { /* sin almacenamiento */ }
  window.location.assign(path)
}
