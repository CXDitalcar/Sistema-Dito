import { useEffect, useMemo, useState } from "react"
import { ArrowRight, BarChart3, CheckCircle2 } from "lucide-react"
import { Link } from "react-router-dom"

import SignalLight from "../components/SignalLight"
import { listRequests } from "../services/requestRepository"
import { computeHomeActivities, type ActivityItem } from "../services/homeActivities"
import type { RequestItem, UserScope } from "../types"
import "./Home.css"
import SeguimientoPendientes from "../components/SeguimientoPendientes"
import FrogmiPendientes from "../components/FrogmiPendientes"

type KpiData = {
  summary: {
    validSalesTotal: number
    goal: number | string
    billingCurrentTotal: number
    compliance: number
  }
  meta: { checkedAt: string }
  stale?: boolean
}

async function getKpiData(): Promise<KpiData> {
  const response = await fetch("/api/kpi/data", { credentials: "include" })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.message || `Error ${response.status}`)
  }
  return payload as KpiData
}

export default function Home({
  userName,
  branch,
  currentUser,
  demoMode,
}: {
  userName: string
  branch: string
  currentUser: UserScope
  demoMode: boolean
}) {
  const firstName = userName.split(" ")[0] || userName
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [kpiData, setKpiData] = useState<KpiData | null>(null)

  useEffect(() => {
    let active = true
    listRequests(currentUser)
      .then((items) => {
        if (active) setRequests(items)
      })
      .catch(() => {
        if (active) setRequests([])
      })

    return () => {
      active = false
    }
  }, [currentUser.email, currentUser.role, currentUser.local])

  useEffect(() => {
    let active = true
    getKpiData()
      .then((result) => {
        if (active) setKpiData(result)
      })
      .catch(() => {
        if (active) setKpiData(null)
      })
    return () => { active = false }
  }, [])

  const { needsAction, pendingItems } = useMemo(() => computeHomeActivities(currentUser, requests), [currentUser, requests])

  return (
    <div className="home-pilot-page">
      <section className="home-pilot-head">
        <div>
          <span className="eyebrow">DITO</span>
          <h1>Hola, {firstName}</h1>
          <p>{branch} · aquí se concentra lo que necesita tu atención.</p>
        </div>
        {demoMode && <span className="home-pilot-badge">MODO PILOTO</span>}
      </section>

      <SeguimientoPendientes currentUser={currentUser} />
      <FrogmiPendientes currentUser={currentUser} />

      <section className="activity-hub-grid home-primary-grid">
        <ActivityPanel
          title="¿Qué necesitas hacer?"
          subtitle="Acciones disponibles para realizar ahora."
          items={needsAction}
          empty="No tienes nuevas acciones por realizar."
        />
        <ActivityPanel
          title="Pendientes"
          subtitle="Gestiones ya abiertas que requieren seguimiento."
          items={pendingItems}
          empty="No tienes pendientes en este momento."
        />
      </section>

      <section className="home-kpi-strip">
        <div className="home-kpi-strip-head">
          <div>
            <span className="eyebrow">KPI COMERCIALES</span>
            <strong>Resumen general</strong>
          </div>
          <Link to="/kpi">Ver KPI <ArrowRight size={14} /></Link>
        </div>
        <div className="home-kpi-mini-grid">
          <KPIMini
            label="Ventas vigentes"
            value={kpiData ? kpiData.summary.validSalesTotal : undefined}
            detail={kpiData ? `Meta dashboard: ${formatKpiValue(kpiData.summary.goal)}` : "Sin conexión"}
          />
          <KPIMini
            label="Facturación vs meta"
            value={kpiData ? kpiData.summary.billingCurrentTotal : undefined}
            detail={kpiData ? `Cumplimiento: ${formatPercent(kpiData.summary.compliance)}` : "Sin conexión"}
          />
        </div>
        <div className="home-kpi-source-note">
          <BarChart3 size={14} /> {kpiData
            ? `${kpiData.stale ? "Último snapshot válido" : "Excel KPI conectado"} · última lectura: ${formatKpiDate(kpiData.meta.checkedAt)}`
            : "Fuente KPI aún no conectada · última actualización: sin conexión."}
        </div>
      </section>
    </div>
  )
}

function ActivityPanel({
  title,
  subtitle,
  items,
  empty,
}: {
  title: string
  subtitle: string
  items: ActivityItem[]
  empty: string
}) {
  return (
    <article className="activity-panel">
      <div className="activity-panel-head">
        <div>
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
        <b>{items.length}</b>
      </div>
      <div className="activity-list">
        {items.length ? (
          items.map((item) => (
            <Link className="activity-row" to={item.to} key={item.id}>
              <SignalLight tone={item.tone ?? "green"} compact />
              <div>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </div>
              <ArrowRight size={15} />
            </Link>
          ))
        ) : (
          <div className="activity-empty"><CheckCircle2 size={17} /> {empty}</div>
        )}
      </div>
    </article>
  )
}

function KPIMini({ label, value, detail }: { label: string; value?: number | string; detail: string }) {
  return (
    <article className="home-kpi-mini-card">
      <div>
        <SignalLight tone={value === undefined ? "neutral" : "green"} compact />
        <span>{label}</span>
      </div>
      <strong>{value === undefined ? "—" : formatKpiValue(value)}</strong>
      <small>{detail}</small>
    </article>
  )
}

function formatKpiValue(value: number | string) {
  if (typeof value === "string") return value || "—"
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(value)
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("es-CL", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value || 0)
}

function formatKpiDate(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short" }).format(date)
}

