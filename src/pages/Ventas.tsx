import { useEffect, useState, type FormEvent } from "react"
import { AlertTriangle, Search } from "lucide-react"
import { fmtDate } from "../services/seguimientoApi"
import { getVentas, miniVin, shortDate, type FormEstado, type Venta, type VentasResponse } from "../services/opsApi"
import type { UserScope } from "../types"
import "./Seguimiento.css"
import "./Ops.css"

// Estado de cada NV sin datos personales del cliente. Alcance según perfil.
export default function Ventas({ currentUser }: { currentUser?: UserScope }) {
  const [data, setData] = useState<VentasResponse | null>(null)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [applied, setApplied] = useState("")
  const [soloAlertas, setSoloAlertas] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getVentas(applied, soloAlertas)
      .then((result) => { setData(result); setError("") })
      .catch((err) => setError(err instanceof Error ? err.message : "No fue posible cargar las ventas."))
      .finally(() => setLoading(false))
  }, [applied, soloAlertas])

  function submit(event: FormEvent) {
    event.preventDefault()
    setApplied(query.trim())
  }

  const isJunior = currentUser?.role === "ASISTENTE_JUNIOR"

  return (
    <div className="seg-page">
      <header className="seg-head">
        <div>
          <span className="eyebrow">VENTAS</span>
          <h1>Estado de cada NV</h1>
          <p>
            Línea de tiempo de cada venta: NV, VIN, llegada esperada, traslados, recepción, factura y entrega. Sin datos personales del cliente.
            {data?.actualizado ? ` Datos actualizados ${fmtDate(data.actualizado)}.` : ""}
          </p>
        </div>
      </header>

      <form className="seg-filters ops-search" onSubmit={submit}>
        <input className="seg-input" placeholder="Buscar por NV, VIN o mini VIN (últimos caracteres)" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button type="submit" className="seg-btn primary"><Search size={16} /> Buscar</button>
        {applied && <button type="button" className="seg-btn" onClick={() => { setQuery(""); setApplied("") }}>Limpiar</button>}
        <label className="ops-toggle">
          <input type="checkbox" checked={soloAlertas} onChange={(e) => setSoloAlertas(e.target.checked)} />
          Solo con alertas{data ? ` (${data.conAlertas})` : ""}
        </label>
      </form>

      {error && <div className="seg-error">{error}</div>}
      {loading && !data && <div className="seg-empty">Cargando ventas…</div>}

      {data && (
        data.rows.length === 0 ? (
          <div className="seg-empty">
            {applied ? "No encontré ventas con ese NV o VIN en tu ámbito." : soloAlertas ? "Nada pendiente: ninguna venta tiene alertas." : "Nada pendiente por ahora. Cuando haya ventas en tu ámbito, verás aquí su avance."}
          </div>
        ) : (
          <>
            <p className="ops-count">{data.total > data.rows.length ? `Mostrando ${data.rows.length} de ${data.total} ventas (usa el buscador para encontrar una NV).` : `${data.total} ventas.`}</p>
            <div className="seg-list">
              {data.rows.map((venta) => (
                <VentaCard key={venta.nv} venta={venta} forms={data.frogmi?.[venta.vin]} showForms={isJunior || Boolean(data.frogmi)} defaultOpen={Boolean(applied) && data.rows.length <= 3} />
              ))}
            </div>
          </>
        )
      )}
    </div>
  )
}

function VentaCard({ venta, forms, showForms, defaultOpen }: { venta: Venta; forms?: FormEstado[]; showForms: boolean; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <article className="seg-card">
      <div className="seg-row">
        <div>
          <h3>NV {venta.nv} · {venta.marca} {venta.modelo}</h3>
          <div className="seg-meta ops-meta">
            <span>{venta.local}</span>
            {venta.vendedor && <span>{venta.vendedor}</span>}
            {venta.vin ? <span>VIN {venta.vin} <b className="ops-mini">({miniVin(venta.vin)})</b></span> : <span>Sin VIN asignado</span>}
            <span>NV del {fmtDate(venta.fechaNV)}</span>
          </div>
        </div>
        <div className="seg-actions">
          {venta.nula ? <span className="seg-chip">NV nula</span> : <span className={`seg-chip stage-${venta.etapa}`}>{venta.etapaLabel}</span>}
          <button type="button" className="seg-btn small" onClick={() => setOpen(!open)}>{open ? "Ocultar" : "Ver línea de tiempo"}</button>
        </div>
      </div>

      {venta.alertas.map((a) => (
        <div key={a.tipo} className="ops-alert"><AlertTriangle size={15} /> {a.texto}</div>
      ))}
      {venta.letraChica && <div className="seg-fine-print">{venta.letraChica}</div>}

      {showForms && forms && (
        <div className="ops-forms">
          {forms.filter((f) => f.key !== "ENTREGA").map((f) => (
            <span key={f.key} className={`ops-form ${f.hecho ? "ok" : f.pendienteAprobacion ? "pending" : "missing"}`} title={f.hecho ? `${f.metodo} · VIN digitado ${f.vinDigitado}` : f.pendienteAprobacion ? `VIN digitado ${f.vinDigitado}: cruce pendiente de aprobación` : "Falta el formulario"}>
              {f.label}: {f.hecho ? `hecho ${shortDate(f.fecha)}` : f.pendienteAprobacion ? "por aprobar" : "falta"}
            </span>
          ))}
        </div>
      )}

      {open && (
        <ol className="ops-timeline">
          {venta.eventos.map((e, i) => (
            <li key={`${e.tipo}-${i}`} className={`ops-ev ev-${e.tipo.toLowerCase()}${e.estimada ? " estimada" : ""}`}>
              <span className="ops-ev-date">{e.fecha ? fmtDate(e.fecha) : "Sin fecha"}</span>
              <strong>{e.titulo}</strong>
              {e.detalle && <span className="ops-ev-detail">{e.detalle}</span>}
            </li>
          ))}
        </ol>
      )}
    </article>
  )
}
