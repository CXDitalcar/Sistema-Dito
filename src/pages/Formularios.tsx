import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight, CheckCircle2, ClipboardCheck, Clock3, Eye, FileCheck2, TriangleAlert } from "lucide-react"
import { useNavigate } from "react-router-dom"
import "./Formularios.css"
import "./Portal.css"
import "./Showroom.css"
import SignalLight from "../components/SignalLight"
import { OtherForms } from "./Showroom"
import { listRouteExecutions, type RouteExecution } from "../services/routeExperienceApi"
import { currentInterface, enterInterface } from "../services/interfaceMode"
import { hasExperienceAccess } from "../services/experienceAccess"
import type { UserScope } from "../types"

// Formularios de la app (Ruta y Auditoría Ruta) con los registros reales guardados en Azure.
// Se realizan en "Gestión de Showroom"; aquí se ven los resultados y el acceso a Frogmi y Tour Manager.
type FormKind = "RUTA" | "AUDITORIA"

const FORMS: Record<FormKind, { code: string; name: string; description: string; frequency: string }> = {
  RUTA: {
    code: "FOR-RUTA-01",
    name: "Ruta de Experiencia",
    description: "Revisión semanal de estándares visuales, físicos y operacionales del local.",
    frequency: "Semanal",
  },
  AUDITORIA: {
    code: "FOR-AUD-RUTA-01",
    name: "Auditoría Ruta Experiencia",
    description: "Auditoría de contraste para revisar la exactitud de la Ruta de Experiencia.",
    frequency: "Según plan",
  },
}

// Mismos perfiles que valida la API para realizar una Auditoría Ruta.
function canAudit(user: UserScope) {
  return ["EXPERIENCIA_CLIENTES", "PROJECT_MANAGER", "JEFATURA_COMERCIAL_CLIENTES", "GERENCIA_MARCA", "JEFATURA_MARCA", "JEFATURA_ZONAL"].includes(user.role)
}

const sortDate = (e: RouteExecution) => e.submittedAt ?? e.updatedAt ?? e.createdAt

export default function Formularios({ currentUser }: { currentUser: UserScope }) {
  const navigate = useNavigate()
  const [executions, setExecutions] = useState<RouteExecution[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    listRouteExecutions()
      .then((r) => setExecutions(r.executions ?? []))
      .catch((err) => { setExecutions([]); setError(err instanceof Error ? err.message : "No fue posible cargar las revisiones.") })
  }, [currentUser.email])

  // La API ya entrega solo las revisiones que este perfil puede ver (propias y de sus locales).
  const submitted = useMemo(
    () => (executions ?? []).filter((e) => e.status === "SUBMITTED").sort((a, b) => sortDate(b).localeCompare(sortDate(a))),
    [executions],
  )
  const myDrafts = (executions ?? []).filter((e) => e.status === "DRAFT" && e.completedByEmail?.toLowerCase() === currentUser.email.toLowerCase())
  const kinds: FormKind[] = canAudit(currentUser) ? ["RUTA", "AUDITORIA"] : ["RUTA"]

  const openBreaches = submitted.reduce((n, e) => n + e.answers.filter((a) => a.status === "NO_CUMPLE" && !a.linkedRequestId && a.resolutionMode !== "LOCAL_ACTION").length, 0)
  const requested = submitted.reduce((n, e) => n + e.answers.filter((a) => a.status === "SOLICITADO" || a.linkedRequestId).length, 0)

  // Los formularios se realizan en Gestión de Showroom: desde la app completa se abre esa interfaz.
  function realize(kind: FormKind, draftId?: string) {
    const query = new URLSearchParams()
    if (draftId) query.set("id", draftId)
    else if (kind === "AUDITORIA") query.set("mode", "AUDITORIA")
    const path = `/ruta-experiencia${query.size ? `?${query}` : ""}`
    if (currentInterface() === "showroom") navigate(path)
    else enterInterface("showroom", path)
  }

  return (
    <div className="forms-page">
      <div className="forms-page-head">
        <div>
          <div className="eyebrow">FORMULARIOS</div>
          <h1>Revisiones del local</h1>
          <p>Realiza las revisiones en Gestión de Showroom y consulta aquí los resultados de tus locales.</p>
        </div>
      </div>

      <section className="forms-section">
        <div className="forms-section-head">
          <div>
            <div className="eyebrow">MIS REVISIONES</div>
            <h2>Formularios de la app</h2>
          </div>
        </div>
        <div className="forms-grid">
          {kinds.map((kind) => {
            const last = submitted.find((e) => e.mode === kind)
            const draft = myDrafts.find((e) => e.mode === kind)
            return <FormCard key={kind} kind={kind} last={last} draft={draft} loading={executions === null}
              onRealize={() => realize(kind, draft?.id)} onView={(id) => navigate(`/formularios/${encodeURIComponent(id)}`)} />
          })}
        </div>
      </section>

      <OtherForms currentUser={currentUser} />

      <section className="forms-section">
        <div className="forms-section-head">
          <div>
            <div className="eyebrow">SEGUIMIENTO</div>
            <h2>Últimas revisiones</h2>
            <p>{hasExperienceAccess(currentUser) ? "Revisiones enviadas en toda la red." : "Revisiones enviadas de tus locales."}</p>
          </div>
        </div>

        {error && <div className="forms-empty"><TriangleAlert size={28} /><div><strong>No pudimos cargar las revisiones.</strong><span>{error}</span></div></div>}

        <div className="forms-summary-grid">
          <SummaryCard label="Revisiones enviadas" value={submitted.length} icon={CheckCircle2} />
          <SummaryCard label="Brechas sin gestionar" value={openBreaches} icon={TriangleAlert} />
          <SummaryCard label="Ya solicitadas" value={requested} icon={FileCheck2} />
        </div>

        {executions === null ? (
          <div className="forms-empty"><Clock3 size={28} /><div><strong>Cargando revisiones…</strong></div></div>
        ) : submitted.length > 0 ? (
          <div className="forms-tracking-card">
            <div className="forms-tracking-head">
              <span>Formulario</span><span>Local</span><span>Enviada</span><span>Resultado</span><span />
            </div>
            {submitted.map((e) => (
              <div key={e.id} className="forms-tracking-row">
                <div><strong>{FORMS[e.mode].name}</strong><small>{FORMS[e.mode].frequency}</small></div>
                <div><strong>{e.local}</strong></div>
                <div><strong>{formatDateTime(sortDate(e))}</strong><small>{e.completedByName}</small></div>
                <div className="tracking-results">
                  <SignalLight tone={e.nonCompliant > 0 ? "orange" : "green"} compact />
                  <span className="result-pill result-ok">{e.compliant} Cumple</span>
                  <span className="result-pill result-alert">{e.nonCompliant} No cumple</span>
                  <span className="result-pill result-requested">{e.requested} Solicitado</span>
                </div>
                <button type="button" className="tracking-view-btn" title="Ver revisión" onClick={() => navigate(`/formularios/${encodeURIComponent(e.id)}`)}>
                  <Eye size={18} />
                </button>
              </div>
            ))}
          </div>
        ) : !error && (
          <div className="forms-empty">
            <ClipboardCheck size={28} />
            <div>
              <strong>Aún no hay revisiones enviadas.</strong>
              <span>Cuando se envíe la primera Ruta de tus locales, aparecerá aquí.</span>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function FormCard({ kind, last, draft, loading, onRealize, onView }: {
  kind: FormKind; last?: RouteExecution; draft?: RouteExecution; loading: boolean
  onRealize: () => void; onView: (id: string) => void
}) {
  const form = FORMS[kind]
  const breaches = last ? last.answers.filter((a) => a.status === "NO_CUMPLE" && !a.linkedRequestId && a.resolutionMode !== "LOCAL_ACTION").length : 0
  return (
    <article className="form-card">
      <div className="form-card-top">
        <div className="form-card-signal">
          <SignalLight tone={breaches > 0 ? "orange" : "green"} compact />
          <span>{breaches > 0 ? "Requiere seguimiento" : draft ? "Borrador en curso" : "Actividad disponible"}</span>
        </div>
        <div className="form-card-icon"><ClipboardCheck size={24} /></div>
        <div className="form-frequency"><Clock3 size={14} />{form.frequency}</div>
      </div>

      <div className="form-card-body">
        <span className="form-code">{form.code}</span>
        <h3>{form.name}</h3>
        <p>{form.description}</p>
      </div>

      <div className="form-last-review">
        <span>Última enviada</span>
        {loading ? <strong>Cargando…</strong> : last ? (
          <><strong>{formatDateTime(sortDate(last))}</strong><small>{last.completedByName} · {last.local}</small></>
        ) : <strong>Sin registros todavía</strong>}
      </div>

      {last && (
        <div className="form-result-line">
          <span className="result-pill result-ok">{last.compliant} Cumple</span>
          <span className="result-pill result-alert">{last.nonCompliant} No cumple</span>
          <span className="result-pill result-requested">{last.requested} Solicitado</span>
        </div>
      )}

      {breaches > 0 && (
        <div className="form-breach-alert">
          <TriangleAlert size={17} />
          <span>{breaches} {breaches === 1 ? "brecha requiere" : "brechas requieren"} seguimiento.</span>
        </div>
      )}

      <div className="form-card-actions">
        {last && (
          <button type="button" className="form-secondary-btn" onClick={() => onView(last.id)}>
            <Eye size={17} /> Ver última revisión
          </button>
        )}
        <button type="button" className="form-primary-btn" onClick={onRealize}>
          {draft ? `Continuar borrador${draft.local ? ` · ${draft.local}` : ""}` : "Realizar en Gestión de Showroom"}
          <ArrowUpRight size={17} />
        </button>
      </div>
    </article>
  )
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof CheckCircle2 }) {
  return (
    <div className="forms-summary-card">
      <div className="forms-summary-icon"><Icon size={20} /></div>
      <div><strong>{value}</strong><span>{label}</span></div>
    </div>
  )
}

function formatDateTime(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date)
}
