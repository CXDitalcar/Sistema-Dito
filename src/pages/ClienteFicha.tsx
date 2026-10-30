import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowLeft, Check, MessageCircle, ShieldAlert } from "lucide-react"
import type { UserScope } from "../types"
import { canSeeSeguimiento } from "../services/experienceAccess"
import {
  RESULT_LABELS, STAGE_LABELS, accionReclamo, confirmarEntrega, crearReclamo, fmtDate, getFicha, registrarContacto, whatsappLink,
  type Ficha, type QuickResponse, type Reclamo, type Unidad,
} from "../services/seguimientoApi"
import "./Seguimiento.css"

export default function ClienteFicha({ currentUser }: { currentUser: UserScope }) {
  const [params] = useSearchParams()
  const nv = params.get("nv") || ""
  const rut = params.get("rut") || ""
  const [ficha, setFicha] = useState<Ficha | null>(null)
  const [error, setError] = useState("")

  async function load() {
    try {
      setFicha(await getFicha({ nv, rut }))
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar la ficha.")
    }
  }

  useEffect(() => { void load() }, [nv, rut])

  return (
    <div className="seg-page">
      <Link className="seg-back" to={canSeeSeguimiento(currentUser) ? "/seguimiento" : "/"}><ArrowLeft size={16} /> Volver</Link>
      {error && <div className="seg-error">{error}</div>}
      {!ficha && !error && <div className="seg-empty">Cargando ficha…</div>}
      {ficha && <FichaBody ficha={ficha} onChanged={load} />}
    </div>
  )
}

function FichaBody({ ficha, onChanged }: { ficha: Ficha; onChanged: () => void }) {
  const { cliente } = ficha
  return (
    <>
      <header className="seg-head">
        <div>
          <span className="eyebrow">FICHA DE CLIENTE</span>
          <h1>{cliente.nombre || "Cliente"}</h1>
          <p>Todo lo del cliente en un solo lugar: compras, traslados, avisos enviados y reclamos.</p>
        </div>
      </header>

      <section className="seg-card">
        <div className="seg-client">
          <div className="seg-kv"><span>RUT</span><strong>{cliente.rut || "—"}</strong></div>
          <div className="seg-kv"><span>Teléfono</span><strong>{cliente.telefono || "—"}</strong>{!cliente.telefonoValido && <span className="seg-fine-print">No apto para WhatsApp</span>}</div>
          <div className="seg-kv"><span>Correo</span><strong>{cliente.email || "—"}</strong></div>
          <div className="seg-kv"><span>Compras en seguimiento</span><strong>{ficha.unidades.length}</strong></div>
        </div>
      </section>

      {ficha.permisos.registrarContacto && <ContactForm ficha={ficha} onChanged={onChanged} />}

      <section className="seg-section">
        <h2>Compras</h2>
        <div className="seg-list">
          {ficha.unidades.map((u) => <UnitCard key={u.nv} unidad={u} onChanged={onChanged} />)}
        </div>
      </section>

      <section className="seg-section">
        <h2>Reclamos</h2>
        <Claims ficha={ficha} onChanged={onChanged} />
      </section>

      <section className="seg-section">
        <h2>Historial de contactos</h2>
        {ficha.contactos.length === 0 ? (
          <div className="seg-empty">Aún no hay contactos registrados.</div>
        ) : (
          <div className="seg-table-wrap">
            <table className="seg-table">
              <thead><tr><th>Fecha</th><th>NV</th><th>Etapa</th><th>Resultado</th><th>Observación</th><th>Responsable</th></tr></thead>
              <tbody>
                {ficha.contactos.map((c) => (
                  <tr key={c.id}>
                    <td>{fmtDate(c.at)}</td>
                    <td>{c.nv || "—"}</td>
                    <td>{STAGE_LABELS[c.stage] || "—"}</td>
                    <td>{RESULT_LABELS[c.result] || c.result}</td>
                    <td>{c.observacion || "—"}{c.derivadoA ? ` · Derivado a: ${c.derivadoA}` : ""}</td>
                    <td>{c.responsable}{c.source !== "APP" ? " (historial)" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

function ContactForm({ ficha, onChanged }: { ficha: Ficha; onChanged: () => void }) {
  const [nv, setNv] = useState(ficha.unidades[0]?.nv || "")
  const [quick, setQuick] = useState<QuickResponse | null>(null)
  const [obs, setObs] = useState("")
  const [msg, setMsg] = useState("")
  const [busy, setBusy] = useState(false)
  const [claimOpen, setClaimOpen] = useState(false)
  const unidad = ficha.unidades.find((u) => u.nv === nv)

  async function submit() {
    if (!quick && !obs.trim()) { setMsg("Elige una respuesta o escribe una observación."); return }
    if (quick?.abreReclamo) { setClaimOpen(true); return }
    setBusy(true)
    try {
      const res = await registrarContacto({ nv, stage: unidad?.etapa, quickId: quick?.id, result: quick ? undefined : "RESPONDIDO", observacion: obs })
      setMsg(res.message)
      setQuick(null)
      setObs("")
      onChanged()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="seg-section seg-card">
      <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>Registrar contacto</h2>
      <div className="seg-meta">Elige la situación (guía de WhatsApp) o escribe libremente. Queda en la ficha del cliente.</div>
      {ficha.unidades.length > 1 && (
        <label className="seg-field" style={{ marginTop: 12, maxWidth: 420 }}>
          <span>Compra</span>
          <select className="seg-select" value={nv} onChange={(e) => setNv(e.target.value)}>
            {ficha.unidades.map((u) => <option key={u.nv} value={u.nv}>NV {u.nv} · {u.marca} {u.modelo}</option>)}
          </select>
        </label>
      )}
      <div className="seg-quick">
        {ficha.quickResponses.map((q) => (
          <button key={q.id} type="button" className={`seg-btn small ${quick?.id === q.id ? "selected" : ""}`} onClick={() => setQuick(quick?.id === q.id ? null : q)}>{q.label}</button>
        ))}
      </div>
      {quick?.sugerencia && <p className="seg-care">Respuesta sugerida: {quick.sugerencia}</p>}
      <textarea className="seg-textarea" placeholder="Observación (opcional): resumen breve y objetivo" value={obs} onChange={(e) => setObs(e.target.value)} />
      <div className="seg-actions" style={{ justifyContent: "flex-start", marginTop: 10 }}>
        <button className="seg-btn primary" disabled={busy} onClick={submit}><Check size={16} /> {quick?.abreReclamo ? "Continuar con el reclamo" : "Registrar"}</button>
        {ficha.cliente.telefonoValido && unidad && (
          <a className="seg-btn whatsapp" href={whatsappLink(ficha.cliente.telefono, quick?.sugerencia || "")} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> Abrir WhatsApp</a>
        )}
        <span className="seg-meta">{msg}</span>
      </div>
      {claimOpen && unidad && (
        <ClaimForm nv={unidad.nv} registrarContacto defaultDetalle={obs} reclamoMensaje={ficha.reclamoMensaje} onDone={() => { setClaimOpen(false); setQuick(null); setObs(""); onChanged() }} />
      )}
    </section>
  )
}

function UnitCard({ unidad: u, onChanged }: { unidad: Unidad; onChanged: () => void }) {
  return (
    <article className="seg-card">
      <div className="seg-row">
        <div>
          <h3>{u.marca} {u.modelo}</h3>
          <div className="seg-meta">NV {u.nv} · {u.color} · VIN {u.vin || "sin asignar"}<br />{u.local} · Ejecutivo: {u.vendedor || "—"}</div>
        </div>
        <div>
          <span className={`seg-chip stage-${u.etapa}`}>{u.etapaLabel}</span>
          {u.motivo && <div className="seg-reason">{u.motivo}</div>}
          {u.letraChica && <span className="seg-fine-print">{u.letraChica}</span>}
        </div>
        <div />
      </div>
      <ul className="seg-timeline">
        <li><span>Nota de venta</span><span>{fmtDate(u.fechaNV)}{u.primeraVezSiga ? ` · cargada en la app el ${fmtDate(u.primeraVezSiga)}` : ""}</span></li>
        <li><span>Llegada (Control)</span><span>{u.llegadaEsperada ? `${fmtDate(u.llegadaEsperada)}${u.destinoControl ? ` · destino ${u.destinoControl}` : ""}` : "Sin pronóstico de llegada"}</span></li>
        {u.traslados.map((t, i) => (
          <li key={i}><span>Traslado {fmtDate(t.fecha)}</span><span>{t.retiro} → {t.destino}{t.llegadaLocal ? " (local de venta)" : " (bodega)"}{t.estado ? ` · ${t.estado}` : ""}</span></li>
        ))}
        <li><span>Recepción en local</span><span>{u.fechaRecepcion ? `${fmtDate(u.fechaRecepcion)} · ${u.recepcionFuente}` : "Pendiente"}</span></li>
        <li><span>Factura</span><span>{u.fechaFactura ? fmtDate(u.fechaFactura) : "Pendiente"}</span></li>
        <li><span>Entrega</span><span>{u.entrega ? `${fmtDate(u.entrega.fechaEntrega)} · confirmada por ${u.entrega.confirmadoPor} · ${u.entrega.percepcion.toLowerCase()}` : "Sin confirmar"}</span></li>
      </ul>
      {u.puedeConfirmarEntrega && <DeliveryForm nv={u.nv} onDone={onChanged} />}
      {u.cambiosSiga.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary className="seg-meta" style={{ cursor: "pointer" }}>Cambios detectados en SIGA ({u.cambiosSiga.length})</summary>
          <ul className="seg-history">
            {u.cambiosSiga.map((c, i) => <li key={i}><small>{fmtDate(c.at)}</small>{c.field}: “{String(c.from || "—")}” → “{String(c.to || "—")}”</li>)}
          </ul>
        </details>
      )}
    </article>
  )
}

export function DeliveryForm({ nv, onDone }: { nv: string; onDone: () => void }) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [percepcion, setPercepcion] = useState("")
  const [msg, setMsg] = useState("")
  const [busy, setBusy] = useState(false)
  async function submit() {
    if (!percepcion) { setMsg("Indica cómo quedó el cliente."); return }
    setBusy(true)
    try {
      const res = await confirmarEntrega({ nv, fechaEntrega: fecha, percepcion })
      setMsg(res.message)
      onDone()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error")
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="seg-message">
      <h4>Confirmar entrega</h4>
      <div className="seg-form-row">
        <label className="seg-field"><span>Fecha de entrega</span><input className="seg-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
        <div className="seg-field">
          <span>¿Cómo quedó el cliente?</span>
          <div className="seg-percep">
            {["PROMOTOR", "NEUTRO", "DETRACTOR"].map((p) => (
              <button key={p} type="button" className={`seg-btn small ${percepcion === p ? `selected ${p.toLowerCase()}` : ""}`} onClick={() => setPercepcion(p)}>
                {p === "PROMOTOR" ? "Promotor" : p === "NEUTRO" ? "Neutro" : "Detractor"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="seg-actions" style={{ justifyContent: "flex-start", marginTop: 10 }}>
        <button className="seg-btn primary" disabled={busy} onClick={submit}><Check size={16} /> Confirmar entrega</button>
        <span className="seg-meta">{msg}</span>
      </div>
    </div>
  )
}

function Claims({ ficha, onChanged }: { ficha: Ficha; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      {ficha.reclamos.length === 0 && <div className="seg-empty">Sin reclamos registrados.</div>}
      <div className="seg-list">
        {ficha.reclamos.map((r) => <ClaimCard key={r.id} claim={r} onChanged={onChanged} />)}
      </div>
      {ficha.permisos.crearReclamo && ficha.unidades[0] && (
        open
          ? <ClaimForm nv={ficha.unidades[0].nv} unidades={ficha.unidades} reclamoMensaje={ficha.reclamoMensaje} onDone={() => { setOpen(false); onChanged() }} />
          : <button className="seg-btn" style={{ marginTop: 12 }} onClick={() => setOpen(true)}><ShieldAlert size={16} /> Nuevo reclamo</button>
      )}
    </>
  )
}

function ClaimForm({ nv: initialNv, unidades, registrarContacto: withContact, defaultDetalle = "", reclamoMensaje, onDone }: {
  nv: string; unidades?: Unidad[]; registrarContacto?: boolean; defaultDetalle?: string; reclamoMensaje: string; onDone: () => void
}) {
  const [nv, setNv] = useState(initialNv)
  const [motivo, setMotivo] = useState("")
  const [urgencia, setUrgencia] = useState("NORMAL")
  const [detalle, setDetalle] = useState(defaultDetalle)
  const [msg, setMsg] = useState("")
  const [busy, setBusy] = useState(false)
  async function submit() {
    setBusy(true)
    try {
      const res = await crearReclamo({ nv, motivo, urgencia, detalle, registrarContacto: withContact })
      setMsg(res.message)
      onDone()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error")
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="seg-message">
      <h4>Ticket de reclamo</h4>
      <p className="seg-care">Mensaje sugerido al cliente: {reclamoMensaje}</p>
      <div className="seg-form">
        {unidades && unidades.length > 1 && (
          <label className="seg-field"><span>Compra</span>
            <select className="seg-select" value={nv} onChange={(e) => setNv(e.target.value)}>
              {unidades.map((u) => <option key={u.nv} value={u.nv}>NV {u.nv} · {u.marca} {u.modelo}</option>)}
            </select>
          </label>
        )}
        <div className="seg-form-row">
          <label className="seg-field"><span>Motivo</span><input className="seg-input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: demora en la entrega" /></label>
          <label className="seg-field"><span>Urgencia</span>
            <select className="seg-select" value={urgencia} onChange={(e) => setUrgencia(e.target.value)}><option value="NORMAL">Normal</option><option value="ALTA">Alta</option></select>
          </label>
        </div>
        <label className="seg-field"><span>Qué ocurrió y desde cuándo</span><textarea className="seg-textarea" value={detalle} onChange={(e) => setDetalle(e.target.value)} /></label>
        <div className="seg-actions" style={{ justifyContent: "flex-start" }}>
          <button className="seg-btn primary" disabled={busy} onClick={submit}><ShieldAlert size={16} /> Crear reclamo y avisar a la jefatura</button>
          <span className="seg-meta">{msg}</span>
        </div>
      </div>
    </div>
  )
}

function ClaimCard({ claim, onChanged }: { claim: Reclamo; onChanged: () => void }) {
  const [texto, setTexto] = useState("")
  const [msg, setMsg] = useState("")
  async function act(accion: "COMENTAR" | "ESCALAR" | "CERRAR" | "PEDIR_AYUDA") {
    try {
      const res = await accionReclamo({ id: claim.id, accion, texto })
      setMsg(res.message)
      setTexto("")
      onChanged()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error")
    }
  }
  const closed = claim.estado === "CERRADO"
  return (
    <article className="seg-card">
      <div className="seg-row">
        <div>
          <h3>{claim.motivo}</h3>
          <div className="seg-meta">Reclamo {claim.id} · NV {claim.nv} · creado por {claim.creadoPor} el {fmtDate(claim.creadoAt)}</div>
        </div>
        <div>
          <span className={`seg-chip ${closed ? "stage-3" : "stage-4"}`}>{closed ? "Cerrado" : `A cargo de: ${claim.nivelLabel}`}</span>
          {claim.urgencia === "ALTA" && <div className="seg-reason">Urgencia alta</div>}
          {claim.ayudaSolicitada && !closed && <span className="seg-fine-print">Pidió apoyo de Experiencia de Clientes</span>}
        </div>
        <div />
      </div>
      {claim.detalle && <p className="seg-reason" style={{ marginTop: 10 }}>{claim.detalle}</p>}
      <ul className="seg-history">
        {claim.historial.map((h, i) => <li key={i}><small>{fmtDate(h.at)} · {h.por}</small>{h.texto}</li>)}
      </ul>
      {!closed && (claim.puedeComentar || claim.puedeActuar) && (
        <div className="seg-form">
          <textarea className="seg-textarea" placeholder={claim.puedeActuar ? "Comentario, gestión realizada o resolución" : "Tu comentario"} value={texto} onChange={(e) => setTexto(e.target.value)} />
          <div className="seg-actions" style={{ justifyContent: "flex-start" }}>
            {claim.puedeComentar && <button className="seg-btn small" onClick={() => act("COMENTAR")}>Comentar</button>}
            {claim.puedeActuar && claim.nivel !== "COMERCIAL" && <button className="seg-btn small" onClick={() => act("ESCALAR")}>Traspasar al siguiente cargo</button>}
            {claim.puedeActuar && !claim.ayudaSolicitada && <button className="seg-btn small" onClick={() => act("PEDIR_AYUDA")}>Pedir ayuda a Experiencia</button>}
            {claim.puedeActuar && <button className="seg-btn small primary" onClick={() => act("CERRAR")}>Cerrar reclamo</button>}
          </div>
        </div>
      )}
      {!closed && !claim.puedeComentar && !claim.puedeActuar && (
        <span className="seg-fine-print">Experiencia puede ver este reclamo y opinar cuando la jefatura solicite ayuda.</span>
      )}
      {msg && <div className="seg-meta">{msg}</div>}
    </article>
  )
}
