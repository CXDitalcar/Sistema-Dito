import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { AlertCircle, Ban, Building2, CheckCircle2, ClipboardList, Filter, Search, Target, Users } from "lucide-react"
import { fmtDate } from "../services/seguimientoApi"
import {
  aprobarCruce, fmtPct, getFrogmi, guardarFrogmiConfig, miniVin, monthLabel, shortDate,
  type FormRatio, type FrogmiResumen, type FrogmiRow, type Pendiente, type TmRow,
} from "../services/opsApi"
import "./Seguimiento.css"
import "./Ops.css"

const barTone = (pct: number | null) => (pct === null ? "" : pct >= 80 ? "good" : pct >= 30 ? "mid" : "low")

function Ratio({ item }: { item: FormRatio }) {
  const superado = item.pct !== null && item.pct >= 80
  return (
    <div className="fr-bar">
      <span className="fr-bar-label">{item.label}</span>
      <div className={`fr-bar-track ${barTone(item.pct)}`}><i style={{ width: `${superado ? 100 : item.pct ?? 0}%` }} /></div>
      <span className="fr-bar-value">
        {item.ok}/{item.total} · {superado ? <><b>100%</b> <em>SUPERADO</em></> : fmtPct(item.pct)}
      </span>
    </div>
  )
}

export default function Frogmi() {
  const [data, setData] = useState<FrogmiResumen | null>(null)
  const [corte, setCorte] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [search, setSearch] = useState("")
  const [reload, setReload] = useState(0)

  useEffect(() => {
    getFrogmi(corte)
      .then((result) => { setData(result); setError("") })
      .catch((err) => setError(err instanceof Error ? err.message : "No fue posible cargar Frogmi."))
  }, [corte, reload])

  const refresh = (message: string) => { setNotice(message); setReload((n) => n + 1) }
  const isAdmin = data?.alcance === "RED"

  const filteredRows = useMemo(() => {
    if (!data) return []
    const q = search.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/[OQ]/g, "0").replace(/I/g, "1")
    const rows = data.rows.filter((r) => !r.exclusion && r.activo)
    if (!q) return rows
    return rows.filter((r) => r.vin.replace(/[OQ]/g, "0").replace(/I/g, "1").endsWith(q) || r.nv === search.trim())
  }, [data, search])

  if (error) return <div className="seg-page"><div className="seg-error">{error}</div></div>
  if (!data) return <div className="seg-page"><div className="seg-empty">Cargando Frogmi…</div></div>

  const cortes = [...new Set([...data.cortes, data.corte])].sort().reverse()
  const notificadas = data.porLocal.filter((l) => l.notificados > 0)
  const noActivos = data.locales.filter((l) => !data.activos[l.key])
  const exclusiones = Object.entries(data.universo.exclusiones)

  return (
    <div className="seg-page fr-page">
      <header className="seg-head">
        <div>
          {isAdmin && <Link to="/gestion" className="seg-back">← Gestión</Link>}
          <span className="eyebrow">FROGMI · RESUMEN GENERAL</span>
          <h1>Junior según notificados + Tour Manager</h1>
          <p>
            Junior: corte {data.range.label}.
            {data.ultimoFormulario ? ` Actualizado con formularios hasta el ${fmtDate(data.ultimoFormulario)}, incluyendo realizados previos asociados al VIN.` : " Aún no hay formularios Frogmi cargados."}
          </p>
        </div>
        <label className="seg-field fr-corte">
          <span>Corte</span>
          <select className="seg-select" value={data.corte} onChange={(e) => { setNotice(""); setCorte(e.target.value) }}>
            {cortes.map((c) => <option key={c} value={c}>{monthLabel(c)}</option>)}
          </select>
        </label>
      </header>

      {notice && <div className="seg-success">{notice}</div>}

      {data.universo.notificados === 0 ? (
        <div className="seg-empty">
          {isAdmin
            ? "Aún no hay VIN notificados para este corte. Se cargan en Gestión › Datos: el Informe de Notificación de Venta y la exportación de Frogmi (data 2)."
            : "Nada pendiente por ahora. Cuando haya ventas notificadas de tu local en este corte, verás aquí sus formularios."}
        </div>
      ) : null}

      {/* ---------- Tour Manager ---------- */}
      {data.tourManager.rows.length > 0 && (
        <section className="seg-section">
          <h2>Tour Manager</h2>
          <div className="macro-grid fr-tiles">
            <Tile icon={<ClipboardList size={18} />} label="Formularios planificados" value={data.tourManager.planificados} />
            <Tile icon={<CheckCircle2 size={18} />} label="Formularios válidos" value={data.tourManager.validos} tone="good" />
            <Tile icon={<AlertCircle size={18} />} label="Pendientes" value={data.tourManager.pendientes} tone={data.tourManager.pendientes ? "bad" : undefined} />
            <Tile icon={<Target size={18} />} label="Cumplimiento general" value={fmtPct(data.tourManager.pct)} />
            <Tile icon={<ClipboardList size={18} />} label="Registros físicos del período" value={data.tourManager.registros} />
          </div>
          <div className="seg-table-wrap">
            <table className="seg-table">
              <thead><tr><th>Sucursal</th><th>Planificados</th><th>Válidos</th><th>Pendientes</th><th>Fechas</th><th>Cumplimiento</th></tr></thead>
              <tbody>
                {data.tourManager.rows.map((row) => (
                  <TmLine key={row.key} row={row} corte={data.corte} editable={isAdmin} onSaved={refresh} />
                ))}
              </tbody>
            </table>
          </div>
          <ul className="fr-notes">
            {data.tourManager.rows.filter((r) => !r.activo).length > 0 && <li>{data.tourManager.rows.filter((r) => !r.activo).map((r) => r.label).join(" y ")}: no activo · fuera del denominador.</li>}
            <li>NT FJR Stellantis: excluido.</li>
            {data.tourManager.rows.filter((r) => r.extra > 0).map((r) => <li key={r.key}>{r.label} registra {r.extra} formulario{r.extra > 1 ? "s" : ""} extra en la misma quincena; el cumplimiento válido sigue siendo {r.validos}/2.</li>)}
            {data.tourManager.pendientes > 0 && <li>Queda{data.tourManager.pendientes > 1 ? "n" : ""} {data.tourManager.pendientes} formulario{data.tourManager.pendientes > 1 ? "s" : ""} pendiente{data.tourManager.pendientes > 1 ? "s" : ""} para completar la meta del mes.</li>}
          </ul>
        </section>
      )}

      {/* ---------- Junior según notificados ---------- */}
      {data.universo.notificados > 0 && (
        <section className="seg-section">
          <h2>Junior según notificados</h2>
          <div className="macro-grid fr-tiles">
            <Tile icon={<Users size={18} />} label="Universo junior activo" value={`${data.universo.junior} VIN`} />
            <Tile icon={<Building2 size={18} />} label="Sucursales notificadas" value={notificadas.map((l) => `${l.label} ${l.vin}`).join(" · ") || "—"} small />
            <Tile icon={<Filter size={18} />} label="Exclusiones" value={exclusiones.length ? exclusiones.map(([k, v]) => `${k} ${v}`).join(" · ") : "Sin exclusiones"} small />
            {isAdmin && <Tile icon={<Ban size={18} />} label="Locales no activos Frogmi" value={noActivos.map((l) => l.label).join(" y ") || "Todos activos"} small tone={noActivos.length ? "bad" : undefined} />}
          </div>

          <div className="fr-locals">
            {data.porLocal.filter((l) => l.vin > 0).map((l) => (
              <article key={l.local} className="seg-card fr-local">
                <h3>{l.label} · <span>{l.vin} VIN</span></h3>
                {l.forms.map((f) => <Ratio key={f.key} item={f} />)}
                <div className="fr-complete">VIN con 4/4 formularios: <b>{l.completos}/{l.vin}</b></div>
              </article>
            ))}
            {data.alcance === "RED" && (
              <article className="seg-card fr-local fr-summary">
                <h3>Resumen junior</h3>
                <p>VIN con 4/4 formularios OK: <b>{data.junior.completos}</b></p>
                <p>Meta por formulario: <b>≥{Math.round(data.umbral * 100)}%</b></p>
                <p>Junior oficial: <b>{data.junior.ok}/{data.junior.total} · {fmtPct(data.junior.pct)}</b></p>
                <p className={data.junior.cumplen === 4 ? "good" : "bad"}>Resultado general: <b>{data.junior.cumplen} de 4 formularios cumplen meta</b></p>
              </article>
            )}
          </div>
        </section>
      )}

      {/* ---------- Lectura operativa ajustada ---------- */}
      {isAdmin && data.universo.junior > 0 && (
        <section className="seg-section">
          <h2>Lectura operativa ajustada</h2>
          <p className="ops-count">Para no perjudicar al asistente por desfases entre la notificación y la operación física. {data.ajustada.arrastres} arrastre{data.ajustada.arrastres === 1 ? "" : "s"} del corte anterior · {data.ajustada.llegadasTardias} unidad{data.ajustada.llegadasTardias === 1 ? "" : "es"} llegada{data.ajustada.llegadasTardias === 1 ? "" : "s"} después del corte.</p>
          <div className="seg-card">
            {data.ajustada.forms.map((f) => <Ratio key={f.key} item={f} />)}
            <div className="fr-complete">Total junior ajustado: <b>{data.ajustada.total.ok}/{data.ajustada.total.total} · {fmtPct(data.ajustada.total.pct)}</b></div>
          </div>
        </section>
      )}

      {/* ---------- Entrega ---------- */}
      {data.entrega.total > 0 && (
        <section className="seg-section">
          <h2>Entrega a cliente final</h2>
          <p className="ops-count">1 entrega por VIN notificado. Sobre el {Math.round(data.umbral * 100)}% entra al sorteo. Total: {data.entrega.ok}/{data.entrega.total} · {fmtPct(data.entrega.pct)}.</p>
          <div className="seg-table-wrap">
            <table className="seg-table">
              <thead><tr><th>Vendedor</th><th>Local</th><th>VIN</th><th>Entregas</th><th>%</th><th></th></tr></thead>
              <tbody>
                {data.entrega.ranking.map((v) => (
                  <tr key={v.vendedor}><td>{v.vendedor}</td><td>{data.locales.find((l) => l.key === v.local)?.label || "—"}</td><td>{v.vin}</td><td>{v.entregas}</td><td>{fmtPct(v.pct)}</td><td>{v.sorteo && <span className="seg-chip stage-3">Sorteo</span>}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ---------- Cruces por aprobar ---------- */}
      {isAdmin && data.pendientesAprobacion.length > 0 && (
        <section className="seg-section">
          <h2>Cruces de VIN por aprobar ({data.pendientesAprobacion.length})</h2>
          <p className="ops-count">El VIN digitado en Frogmi no calza exacto. Aprueba el VIN que corresponde o rechaza el cruce. Lo aprobado se reutiliza en los cortes siguientes; solo los cruces exactos o aprobados suman.</p>
          <div className="seg-list">
            {data.pendientesAprobacion.map((p) => <PendingCard key={p.key} item={p} onDone={refresh} />)}
          </div>
        </section>
      )}

      {/* ---------- Detalle por VIN ---------- */}
      {data.rows.length > 0 && (
        <section className="seg-section">
          <h2>Detalle por VIN</h2>
          <div className="seg-filters ops-search">
            <Search size={16} />
            <input className="seg-input" placeholder="Buscar por mini VIN (últimos caracteres), VIN completo o NV" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="seg-table-wrap">
            <table className="seg-table fr-detail">
              <thead><tr><th>VIN</th><th>NV</th><th>Local</th><th>Unidad</th>{data.forms.map((f) => <th key={f.key}>{f.label}</th>)}<th>Entrega</th><th>4/4</th></tr></thead>
              <tbody>
                {filteredRows.slice(0, 250).map((r) => <VinLine key={r.vin} row={r} forms={data.forms} locales={data.locales} />)}
              </tbody>
            </table>
          </div>
          {filteredRows.length === 0 && <div className="seg-empty">No hay VIN que calcen con esa búsqueda.</div>}
        </section>
      )}

      {/* ---------- Evolutivo ---------- */}
      {isAdmin && (
        <section className="seg-section">
          <h2>Evolutivo</h2>
          <div className="seg-table-wrap">
            <table className="seg-table">
              <thead><tr><th>Cierre</th><th>Período</th><th>VIN notif.</th><th>Evaluados</th><th>Junior oficial</th><th>Entrega</th><th>Tour Manager</th><th>Nota</th></tr></thead>
              <tbody>
                {data.evolutivo.map((e) => (
                  <tr key={e.corte} className={e.estado !== "CIERRE" ? "muted" : ""}>
                    <td>{monthLabel(e.corte)}</td>
                    {e.estado === "CIERRE" ? (
                      <>
                        <td>{e.periodo}</td><td>{e.notificados}</td><td>{e.evaluados}</td>
                        <td>{fmtPct(e.junior ?? null)}{e.juniorAjustado ? ` (ajust. ${fmtPct(e.juniorAjustado)})` : ""}</td>
                        <td>{e.entregaTxt} · {fmtPct(e.entrega ?? null)}</td>
                        <td>{e.tourManagerTxt} · {fmtPct(e.tourManager ?? null)}</td>
                        <td>{e.nota}</td>
                      </>
                    ) : <td colSpan={7}>{e.nota}</td>}
                  </tr>
                ))}
                {!data.evolutivo.some((e) => e.corte === data.corte) && (
                  <tr className="current">
                    <td>{monthLabel(data.corte)} (en curso)</td><td>{data.range.label}</td><td>{data.universo.notificados}</td><td>{data.universo.junior}</td>
                    <td>{data.junior.ok}/{data.junior.total} · {fmtPct(data.junior.pct)}</td>
                    <td>{data.entrega.ok}/{data.entrega.total} · {fmtPct(data.entrega.pct)}</td>
                    <td>{data.tourManager.validos}/{data.tourManager.planificados} · {fmtPct(data.tourManager.pct)}</td>
                    <td>Calculado con los datos cargados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ---------- Locales activos ---------- */}
      {isAdmin && <ActiveLocals data={data} onSaved={refresh} />}
    </div>
  )
}

function Tile({ icon, label, value, tone, small }: { icon?: ReactNode; label: string; value: string | number; tone?: "good" | "bad"; small?: boolean }) {
  return (
    <div className={`seg-card macro-tile ${tone || ""}`}>
      <span>{icon} {label}</span>
      <strong className={small ? "small" : ""}>{value}</strong>
    </div>
  )
}

function TmLine({ row, corte, editable, onSaved }: { row: TmRow; corte: string; editable: boolean; onSaved: (m: string) => void }) {
  const [date, setDate] = useState("")
  const [busy, setBusy] = useState(false)
  async function save(fechas: string[]) {
    setBusy(true)
    try {
      await guardarFrogmiConfig({ corte, tourManager: { local: row.key, fechas } })
      setDate("")
      onSaved(`Tour Manager de ${row.label} actualizado.`)
    } catch (err) { alertError(err) } finally { setBusy(false) }
  }
  const chip = row.pct === null ? "" : row.pct >= 80 ? "good" : "mid"
  return (
    <tr className={row.activo ? "" : "muted"}>
      <td>{row.label}</td>
      <td>{row.activo ? row.planificados : "No activo"}</td>
      <td>{row.validos}</td>
      <td>{row.pendientes}</td>
      <td>
        <div className="fr-dates">
          {row.fechas.map((f) => (
            <span key={f} className="fr-date">{shortDate(f)}{editable && <button type="button" aria-label={`Quitar ${f}`} disabled={busy} onClick={() => save(row.fechas.filter((x) => x !== f))}>×</button>}</span>
          ))}
          {!row.fechas.length && !editable && "—"}
          {editable && (
            <span className="fr-add">
              <input type="date" className="seg-input" value={date} onChange={(e) => setDate(e.target.value)} aria-label={`Fecha Tour Manager ${row.label}`} />
              <button type="button" className="seg-btn small" disabled={!date || busy} onClick={() => save([...row.fechas, date])}>Agregar</button>
            </span>
          )}
        </div>
      </td>
      <td>{row.pct === null ? "—" : <span className={`fr-chip ${chip}`}>{fmtPct(row.pct)}{row.extra > 0 && row.pct >= 100 ? " + extra" : ""}</span>}</td>
    </tr>
  )
}

function VinLine({ row, forms, locales }: { row: FrogmiRow; forms: { key: string; label: string }[]; locales: { key: string; label: string }[] }) {
  const cell = (key: string) => {
    const f = row.forms[key]
    if (f) return <span className="fr-cell ok" title={`${f.metodo} · VIN digitado ${f.vinDigitado}${f.local && f.local !== row.local ? ` · hecho en ${f.local}` : ""}`}>✓ {shortDate(f.fecha)}</span>
    if (row.pendientes[key]) return <span className="fr-cell pending" title="El VIN digitado no calza exacto: Experiencia debe aprobar el cruce">Por aprobar</span>
    return <span className="fr-cell missing">Falta</span>
  }
  return (
    <tr>
      <td title={row.vin}><b>{miniVin(row.vin)}</b><small>{row.vin}</small></td>
      <td>{row.nv || "—"}</td>
      <td>{locales.find((l) => l.key === row.local)?.label || "—"}</td>
      <td>{row.marca} {row.modelo}<small>{row.vendedor}</small></td>
      {forms.map((f) => <td key={f.key}>{cell(f.key)}</td>)}
      <td>{cell("ENTREGA")}</td>
      <td>{row.juniorOk}/4</td>
    </tr>
  )
}

function PendingCard({ item, onDone }: { item: Pendiente; onDone: (m: string) => void }) {
  const [busy, setBusy] = useState(false)
  async function decide(decision: "APROBADO" | "RECHAZADO", vin?: string) {
    setBusy(true)
    try {
      const result = await aprobarCruce({ key: item.key, vin, decision })
      onDone(result.message)
    } catch (err) { alertError(err) } finally { setBusy(false) }
  }
  return (
    <article className="seg-card">
      <div className="seg-row">
        <div>
          <h3>VIN digitado «{item.vinDigitado}» · {item.local || "sin local"}</h3>
          <div className="seg-meta">
            <span>{item.metodo}</span>
            <span>{item.formularios.map((f) => `${f.form.toLowerCase()} ${shortDate(f.fecha)}`).join(" · ")}</span>
          </div>
        </div>
      </div>
      <div className="seg-actions">
        {item.candidatos.map((c) => (
          <button key={c.vin} type="button" className="seg-btn small primary" disabled={busy} onClick={() => decide("APROBADO", c.vin)}>
            Aprobar {c.vin} ({Math.round(c.score * 100)}%)
          </button>
        ))}
        <button type="button" className="seg-btn small" disabled={busy} onClick={() => decide("RECHAZADO")}>Rechazar</button>
      </div>
    </article>
  )
}

function ActiveLocals({ data, onSaved }: { data: FrogmiResumen; onSaved: (m: string) => void }) {
  const [busy, setBusy] = useState(false)
  async function toggle(key: string, value: boolean) {
    setBusy(true)
    try {
      await guardarFrogmiConfig({ corte: data.corte, activos: { [key]: value } })
      onSaved("Locales activos actualizados para este corte.")
    } catch (err) { alertError(err) } finally { setBusy(false) }
  }
  return (
    <section className="seg-section">
      <h2>Locales activos en Frogmi · {monthLabel(data.corte)}</h2>
      <p className="ops-count">Los locales no activos no penalizan: quedan fuera del denominador del junior y del Tour Manager.</p>
      <div className="fr-toggles">
        {data.locales.map((l) => (
          <label key={l.key} className="ops-toggle">
            <input type="checkbox" checked={Boolean(data.activos[l.key])} disabled={busy} onChange={(e) => toggle(l.key, e.target.checked)} />
            {l.label}
          </label>
        ))}
      </div>
    </section>
  )
}

function alertError(err: unknown) {
  window.alert(err instanceof Error ? err.message : "No fue posible guardar.")
}
