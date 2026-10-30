import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Plus, RefreshCcw, Search } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { listRequests } from "../services/requestRepository"
import { getAllRequestAssignments } from "../services/requestCatalog"
import { canViewRequest } from "../services/permissions"
import type { RequestItem, UserScope } from "../types"
import { responsibleLabel, visibleStatusLabel } from "../services/requestPresentation"
import SignalLight, { signalFromRequest } from "../components/SignalLight"
import { hasExperienceAccess } from "../services/experienceAccess"

export default function Solicitudes({
  branch,
  currentUser,
  demoMode,
}: {
  branch: string
  currentUser: UserScope
  demoMode: boolean
}) {
  const navigate = useNavigate()
  const [rows, setRows] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")

  async function load() {
    setLoading(true)
    setError("")
    try {
      setRows(await listRequests(currentUser))
    } catch (errorValue: any) {
      setError(errorValue?.message || "No fue posible cargar las solicitudes.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [currentUser.email, currentUser.role, demoMode])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((request) =>
        canViewRequest(currentUser, request, getAllRequestAssignments())
      )
      .filter((request) => {
        if (!q) return true
        return `${request.id} ${request.processName} ${request.local} ${request.requesterName} ${request.status} ${request.currentResponsibleName ?? ""}`
          .toLowerCase()
          .includes(q)
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
  }, [rows, query, currentUser])

  return (
    <div className="requests-page-pilot">
      <div className="page-head inline">
        <div>
          <span className="eyebrow">SOLICITUDES</span>
          <h1>Seguimiento</h1>
          <p>
            {demoMode
              ? hasExperienceAccess(currentUser)
                ? "Piloto interactivo · flujo por rol y SLA"
                : "Piloto interactivo · flujo por rol y seguimiento de plazos"
              : "Solicitudes guardadas en DITO · historial, adjuntos y plazos"}
          </p>
        </div>
        <div className="request-head-actions">
          <button className="secondary-btn" onClick={load} disabled={loading}>
            <RefreshCcw size={17} /> Actualizar
          </button>
          <Link className="primary-btn" to="/solicitudes/nueva">
            <Plus size={17} /> Nueva solicitud
          </Link>
        </div>
      </div>

      <div className="toolbar">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar solicitud, local, proceso o estado..."
        />
      </div>

      {loading && <div className="empty">Cargando solicitudes…</div>}

      {error && (
        <div className="error-box">
          <AlertCircle />
          <div>
            <strong>No se pudieron cargar las solicitudes</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="requests-grid">
          {visible.map((request) => (
            <button
              className="request-card request-card-button"
              key={request.id}
              onClick={() => navigate(`/solicitudes/${request.id}`)}
            >
              <div className="request-top">
                <PilotStatus request={request} />
                <span>#{request.id}</span>
              </div>
              <h3>{request.processName}</h3>
              {request.isTest && <span className="pilot-test-tag">PRUEBA</span>}
              <div className="request-meta">
                <span>{request.local}</span>
                <span>{request.requesterName}</span>
                <span>{responsibleLabel(currentUser, request)}</span>
              </div>
              {request.slaPausedReason && (
                <div className="request-paused">
                  {hasExperienceAccess(currentUser) ? "SLA" : "Plazo"} pausado · {request.slaPausedReason}
                </div>
              )}
              <div className="request-foot">
                <small>
                  {new Date(request.createdAt).toLocaleDateString("es-CL")}
                </small>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="empty"><strong>Nada pendiente por ahora.</strong> Aquí verás las solicitudes que ingreses y las que te toque revisar o gestionar.</div>
      )}
    </div>
  )
}

function PilotStatus({ request }: { request: RequestItem }) {
  const value = request.status
  return (
    <span className="request-status-signal">
      <SignalLight tone={signalFromRequest(request)} compact />
      <span
        className={`status ${
          value === "RESUELTA"
            ? "ok"
            : value === "RECHAZADA"
              ? "bad"
              : value === "PENDIENTE_APROBACION"
                ? "requested"
                : "neutral"
        }`}
      >
        {visibleStatusLabel(request)}
      </span>
    </span>
  )
}
