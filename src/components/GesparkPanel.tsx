import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { fmtPct, getGespark, monthLabel, shortDate, type GesparkResumen, type GesparkUnidad } from "../services/opsApi"

// Resumen Gespark en Datos: evolutivo, detalle del mes y avisos para revisar.
export default function GesparkPanel({ version }: { version: number }) {
  const [data, setData] = useState<GesparkResumen | null>(null)
  const [mes, setMes] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    getGespark(mes).then((result) => { setData(result); setError("") })
      .catch((err) => setError(err instanceof Error ? err.message : "No fue posible calcular Gespark."))
  }, [mes, version])

  if (error) return <div className="seg-error">{error}</div>
  if (!data) return <div className="seg-empty">Calculando Gespark…</div>

  const d = data.detalle
  const meses = [...new Set([...data.evolutivo.map((e) => e.mes), ...data.meses])].sort()
  const fromBase = data.evolutivo.find((e) => e.mes === data.mes && e.fuente === "Histórico de la calculadora")

  return (
    <div className="gk-panel">
      <h3 className="datos-subtitle">Evolutivo · Gespark realizado (Estado Color 32768)</h3>
      <div className="gk-evo">
        {data.evolutivo.map((e) => (
          <button type="button" key={e.mes} className={`seg-card gk-month ${e.mes === data.mes ? "active" : ""}`} onClick={() => setMes(e.mes)} title={e.nota || ""}>
            <span>{monthLabel(e.mes)}</span>
            <strong>{fmtPct(e.pct)}</strong>
            <span>{e.ok}/{e.total}{e.paTotal ? ` · PA ${e.paOk}/${e.paTotal}` : ""}</span>
          </button>
        ))}
      </div>

      <div className="seg-filters ops-search">
        <label className="seg-field">
          <span>Mes (fecha de traslado)</span>
          <select className="seg-select" value={data.mes} onChange={(e) => setMes(e.target.value)}>
            {meses.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </label>
        <p className="ops-count">Extranet cargada: {data.extranet.registros} VIN{data.extranet.desde ? ` (${shortDate(data.extranet.desde)} al ${shortDate(data.extranet.hasta)})` : ""}.</p>
      </div>

      {data.cobertura && <div className="ops-alert"><AlertTriangle size={15} /> {data.cobertura}</div>}
      {fromBase && <p className="ops-count">Cierre histórico de la calculadora: {fromBase.ok}/{fromBase.total} · {fmtPct(fromBase.pct)}. {fromBase.nota}. Abajo, el detalle calculado con los datos cargados.</p>}

      <div className="macro-grid">
        <article className="seg-card macro-tile"><span>Evaluadas (en extranet)</span><strong>{d.total}</strong></article>
        <article className="seg-card macro-tile good"><span>Con Gespark</span><strong>{d.ok}</strong></article>
        <article className="seg-card macro-tile"><span>Cumplimiento</span><strong>{fmtPct(d.pct)}</strong></article>
        <article className="seg-card macro-tile"><span>Sin registro en la extranet</span><strong>{d.sinExtranet.length}</strong><small>No entran al %</small></article>
      </div>

      {d.pendientes.length > 0 && <UnitTable title={`Pendientes de Gespark (${d.pendientes.length})`} rows={d.pendientes} />}
      {d.sinExtranet.length > 0 && <UnitTable title={`Sin registro en la extranet (${d.sinExtranet.length}) · descarga un rango más amplio para incluirlas`} rows={d.sinExtranet} />}
      {data.ilegibles.length > 0 && (
        <section className="seg-section">
          <h3 className="datos-subtitle">Fechas ilegibles en la planilla T ({data.ilegibles.length}) · revisar</h3>
          <p className="ops-count">No se suman a ningún mes hasta que se corrija la fecha en la T.</p>
          <div className="seg-table-wrap">
            <table className="seg-table">
              <thead><tr><th>VIN</th><th>Marca</th><th>Modelo</th><th>Fecha escrita</th><th>Retiro → Destino</th></tr></thead>
              <tbody>{data.ilegibles.map((u, i) => <tr key={`${u.vin}-${i}`}><td>{u.vin}</td><td>{u.marca}</td><td>{u.modelo}</td><td>«{u.fechaTexto}»</td><td>{u.retiro} → {u.destino}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}
      <p className="ops-count">Base: unidades Astara (Chery, JMC, Mitsubishi, KGM, Nissan, Renault, Exeed) que llegan según la T a Casona, Tobalaba o Puente Alto, sin traslados internos. Una fila por VIN (primera llegada del mes).</p>
    </div>
  )
}

function UnitTable({ title, rows }: { title: string; rows: GesparkUnidad[] }) {
  return (
    <section className="seg-section">
      <h3 className="datos-subtitle">{title}</h3>
      <div className="seg-table-wrap">
        <table className="seg-table">
          <thead><tr><th>VIN</th><th>Marca</th><th>Modelo</th><th>Llegada</th><th>Retiro → Destino</th><th>Estado extranet</th></tr></thead>
          <tbody>{rows.map((u) => <tr key={u.vin}><td>{u.vin}</td><td>{u.marca}</td><td>{u.modelo}</td><td>{shortDate(u.fecha)}</td><td>{u.retiro} → {u.destino}</td><td>{u.estado || "—"}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  )
}
