import { useEffect, useMemo, useRef, useState } from "react"
import { localMatches } from "../services/localMatch"
import { userLocalList } from "../services/userLocals"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  CloudUpload,
  FileCheck2,
  GitCompare,
  History,
  Loader2,
  MapPin,
  Plus,
  Save,
  ShieldCheck,
  TriangleAlert,
  Upload,
} from "lucide-react"
import {
  routeLocalBrands,
  routeLocals,
  routeQuestions,
  routeSections,
  type RouteAnswerStatus,
  type RouteQuestionDefinition,
} from "../data/routeExperience"
import { getLocalOptions } from "../services/requestCatalog"
import {
  getRouteExecution,
  getRouteMetrics,
  listRouteExecutions,
  saveRouteExecution,
  uploadRouteEvidence,
  type RouteAnswer,
  type RouteExecution,
  type RouteMetrics,
} from "../services/routeExperienceApi"
import type { UserScope } from "../types"
import "./RutaExperiencia.css"

type Draft = {
  id: string
  mode: "RUTA" | "AUDITORIA"
  local: string
  answers: RouteAnswer[]
  walkAdjustments: string
  pendingActions: string
  additionalComment: string
  status: "DRAFT" | "SUBMITTED"
}

type AutoSaveState = "IDLE" | "PENDING" | "SAVING" | "SAVED" | "ERROR"

function newId() {
  return `RUTA-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

function canAudit(user: UserScope) {
  return [
    "EXPERIENCIA_CLIENTES", "PROJECT_MANAGER",
    "JEFATURA_COMERCIAL_CLIENTES",
    "GERENCIA_MARCA",
    "JEFATURA_MARCA",
    "JEFATURA_ZONAL",
  ].includes(user.role)
}

function broadRouteAccess(user: UserScope) {
  return ["EXPERIENCIA_CLIENTES", "PROJECT_MANAGER", "JEFATURA_COMERCIAL_CLIENTES"].includes(user.role)
}

function emptyDraft(user: UserScope, mode: "RUTA" | "AUDITORIA" = "RUTA"): Draft {
  return {
    id: newId(),
    mode,
    local: defaultRouteLocal(user),
    answers: routeQuestions.map((question) => ({ itemId: question.id, evidence: [], missing: [] })),
    walkAdjustments: "",
    pendingActions: "",
    additionalComment: "",
    status: "DRAFT",
  }
}

// El local de 02_Usuarios puede tener otro nombre que en la Ruta ("Vespucio" ↔ "Chery-Renault Vespucio"):
// se guarda con el nombre de la Ruta para que el seguimiento y las métricas por local lo encuentren.
function defaultRouteLocal(user: UserScope) {
  const own = user.local ?? user.localPrincipal ?? user.assignedLocals?.[0] ?? ""
  if (!own) return ""
  return routeLocals.find((route) => route === own || localMatches(own, route)) ?? own
}

function statusLabel(status?: RouteAnswerStatus) {
  if (status === "CUMPLE") return "Cumple"
  if (status === "NO_CUMPLE") return "No cumple"
  if (status === "SOLICITADO") return "Solicitado"
  return "—"
}

function formatDate(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short" }).format(date)
}

function monthLabel(period: string) {
  const [year, month] = period.split("-").map(Number)
  if (!year || !month) return period
  return new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1))
}

function questionLabel(itemId: string) {
  return routeQuestions.find((item) => item.id === itemId)?.question ?? itemId
}

export default function RutaExperiencia({ currentUser }: { currentUser: UserScope }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const auditAllowed = canAudit(currentUser)
  const initialMode = searchParams.get("mode") === "AUDITORIA" && auditAllowed ? "AUDITORIA" : "RUTA"

  const [draft, setDraft] = useState<Draft>(() => emptyDraft(currentUser, initialMode))
  const [history, setHistory] = useState<RouteExecution[]>([])
  const [metrics, setMetrics] = useState<RouteMetrics | null>(null)
  const [metricsMode, setMetricsMode] = useState<"LATEST" | "MONTHLY">("LATEST")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingItem, setUploadingItem] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>("IDLE")
  const [showSubmitSummary, setShowSubmitSummary] = useState(false)
  // Autoguardado en curso y bloqueo mientras se guarda a mano o se envía: evita que un borrador
  // automático llegue después del envío y deje la Ruta otra vez como borrador.
  const autoSaveRun = useRef<Promise<unknown> | null>(null)
  const persisting = useRef(false)

  const localOptions = useMemo(() => {
    if (broadRouteAccess(currentUser)) return routeLocals

    // Cada usuario queda limitado a sus locales de 02_Usuarios (aunque el nombre del local en la Ruta sea distinto).
    const explicit = userLocalList(currentUser)
    const explicitRouteLocals = routeLocals.filter((route) => explicit.some((local) => local === route || localMatches(local, route)))
    if (explicitRouteLocals.length) return explicitRouteLocals
    if (explicit.length) return explicit

    if (["GERENCIA_MARCA", "JEFATURA_MARCA"].includes(currentUser.role) || currentUser.scope === "MARCA") {
      const brands = (currentUser.brands || []).map((brand) => brand.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())
      const byBrand = routeLocals.filter((local) => (routeLocalBrands[local] || []).some((brand) =>
        brands.includes(brand.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())
      ))
      if (byBrand.length) return byBrand
    }

    // Sin locales propios, solo un perfil de red (Alcance Red, no vendedor) puede elegir cualquier local,
    // igual que valida la API. Un perfil de local nunca ve la lista de otros locales.
    if (!explicit.length && currentUser.scope === "RED" && currentUser.role !== "VENDEDOR") return routeLocals
    const configured = getLocalOptions(currentUser).options
    return configured.filter((local) => routeLocals.includes(local))
  }, [currentUser])

  const readOnly = draft.status === "SUBMITTED"

  async function refreshHistoryAndMetrics(local = draft.local) {
    const list = await listRouteExecutions()
    setHistory(list.executions)
    if (local) {
      const routeMetrics = await getRouteMetrics(local).catch(() => null)
      setMetrics(routeMetrics)
    }
  }

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const result = await listRouteExecutions()
        if (active) setHistory(result.executions)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "No fue posible cargar las rutas.")
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  useEffect(() => {
    const requestedId = searchParams.get("id")
    if (!requestedId) return
    let active = true
    getRouteExecution(requestedId)
      .then(({ execution }) => {
        if (!active) return
        setDraft({
          id: execution.id,
          mode: execution.mode,
          local: execution.local,
          answers: routeQuestions.map((question) => execution.answers.find((answer) => answer.itemId === question.id) || { itemId: question.id, evidence: [], missing: [] }),
          walkAdjustments: execution.walkAdjustments || "",
          pendingActions: execution.pendingActions || "",
          additionalComment: execution.additionalComment || "",
          status: execution.status,
        })
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No fue posible abrir la Ruta."))
    return () => { active = false }
  }, [searchParams])

  useEffect(() => {
    if (!draft.local) {
      setMetrics(null)
      return
    }
    let active = true
    getRouteMetrics(draft.local)
      .then((result) => { if (active) setMetrics(result) })
      .catch(() => { if (active) setMetrics(null) })
    return () => { active = false }
  }, [draft.local, history])

  // Recupera vínculos de solicitudes creadas desde la Ruta al volver desde Solicitudes.
  useEffect(() => {
    setDraft((current) => ({
      ...current,
      answers: current.answers.map((answer) => {
        const linked = localStorage.getItem(`ditalcar.route.request.${current.id}-${answer.itemId}`)
        return linked && linked !== answer.linkedRequestId ? { ...answer, linkedRequestId: linked, resolutionMode: "REQUEST" } : answer
      }),
    }))
  }, [searchParams])

  useEffect(() => {
    if (readOnly) return
    localStorage.setItem(`ditalcar.route.draft.${draft.id}`, JSON.stringify(draft))
  }, [draft, readOnly])

  // Guardado automático real en Azure. Se hace con debounce para no escribir por cada tecla.
  useEffect(() => {
    if (readOnly || !draft.local) return
    const hasContent = draft.answers.some((answer) => answer.status || answer.detail || answer.evidence?.length || answer.localAction?.note) ||
      Boolean(draft.walkAdjustments || draft.pendingActions || draft.additionalComment)
    if (!hasContent) return
    if (persisting.current) return
    setAutoSaveState("PENDING")
    const timer = window.setTimeout(() => {
      if (persisting.current) return
      setAutoSaveState("SAVING")
      const run = saveRouteExecution({ ...draft, status: "DRAFT" })
        .then(() => setAutoSaveState("SAVED"))
        .catch(() => setAutoSaveState("ERROR"))
      autoSaveRun.current = run
      void run.finally(() => { if (autoSaveRun.current === run) autoSaveRun.current = null })
    }, 1600)
    return () => window.clearTimeout(timer)
  }, [draft, readOnly])

  function answerFor(itemId: string) {
    return draft.answers.find((answer) => answer.itemId === itemId) || { itemId, evidence: [], missing: [] }
  }

  function updateAnswer(itemId: string, patch: Partial<RouteAnswer>) {
    if (readOnly) return
    setShowSubmitSummary(false)
    setDraft((current) => ({
      ...current,
      answers: current.answers.map((answer) => answer.itemId === itemId ? { ...answer, ...patch } : answer),
    }))
  }

  function chooseStatus(itemId: string, status: RouteAnswerStatus) {
    const answer = answerFor(itemId)
    updateAnswer(itemId, {
      status,
      resolutionMode: status === "SOLICITADO" ? "REQUEST" : answer.resolutionMode,
      ...(status === "CUMPLE" ? { resolutionMode: undefined, localAction: undefined } : {}),
    })
  }

  function startNew(mode: "RUTA" | "AUDITORIA" = draft.mode) {
    const next = emptyDraft(currentUser, mode)
    if (!next.local && localOptions.length === 1) next.local = localOptions[0]
    setDraft(next)
    setMessage("")
    setError("")
    setShowSubmitSummary(false)
    setSearchParams(mode === "AUDITORIA" ? { mode: "AUDITORIA" } : {})
  }

  async function persist(status: "DRAFT" | "SUBMITTED") {
    setSaving(true)
    setError("")
    setMessage("")
    persisting.current = true
    try {
      if (status === "SUBMITTED") {
        const validation = validateDraft(draft)
        if (validation) throw new Error(validation)
      }
      // Si hay un autoguardado en camino, se espera a que termine antes de guardar o enviar.
      await autoSaveRun.current?.catch(() => undefined)
      const result = await saveRouteExecution({ ...draft, status })
      setDraft((current) => ({ ...current, status: result.execution.status }))
      setMessage(result.message)
      localStorage.removeItem(`ditalcar.route.draft.${draft.id}`)
      await refreshHistoryAndMetrics(result.execution.local)
      if (status === "SUBMITTED") setSearchParams({ id: result.execution.id })
      setShowSubmitSummary(false)
      return result.execution
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar la Ruta.")
      return null
    } finally {
      persisting.current = false
      setSaving(false)
    }
  }

  function prepareSubmit() {
    const validation = validateDraft(draft)
    if (validation) {
      setError(validation)
      setShowSubmitSummary(false)
      return
    }
    setError("")
    setShowSubmitSummary(true)
  }

  async function handleEvidence(question: RouteQuestionDefinition, file?: File) {
    if (!file || readOnly) return
    setUploadingItem(question.id)
    setError("")
    try {
      const result = await uploadRouteEvidence(draft.id, question.id, file)
      const answer = answerFor(question.id)
      updateAnswer(question.id, { evidence: [...(answer.evidence || []), result.evidence] })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible subir la evidencia.")
    } finally {
      setUploadingItem("")
    }
  }

  async function createRequest(question: RouteQuestionDefinition, processCode: string) {
    const answer = answerFor(question.id)
    const nextAnswers = draft.answers.map((item) => item.itemId === question.id ? { ...item, resolutionMode: "REQUEST" as const } : item)
    setDraft((current) => ({ ...current, answers: nextAnswers }))
    setSaving(true)
    let saved: RouteExecution | null = null
    try {
      const result = await saveRouteExecution({ ...draft, answers: nextAnswers, status: "DRAFT" })
      saved = result.execution
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar la Ruta antes de crear la solicitud.")
    } finally {
      setSaving(false)
    }
    if (!saved) return

    const breachId = `${draft.id}-${question.id}`
    const params = new URLSearchParams({
      process: processCode,
      breach: breachId,
      originForm: draft.mode === "AUDITORIA" ? "FOR-AUD-RUTA-01" : "FOR-RUTA-01",
      originExecution: draft.id,
      originItem: question.id,
      originLocal: draft.local,
      originSection: question.section,
      originQuestion: question.question,
      originDetail: answer.detail || "",
      returnTo: `/ruta-experiencia?id=${encodeURIComponent(draft.id)}`,
    })
    navigate(`/solicitudes/nueva?${params.toString()}`)
  }

  const completed = draft.answers.filter((answer) => Boolean(answer.status)).length
  const progress = Math.round((completed / routeQuestions.length) * 100)
  const counts = draft.answers.reduce((acc, answer) => {
    if (answer.status === "CUMPLE") acc.ok += 1
    if (answer.status === "NO_CUMPLE") acc.bad += 1
    if (answer.status === "SOLICITADO") acc.requested += 1
    if (answer.resolutionMode === "LOCAL_ACTION") acc.localActions += 1
    if (answer.linkedRequestId) acc.linked += 1
    return acc
  }, { ok: 0, bad: 0, requested: 0, localActions: 0, linked: 0 })
  const pending = routeQuestions.length - completed

  return (
    <div className="route-page">
      <header className="route-hero">
        <div>
          <div className="eyebrow">EXPERIENCIA · REVISIÓN EN APP</div>
          <h1>{draft.mode === "AUDITORIA" ? "Auditoría Ruta de Experiencia" : "Ruta de Experiencia"}</h1>
          <p>Ruta y Auditoría usan exactamente las mismas preguntas. Las diferencias se miden con fecha y trazabilidad por local.</p>
        </div>
        <div className="route-progress-card">
          <span>Avance</span>
          <strong>{progress}%</strong>
          <div className="route-progress-track"><i style={{ width: `${progress}%` }} /></div>
          <small>{completed} de {routeQuestions.length} puntos revisados</small>
        </div>
      </header>

      {error && <div className="route-alert route-alert-error"><TriangleAlert size={18} />{error}</div>}
      {message && <div className="route-alert route-alert-ok"><CheckCircle2 size={18} />{message}</div>}

      <section className="route-toolbar">
        <div className="route-field">
          <label>Local</label>
          <select value={draft.local} disabled={readOnly} onChange={(event) => setDraft((current) => ({ ...current, local: event.target.value }))}>
            <option value="">Seleccionar local</option>
            {localOptions.map((local) => <option key={local} value={local}>{local}</option>)}
          </select>
        </div>

        {auditAllowed && (
          <div className="route-mode-toggle">
            <button className={draft.mode === "RUTA" ? "active" : ""} disabled={readOnly} onClick={() => setDraft((current) => ({ ...current, mode: "RUTA" }))}>Ruta del local</button>
            <button className={draft.mode === "AUDITORIA" ? "active" : ""} disabled={readOnly} onClick={() => setDraft((current) => ({ ...current, mode: "AUDITORIA" }))}><ShieldCheck size={15} /> Auditoría Ruta</button>
          </div>
        )}

        <div className="route-toolbar-actions">
          <div className={`route-autosave ${autoSaveState.toLowerCase()}`}>
            <CloudUpload size={14} />
            {autoSaveState === "SAVING" ? "Guardando…" : autoSaveState === "SAVED" ? "Borrador guardado" : autoSaveState === "ERROR" ? "Sin guardar" : "Autoguardado"}
          </div>
          <button className="route-btn secondary" onClick={() => startNew(draft.mode)}><Plus size={16} /> Nueva</button>
          {!readOnly && <button className="route-btn secondary" disabled={saving} onClick={() => void persist("DRAFT")}><Save size={16} /> Guardar</button>}
          {!readOnly && <button className="route-btn primary" disabled={saving} onClick={prepareSubmit}><FileCheck2 size={17} /> Revisar y finalizar</button>}
        </div>
      </section>

      <div className="route-summary-strip">
        <span className="ok"><CheckCircle2 size={16} /> {counts.ok} Cumple</span>
        <span className="bad"><TriangleAlert size={16} /> {counts.bad} No cumple</span>
        <span className="requested"><ClipboardCheck size={16} /> {counts.requested} Solicitado</span>
        <span className="pending">{pending} por responder</span>
        <span className="storage"><CloudUpload size={16} /> Registro externo automático</span>
      </div>

      {showSubmitSummary && !readOnly && (
        <section className="route-submit-summary">
          <div>
            <span>RESUMEN ANTES DE ENVIAR</span>
            <strong>{draft.mode === "AUDITORIA" ? "Auditoría lista para finalizar" : "Ruta lista para finalizar"}</strong>
            <small>{draft.local} · {counts.ok} cumple · {counts.bad} no cumple · {counts.requested} solicitado · {counts.localActions} planes locales · {counts.linked} solicitudes vinculadas</small>
          </div>
          <div className="route-submit-actions">
            <button className="route-btn secondary" onClick={() => setShowSubmitSummary(false)}>Volver a revisar</button>
            <button className="route-btn primary" disabled={saving} onClick={() => void persist("SUBMITTED")}>{saving ? <Loader2 className="spin" size={17} /> : <FileCheck2 size={17} />} Finalizar ahora</button>
          </div>
        </section>
      )}

      {auditAllowed && draft.local && (
        <section className="route-measurement">
          <div className="route-measurement-head">
            <div>
              <span className="eyebrow">EXACTITUD · RUTA VS AUDITORÍA</span>
              <h2>Diferencia de medición</h2>
              <p>Compara el estado marcado en la Ruta del local con la Auditoría Ruta usando la misma pregunta.</p>
            </div>
            <div className="route-measurement-toggle">
              <button className={metricsMode === "LATEST" ? "active" : ""} onClick={() => setMetricsMode("LATEST")}><GitCompare size={14} /> Últimos cambios</button>
              <button className={metricsMode === "MONTHLY" ? "active" : ""} onClick={() => setMetricsMode("MONTHLY")}><CalendarDays size={14} /> Mensual</button>
            </div>
          </div>

          {metricsMode === "LATEST" ? (
            metrics?.latest ? (
              <div className="route-latest-comparison">
                <div className="route-exactitude-score"><span>Exactitud</span><strong>{metrics.latest.exactitude}%</strong><small>{metrics.latest.matches}/{metrics.latest.compared} respuestas coinciden</small></div>
                <div className="route-date-pair"><div><span>Ruta</span><strong>{formatDate(metrics.latest.routeDate)}</strong></div><div><span>Auditoría</span><strong>{formatDate(metrics.latest.auditDate)}</strong></div></div>
                <div className="route-difference-list">
                  <strong>{metrics.latest.differences.length} diferencias</strong>
                  {metrics.latest.differences.slice(0, 5).map((diff) => (
                    <div key={diff.itemId}>
                      <span>{questionLabel(diff.itemId)}</span>
                      <small>Ruta: {statusLabel(diff.routeStatus)} · Auditoría: {statusLabel(diff.auditStatus)}</small>
                    </div>
                  ))}
                  {!metrics.latest.differences.length && <small>Sin diferencias en la última comparación.</small>}
                </div>
              </div>
            ) : <div className="route-metrics-empty">Necesitamos al menos una Ruta y una Auditoría finalizadas para este local.</div>
          ) : (
            metrics?.monthly?.length ? (
              <div className="route-monthly-grid">
                {metrics.monthly.slice(0, 8).map((item) => (
                  <article key={`${item.period}-${item.routeId}-${item.auditId}`}>
                    <span>{monthLabel(item.period)}</span>
                    <strong>{item.exactitude}%</strong>
                    <div className="route-monthly-bar"><i style={{ width: `${Math.max(0, Math.min(100, item.exactitude))}%` }} /></div>
                    <small>Ruta {formatDate(item.routeDate)}<br />Auditoría {formatDate(item.auditDate)}<br />{item.differences.length} diferencias</small>
                  </article>
                ))}
              </div>
            ) : <div className="route-metrics-empty">Todavía no existen meses con Ruta + Auditoría comparables.</div>
          )}
        </section>
      )}

      <div className="route-layout">
        <main className="route-main">
          {routeSections.map((section) => (
            <section className="route-section" key={section}>
              <div className="route-section-head">
                <div><span>SECCIÓN</span><h2>{section}</h2></div>
                <small>{routeQuestions.filter((item) => item.section === section && answerFor(item.id).status).length}/{routeQuestions.filter((item) => item.section === section).length}</small>
              </div>
              {routeQuestions.filter((item) => item.section === section).map((question) => {
                const answer = answerFor(question.id)
                const showDetail = Boolean(answer.status && answer.status !== "CUMPLE") || Boolean(answer.detail)
                return (
                  <article className={`route-question ${answer.status ? `answered ${answer.status.toLowerCase()}` : ""}`} key={question.id}>
                    <div className="route-question-title"><span>{question.id.replace("RUTA-", "")}</span><h3>{question.question}</h3></div>
                    <div className="route-statuses">
                      {question.statuses.map((status) => (
                        <button key={status} disabled={readOnly} className={answer.status === status ? `selected ${status.toLowerCase()}` : ""} onClick={() => chooseStatus(question.id, status)}>{statusLabel(status)}</button>
                      ))}
                    </div>

                    {question.missingOptions && answer.status && answer.status !== "CUMPLE" && (
                      <div className="route-missing-grid">
                        {question.missingOptions.map((option) => {
                          const checked = (answer.missing || []).includes(option)
                          return <label key={option}><input type="checkbox" disabled={readOnly} checked={checked} onChange={() => updateAnswer(question.id, { missing: checked ? (answer.missing || []).filter((item) => item !== option) : [...(answer.missing || []), option] })} /> {option}</label>
                        })}
                      </div>
                    )}

                    {showDetail && question.detailLabel && (
                      <label className="route-detail"><span>{question.detailLabel}</span><textarea disabled={readOnly} value={answer.detail || ""} onChange={(event) => updateAnswer(question.id, { detail: event.target.value })} placeholder="Describe con el detalle necesario para poder gestionar la solución." /></label>
                    )}

                    {question.evidenceRequired && (
                      <div className="route-evidence">
                        <div><strong>Imágenes de verificación</strong><span>Hasta 10 MB por archivo.</span></div>
                        {!readOnly && <label className="route-upload-btn"><Upload size={16} />{uploadingItem === question.id ? "Subiendo…" : "Subir evidencia"}<input type="file" accept="image/*,.pdf" disabled={uploadingItem === question.id} onChange={(event) => void handleEvidence(question, event.target.files?.[0])} /></label>}
                        {!!answer.evidence?.length && <div className="route-evidence-list">{answer.evidence.map((file) => <span key={file.id}><FileCheck2 size={14} />{file.fileName}</span>)}</div>}
                      </div>
                    )}

                    {answer.status && answer.status !== "CUMPLE" && (
                      <div className="route-resolution-choice">
                        <div><strong>¿Cómo se gestionará esta brecha?</strong><span>No todo hallazgo necesita ir a Casa Matriz.</span></div>
                        <div className="route-resolution-buttons">
                          <button disabled={readOnly} className={answer.resolutionMode === "LOCAL_ACTION" ? "active" : ""} onClick={() => updateAnswer(question.id, { resolutionMode: "LOCAL_ACTION", localAction: answer.localAction || { owner: "", dueDate: "", note: "", status: "OPEN" } })}>Plan de acción local</button>
                          {!!question.mappedProcesses?.length && <button disabled={readOnly} className={answer.resolutionMode === "REQUEST" ? "active" : ""} onClick={() => updateAnswer(question.id, { resolutionMode: "REQUEST" })}>Crear / vincular solicitud</button>}
                        </div>
                      </div>
                    )}

                    {answer.resolutionMode === "LOCAL_ACTION" && answer.status && answer.status !== "CUMPLE" && (
                      <div className="route-local-action">
                        <label><span>Responsable</span><input disabled={readOnly} value={answer.localAction?.owner || ""} onChange={(event) => updateAnswer(question.id, { localAction: { owner: event.target.value, dueDate: answer.localAction?.dueDate || "", note: answer.localAction?.note || "", status: answer.localAction?.status || "OPEN" } })} /></label>
                        <label><span>Fecha compromiso</span><input type="date" disabled={readOnly} value={answer.localAction?.dueDate || ""} onChange={(event) => updateAnswer(question.id, { localAction: { owner: answer.localAction?.owner || "", dueDate: event.target.value, note: answer.localAction?.note || "", status: answer.localAction?.status || "OPEN" } })} /></label>
                        <label className="wide"><span>Plan / compromiso</span><textarea disabled={readOnly} value={answer.localAction?.note || ""} onChange={(event) => updateAnswer(question.id, { localAction: { owner: answer.localAction?.owner || "", dueDate: answer.localAction?.dueDate || "", note: event.target.value, status: answer.localAction?.status || "OPEN" } })} /></label>
                      </div>
                    )}

                    {answer.status && answer.status !== "CUMPLE" && answer.resolutionMode === "REQUEST" && question.mappedProcesses?.length ? (
                      <div className="route-request-box">
                        <div><strong>Resolver desde la app</strong><span>La solicitud queda vinculada a este hallazgo y evita duplicados.</span></div>
                        {answer.linkedRequestId ? (
                          <button onClick={() => navigate(`/solicitudes/${answer.linkedRequestId}`)}>Ver solicitud {answer.linkedRequestId}<ArrowRight size={15} /></button>
                        ) : (
                          <div className="route-request-buttons">{question.mappedProcesses.map((process) => <button key={process.code} disabled={readOnly} onClick={() => void createRequest(question, process.code)}>{process.label}<ArrowRight size={14} /></button>)}</div>
                        )}
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </section>
          ))}

          <section className="route-section route-closing">
            <div className="route-section-head"><div><span>CIERRE</span><h2>Brechas detectadas y acciones</h2></div></div>
            <label className="route-detail"><span>Modificaciones o ajustes realizados durante la caminata *</span><textarea disabled={readOnly} value={draft.walkAdjustments} onChange={(event) => setDraft((current) => ({ ...current, walkAdjustments: event.target.value }))} /></label>
            <label className="route-detail"><span>Acciones correctivas pendientes, responsable y fecha compromiso *</span><textarea disabled={readOnly} value={draft.pendingActions} onChange={(event) => setDraft((current) => ({ ...current, pendingActions: event.target.value }))} /></label>
            <label className="route-detail"><span>¿Hay algo que no haya estado considerado en el checklist que quisieras comentar?</span><textarea disabled={readOnly} value={draft.additionalComment} onChange={(event) => setDraft((current) => ({ ...current, additionalComment: event.target.value }))} /></label>
          </section>
        </main>

        <aside className="route-history">
          <div className="route-history-head"><History size={18} /><div><span>SEGUIMIENTO</span><strong>Rutas registradas</strong></div></div>
          {loading ? <div className="route-history-empty"><Loader2 className="spin" size={20} /> Cargando…</div> : history.length ? history.slice(0, 20).map((item) => (
            <button key={item.id} className={item.id === draft.id ? "active" : ""} onClick={() => setSearchParams({ id: item.id })}>
              <div><strong>{item.local}</strong><span>{item.mode === "AUDITORIA" ? "Auditoría Ruta" : "Ruta"} · {item.status === "SUBMITTED" ? "Finalizada" : "Borrador"}</span></div>
              <small>{formatDate(item.updatedAt)}</small>
              <div className="route-history-counts"><i>{item.compliant} ✓</i><i>{item.nonCompliant} !</i><i>{item.requested} S</i></div>
            </button>
          )) : <div className="route-history-empty">Todavía no hay rutas registradas.</div>}
        </aside>
      </div>
    </div>
  )
}

function validateDraft(draft: Draft) {
  if (!draft.local) return "Selecciona el local antes de finalizar."
  for (const question of routeQuestions) {
    const answer = draft.answers.find((item) => item.itemId === question.id)
    if (!answer?.status) return `Falta responder: ${question.question}`
    if (question.detailRequiredWhen?.includes(answer.status) && !answer.detail?.trim()) return `Falta detallar: ${question.question}`
    if (question.evidenceRequired && !(answer.evidence?.length)) return `Falta subir imagen de verificación en: ${question.section}`
    if (question.missingOptions && answer.status !== "CUMPLE" && !(answer.missing?.length)) return "En Unidades, selecciona qué elemento está faltando."
    if (answer.resolutionMode === "LOCAL_ACTION") {
      if (!answer.localAction?.owner?.trim()) return `Falta responsable del plan local: ${question.question}`
      if (!answer.localAction?.dueDate) return `Falta fecha compromiso del plan local: ${question.question}`
      if (!answer.localAction?.note?.trim()) return `Falta detallar el plan local: ${question.question}`
    }
  }
  if (!draft.walkAdjustments.trim()) return "Completa las modificaciones o ajustes realizados durante la caminata."
  if (!draft.pendingActions.trim()) return "Completa las acciones correctivas pendientes, responsable y fecha compromiso."
  return ""
}
