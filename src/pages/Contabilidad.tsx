import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { AlertTriangle, FileText, HelpCircle, Search, Truck } from "lucide-react"
import {
  getBonos, guardarCondicion,
  type BonoNv, type BonosRespuesta, type Canal, type CondicionNv, type EstadoLista, type ListaPrecio, type Revision,
} from "../services/contabilidadApi"
import type { UserScope } from "../types"
import { CargarArchivos, ResumenAcumuladoCard } from "./ContabilidadCarga"
import "./Contabilidad.css"

type Tab = "resumen" | "bonos" | "listas" | "cargar"
const TABS: { id: Tab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "bonos", label: "Bonos por NV" },
  { id: "listas", label: "Listas de precio" },
  { id: "cargar", label: "Cargar archivos" },
]

const REVISION: Record<Revision, { label: string; hint: string }> = {
  CALCULADO: { label: "Calculado", hint: "Con todas las condiciones de la NV confirmadas." },
  SOLO_MARCA: { label: "Por completar", hint: "Falta confirmar crédito, retoma o canal de venta." },
  MODELO_POR_CONFIRMAR: { label: "Modelo por confirmar", hint: "El modelo de SIGA no calza exacto con la lista." },
  SIN_MODELO: { label: "Sin modelo en la lista", hint: "No se encontró el modelo en la lista vigente." },
}
const CANAL: Record<Canal, string> = { TMP: "Todo medio de pago", CC: "Crédito convencional", CI: "Compra inteligente" }
const ESTADO_LISTA: Record<EstadoLista, string> = { OK: "Leída", REVISAR: "Revisar", FALTA_LECTOR: "Falta lector", GUARDADO: "Guardada" }

const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`
const millones = (n: number) => `$${(n / 1_000_000).toLocaleString("es-CL", { maximumFractionDigits: 1 })} MM`
const fecha = (iso?: string | null) => (iso ? new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${iso.slice(0, 10)}T12:00:00`)) : "—")
const fechaHora = (iso?: string | null) => (iso ? new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "—")
const nombreMes = (mes?: string | null) => (mes ? new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(new Date(`${mes}-15T12:00:00`)) : "Sin mes")

// Interfaz "Contabilidad": bonos por cobrar a la marca por NV, calculados desde la lista de precios vigente.
export default function Contabilidad({ currentUser, canManage = false }: { currentUser: UserScope; canManage?: boolean }) {
  const [params, setParams] = useSearchParams()
  const tabs = TABS.filter((t) => t.id !== "cargar" || canManage)
  const tab = (tabs.find((t) => t.id === params.get("tab"))?.id ?? "resumen") as Tab
  const [data, setData] = useState<BonosRespuesta | null>(null)
  const [error, setError] = useState("")

  const load = useCallback(() => {
    setError("")
    return getBonos().then(setData).catch((err) => setError(err instanceof Error ? err.message : "No fue posible cargar Contabilidad."))
  }, [])
  useEffect(() => { void load() }, [load])

  const firstName = currentUser.name.split(" ")[0] || currentUser.name

  return (
    <div className="conta-page">
      <header className="conta-hello">
        <h1>Hola, {firstName}</h1>
        <p>Bonos por cobrar a las marcas, calculados NV por NV desde la lista de precios vigente.</p>
      </header>

      <nav className="conta-tabs" aria-label="Secciones de Contabilidad">
        {tabs.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? "active" : ""} aria-current={tab === t.id ? "page" : undefined}
            onClick={() => setParams(t.id === "resumen" ? {} : { tab: t.id })}>{t.label}</button>
        ))}
      </nav>

      {error && <div className="conta-alert error"><AlertTriangle size={18} /> {error}</div>}
      {!data && !error && <div className="conta-card conta-muted">Cargando…</div>}

      {data && tab === "resumen" && <Resumen data={data} canManage={canManage} onGo={(t, marca) => setParams(marca ? { tab: t, marca } : { tab: t })} />}
      {data && tab === "bonos" && <Bonos data={data} canManage={canManage} marcaInicial={params.get("marca") ?? "TODAS"} onChanged={load} />}
      {data && tab === "listas" && <Listas listas={data.listas} canManage={canManage} />}
      {tab === "cargar" && canManage && <CargarArchivos onDone={() => void load()} />}
    </div>
  )
}

/* ---------------- Resumen ---------------- */
function Resumen({ data, onGo, canManage }: { data: BonosRespuesta; onGo: (tab: Tab, marca?: string) => void; canManage: boolean }) {
  const retail = data.listas.filter((l) => l.tipo === "RETAIL" && l.estado === "OK")
  if (!retail.length) {
    return (
      <section className="conta-card conta-empty">
        <FileText size={30} />
        <h2>Aún no hay listas de precio leídas</h2>
        <p>{canManage ? "Carga las listas del mes en la pestaña Cargar archivos. Apenas estén, aquí verás los bonos por cobrar." : "Apenas se carguen las listas del mes, aquí verás los bonos por cobrar."}</p>
      </section>
    )
  }
  const sum = (fn: (m: BonosRespuesta["marcas"][number]) => number) => data.marcas.reduce((s, m) => s + fn(m), 0)
  const bruto = sum((m) => m.totales.bruto)
  const nv = sum((m) => m.totales.nv)
  const calculado = sum((m) => m.totales.porRevision.CALCULADO ?? 0)
  const pendientes = sum((m) => (m.totales.porRevision.SOLO_MARCA ?? 0) + (m.totales.porRevision.MODELO_POR_CONFIRMAR ?? 0) + (m.totales.porRevision.SIN_MODELO ?? 0))
  const sinLista = sum((m) => m.totales.sinLista)
  return (
    <>
      <section className="conta-card conta-hero">
        <div>
          <span className="conta-eyebrow">BONOS POR COBRAR · RETAIL</span>
          <strong className="conta-big">{pesos(bruto)}</strong>
          <p>Bruto, con IVA · {nv} NV con bono calculado</p>
        </div>
        <div className="conta-hero-side">
          {data.marcas.map((m) => (
            <button key={m.marca} type="button" className="conta-brand-row" onClick={() => onGo("bonos", m.marca)}>
              <span>{m.marca}</span>
              <strong>{millones(m.totales.bruto)}</strong>
              <small>{m.totales.nv} NV{m.totales.sinLista ? ` · ${m.totales.sinLista} sin lista vigente` : ""}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="conta-grid">
        <Kpi tone="ok" label="Calculado completo" value={calculado} hint={REVISION.CALCULADO.hint} />
        <Kpi tone="warn" label="Por completar" value={pendientes} hint="Falta crédito, retoma o canal, o confirmar el modelo." onClick={() => onGo("bonos")} />
        <Kpi tone="neutral" label="NV sin lista vigente" value={sinLista} hint="Vendidas en fechas sin lista cargada." onClick={() => onGo("listas")} />
      </section>

      <p className="conta-foot">
        Fuente de NV: SIGA cargado en Gestión › Datos{data.siga.actualizado ? ` (actualizado ${fechaHora(data.siga.actualizado)})` : ""}.
        Las listas de flota se llevan aparte y no se suman aquí.
      </p>
      <ResumenAcumuladoCard />
    </>
  )
}

function Kpi({ tone, label, value, hint, onClick }: { tone: "ok" | "warn" | "neutral"; label: string; value: number; hint: string; onClick?: () => void }) {
  const body = (<><span>{label}</span><strong>{value.toLocaleString("es-CL")}</strong><small>{hint}</small></>)
  return onClick
    ? <button type="button" className={`conta-card conta-kpi ${tone}`} onClick={onClick}>{body}</button>
    : <div className={`conta-card conta-kpi ${tone}`}>{body}</div>
}

/* ---------------- Bonos por NV ---------------- */
type FilaMarca = BonoNv & { marca: string; condiciones: CondicionNv[] }

function Bonos({ data, marcaInicial, onChanged, canManage }: { data: BonosRespuesta; marcaInicial: string; onChanged: () => Promise<void>; canManage: boolean }) {
  const [marca, setMarca] = useState(marcaInicial)
  const [filtro, setFiltro] = useState<Revision | "TODAS">("TODAS")
  const [buscar, setBuscar] = useState("")
  const [guardando, setGuardando] = useState("")
  const [mensaje, setMensaje] = useState("")
  const todas = useMemo<FilaMarca[]>(() => data.marcas.flatMap((m) => m.filas.map((f) => ({ ...f, marca: m.marca, condiciones: m.condiciones }))), [data])
  const filas = todas.filter((f) => marca === "TODAS" || f.marca === marca)
  const q = buscar.trim().toLowerCase()
  const visibles = filas.filter((f) => (filtro === "TODAS" || f.revision === filtro) &&
    (!q || f.nv.includes(q) || f.modeloSistema.toLowerCase().includes(q) || f.local.toLowerCase().includes(q) || f.factura.toLowerCase().includes(q)))
  const conteo = (r: Revision) => filas.filter((f) => f.revision === r).length

  async function cambiar(f: FilaMarca, cambio: { financiaScf?: boolean | null; tieneRetoma?: boolean | null; canal?: Canal | null }, clave: string) {
    setGuardando(`${f.nv}-${clave}`)
    setMensaje("")
    try {
      // Se envían todas las condiciones para no perder las otras al cambiar una.
      await guardarCondicion(f.nv, { financiaScf: f.financiaScf, tieneRetoma: f.tieneRetoma, canal: f.canal, ...cambio })
      await onChanged()
      setMensaje(`NV ${f.nv} actualizada.`)
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "No fue posible guardar.")
    } finally {
      setGuardando("")
    }
  }

  if (!todas.length) return <section className="conta-card conta-muted">Aún no hay NV con bono calculado. Revisa que SIGA esté cargado y que exista una lista vigente.</section>

  return (
    <section className="conta-card">
      <div className="conta-toolbar">
        <label className="conta-select">
          <span>Marca</span>
          <select value={marca} onChange={(e) => setMarca(e.target.value)}>
            <option value="TODAS">Todas</option>
            {data.marcas.map((m) => <option key={m.marca} value={m.marca}>{m.marca} · {m.filas.length}</option>)}
          </select>
        </label>
        <label className="conta-search">
          <Search size={16} />
          <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar NV, modelo, local o factura" />
        </label>
      </div>
      <div className="conta-chips" role="group" aria-label="Filtrar por revisión">
        <button type="button" className={filtro === "TODAS" ? "active" : ""} onClick={() => setFiltro("TODAS")}>Todas · {filas.length}</button>
        {(Object.keys(REVISION) as Revision[]).filter((r) => conteo(r)).map((r) => (
          <button key={r} type="button" title={REVISION[r].hint} className={filtro === r ? "active" : ""} onClick={() => setFiltro(r)}>{REVISION[r].label} · {conteo(r)}</button>
        ))}
      </div>
      {mensaje && <p className="conta-msg">{mensaje}</p>}

      <div className="conta-table-wrap">
        <table className="conta-table">
          <thead>
            <tr>
              <th>NV</th><th>Factura</th><th>Modelo</th><th>Condiciones</th>
              <th className="num">Bono marca</th><th className="num">Financ.</th><th className="num">VPP</th><th className="num">Por cobrar</th><th>Revisión</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((f) => (
              <tr key={`${f.marca}-${f.nv}`}>
                <td><strong>{f.nv}</strong><small>{f.marca} · {f.local}</small></td>
                <td className="conta-nowrap">{f.factura || "—"}<small>{fecha(f.fecha)}</small></td>
                <td className="conta-model">{f.modeloSistema}{f.modeloLista && f.modeloLista !== f.modeloSistema && <small>Lista: {f.modeloLista}</small>}</td>
                <td className="conta-conds">
                  {f.condiciones.includes("financia") && (
                    <span><small>{f.marca === "CHERY" ? "SCF" : "Crédito"}</small>
                      <TriState value={f.financiaScf} busy={!canManage || guardando === `${f.nv}-financia`} label={`Crédito NV ${f.nv}`} onChange={(v) => void cambiar(f, { financiaScf: v }, "financia")} />
                    </span>
                  )}
                  {f.condiciones.includes("retoma") && (
                    <span><small>Retoma</small>
                      <TriState value={f.tieneRetoma} busy={!canManage || guardando === `${f.nv}-retoma`} label={`Retoma NV ${f.nv}`} onChange={(v) => void cambiar(f, { tieneRetoma: v }, "retoma")} />
                    </span>
                  )}
                  {f.condiciones.includes("canal") && (
                    <span><small>Canal</small>
                      <select className="conta-canal" value={f.canal ?? ""} disabled={!canManage || guardando === `${f.nv}-canal`} aria-label={`Canal NV ${f.nv}`}
                        onChange={(e) => void cambiar(f, { canal: (e.target.value || null) as Canal | null }, "canal")}>
                        <option value="">Sin confirmar</option>
                        {(Object.keys(CANAL) as Canal[]).map((c) => <option key={c} value={c}>{CANAL[c]}</option>)}
                      </select>
                    </span>
                  )}
                </td>
                <td className="num">{f.bono ? pesos(f.bono.marca) : "—"}</td>
                <td className="num">{f.bono ? pesos(f.bono.financiamiento) : "—"}</td>
                <td className="num">{f.bono ? pesos(f.bono.vpp) : "—"}</td>
                <td className="num"><strong>{f.bono ? pesos(f.bono.bruto) : "—"}</strong></td>
                <td><span className={`conta-tag ${f.revision.toLowerCase()}`} title={REVISION[f.revision].hint}>{REVISION[f.revision].label}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="conta-foot">Bono marca, financiamiento y VPP en neto; "Por cobrar" en bruto con IVA, redondeado a la centena.</p>
    </section>
  )
}

// Sí / No / No se sabe: lo que Contabilidad confirma por cada NV.
function TriState({ value, onChange, busy, label }: { value: boolean | null; onChange: (v: boolean | null) => void; busy: boolean; label: string }) {
  return (
    <div className={`conta-tri ${busy ? "busy" : ""}`} role="group" aria-label={label}>
      <button type="button" className={value === true ? "active yes" : ""} onClick={() => onChange(true)} disabled={busy}>Sí</button>
      <button type="button" className={value === false ? "active no" : ""} onClick={() => onChange(false)} disabled={busy}>No</button>
      <button type="button" className={value === null ? "active unk" : ""} onClick={() => onChange(null)} disabled={busy} aria-label="No se sabe"><HelpCircle size={14} /></button>
    </div>
  )
}

/* ---------------- Listas de precio (consulta; se cargan en la pestaña Cargar archivos) ---------------- */
function Listas({ listas, canManage }: { listas: ListaPrecio[]; canManage: boolean }) {
  const meses = [...new Set(listas.map((l) => l.mes || ""))].sort().reverse()
  const [mes, setMes] = useState(meses[0] ?? "")
  const delMes = listas.filter((l) => (l.mes || "") === mes)
  const retail = delMes.filter((l) => l.tipo === "RETAIL")
  const flota = delMes.filter((l) => l.tipo === "FLOTA")
  const circulares = delMes.filter((l) => l.tipo === "CIRCULAR")

  if (!listas.length) {
    return (
      <section className="conta-card conta-empty">
        <FileText size={30} />
        <h2>Aún no hay listas cargadas</h2>
        <p>{canManage ? "Se cargan una vez al mes en la pestaña Cargar archivos." : "Aparecerán cuando se carguen las del mes."}</p>
      </section>
    )
  }

  return (
    <>
      <section className="conta-card">
        <div className="conta-toolbar">
          <h2>Listas de {nombreMes(mes)}</h2>
          {meses.length > 1 && (
            <label className="conta-select">
              <span>Mes</span>
              <select value={mes} onChange={(e) => setMes(e.target.value)}>
                {meses.map((m) => <option key={m} value={m}>{nombreMes(m)}</option>)}
              </select>
            </label>
          )}
        </div>
        <p className="conta-msg">Las que dicen "Falta lector" quedan guardadas y se leen apenas se agregue el lector de su marca.</p>
        <ListaArchivos items={retail} />
      </section>

      {flota.length > 0 && (
        <section className="conta-card">
          <h2><Truck size={19} style={{ verticalAlign: "-3px", marginRight: 6 }} />Flota</h2>
          <p className="conta-msg">Listas de flota, flotillas y B2B. Se llevan aparte y nunca se usan para los bonos retail.</p>
          <ListaArchivos items={flota} />
        </section>
      )}

      {circulares.length > 0 && (
        <details className="conta-card conta-details">
          <summary>Circulares y acciones comerciales · {circulares.length}</summary>
          <ListaArchivos items={circulares} />
        </details>
      )}
    </>
  )
}

function ListaArchivos({ items }: { items: ListaPrecio[] }) {
  const orden = [...items].sort((a, b) => String(a.marca).localeCompare(String(b.marca)) || a.archivo.localeCompare(b.archivo))
  return (
    <ul className="conta-lists">
      {orden.map((l) => (
        <li key={l.sha}>
          <FileText size={20} />
          <div>
            <strong>{l.marca || "Marca sin reconocer"} · {l.titulo || l.archivo}</strong>
            <small>{l.archivo}{l.desde ? ` · vigencia ${fecha(l.desde)} al ${fecha(l.hasta)}` : ""}{l.filas ? ` · ${l.filas} modelos` : ""}</small>
            <small>Cargado por {l.cargadoPor} · {fechaHora(l.cargadoEn)}</small>
            {l.avisos.map((a) => <small key={a} className="conta-note">{a}</small>)}
            {l.observaciones.slice(0, 3).map((o) => <small key={o} className="conta-note warn">{o}</small>)}
          </div>
          <span className={`conta-tag ${l.estado === "OK" ? "calculado" : l.estado === "FALTA_LECTOR" ? "solo_marca" : l.estado === "REVISAR" ? "modelo_por_confirmar" : "sin_modelo"}`}>{ESTADO_LISTA[l.estado] ?? l.estado}</span>
        </li>
      ))}
    </ul>
  )
}
