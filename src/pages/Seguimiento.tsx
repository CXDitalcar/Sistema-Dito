import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Check, ClipboardCopy, MessageCircle, Settings2, ShieldAlert, X } from "lucide-react"
import type { UserScope } from "../types"
import { hasExperienceAccess } from "../services/experienceAccess"
import {
  fmtDate, getReclamos, getSeguimiento, guardarReglas, registrarContacto, revisar, whatsappLink,
  type Bucket, type Reclamo, type SegLista, type SegRow,
} from "../services/seguimientoApi"
import "./Seguimiento.css"

const TAB_ORDER: (Bucket | "reclamos")[] = ["enviar", "reintentar", "revisar", "reclamos", "no_enviar", "en_espera", "al_dia", "fuera"]
const PAGE = 50

export default function Seguimiento({ currentUser }: { currentUser: UserScope }) {
  const [data, setData] = useState<SegLista | null>(null)
  const [reclamos, setReclamos] = useState<Reclamo[]>([])
  const [error, setError] = useState("")
  const [tab, setTab] = useState<Bucket | "reclamos">("enviar")
  const [q, setQ] = useState("")
  const [local, setLocal] = useState("")
  const [grupo, setGrupo] = useState("")
  const [etapa, setEtapa] = useState("")
  const [limit, setLimit] = useState(PAGE)
  const [showRules, setShowRules] = useState(false)
  const isExperience = hasExperienceAccess(currentUser)

  async function load() {
    try {
      const [lista, rec] = await Promise.all([getSeguimiento(), getReclamos()])
      setData(lista)
      setReclamos(rec.reclamos)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar el seguimiento.")
    }
  }

  useEffect(() => { void load() }, [])
  useEffect(() => { setLimit(PAGE) }, [tab, q, local, grupo, etapa])

  const locales = useMemo(() => [...new Set((data?.rows || []).map((r) => r.local))].sort(), [data])
  const filtered = useMemo(() => {
    if (!data || tab === "reclamos") return []
    const term = q.trim().toLowerCase()
    return data.rows.filter((r) =>
      r.bucket === tab &&
      (!local || r.local === local) &&
      (!grupo || r.grupo === grupo) &&
      (!etapa || String(r.etapa) === etapa) &&
      (!term || [r.cliente, r.rut, r.nv, r.telefono, r.vin, r.vendedor].some((v) => String(v || "").toLowerCase().includes(term)))
    )
  }, [data, tab, q, local, grupo, etapa])

  const openClaims = reclamos.filter((r) => r.estado !== "CERRADO")

  return (
    <div className="seg-page">
      <header className="seg-head">
        <div>
          <span className="eyebrow">SEGUIMIENTO DE CLIENTES · AUTOS NUEVOS</span>
          <h1>Avisos por WhatsApp</h1>
          <p>Lista del día según SIGA, Control de unidades y planilla T. Si hay duda, el caso no se envía: se revisa y se documenta.</p>
        </div>
        {isExperience && (
          <button className="seg-btn" onClick={() => setShowRules((v) => !v)}><Settings2 size={16} /> Reglas</button>
        )}
      </header>

      {data && <SourcesBar fuentes={data.fuentes} />}
      {showRules && data && <RulesPanel rules={data.rules} onSaved={load} />}
      {error && <div className="seg-error">{error}</div>}
      {!data && !error && <div className="seg-empty">Cargando seguimiento…</div>}

      {data && (
        <>
          <div className="seg-tabs" role="tablist">
            {TAB_ORDER.map((key) => (
              <button key={key} role="tab" aria-selected={tab === key} className={`seg-tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
                {key === "reclamos" ? "Reclamos abiertos" : data.buckets[key]}
                <b>{key === "reclamos" ? openClaims.length : data.counts[key]}</b>
              </button>
            ))}
          </div>

          {tab !== "reclamos" && (
            <div className="seg-filters">
              <input className="seg-input" placeholder="Buscar cliente, RUT, NV, teléfono o ejecutivo" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
              <select className="seg-select" value={local} onChange={(e) => setLocal(e.target.value)} aria-label="Sucursal">
                <option value="">Todas las sucursales</option>
                {locales.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <select className="seg-select" value={grupo} onChange={(e) => setGrupo(e.target.value)} aria-label="Grupo de marcas">
                <option value="">Todas las marcas</option>
                <option value="ASTARA">Astara</option>
                <option value="STELLANTIS">Stellantis</option>
                <option value="GEELY">Geely</option>
                <option value="OTRA">Otras</option>
              </select>
              <select className="seg-select" value={etapa} onChange={(e) => setEtapa(e.target.value)} aria-label="Etapa">
                <option value="">Todas las etapas</option>
                <option value="1">Compra confirmada</option>
                <option value="2">En camino</option>
                <option value="3">Recibido y en preparación</option>
                <option value="4">Entregado</option>
              </select>
            </div>
          )}

          {tab === "reclamos" ? (
            <ClaimsList reclamos={openClaims} />
          ) : filtered.length === 0 ? (
            <div className="seg-empty">No hay casos en esta lista con los filtros elegidos.</div>
          ) : (
            <div className="seg-list">
              {filtered.slice(0, limit).map((row) => <SegItem key={row.nv} row={row} onChanged={load} />)}
              {filtered.length > limit && (
                <button className="seg-btn" onClick={() => setLimit((l) => l + PAGE)}>Mostrar más ({filtered.length - limit} restantes)</button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SourcesBar({ fuentes }: { fuentes: SegLista["fuentes"] }) {
  const labels: Record<string, string> = { siga: "SIGA", control: "Control de unidades", traslados: "Planilla T" }
  return (
    <div className="seg-sources">
      {Object.entries(labels).map(([key, label]) => {
        const f = fuentes[key]
        const days = f?.updatedAt ? (Date.now() - new Date(f.updatedAt).getTime()) / 86400000 : null
        const cls = days === null ? "bad" : days > 2 ? "warn" : ""
        return (
          <span key={key} className={`seg-source-pill ${cls}`}>
            {label}: {f?.updatedAt ? `actualizado ${fmtDate(f.updatedAt)}` : "sin cargar"}
          </span>
        )
      })}
      <Link to="/datos" className="seg-source-pill" style={{ textDecoration: "none" }}>Ir a Datos →</Link>
    </div>
  )
}

function SegItem({ row, onChanged }: { row: SegRow; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState("")
  const [msg, setMsg] = useState("")
  const [copied, setCopied] = useState(false)

  async function act(fn: () => Promise<{ message: string }>) {
    setBusy(true)
    try {
      const res = await fn()
      setMsg(res.message)
      onChanged()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error")
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(row.mensaje || "")
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch { setCopied(false) }
  }

  const canSend = (row.bucket === "enviar" || row.bucket === "reintentar") && row.mensaje
  return (
    <article className="seg-card">
      <div className="seg-row">
        <div>
          <h3><Link to={`/seguimiento/cliente?nv=${row.nv}`}>{row.cliente || "Cliente sin nombre"}</Link></h3>
          <div className="seg-meta">
            NV {row.nv} · {row.marca} {row.modelo}<br />
            {row.local} · Ejecutivo: {row.vendedor || "—"} · {row.telefono || "sin teléfono"}
          </div>
        </div>
        <div>
          <span className={`seg-chip stage-${row.etapa}`}>{row.etapaLabel}</span>
          {row.motivo && <div className="seg-reason">{row.motivo}</div>}
          {row.letraChica && <span className="seg-fine-print">{row.letraChica}</span>}
          {row.ultimoContacto && (
            <span className="seg-fine-print">Último contacto: {fmtDate(row.ultimoContacto.at)} · {row.ultimoContacto.result.replace(/_/g, " ").toLowerCase()}</span>
          )}
        </div>
        <div className="seg-actions">
          {canSend && <button className="seg-btn primary" onClick={() => setOpen((v) => !v)}><MessageCircle size={16} /> {open ? "Cerrar" : "Ver mensaje"}</button>}
          {row.bucket === "revisar" && (
            <>
              <button className="seg-btn" disabled={busy} onClick={() => act(() => revisar({ nv: row.nv, stage: row.etapa, decision: "APROBADO", nota: note }))}><Check size={16} /> Aprobar envío</button>
              <button className="seg-btn" disabled={busy} onClick={() => act(() => revisar({ nv: row.nv, stage: row.etapa, decision: "NO_ENVIAR", nota: note }))}><X size={16} /> No enviar</button>
            </>
          )}
          <Link className="seg-btn" to={`/seguimiento/cliente?nv=${row.nv}`}>Ficha</Link>
        </div>
      </div>

      {row.bucket === "revisar" && (
        <input className="seg-input" style={{ marginTop: 10 }} placeholder="Nota de la revisión (opcional)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Nota de revisión" />
      )}

      {open && canSend && (
        <div className="seg-message">
          <h4>{row.mensajeTitulo}</h4>
          <pre>{row.mensaje}</pre>
          {row.mensajeCuidado && <p className="seg-care">{row.mensajeCuidado}</p>}
          <div className="seg-actions" style={{ justifyContent: "flex-start" }}>
            <a className="seg-btn whatsapp" href={whatsappLink(row.telefono, row.mensaje || "")} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> Abrir WhatsApp</a>
            <button className="seg-btn" onClick={copy}><ClipboardCopy size={16} /> {copied ? "Copiado" : "Copiar mensaje"}</button>
            <button className="seg-btn primary" disabled={busy} onClick={() => act(() => registrarContacto({ nv: row.nv, stage: row.etapa, quickId: "ENVIADO" }))}><Check size={16} /> Marcar como enviado</button>
          </div>
        </div>
      )}
      {msg && <div className="seg-meta" style={{ marginTop: 8 }}>{msg}</div>}
    </article>
  )
}

function ClaimsList({ reclamos }: { reclamos: Reclamo[] }) {
  if (!reclamos.length) return <div className="seg-empty">No hay reclamos abiertos.</div>
  return (
    <div className="seg-list">
      {reclamos.map((r) => (
        <article key={r.id} className="seg-card">
          <div className="seg-row">
            <div>
              <h3><Link to={`/seguimiento/cliente?nv=${r.nv}`}>{r.cliente}</Link></h3>
              <div className="seg-meta">Reclamo {r.id} · NV {r.nv} · {r.marca}</div>
            </div>
            <div>
              <span className="seg-chip stage-4"><ShieldAlert size={13} /> {r.nivelLabel}{r.urgencia === "ALTA" ? " · Urgente" : ""}</span>
              <div className="seg-reason">{r.motivo}</div>
              {r.ayudaSolicitada && <span className="seg-fine-print">Solicitó apoyo de Experiencia</span>}
            </div>
            <div className="seg-actions">
              <Link className="seg-btn" to={`/seguimiento/cliente?nv=${r.nv}`}>Ver reclamo</Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function RulesPanel({ rules, onSaved }: { rules: SegLista["rules"]; onSaved: () => void }) {
  const [soloPromotores, setSoloPromotores] = useState(rules.stellantisSoloPromotores)
  const [dias, setDias] = useState(rules.diasCompraReciente)
  const [detallePropio, setDetallePropio] = useState(Boolean(rules.detallePropio))
  const [msg, setMsg] = useState("")
  async function save() {
    try {
      await guardarReglas({ stellantisSoloPromotores: soloPromotores, diasCompraReciente: dias, detallePropio })
      setMsg("Reglas guardadas.")
      onSaved()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "No fue posible guardar.")
    }
  }
  return (
    <section className="seg-card" style={{ marginBottom: 18 }}>
      <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Reglas del seguimiento</h2>
      <div className="seg-form">
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 15 }}>
          <input type="checkbox" checked={soloPromotores} onChange={(e) => setSoloPromotores(e.target.checked)} style={{ marginTop: 4 }} />
          <span>
            Stellantis: enviar el Aviso 4 (encuesta de marca y Ditalcar Rewards) sólo a clientes que el ejecutivo marcó como promotores.
            <span className="seg-fine-print">
              Ojo: la guía indica no relacionar el beneficio con una nota positiva, y las reglas de encuesta de marca suelen prohibir invitar sólo a clientes satisfechos. Validar con la gerencia de marca.
            </span>
          </span>
        </label>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 15 }}>
          <input type="checkbox" checked={detallePropio} onChange={(e) => setDetallePropio(e.target.checked)} style={{ marginTop: 4 }} />
          <span>
            Vendedores y jefaturas ven el detalle de sus propias NV (clientes, etapa y último contacto).
            <span className="seg-fine-print">Apagado: el resto de los perfiles sólo ve totales (vista macro).</span>
          </span>
        </label>
        <label className="seg-field" style={{ maxWidth: 320 }}>
          <span>Días en que una compra cuenta como “reciente” para el Aviso 1</span>
          <input className="seg-input" type="number" min={1} max={90} value={dias} onChange={(e) => setDias(Number(e.target.value))} />
        </label>
        <div><button className="seg-btn primary" onClick={save}>Guardar reglas</button> <span className="seg-meta">{msg}</span></div>
      </div>
    </section>
  )
}
