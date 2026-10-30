import { useEffect, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  Inbox,
  RefreshCcw,
  Search,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import "./Aprobaciones.css"
import SignalLight, { signalFromRequest } from "../components/SignalLight"
import { listRequests } from "../services/requestRepository"
import { getAllRequestAssignments } from "../services/requestCatalog"
import {
  canApproveRequest,
  canConfirmResolution,
  canManageRequest,
  canViewRequest,
} from "../services/permissions"
import {
  responsibleLabel,
  visibleStatusLabel,
} from "../services/requestPresentation"
import type { RequestItem, UserScope } from "../types"
import { hasExperienceAccess } from "../services/experienceAccess"

type ManagementView =
  | "NUEVAS"
  | "POR_APROBAR"
  | "EN_GESTION"
  | "FALTA_INFO"
  | "POR_CONFIRMAR"
  | "SLA"
  | "TODAS"

export default function Aprobaciones({
  currentUser,
}: {
  currentUser: UserScope
}) {
  const navigate = useNavigate()
  const showSlaTerm = hasExperienceAccess(currentUser)
  const [view, setView] = useState<ManagementView>("NUEVAS")
  const [search, setSearch] = useState("")
  const [localFilter, setLocalFilter] = useState("TODOS")
  const [processFilter, setProcessFilter] = useState("TODOS")
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function load() {
    setLoading(true)
    setError("")
    try {
      setRequests(await listRequests(currentUser))
    } catch (errorValue: any) {
      setError(errorValue?.message ?? "No fue posible cargar la bandeja.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [currentUser.email, currentUser.role])

  const accessible = requests.filter((request) =>
    canViewRequest(currentUser, request, getAllRequestAssignments())
  )

  function matchesView(request: RequestItem, target: ManagementView) {
    const canApprove = canApproveRequest(
      currentUser,
      request,
      getAllRequestAssignments()
    )
    const canManage = canManageRequest(
      currentUser,
      request,
      getAllRequestAssignments()
    )
    const canConfirm = canConfirmResolution(currentUser, request)
    const oversight = [
      "GERENCIA_MARCA",
      "GERENCIA_VENTAS",
      "EXPERIENCIA_CLIENTES", "PROJECT_MANAGER",
    ].includes(currentUser.role)

    if (target === "NUEVAS") {
      return request.status === "RECIBIDA" && (canManage || oversight)
    }

    if (target === "POR_APROBAR") {
      return request.status === "PENDIENTE_APROBACION" && (canApprove || oversight)
    }

    if (target === "EN_GESTION") {
      return request.status === "EN_GESTION" && (canManage || oversight)
    }

    if (target === "FALTA_INFO") {
      return (
        request.status === "INFORMACION_REQUERIDA" &&
        (canManage ||
          canApprove ||
          oversight ||
          request.requesterEmail.toLowerCase() ===
            currentUser.email.toLowerCase() ||
          (currentUser.role === "JEFATURA_LOCAL" &&
            request.local === currentUser.local))
      )
    }

    if (target === "POR_CONFIRMAR") {
      return request.status === "RESUELTA_POR_CONFIRMAR" && (canConfirm || oversight)
    }

    if (target === "SLA") {
      const tone = getSLA(request).tone
      return ["warning", "danger"].includes(tone)
    }

    return true
  }

  const metrics = {
    nuevas: accessible.filter((r) => matchesView(r, "NUEVAS")).length,
    aprobar: accessible.filter((r) => matchesView(r, "POR_APROBAR")).length,
    gestion: accessible.filter((r) => matchesView(r, "EN_GESTION")).length,
    info: accessible.filter((r) => matchesView(r, "FALTA_INFO")).length,
    confirmar: accessible.filter((r) => matchesView(r, "POR_CONFIRMAR")).length,
    sla: accessible.filter((r) => matchesView(r, "SLA")).length,
  }

  const locals = Array.from(
    new Set(accessible.map((request) => request.local))
  ).sort()

  const processes = Array.from(
    new Set(accessible.map((request) => request.processName))
  ).sort()

  const query = search.trim().toLowerCase()

  const filtered = accessible
    .filter((request) => matchesView(request, view))
    .filter((request) =>
      localFilter === "TODOS" ? true : request.local === localFilter
    )
    .filter((request) =>
      processFilter === "TODOS"
        ? true
        : request.processName === processFilter
    )
    .filter((request) => {
      if (!query) return true
      return `${request.id} ${request.processName} ${request.local} ${request.requesterName} ${request.currentResponsibleName ?? ""}`
        .toLowerCase()
        .includes(query)
    })
    .sort(
      (a, b) =>
        getSLA(a).priority - getSLA(b).priority ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

  return (
    <div className="approvals-page">
      <div className="page-head inline">
        <div>
          <div className="eyebrow">SOLICITUDES</div>
          <h1>Bandeja de gestión</h1>
          <p>
            Nuevas, aprobaciones, gestiones, información pendiente y {showSlaTerm ? "SLA" : "plazos"}
            en una sola vista.
          </p>
        </div>
        <button className="secondary-btn" onClick={load} disabled={loading}>
          <RefreshCcw size={16} /> Actualizar
        </button>
      </div>

      {error && (
        <div className="error-box">
          <AlertTriangle size={18} />
          <div>
            <strong>No se pudo cargar la bandeja</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="approval-metrics">
        <Metric label="Nuevas" value={metrics.nuevas} icon={Inbox} active={view === "NUEVAS"} onClick={() => setView("NUEVAS")} />
        <Metric label="Por aprobar" value={metrics.aprobar} icon={Clock3} active={view === "POR_APROBAR"} onClick={() => setView("POR_APROBAR")} />
        <Metric label="En gestión" value={metrics.gestion} icon={Clock3} active={view === "EN_GESTION"} onClick={() => setView("EN_GESTION")} />
        <Metric label="Falta información" value={metrics.info} icon={AlertTriangle} active={view === "FALTA_INFO"} onClick={() => setView("FALTA_INFO")} />
        <Metric label="Por confirmar" value={metrics.confirmar} icon={CheckCircle2} active={view === "POR_CONFIRMAR"} onClick={() => setView("POR_CONFIRMAR")} />
        <Metric label="Por vencer / vencidas" value={metrics.sla} icon={AlertTriangle} tone="danger" active={view === "SLA"} onClick={() => setView("SLA")} />
      </div>

      <div className="approval-tabs">
        {(
          [
            "NUEVAS",
            "POR_APROBAR",
            "EN_GESTION",
            "FALTA_INFO",
            "POR_CONFIRMAR",
            "SLA",
            "TODAS",
          ] as ManagementView[]
        ).map((item) => (
          <button
            key={item}
            className={view === item ? "approval-tab active" : "approval-tab"}
            onClick={() => setView(item)}
          >
            {tabLabel(item, showSlaTerm)}
          </button>
        ))}
      </div>

      <div className="approval-toolbar">
        <div className="approval-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar solicitud, local o solicitante..."
          />
        </div>
        <div className="approval-filter-icon"><Filter size={16} /></div>
        <select value={localFilter} onChange={(event) => setLocalFilter(event.target.value)}>
          <option value="TODOS">Todos los locales</option>
          {locals.map((local) => <option key={local} value={local}>{local}</option>)}
        </select>
        <select value={processFilter} onChange={(event) => setProcessFilter(event.target.value)}>
          <option value="TODOS">Todos los procesos</option>
          {processes.map((process) => <option key={process} value={process}>{process}</option>)}
        </select>
      </div>

      <div className="approval-table-wrap">
        <table className="approval-table">
          <thead>
            <tr>
              <th>Solicitud</th>
              <th>Local</th>
              <th>Solicitante</th>
              <th>Ingresada</th>
              <th>Responsable</th>
              <th>{showSlaTerm ? "SLA" : "Plazo"}</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((request) => (
              <tr
                key={request.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/solicitudes/${request.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") navigate(`/solicitudes/${request.id}`)
                }}
              >
                <td><div className="approval-request-main"><strong>{request.processName}</strong><span>{request.id}{request.isTest ? " · PRUEBA" : ""}</span></div></td>
                <td>{request.local}</td>
                <td>{request.requesterName}</td>
                <td>{new Date(request.createdAt).toLocaleDateString("es-CL")}</td>
                <td>{responsibleLabel(currentUser, request)}</td>
                <td><span className={`sla-badge sla-${getSLA(request).tone}`}>{getSLA(request).label}</span></td>
                <td><span className="request-status-signal"><SignalLight tone={signalFromRequest(request)} compact /><span className="status neutral">{visibleStatusLabel(request)}</span></span></td>
                <td className="approval-row-arrow"><ChevronRight size={17} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && (
          <div className="approval-empty">
            <Clock3 size={28} />
            <strong>Cargando pendientes…</strong>
          </div>
        )}

        {!loading && !filtered.length && (
          <div className="approval-empty">
            <CheckCircle2 size={28} />
            <strong>Nada pendiente</strong>
            <span>No tienes solicitudes por revisar o gestionar en este momento.</span>
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  icon: Icon,
  active,
  onClick,
  tone,
}: {
  label: string
  value: number
  icon: typeof Inbox
  active?: boolean
  onClick: () => void
  tone?: "danger"
}) {
  return (
    <button
      className={`approval-metric ${active ? "active" : ""} ${tone ? `metric-${tone}` : ""}`}
      onClick={onClick}
    >
      <SignalLight tone={value > 0 ? (tone === "danger" ? "red" : "green") : "neutral"} compact />
      <Icon size={18} />
      <div><strong>{value}</strong><span>{label}</span></div>
    </button>
  )
}

function tabLabel(value: ManagementView, showSlaTerm: boolean) {
  const labels: Record<ManagementView, string> = {
    NUEVAS: "Nuevas",
    POR_APROBAR: "Por aprobar",
    EN_GESTION: "En gestión",
    FALTA_INFO: "Falta información",
    POR_CONFIRMAR: "Por confirmar",
    SLA: showSlaTerm ? "SLA" : "Plazos",
    TODAS: "Todas",
  }
  return labels[value]
}

function getSLA(request: RequestItem): {
  label: string
  tone: "ok" | "warning" | "danger" | "paused" | "neutral"
  priority: number
} {
  if (request.slaPausedReason) return { label: "En pausa", tone: "paused", priority: 2 }
  if (["RESUELTA", "RECHAZADA"].includes(request.status)) return { label: "Finalizado", tone: "neutral", priority: 5 }

  let hours: number | undefined
  let started: string | undefined
  if (request.status === "RECIBIDA") {
    hours = request.acceptanceSLAHours
    started = request.acceptanceSLAStartedAt
  } else if (request.status === "PENDIENTE_APROBACION") {
    hours = request.approvalSLAHours
    started = request.approvalSLAStartedAt
  } else if (request.status === "EN_GESTION") {
    hours = request.resolutionSLAHours
    started = request.resolutionSLAStartedAt
  }

  if (!hours || !started) return { label: "A tiempo", tone: "ok", priority: 3 }
  const startDate = new Date(started)
  const due = hours === 24 ? addBusinessDays(startDate, 1) : new Date(startDate.getTime() + hours * 3600000)
  const remaining = (due.getTime() - Date.now()) / 3600000
  if (remaining <= 0) return { label: "Vencida", tone: "danger", priority: 0 }
  if (remaining <= 6) return { label: "Por vencer", tone: "warning", priority: 1 }
  return { label: "A tiempo", tone: "ok", priority: 3 }
}

function addBusinessDays(date: Date, days: number) {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const day = result.getDay()
    if (day !== 0 && day !== 6) added += 1
  }
  return result
}
