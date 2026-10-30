import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Check, MessageCircle, PackageCheck, PhoneCall, ShieldAlert } from "lucide-react"
import type { UserScope } from "../types"
import { DeliveryForm } from "../pages/ClienteFicha"
import { derivacionAtendida, fmtDate, getPendientes, type Pendientes } from "../services/seguimientoApi"
import "../pages/Seguimiento.css"

// Pendientes del Seguimiento de clientes que aparecen en Inicio:
// confirmar entregas (ejecutivo de la NV / jefe de sucursal), clientes que piden
// hablar con su ejecutivo y reclamos a cargo según la jerarquía.
export default function SeguimientoPendientes({ currentUser }: { currentUser: UserScope }) {
  const [data, setData] = useState<Pendientes | null>(null)
  const [openNv, setOpenNv] = useState("")
  const [showAll, setShowAll] = useState(false)
  const viewAs = currentUser.testingView ? currentUser : null

  async function load() {
    try { setData(await getPendientes(viewAs)) } catch { setData(null) }
  }

  useEffect(() => { void load() }, [currentUser.email])

  if (!data) return null
  const c = data.contactos
  const contactosTotal = c ? c.enviar + c.reintentar + c.revisar : 0
  const total = data.entregas.length + data.derivaciones.length + data.reclamos.length + data.ayuda.length + contactosTotal
  if (!total) return null

  return (
    <section className="seg-pending" aria-label="Pendientes de seguimiento de clientes">
      {c && contactosTotal > 0 && (
        <article className="seg-card">
          <h3 style={{ margin: "0 0 10px", fontSize: 17 }}><MessageCircle size={17} style={{ verticalAlign: "-3px" }} /> Contactos de seguimiento pendientes</h3>
          <div className="seg-row">
            <div className="datos-summary" style={{ margin: 0 }}>
              {c.enviar > 0 && <span>{c.enviar} por enviar</span>}
              {c.reintentar > 0 && <span>{c.reintentar} por reintentar</span>}
              {c.revisar > 0 && <span>{c.revisar} por revisar</span>}
            </div>
            <div className="seg-actions"><Link className="seg-btn small primary" to="/seguimiento">Ir a Seguimiento</Link></div>
          </div>
        </article>
      )}
      {data.reclamos.length > 0 && (
        <article className="seg-card">
          <h3 style={{ margin: "0 0 10px", fontSize: 17 }}><ShieldAlert size={17} style={{ verticalAlign: "-3px" }} /> Reclamos a tu cargo ({data.reclamos.length})</h3>
          <div className="seg-list">
            {data.reclamos.map((r) => (
              <div key={r.id} className="seg-row">
                <div><strong>{r.cliente}</strong><div className="seg-meta">NV {r.nv} · {fmtDate(r.creadoAt)}</div></div>
                <div className="seg-reason">{r.motivo}{r.urgencia === "ALTA" ? " · urgente" : ""}</div>
                <div className="seg-actions"><Link className="seg-btn small primary" to={`/seguimiento/cliente?nv=${r.nv}`}>Gestionar</Link></div>
              </div>
            ))}
          </div>
        </article>
      )}

      {data.ayuda.length > 0 && (
        <article className="seg-card">
          <h3 style={{ margin: "0 0 10px", fontSize: 17 }}>Piden ayuda a Experiencia ({data.ayuda.length})</h3>
          {data.ayuda.map((r) => (
            <div key={r.id} className="seg-row">
              <div><strong>{r.cliente}</strong><div className="seg-meta">NV {r.nv} · {r.nivelLabel}</div></div>
              <div className="seg-reason">{r.motivo}</div>
              <div className="seg-actions"><Link className="seg-btn small" to={`/seguimiento/cliente?nv=${r.nv}`}>Ver reclamo</Link></div>
            </div>
          ))}
        </article>
      )}

      {data.derivaciones.length > 0 && (
        <article className="seg-card">
          <h3 style={{ margin: "0 0 10px", fontSize: 17 }}><PhoneCall size={17} style={{ verticalAlign: "-3px" }} /> Clientes que piden hablar contigo ({data.derivaciones.length})</h3>
          {data.derivaciones.map((d) => (
            <div key={d.nv} className="seg-row">
              <div><strong>{d.cliente}</strong><div className="seg-meta">NV {d.nv} · {d.marca} {d.modelo} · {d.telefono}</div></div>
              <div className="seg-reason">{d.observacion || "Pidió hablar con su ejecutivo"} <span className="seg-fine-print">{fmtDate(d.at)}</span></div>
              <div className="seg-actions">
                <button className="seg-btn small" onClick={async () => { await derivacionAtendida({ nv: d.nv }); void load() }}><Check size={14} /> Ya lo contacté</button>
              </div>
            </div>
          ))}
        </article>
      )}

      {data.entregas.length > 0 && (
        <article className="seg-card">
          <h3 style={{ margin: "0 0 4px", fontSize: 17 }}><PackageCheck size={17} style={{ verticalAlign: "-3px" }} /> Confirmar entregas ({data.entregas.length})</h3>
          <div className="seg-meta" style={{ marginBottom: 10 }}>Confirma cuando entregaste la unidad y cómo quedó el cliente. Con eso se habilita el aviso de encuesta.</div>
          {data.entregas.slice(0, showAll ? 60 : 4).map((e) => (
            <div key={e.nv} style={{ borderTop: "1px solid #222228", padding: "10px 0" }}>
              <div className="seg-row">
                <div><strong>{e.cliente}</strong><div className="seg-meta">NV {e.nv} · {e.marca} {e.modelo} · {e.local}</div></div>
                <div className="seg-meta">
                  {e.fechaRecepcion ? `Recibida ${fmtDate(e.fechaRecepcion)}` : "Sin recepción registrada"} · {e.fechaFactura ? `Facturada ${fmtDate(e.fechaFactura)}` : "Sin factura"}
                  {e.prioritaria && <span className="seg-fine-print">Ya pasaron 7 días desde la factura y la recepción</span>}
                </div>
                <div className="seg-actions">
                  <button className="seg-btn small primary" onClick={() => setOpenNv(openNv === e.nv ? "" : e.nv)}>{openNv === e.nv ? "Cerrar" : "Confirmar entrega"}</button>
                </div>
              </div>
              {openNv === e.nv && <DeliveryForm nv={e.nv} onDone={() => { setOpenNv(""); void load() }} />}
            </div>
          ))}
          {data.entregas.length > 4 && (
            <button className="seg-btn small" style={{ marginTop: 8 }} onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Ver menos" : `Ver todas (${data.entregas.length})`}
            </button>
          )}
        </article>
      )}
    </section>
  )
}
