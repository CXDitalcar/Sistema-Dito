import { useEffect, useState } from "react"
import { ArrowLeft, CheckCircle2, CircleAlert, ClipboardCheck, FileText, Link2, Plus, TriangleAlert, Wrench } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import "./FormularioDetalle.css"
import { routeQuestions, type RouteAnswerStatus } from "../data/routeExperience"
import { getRouteExecution, type RouteAnswer, type RouteExecution } from "../services/routeExperienceApi"
import type { UserScope } from "../types"

// Detalle de una Ruta o Auditoría Ruta enviada, leída desde Azure.
export default function FormularioDetalle({ currentUser }: { currentUser: UserScope }) {
  const { executionId = "" } = useParams()
  const navigate = useNavigate()
  const [execution, setExecution] = useState<RouteExecution | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    setExecution(null)
    setError("")
    getRouteExecution(executionId)
      .then((r) => { if (active) setExecution(r.execution) })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "No fue posible abrir la revisión.") })
    return () => { active = false }
  }, [executionId, currentUser.email])

  const back = (
    <button type="button" className="form-detail-back" onClick={() => navigate("/formularios")}>
      <ArrowLeft size={17} /> Volver a Formularios
    </button>
  )

  if (error || !execution) {
    return (
      <div className="form-detail-page">
        {back}
        <div className="form-detail-empty">
          {error ? <CircleAlert size={32} /> : <ClipboardCheck size={32} />}
          <h2>{error ? "Revisión no disponible" : "Cargando revisión…"}</h2>
          {error && <p>{error}</p>}
        </div>
      </div>
    )
  }

  const answers = routeQuestions.map((question) => ({
    question,
    answer: execution.answers.find((a) => a.itemId === question.id) ?? ({ itemId: question.id } as RouteAnswer),
  }))
  const breaches = answers.filter(({ answer }) => answer.status === "NO_CUMPLE" || answer.status === "SOLICITADO")
  const sections = [...new Set(routeQuestions.map((q) => q.section))]
  const total = execution.compliant + execution.nonCompliant + execution.requested
  const compliance = total ? Math.round((execution.compliant / total) * 100) : 0
  const name = execution.mode === "AUDITORIA" ? "Auditoría Ruta Experiencia" : "Ruta de Experiencia"

  // Solicitud vinculada: la guarda la Ruta o, si se creó desde este detalle, queda en este navegador.
  const linkedRequest = (answer: RouteAnswer) =>
    answer.linkedRequestId || readLocal(`ditalcar.route.request.${execution.id}-${answer.itemId}`)

  function createRequest(itemId: string) {
    const item = answers.find((a) => a.question.id === itemId)
    if (!item) return
    const params = new URLSearchParams({
      process: item.question.mappedProcesses?.[0]?.code ?? "",
      breach: `${execution!.id}-${itemId}`,
      originForm: execution!.mode === "AUDITORIA" ? "FOR-AUD-RUTA-01" : "FOR-RUTA-01",
      originExecution: execution!.id,
      originItem: itemId,
      originLocal: execution!.local,
      originSection: item.question.section,
      originQuestion: item.question.question,
      originDetail: item.answer.detail || "",
      returnTo: `/formularios/${encodeURIComponent(execution!.id)}`,
    })
    navigate(`/solicitudes/nueva?${params.toString()}`)
  }

  return (
    <div className="form-detail-page">
      {back}

      <div className="form-detail-head">
        <div>
          <div className="eyebrow">{execution.status === "SUBMITTED" ? "DETALLE DE REVISIÓN" : "BORRADOR"}</div>
          <h1>{name}</h1>
          <p>Resultado por ítem, brechas detectadas y solicitudes asociadas.</p>
        </div>
        <div className="form-detail-local">
          <ClipboardCheck size={20} />
          <div><span>Local</span><strong>{execution.local}</strong></div>
        </div>
      </div>

      <div className="form-detail-info-grid">
        <InfoCard label="Realizado por" value={execution.completedByName || execution.completedByEmail} />
        <InfoCard label={execution.status === "SUBMITTED" ? "Enviada" : "Última edición"} value={formatDateTime(execution.submittedAt ?? execution.updatedAt)} />
        <InfoCard label="Cumplimiento" value={`${compliance}%`} />
        <InfoCard label="Brechas detectadas" value={String(execution.nonCompliant)} />
      </div>

      <div className="form-detail-summary">
        <div className="form-detail-result result-ok-large"><CheckCircle2 size={19} /><div><strong>{execution.compliant}</strong><span>Cumple</span></div></div>
        <div className="form-detail-result result-alert-large"><TriangleAlert size={19} /><div><strong>{execution.nonCompliant}</strong><span>No cumple</span></div></div>
        <div className="form-detail-result result-requested-large"><FileText size={19} /><div><strong>{execution.requested}</strong><span>Solicitado</span></div></div>
      </div>

      {breaches.length > 0 && (
        <section className="form-detail-section">
          <div className="form-detail-section-head">
            <div>
              <div className="eyebrow">SEGUIMIENTO</div>
              <h2>Brechas y solicitudes</h2>
              <p>Cada brecha se resuelve en el local o con una solicitud.</p>
            </div>
            <span className="form-detail-counter">{breaches.length} brecha{breaches.length === 1 ? "" : "s"}</span>
          </div>
          <div className="form-breach-list">
            {breaches.map(({ question, answer }) => {
              const requestId = linkedRequest(answer)
              return (
                <div key={question.id} className="form-breach-item">
                  <div className="form-breach-status-icon">{answer.status === "NO_CUMPLE" ? <TriangleAlert size={20} /> : <FileText size={20} />}</div>
                  <div className="form-breach-content">
                    <span className="form-breach-section">{question.section}</span>
                    <strong>{question.question}</strong>
                    {answer.detail && <small>{answer.detail}</small>}
                    {answer.resolutionMode === "LOCAL_ACTION" && answer.localAction && (
                      <small><Wrench size={13} /> Se resuelve en el local: {answer.localAction.note || "sin detalle"}{answer.localAction.owner ? ` · ${answer.localAction.owner}` : ""}{answer.localAction.dueDate ? ` · ${answer.localAction.dueDate}` : ""}</small>
                    )}
                  </div>
                  <div className="form-breach-action">
                    {requestId ? (
                      <button type="button" className="breach-existing-btn" onClick={() => navigate(`/solicitudes/${requestId}`)}>
                        <Link2 size={16} /> Ver solicitud
                      </button>
                    ) : answer.status === "NO_CUMPLE" && answer.resolutionMode !== "LOCAL_ACTION" && question.mappedProcesses?.length ? (
                      <button type="button" className="breach-create-btn" onClick={() => createRequest(question.id)}>
                        <Plus size={16} /> Crear solicitud
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="form-detail-section">
        <div className="form-detail-section-head">
          <div>
            <div className="eyebrow">RESULTADO</div>
            <h2>Revisión por ítem</h2>
          </div>
        </div>
        {sections.map((section) => {
          const items = answers.filter(({ question }) => question.section === section)
          return (
            <div key={section} className="form-item-section">
              <div className="form-item-section-title"><span>{section}</span><small>{items.length} ítems</small></div>
              <div className="form-item-list">
                {items.map(({ question, answer }) => (
                  <div key={question.id} className={`form-item-row ${statusClass(answer.status)}`}>
                    <div className="form-item-status">
                      {answer.status === "CUMPLE" && <CheckCircle2 size={19} />}
                      {answer.status === "NO_CUMPLE" && <TriangleAlert size={19} />}
                      {answer.status === "SOLICITADO" && <FileText size={19} />}
                    </div>
                    <div className="form-item-content">
                      <strong>{question.question}</strong>
                      {answer.detail && <p>{answer.detail}</p>}
                      {answer.evidence?.length ? <small>{answer.evidence.length} foto{answer.evidence.length === 1 ? "" : "s"} de evidencia</small> : null}
                    </div>
                    <span className="form-item-label">{statusLabel(answer.status)}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </section>

      {(execution.walkAdjustments || execution.pendingActions || execution.additionalComment) && (
        <section className="form-detail-section">
          <div className="form-detail-section-head">
            <div>
              <div className="eyebrow">CIERRE</div>
              <h2>Ajustes y acciones</h2>
            </div>
          </div>
          <div className="form-detail-info-grid">
            {execution.walkAdjustments && <InfoCard label="Ajustes durante la caminata" value={execution.walkAdjustments} />}
            {execution.pendingActions && <InfoCard label="Acciones pendientes" value={execution.pendingActions} />}
            {execution.additionalComment && <InfoCard label="Comentario adicional" value={execution.additionalComment} />}
          </div>
        </section>
      )}
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="form-detail-info-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function readLocal(key: string) {
  try { return localStorage.getItem(key) ?? "" } catch { return "" }
}

function statusClass(status?: RouteAnswerStatus) {
  if (status === "CUMPLE") return "item-status-ok"
  if (status === "NO_CUMPLE") return "item-status-alert"
  if (status === "SOLICITADO") return "item-status-requested"
  return ""
}

function statusLabel(status?: RouteAnswerStatus) {
  if (status === "CUMPLE") return "Cumple"
  if (status === "NO_CUMPLE") return "No cumple"
  if (status === "SOLICITADO") return "Solicitado"
  return "Sin responder"
}

function formatDateTime(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date)
}
