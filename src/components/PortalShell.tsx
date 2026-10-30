import { useEffect, useRef, useState, type ReactNode } from "react"
import { ArrowLeft, Bell, ChevronDown, LogOut, UserRound } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import Brand from "./Brand"
import PilotFeedback from "./PilotFeedback"
import { formatRole, getInitials } from "./Shell"
import { useNavBadges } from "../services/navBadges"
import type { UserScope } from "../types"
import { userLocalList } from "../services/userLocals"
import "./PortalShell.css"
import "./ditalcar-theme.css"

// Marco sin menú lateral para todos los perfiles que no son Experiencia/PM:
// barra superior con Avisos, Mi cuenta y Salir; dentro de cada pantalla, "Volver al inicio".
type Props = {
  children?: ReactNode
  currentUser?: UserScope
  authenticatedUser?: UserScope
  onLogout?: () => void | Promise<void>
  viewAsOptions?: UserScope[]
  viewAsEmail?: string
  onViewAs?: (email: string) => void
  showPilotFeedback?: boolean
  // compatibilidad con Shell
  userName?: string
  branch?: string
  demoMode?: boolean
  showGestion?: boolean
  // Interfaz separada (por ejemplo "Gestión de Showroom")
  homePath?: string
  productName?: string
  avisosOverride?: number
  // Interfaz Academia: el aviso cuenta solo cursos y evaluaciones pendientes (se actualiza al avanzar).
  avisosKey?: "academia"
  onLeave?: () => void
}

export default function PortalShell({ children, currentUser, authenticatedUser, onLogout, viewAsOptions, viewAsEmail, onViewAs, showPilotFeedback, homePath = "/", productName, avisosOverride, avisosKey, onLeave }: Props) {
  const { pathname } = useLocation()
  const badges = useNavBadges(currentUser)
  const [accountOpen, setAccountOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const atHome = pathname === homePath
  // En este inicio, "Para hoy" incluye los cursos y evaluaciones asignados: el aviso suma ambos.
  const avisos = avisosKey === "academia" ? badges.academia : avisosOverride ?? badges.inicio + badges.academia
  const viewingAs = Boolean(authenticatedUser && currentUser && authenticatedUser.email !== currentUser.email)

  useEffect(() => { setAccountOpen(false); window.scrollTo(0, 0) }, [pathname])
  useEffect(() => {
    if (!accountOpen) return
    const close = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) setAccountOpen(false) }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [accountOpen])

  return (
    <div className={`portal-shell ${productName ? "theme-ditalcar" : ""}`}>
      {viewAsOptions && onViewAs && (
        <div className="portal-viewas">
          <span>{viewingAs ? `Estás viendo DITO como ${currentUser?.name} · ${formatRole(currentUser!.role)}` : "Vista de prueba"}</span>
          <select value={viewAsEmail ?? authenticatedUser?.email ?? ""} onChange={(e) => onViewAs(e.target.value)} aria-label="Ver como">
            {authenticatedUser && <option value={authenticatedUser.email}>Volver a mi perfil</option>}
            {viewAsOptions.filter((u) => u.email !== authenticatedUser?.email).map((u) => (
              <option key={`${u.role}-${u.email}`} value={u.email}>{formatRole(u.role)} · {u.name}</option>
            ))}
          </select>
        </div>
      )}

      <header className="portal-topbar">
        <div className="portal-topbar-inner">
          {atHome ? (
            <Link to={homePath} className="portal-brand" aria-label={`Inicio ${productName ?? "DITO"}`}>
              {productName ? <ProductBrand name={productName} /> : <Brand />}
            </Link>
          ) : (
            <Link to={homePath} className="portal-back"><ArrowLeft size={18} /> <span>{productName ?? "Inicio"}</span></Link>
          )}

          <nav className="portal-actions" aria-label="Cuenta">
            <Link to={`${homePath}#para-hoy`} className="portal-action" aria-label={avisos ? `Avisos: ${avisos} pendientes` : "Avisos"}>
              <Bell size={18} />
              <span className="portal-action-label">Avisos</span>
              {avisos > 0 && <b className="portal-count">{avisos}</b>}
            </Link>

            <div className="portal-account" ref={menuRef}>
              <button type="button" className="portal-action" aria-expanded={accountOpen} aria-haspopup="menu" onClick={() => setAccountOpen((v) => !v)}>
                <span className="portal-avatar">{getInitials(currentUser?.name ?? "")}</span>
                <span className="portal-action-label">Mi cuenta</span>
                <ChevronDown size={15} />
              </button>
              {accountOpen && (
                <div className="portal-account-menu" role="menu">
                  <div className="portal-account-card">
                    <UserRound size={18} />
                    <div>
                      <strong>{currentUser?.name}</strong>
                      <span>{currentUser ? formatRole(currentUser.role) : ""}</span>
                      {currentUser && userLocalList(currentUser).length > 0 && <small>{userLocalList(currentUser).join(" · ")}</small>}
                    </div>
                  </div>
                  {onLeave && (
                    <button type="button" role="menuitem" className="portal-logout" onClick={onLeave}>
                      Ir a DITO
                    </button>
                  )}
                  {onLogout && (
                    <button type="button" role="menuitem" className="portal-logout" onClick={() => void onLogout()}>
                      <LogOut size={16} /> Salir
                    </button>
                  )}
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="portal-main">{children}</main>

      {showPilotFeedback && currentUser && <PilotFeedback currentUser={currentUser} />}
    </div>
  )
}

function ProductBrand({ name }: { name: string }) {
  return (
    <div className="portal-product-brand">
      <img src="/assets/logo-sin-slogan.png" alt="Ditalcar" />
      <span aria-hidden="true" />
      <strong>{name}</strong>
    </div>
  )
}
