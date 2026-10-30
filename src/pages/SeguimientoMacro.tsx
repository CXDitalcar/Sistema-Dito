import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { MessagesSquare } from "lucide-react"
import { fmtDate, getSeguimientoMacro, RESULT_LABELS, STAGE_LABELS, type SegMacro } from "../services/seguimientoApi"
import "./Seguimiento.css"

// Vista "macro" del seguimiento de clientes: totales de tu ámbito, sin datos personales.
export default function SeguimientoMacro() {
  const [data, setData] = useState<SegMacro | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    getSeguimientoMacro().then(setData).catch((err) => setError(err instanceof Error ? err.message : "No fue posible cargar el seguimiento."))
  }, [])

  if (error) return <div className="seg-page"><div className="seg-error">{error}</div></div>
  if (!data) return <div className="seg-page"><div className="seg-empty">Cargando seguimiento…</div></div>

  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—")

  return (
    <div className="seg-page">
      <header className="seg-head">
        <div>
          <span className="eyebrow">SEGUIMIENTO DE CLIENTES</span>
          <h1>Cómo vamos</h1>
          <p>Resumen de tus ventas nuevas en seguimiento: etapas, contactos, entregas y reclamos. Actualizado {fmtDate(data.actualizado)}.</p>
        </div>
      </header>

      {data.total === 0 ? (
        <div className="seg-empty">Nada pendiente por ahora. Cuando haya ventas nuevas en tu ámbito, verás aquí su avance.</div>
      ) : (
        <>
          <div className="macro-grid">
            <Tile label="Ventas en seguimiento" value={data.total} />
            <Tile label="Clientes contactados" value={data.contactados} note={pct(data.contactados, data.total)} />
            <Tile label="Respondieron" value={data.respondidos} note={pct(data.respondidos, data.contactados)} />
            <Tile label="Entregas confirmadas" value={data.entregasConfirmadas} />
            <Tile label="Promotores / neutros / detractores" value={`${data.promotores} / ${data.neutros} / ${data.detractores}`} />
            <Tile label="Reclamos abiertos" value={data.reclamosAbiertos.total} note={data.reclamosAbiertos.total ? `Sucursal ${data.reclamosAbiertos.SUCURSAL} · Marca ${data.reclamosAbiertos.MARCA} · Comercial ${data.reclamosAbiertos.COMERCIAL}` : undefined} />
          </div>

          <section className="seg-section">
            <h2>Por etapa</h2>
            <div className="macro-stages">
              {data.etapas.map((item) => (
                <div key={item.etapa} className="macro-stage">
                  <span>{STAGE_LABELS[item.etapa]}</span>
                  <div className="datos-progress"><i style={{ width: `${data.total ? (item.total / data.total) * 100 : 0}%` }} /></div>
                  <strong>{item.total}</strong>
                </div>
              ))}
            </div>
          </section>

          {data.porLocal.length > 1 && (
            <section className="seg-section">
              <h2>Por local</h2>
              <div className="seg-table-wrap">
                <table className="seg-table">
                  <thead><tr><th>Local</th><th>Ventas</th><th>Contactados</th><th>Entregas confirmadas</th><th>En camino</th><th>Recibidas</th></tr></thead>
                  <tbody>
                    {data.porLocal.map((row) => (
                      <tr key={row.local}><td>{row.local}</td><td>{row.total}</td><td>{row.contactados} ({pct(row.contactados, row.total)})</td><td>{row.entregados}</td><td>{row.etapas[1]}</td><td>{row.etapas[2]}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {data.detalle && (
            <section className="seg-section">
              <h2>Tus NV</h2>
              {data.detalle.length === 0 ? <div className="seg-empty">Nada pendiente por ahora.</div> : (
                <div className="seg-table-wrap">
                  <table className="seg-table">
                    <thead><tr><th>NV</th><th>Cliente</th><th>Unidad</th><th>Etapa</th><th>Último contacto</th><th></th></tr></thead>
                    <tbody>
                      {data.detalle.map((row) => (
                        <tr key={row.nv}>
                          <td>{row.nv}</td><td>{row.cliente}</td><td>{row.marca} {row.modelo}</td><td>{row.etapaLabel}</td>
                          <td>{row.ultimoContacto ? `${RESULT_LABELS[row.ultimoContacto.result] ?? row.ultimoContacto.result} · ${fmtDate(row.ultimoContacto.at)}` : "—"}</td>
                          <td><Link className="seg-btn small" to={`/seguimiento/cliente?nv=${row.nv}`}><MessagesSquare size={13} /> Ver</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}

function Tile({ label, value, note }: { label: string; value: number | string; note?: string }) {
  return (
    <article className="seg-card macro-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </article>
  )
}
