import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  ArrowRight, ArrowUpRight, BarChart3, BookOpen, Building2, Car, CheckCircle2, ClipboardCheck,
  ClipboardList, ExternalLink, Inbox, MessagesSquare, Route as RouteIcon, type LucideIcon,
} from "lucide-react"
import SeguimientoPendientes from "../components/SeguimientoPendientes"
import { listRequests } from "../services/requestRepository"
import { computeHomeActivities } from "../services/homeActivities"
import { useNavBadges } from "../services/navBadges"
import { getPortalConfig, resolvePortalCards, type PortalCard, type PortalOverride, type PortalPermissions } from "../services/portalAccess"
import type { RequestItem, UserScope } from "../types"
import { userLocalList } from "../services/userLocals"
import "./Portal.css"

const ICONS: Record<PortalCard["icon"], LucideIcon> = {
  kpi: BarChart3, ventas: Car, seguimiento: MessagesSquare, frogmi: ClipboardList, local: Building2,
  solicitudes: ClipboardCheck, bandeja: Inbox, academia: BookOpen, ruta: RouteIcon, externo: ExternalLink,
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches"
}

// Inicio por tarjetas (perfiles distintos de Experiencia/PM): lo de hoy, tableros y accesos.
export default function Portal({ currentUser, permissions }: { currentUser: UserScope; permissions: PortalPermissions }) {
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [overrides, setOverrides] = useState<PortalOverride[]>([])
  const [showAll, setShowAll] = useState(false)
  const badges = useNavBadges(currentUser)
  const { hash } = useLocation()

  useEffect(() => {
    let active = true
    listRequests(currentUser).then((items) => { if (active) setRequests(items) }).catch(() => undefined)
    getPortalConfig().then((config) => { if (active) setOverrides(config.items || []) })
    return () => { active = false }
  }, [currentUser.email, currentUser.role])

  useEffect(() => {
    if (hash === "#para-hoy") document.getElementById("para-hoy")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [hash])

  const home = useMemo(() => computeHomeActivities(currentUser, requests), [currentUser, requests])
  const todo = [...home.needsAction.filter((item) => !item.id.startsWith("sugerida-")), ...home.pendingItems]
  const suggested = home.needsAction.filter((item) => item.id.startsWith("sugerida-")).slice(0, 3)
  const cards = resolvePortalCards(currentUser, permissions, overrides)
  const tableros = cards.filter((c) => c.seccion === "TABLEROS")
  const accesos = cards.filter((c) => c.seccion === "ACCESOS")
  const firstName = currentUser.name.split(" ")[0] || currentUser.name

  const badgeFor = (card: PortalCard): string => {
    if (!card.badge) return ""
    const value = badges[card.badge]
    if (typeof value === "boolean") return value ? "Nuevo" : ""
    if (!value) return ""
    const labels: Record<string, string> = {
      solicitudes: "en curso", bandeja: "por revisar", academia: "pendientes", seguimiento: "por atender", frogmi: "VIN con formularios faltantes",
    }
    return `${value} ${labels[card.badge] ?? ""}`.trim()
  }

  return (
    <div className="portal-page">
      <section className="portal-hello">
        <h1>{greeting()}, {firstName}</h1>
        <p>{userLocalList(currentUser).length ? `${userLocalList(currentUser).join(" · ")} · ` : ""}Aquí tienes lo de hoy, tus tableros y tus accesos.</p>
      </section>

      <section id="para-hoy" className="portal-today" aria-labelledby="para-hoy-title">
        <div className="portal-section-head">
          <h2 id="para-hoy-title">Para hoy</h2>
          {todo.length > 0 && <span className="portal-pill">{todo.length}</span>}
        </div>
        <SeguimientoPendientes currentUser={currentUser} />
        {todo.length === 0 ? (
          <div className="portal-empty"><CheckCircle2 size={18} /> Nada pendiente por ahora.</div>
        ) : (
          <ul className="portal-todo">
            {(showAll ? todo : todo.slice(0, 4)).map((item) => (
              <li key={item.id}>
                <Link to={item.to}>
                  <span className="portal-todo-dot" aria-hidden="true" />
                  <span className="portal-todo-text"><strong>{item.title}</strong><small>{item.detail}</small></span>
                  <ArrowRight size={16} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {todo.length > 4 && (
          <button type="button" className="portal-more" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Ver menos" : `Ver los ${todo.length}`}
          </button>
        )}
      </section>

      {tableros.length > 0 && (
        <section className="portal-section" aria-labelledby="tableros-title">
          <div className="portal-section-head">
            <h2 id="tableros-title">Tus tableros</h2>
            <p>Para ver cómo vas.</p>
          </div>
          <div className="portal-grid">
            {tableros.map((card) => <PortalTile key={card.id} card={card} badge={badgeFor(card)} />)}
          </div>
        </section>
      )}

      {accesos.length > 0 && (
        <section className="portal-section" aria-labelledby="accesos-title">
          <div className="portal-section-head">
            <h2 id="accesos-title">Tus accesos</h2>
            <p>Para hacer tus gestiones y entrar a los otros sistemas.</p>
          </div>
          <div className="portal-grid">
            {accesos.map((card) => (
              <PortalTile key={card.id} card={card} badge={badgeFor(card)}>
                {card.id === "solicitudes" && suggested.length > 0 && (
                  <div className="portal-quick">
                    <span>Pedir rápido</span>
                    {suggested.map((item) => (
                      <Link key={item.id} to={item.to}>{item.title.replace(/^Solicitar · /, "")}</Link>
                    ))}
                  </div>
                )}
              </PortalTile>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function PortalTile({ card, badge, children }: { card: PortalCard; badge: string; children?: ReactNode }) {
  const Icon = ICONS[card.icon] ?? ExternalLink
  const body = (
    <>
      <span className="portal-tile-icon"><Icon size={22} /></span>
      <span className="portal-tile-text">
        <strong>{card.nombre}</strong>
        <span>{card.descripcion}</span>
        {badge && <b className="portal-tile-badge">{badge}</b>}
      </span>
      {card.external ? <ArrowUpRight size={18} className="portal-tile-arrow" aria-label="Se abre en otra pestaña" /> : <ArrowRight size={18} className="portal-tile-arrow" />}
    </>
  )
  return (
    <article className={`portal-tile ${badge ? "has-badge" : ""}`}>
      {card.external ? (
        <a href={card.url} target="_blank" rel="noopener noreferrer" className="portal-tile-link">{body}</a>
      ) : (
        <Link to={card.url} className="portal-tile-link">{body}</Link>
      )}
      {card.external && <small className="portal-tile-note">Se abre en otra pestaña</small>}
      {children}
    </article>
  )
}
