import { Link } from "react-router-dom"
import {
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  Database,
  ShieldCheck,
  UsersRound,
  Archive,
  type LucideIcon,
} from "lucide-react"
import SignalLight, { type SignalTone } from "../components/SignalLight"
import "./Gestion.css"

// ======================================================
// GESTIÓN · punto de entrada único a las herramientas administrativas.
// La visibilidad de cada acceso se calcula en App.tsx con los mismos
// permisos que protegen cada ruta; aquí sólo se muestran.
// ======================================================

type GestionProps = {
  showApprovals: boolean
  showRequests: boolean
  showKpi: boolean
  showForms: boolean
  // Usuarios y fuentes de datos: sólo con el perfil REAL de Experiencia
  // (no se habilita con "Ver como"). El backend también lo valida.
  showAdmin: boolean
  // Interruptor, respaldo y vaciado: solo los 3 administradores de DITO.
  showDitoAdmin?: boolean
}

type GestionItem = {
  key: string
  title: string
  description: string
  to?: string
  icon: LucideIcon
  tone: SignalTone
  status: string
}

export default function Gestion({
  showApprovals,
  showRequests,
  showKpi,
  showForms,
  showAdmin,
  showDitoAdmin = false,
}: GestionProps) {
  const operation: GestionItem[] = [
    showApprovals && {
      key: "approvals",
      title: "Bandeja de gestión",
      description: "Solicitudes que esperan tu aprobación, toma o respuesta.",
      to: "/aprobaciones",
      icon: ShieldCheck,
      tone: "green" as SignalTone,
      status: "Disponible",
    },
    showRequests && {
      key: "requests",
      title: "Solicitudes",
      description: "Seguimiento de las solicitudes que ingresaste o que involucran a tu local.",
      to: "/solicitudes",
      icon: ClipboardList,
      tone: "green" as SignalTone,
      status: "Disponible",
    },
    showForms && {
      key: "forms",
      title: "Formularios",
      description: "Ruta de Experiencia y auditorías. Cuando tengas uno pendiente, también aparece en Inicio.",
      to: "/formularios",
      icon: ClipboardCheck,
      tone: "green" as SignalTone,
      status: "Disponible",
    },
    showKpi && {
      key: "kpi",
      title: "KPI",
      description: "Indicadores comerciales del archivo Dashboard y, más adelante, Experiencia · Estándares.",
      to: "/kpi",
      icon: BarChart3,
      tone: "green" as SignalTone,
      status: "Disponible",
    },
  ].filter(Boolean) as GestionItem[]

  const administration: GestionItem[] = showAdmin
    ? [
        {
          key: "users",
          title: "Usuarios",
          description: "Directorio, perfiles y fuente de usuarios (02_Usuarios o Excel temporal).",
          to: "/usuarios",
          icon: UsersRound,
          tone: "green",
          status: "Disponible",
        },
        {
          key: "datos",
          title: "Datos",
          description: "Carga de planillas (SIGA, Control, T, Frogmi, extranet Gespark, listas de precios…), Gespark y enlace de Recursos de Academia.",
          to: "/datos",
          icon: Database,
          tone: "green",
          status: "Disponible",
        },
        {
          key: "frogmi",
          title: "Frogmi",
          description: "Medición junior según notificados, Entrega, Tour Manager, cruces de VIN por aprobar y locales activos.",
          to: "/frogmi",
          icon: ClipboardList,
          tone: "green",
          status: "Disponible",
        },
      ]
    : []

  if (showDitoAdmin) {
    administration.push({
      key: "dito-admin",
      title: "Administración de DITO",
      description: "Interruptor de implementación de la Ruta, respaldo y vaciado del detalle, evolutivos anteriores.",
      to: "/dito-admin",
      icon: Archive,
      tone: "green",
      status: "Solo administradores",
    })
  }

  return (
    <div className="gestion-page">
      <header className="gestion-head">
        <span className="eyebrow">GESTIÓN</span>
        <h1>Herramientas de gestión</h1>
        <p>Solicitudes, formularios, indicadores y administración en un solo lugar.</p>
      </header>

      {operation.length > 0 && (
        <section className="gestion-section">
          <h2>Operación</h2>
          <div className="gestion-grid">
            {operation.map((item) => (
              <GestionCard key={item.key} item={item} />
            ))}
          </div>
        </section>
      )}

      {administration.length > 0 && (
        <section className="gestion-section">
          <h2>Administración</h2>
          <div className="gestion-grid">
            {administration.map((item) => (
              <GestionCard key={item.key} item={item} />
            ))}
          </div>
        </section>
      )}

      {operation.length === 0 && administration.length === 0 && (
        <div className="gestion-empty">
          Tu perfil todavía no tiene herramientas de gestión habilitadas.
        </div>
      )}
    </div>
  )
}

function GestionCard({ item }: { item: GestionItem }) {
  const Icon = item.icon
  const content = (
    <>
      <div className="gestion-card-top">
        <span className="gestion-card-icon">
          <Icon size={22} strokeWidth={1.9} />
        </span>
        <span className="gestion-card-status">
          <SignalLight tone={item.tone} compact />
          {item.status}
        </span>
      </div>
      <h3>{item.title}</h3>
      <p>{item.description}</p>
      {item.to && (
        <span className="gestion-card-link">
          Abrir <ArrowRight size={16} />
        </span>
      )}
    </>
  )

  return item.to ? (
    <Link className="gestion-card" to={item.to}>
      {content}
    </Link>
  ) : (
    <article className="gestion-card gestion-card-disabled" aria-disabled="true">
      {content}
    </article>
  )
}
