import { useEffect, useState } from "react"
import { markMiLocalSeen } from "../services/homeActivities"
import { AlertTriangle, CheckCircle2, MapPin } from "lucide-react"

import StatusBadge from "../components/StatusBadge"
import SignalLight, { signalFromPercent } from "../components/SignalLight"

import {
  getPilotLocal,
  getVisiblePilotLocals,
} from "../data/pilotData"

import type {
  UserScope,
} from "../types"
import { getRouteMetrics, type LocalKpis, type MacroMonth, type MacroPoint, type MacroWeek, type RouteMetrics } from "../services/routeExperienceApi"
import { routeQuestions } from "../data/routeExperience"


// ======================================================
// INDICADORES DE MI LOCAL (basados en Ruta y Auditoría Ruta)
// ======================================================
type KpiDef = { id: "adherencia" | "estandares" | "auditoria" | "exactitud"; label: string; note: string; key: keyof Pick<MacroPoint, "adherencia" | "cumplimientoEstandares" | "cumplimientoAuditoria" | "exactitud"> }

const KPI_DEFS: KpiDef[] = [
  { id: "adherencia", label: "Adherencia", note: "1 Ruta por semana realizada por la jefatura del local.", key: "adherencia" },
  { id: "estandares", label: "Cumplimiento de estándares", note: "Puntos que cumplen en la última Ruta.", key: "cumplimientoEstandares" },
  { id: "auditoria", label: "Cumplimiento de la auditoría", note: "Puntos que cumplen en la última Auditoría Ruta.", key: "cumplimientoAuditoria" },
  { id: "exactitud", label: "Brecha / exactitud de la revisión", note: "Coincidencia entre la Auditoría y la Ruta más cercana (última).", key: "exactitud" },
]

function kpiValue(id: KpiDef["id"], k?: LocalKpis | null): number | null {
  if (!k) return null
  if (id === "adherencia") return k.adherencia?.value ?? null
  if (id === "estandares") return k.cumplimientoEstandares?.value ?? null
  if (id === "auditoria") return k.cumplimientoAuditoria?.value ?? null
  return k.exactitud?.value ?? null
}

const dateShort = (v?: string) => (v ? new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit" }).format(new Date(`${v.slice(0, 10)}T12:00:00`)) : "")

function kpiDetail(id: KpiDef["id"], k?: LocalKpis | null): string {
  if (!k) return ""
  if (id === "adherencia" && k.adherencia) return `${k.adherencia.done} de ${k.adherencia.expected} semanas · desde ${dateShort(k.adherencia.desde)}`
  if (id === "estandares" && k.cumplimientoEstandares) return `Semana del ${dateShort(k.cumplimientoEstandares.date)}`
  if (id === "auditoria" && k.cumplimientoAuditoria) return `Semana del ${dateShort(k.cumplimientoAuditoria.date)}`
  if (id === "exactitud" && k.exactitud) return `${k.exactitud.brecha !== null ? `Brecha ${k.exactitud.brecha} pts · ` : ""}Semana del ${dateShort(k.exactitud.date)}`
  return ""
}

const fmtPct = (v: number | null) => (v === null ? "—" : `${v}%`)
const monthLabel = (period: string) => new Intl.DateTimeFormat("es-CL", { month: "short", year: "numeric" }).format(new Date(`${period}-01T12:00:00`))
const weekLabel = (week: string) => `Sem. ${dateShort(week)}`

const STATUS_TEXT: Record<string, string> = { CUMPLE: "Cumple", NO_CUMPLE: "No cumple", SOLICITADO: "Solicitado" }

function KpiValueView({ def, kpis }: { def: KpiDef; kpis?: LocalKpis | null }) {
  const pending = def.id === "adherencia" && (!kpis || kpis.enImplementacion)
  const value = kpiValue(def.id, kpis)
  if (pending) return <strong className="kpi-value kpi-impl">En implementación</strong>
  return <strong className="kpi-value">{fmtPct(value)}</strong>
}

type EvoRow = { label: string; point: MacroPoint }

export default function MiLocal({
  branch,
  currentUser,
}: {
  branch: string
  currentUser: UserScope
}) {
  const local =
    getPilotLocal(
      currentUser.local ??
      branch
    )


  const visibleLocals =
    getVisiblePilotLocals(
      currentUser
    )


  const metricsLocalName = local?.name ?? (visibleLocals.length === 1 ? visibleLocals[0]?.name : "")
  const [routeMetrics, setRouteMetrics] = useState<RouteMetrics | null>(null)
  const [networkMetrics, setNetworkMetrics] = useState<RouteMetrics | null>(null)
  const isNetwork = !local && visibleLocals.length > 1
  useEffect(() => {
    if (!isNetwork) return
    let active = true
    getRouteMetrics().then((r) => { if (active) setNetworkMetrics(r) }).catch(() => { if (active) setNetworkMetrics(null) })
    return () => { active = false }
  }, [isNetwork])

  // Al entrar a Mi local se da por vista la última Ruta/Auditoría (apaga el aviso del menú).
  useEffect(() => { markMiLocalSeen(currentUser.email) }, [currentUser.email])

  useEffect(() => {
    let active = true
    if (!metricsLocalName) {
      setRouteMetrics(null)
      return () => { active = false }
    }
    getRouteMetrics(metricsLocalName)
      .then((result) => { if (active) setRouteMetrics(result) })
      .catch(() => { if (active) setRouteMetrics(null) })
    return () => { active = false }
  }, [metricsLocalName])


  // ======================================================
  // VISTA DE RED
  // ======================================================

  if (
    !local &&
    visibleLocals.length > 1
  ) {
    return (
      <div className="local-page">

        <div className="page-head">

          <span className="eyebrow">
            LOCALES
          </span>


          <h1>
            Vista de red
          </h1>


          <p>
            Indicadores generales por
            local según el ámbito de tu
            rol.
          </p>

        </div>


        <div className="local-management-grid">

          {visibleLocals.map(
            (item) => (
              <article
                className="local-management-card"
                key={
                  item.name
                }
              >

                <div className="local-management-title">

                  <MapPin
                    size={18}
                  />


                  <div>

                    <span>
                      {
                        item.operation
                      }
                    </span>


                    <h3>
                      {
                        item.name
                      }
                    </h3>

                  </div>

                </div>


                <div className="local-management-kpis">
                  {KPI_DEFS.map((def) => {
                    const k = networkMetrics?.byLocal?.[item.name]
                    const value = kpiValue(def.id, k)
                    const pending = def.id === "adherencia" && (!k || k.enImplementacion)
                    return (
                      <div key={def.id}>
                        <span>{def.label}</span>
                        <strong>{pending ? "En implementación" : fmtPct(value)}</strong>
                        {!pending && value !== null && def.id !== "exactitud" && <SignalLight tone={signalFromPercent(value)} compact />}
                      </div>
                    )
                  })}
                </div>

              </article>
            )
          )}

        </div>

      </div>
    )
  }


  // ======================================================
  // LOCAL ACTIVO
  // ======================================================

  const activeLocal =
    local ??
    getPilotLocal(
      "Vespucio"
    )


  if (!activeLocal) {
    return null
  }


  return (
    <div className="local-page">

      {/* ==================================================
          CABECERA
      ================================================== */}

      <div className="page-head local-page-head">

        <div>

          <span className="eyebrow">
            MI LOCAL
          </span>


          <h1>
            {
              activeLocal.name
            }
          </h1>


          <p>
            La revisión debe reflejar
            la realidad del local y
            movilizar soluciones.
          </p>

        </div>


        <div className="local-route-state">

          <CheckCircle2
            size={18}
          />


          <div>

            <span>
              Ruta semanal
            </span>

            <strong>
              {routeMetrics?.ultimaRuta ? "Realizada" : "Sin registros"}
            </strong>

            <small>
              {routeMetrics?.ultimaRuta
                ? `Último registro · ${new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(routeMetrics.ultimaRuta.date))}`
                : "Aparecerá al enviar la primera Ruta"}
            </small>

          </div>

        </div>

      </div>

      <section className="section local-kpi-section">
        <div className="section-head">
          <span className="eyebrow">INDICADORES DEL LOCAL</span>
          <h2>Seguimiento</h2>
        </div>

        <div className="kpi-grid">
          {KPI_DEFS.map((def) => {
            const kpis = routeMetrics?.kpis
            const value = kpiValue(def.id, kpis)
            const pending = def.id === "adherencia" && (!kpis || kpis.enImplementacion)
            const detail = pending ? "Se medirá desde que se active la implementación." : kpiDetail(def.id, kpis)
            return (
              <article className="kpi-card" key={def.id}>
                <div className="kpi-card-head">
                  <span>{def.label}</span>
                  <div className="kpi-signal-row">
                    {!pending && value !== null && def.id !== "exactitud" && <SignalLight tone={signalFromPercent(value)} compact />}
                  </div>
                </div>
                <KpiValueView def={def} kpis={kpis} />
                <p>{!pending && value === null ? "Se calcula cuando haya Ruta o Auditoría enviadas." : def.note}</p>
                {detail && <small>{detail}</small>}
                {!pending && value !== null && (
                  <div className="kpi-progress"><span style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} /></div>
                )}
              </article>
            )
          })}
        </div>
      </section>

      <EvolutivoSection weekly={routeMetrics?.evolutivo?.weekly} monthly={routeMetrics?.evolutivo?.monthly} windowStart={routeMetrics?.evolutivo?.windowStart} />

      <EstandaresSection answers={routeMetrics?.ultimaRuta?.answers} date={routeMetrics?.ultimaRuta?.date} />

    </div>
  )
}

function Bars({ rows, def }: { rows: EvoRow[]; def: KpiDef }) {
  return (
    <article>
      <div className="local-route-evolution-head"><span>{def.label}</span></div>
      {rows.map((row) => {
        const value = row.point[def.key]
        return (
          <div className="local-evo-row" key={row.label}>
            <span>{row.label}</span>
            <div className="local-route-evolution-bar"><i style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} /></div>
            <strong>{fmtPct(value)}</strong>
          </div>
        )
      })}
    </article>
  )
}

// Semanal durante los últimos 3 meses (13 semanas); lo anterior se ve mes a mes.
function EvolutivoSection({ weekly, monthly, windowStart }: { weekly?: MacroWeek[]; monthly?: MacroMonth[]; windowStart?: string }) {
  const weekRows: EvoRow[] = [...(weekly || [])].reverse().filter((w) => w.adherencia !== null || w.cumplimientoEstandares !== null || w.cumplimientoAuditoria !== null || w.exactitud !== null).map((w) => ({ label: weekLabel(w.week), point: w }))
  const monthRows: EvoRow[] = [...(monthly || [])].filter((m) => !windowStart || `${m.period}-31` < windowStart).reverse().map((m) => ({ label: monthLabel(m.period), point: m }))
  const empty = !weekRows.length && !monthRows.length
  return (
    <>
      <section className="section local-route-evolution">
        <div className="section-head local-standard-head">
          <div>
            <span className="eyebrow">EVOLUTIVO</span>
            <h2>Últimas semanas (3 meses)</h2>
          </div>
        </div>
        {empty ? (
          <div className="activity-empty">El evolutivo aparecerá cuando exista al menos una Ruta o Auditoría enviada.</div>
        ) : weekRows.length ? (
          <div className="local-route-evolution-grid local-kpi-evolution">
            {KPI_DEFS.map((def) => <Bars key={def.id} rows={weekRows} def={def} />)}
          </div>
        ) : (
          <div className="activity-empty">Sin semanas con datos en los últimos 3 meses.</div>
        )}
      </section>
      {monthRows.length > 0 && (
        <section className="section local-route-evolution">
          <div className="section-head local-standard-head">
            <div>
              <span className="eyebrow">EVOLUTIVO</span>
              <h2>Meses anteriores</h2>
            </div>
          </div>
          <div className="local-route-evolution-grid local-kpi-evolution">
            {KPI_DEFS.map((def) => <Bars key={def.id} rows={monthRows.slice(0, 12)} def={def} />)}
          </div>
        </section>
      )}
    </>
  )
}

function EstandaresSection({ answers, date }: { answers?: { itemId: string; status?: string; detail: string }[]; date?: string }) {
  const byId = new Map((answers || []).map((a) => [a.itemId, a]))
  const rows = routeQuestions
    .map((q) => ({ q, a: byId.get(q.id) }))
    .filter((r) => r.a?.status)
    .sort((x, y) => (x.a!.status === "CUMPLE" ? 1 : 0) - (y.a!.status === "CUMPLE" ? 1 : 0))
  const gaps = rows.filter((r) => r.a!.status !== "CUMPLE").length
  return (
    <section className="section">
      <div className="section-head local-standard-head">
        <div>
          <span className="eyebrow">ESTÁNDARES</span>
          <h2>Última revisión</h2>
        </div>
        {rows.length > 0 && (
          <span className="local-breach-pill">
            <AlertTriangle size={14} />
            {gaps === 0 ? "Sin brechas" : `${gaps} ${gaps === 1 ? "brecha activa" : "brechas activas"}`}
          </span>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="activity-empty">Aún no hay una Ruta enviada para este local.</div>
      ) : (
        <>
          {date && <p className="local-standard-date">Ruta del {dateShort(date)}</p>}
          <div className="standard-list">
            {rows.map(({ q, a }) => (
              <article className="standard-card" key={q.id}>
                <div className="standard-icon">{a!.status === "CUMPLE" ? <CheckCircle2 /> : <AlertTriangle />}</div>
                <div className="standard-copy">
                  <strong>{q.question}</strong>
                  <span>{a!.detail || q.section}</span>
                </div>
                <StatusBadge value={STATUS_TEXT[a!.status as string] || String(a!.status)} />
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
