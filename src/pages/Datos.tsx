import { useEffect, useRef, useState } from "react"
import { Database, ExternalLink, FileSpreadsheet, FolderOpen, MapPin, Tags, Trash2, Upload } from "lucide-react"
import { getLocals, loadLocals, saveLocals, type LocalDef } from "../services/localesStore"
import { getKpiSourceInfo, KPI_MANUAL_FIELDS, parsePastedKpi, saveKpiManual, saveKpiSourceUrl, uploadKpiWorkbook, type KpiSourceInfo } from "../services/kpiApi"
import { prepareUploadFile } from "../services/fileUtils"
import { BarChart3 } from "lucide-react"
import SignalLight from "../components/SignalLight"
import { getDatosEstado, uploadAndProcess, type DataKind, type DataSource, type ImportLogEntry } from "../services/datosApi"
import { fmtDate } from "../services/seguimientoApi"
import {
  DEFAULT_BRANDS,
  getAcademyResources,
  getModelCatalog,
  removeModelBrand,
  saveAcademyResources,
  type ModelBrand,
} from "../services/catalogoApi"
import GesparkPanel from "../components/GesparkPanel"
import PortalAccessEditor from "../components/PortalAccessEditor"
import ShowroomAccessEditor from "../components/ShowroomAccessEditor"
import { Link } from "react-router-dom"
import "./Seguimiento.css"
import "./Ops.css"

const OPS_KINDS: DataKind[] = ["extranet", "frogmi", "notificados"]

// Descripción de cada planilla, según los archivos reales recibidos (08-10-2026).
const SOURCE_INFO: Record<DataKind, { uso: string; formato: string }> = {
  siga: {
    uso: "Notas de venta: compra confirmada, cliente, teléfono, ejecutivo, factura y recepción.",
    formato: "Exportación SIGA (.xlsx) con N°, Fecha, Marca, Modelo, Chassis, Local, Vendedor, Cliente, R.U.T., Teléfono, Fecha Factura, Fecha Recepción.",
  },
  control: {
    uso: "Control de unidades nuevo (SharePoint): VIN asignado y llegada pronosticada → “En camino”.",
    formato: "CSV o Excel con ESTADO (NV), FECHADEASIGNACIÓN, FECHA LLEGADA, VIN, DESTINO.",
  },
  traslados: {
    uso: "Planilla T del día: llegada de la unidad al local de venta → “Recibido y en preparación”.",
    formato: "Excel con NV, FECHA TRASLADO, VIN, RETIRO, DESTINO.",
  },
  consolidado: {
    uso: "Historial de contactos ya realizados, para no repetir etapas.",
    formato: "Consolidado de clientes contactados (Cliente, RUT, Teléfono, NV contactada(s), Historial por etapa).",
  },
  operativo: {
    uso: "Historial del Excel operativo de seguimiento (estados de envío y teléfonos sin WhatsApp).",
    formato: "Seguimiento clientes OPERATIVO, hoja “Enviar a clientes”.",
  },
  extranet: {
    uso: "Gespark: estado de cada VIN en la extranet del transportista (Estado Color 32768 = realizado). Se cruza con la planilla T.",
    formato: "Listado de salidas del transportista (.xlsx) con VIN y Estado Color (y, si vienen, Fecha, Marca, Modelo, Destino, Estado Chasis).",
  },
  frogmi: {
    uso: "Formularios Frogmi realizados (Recepción, Stock, Control previo, Preparación y Entrega) con el VIN digitado.",
    formato: "Exportación “data 2”, hoja Export: Zona, Cadena, Fecha, Tienda, Actividad, VIN del Vehículo, Marca, Modelo, ID Evento.",
  },
  notificados: {
    uso: "Universo Frogmi: VIN notificados a la marca. Se consolida del 15 al 15 por Fecha Venta; local y vendedor salen del cruce con SIGA.",
    formato: "Informe de Notificación de Venta (Chile) del portal de marca (.xlsx), con la fila de encabezados “Vehículo: VIN”.",
  },
}

const IN_CONSTRUCTION = [
  { title: "Encuestas", text: "Reportes de encuestas Astara y Stellantis (NPS, SSI, bonificación)." },
]

export default function Datos() {
  const [fuentes, setFuentes] = useState<DataSource[]>([])
  const [log, setLog] = useState<ImportLogEntry[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const data = await getDatosEstado()
      setFuentes(data.fuentes)
      setLog(data.log)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible leer el estado de los datos.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  return (
    <div className="seg-page">
      <header className="seg-head">
        <div>
          <span className="eyebrow">DATOS</span>
          <h1>Planillas de origen</h1>
          <p>
            Sube aquí las planillas tal como las descargas. La app quita duplicados y actualiza cada NV con la
            última lectura, sin perder la fecha en que apareció por primera vez.
          </p>
        </div>
      </header>

      {error && <div className="seg-error">{error}</div>}
      {loading && <div className="seg-empty">Cargando estado de las fuentes…</div>}

      <section className="seg-section">
        <h2>KPI comercial</h2>
        <KpiSourceCard />
      </section>

      <section className="seg-section">
        <h2>Solicitudes y Academia</h2>
        <div className="datos-grid">
          <PriceListCard onDone={load} />
          <ResourcesCard />
          <LocalsCard />
        </div>
      </section>

      <section className="seg-section">
        <h2>Inicio y accesos</h2>
        <div className="datos-grid">
          <PortalAccessEditor />
          <ShowroomAccessEditor />
        </div>
      </section>

      <h2 className="datos-subtitle">Seguimiento de clientes y Ventas</h2>
      <div className="datos-grid">
        {fuentes.filter((fuente) => !OPS_KINDS.includes(fuente.kind)).map((fuente) => (
          <SourceCard key={fuente.kind} fuente={fuente} onDone={load} />
        ))}
        {IN_CONSTRUCTION.map((item) => (
          <article key={item.title} className="seg-card datos-card disabled">
            <div className="seg-chip"><SignalLight tone="neutral" compact /> En construcción</div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>

      <section className="seg-section">
        <h2>Frogmi</h2>
        <p className="datos-note">Sube el Informe de Notificación de Venta y la exportación de Frogmi. La medición se ve en <Link to="/frogmi">Gestión › Frogmi</Link>, donde también se aprueban los cruces de VIN, los locales activos y el Tour Manager.</p>
        <div className="datos-grid">
          {fuentes.filter((fuente) => fuente.kind === "notificados" || fuente.kind === "frogmi").map((fuente) => (
            <SourceCard key={fuente.kind} fuente={fuente} onDone={load} />
          ))}
        </div>
      </section>

      <section className="seg-section">
        <h2>Gespark</h2>
        <p className="datos-note">Se usa la planilla T ya cargada (acumulada) y el listado de la extranet del transportista.</p>
        <div className="datos-grid">
          {fuentes.filter((fuente) => fuente.kind === "extranet").map((fuente) => (
            <SourceCard key={fuente.kind} fuente={fuente} onDone={load} />
          ))}
        </div>
        <GesparkPanel version={log.length} />
      </section>

      <section className="seg-section">
        <h2>Historial de cargas</h2>
        {log.length === 0 ? (
          <div className="seg-empty">Todavía no hay cargas registradas.</div>
        ) : (
          <div className="seg-table-wrap">
            <table className="seg-table">
              <thead>
                <tr><th>Fecha</th><th>Fuente</th><th>Archivo</th><th>Por</th><th>Resultado</th></tr>
              </thead>
              <tbody>
                {log.map((entry, index) => (
                  <tr key={`${entry.at}-${index}`}>
                    <td>{fmtDate(entry.at)}</td>
                    <td>{entry.label}</td>
                    <td>{entry.fileName}</td>
                    <td>{entry.byName || entry.by}</td>
                    <td>{entry.ok && entry.summary ? summaryText(entry) : <span style={{ color: "#ff9097" }}>{entry.error}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function summaryText(entry: ImportLogEntry) {
  const s = entry.summary!
  return `${s.nuevos} nuevos · ${s.actualizados} actualizados · ${s.duplicados} duplicados${s.errores ? ` · ${s.errores} con error` : ""}`
}

function SourceCard({ fuente, onDone }: { fuente: DataSource; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<{ label: string; percent: number } | null>(null)
  const [result, setResult] = useState<ImportLogEntry | null>(null)
  const [error, setError] = useState("")
  const info = SOURCE_INFO[fuente.kind]
  const last = result || fuente.ultimaCarga
  const tone = last ? "green" : "neutral"

  async function handleFile(file?: File | null) {
    if (!file) return
    setError("")
    setResult(null)
    try {
      const entry = await uploadAndProcess(fuente.kind, file, (label, percent) => setProgress({ label, percent }))
      setResult(entry)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar el archivo.")
    } finally {
      setProgress(null)
      if (input.current) input.current.value = ""
    }
  }

  return (
    <article className="seg-card datos-card">
      <div className="seg-chip"><SignalLight tone={tone} compact /> {last ? `Última carga: ${fmtDate(last.at)}` : "Sin cargas"}</div>
      <h3><FileSpreadsheet size={18} style={{ verticalAlign: "-3px", marginRight: 6 }} />{fuente.label}</h3>
      <p>{info.uso}</p>
      <div className="seg-meta">
        <Database size={13} style={{ verticalAlign: "-2px" }} /> {fuente.registros.toLocaleString("es-CL")} registros guardados
        {last && <><br />Archivo: {last.fileName} · {last.byName || last.by}</>}
        <span className="seg-fine-print">Formato: {info.formato}</span>
      </div>
      {last?.summary && (
        <div className="datos-summary">
          <span>{last.summary.leidos} leídos</span>
          <span>{last.summary.nuevos} nuevos</span>
          <span>{last.summary.actualizados} actualizados</span>
          <span>{last.summary.duplicados} duplicados</span>
          {last.summary.errores > 0 && <span>{last.summary.errores} con error</span>}
        </div>
      )}
      {progress && (
        <>
          <div className="datos-progress"><i style={{ width: `${progress.percent}%` }} /></div>
          <div className="seg-meta">{progress.label}</div>
        </>
      )}
      {error && <div className="seg-error" style={{ marginTop: 10 }}>{error}</div>}
      <label className="seg-btn primary" style={{ marginTop: 12, position: "relative" }}>
        <Upload size={16} /> {progress ? "Cargando…" : "Subir archivo"}
        <input
          ref={input}
          className="datos-file-input"
          type="file"
          accept=".xlsx,.xlsm,.csv"
          disabled={Boolean(progress)}
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </label>
    </article>
  )
}


// ======================================================
// LISTAS DE PRECIOS → modelos para las solicitudes
// ======================================================

function PriceListCard({ onDone }: { onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [catalog, setCatalog] = useState<ModelBrand[]>([])
  const [marca, setMarca] = useState("")
  const [otraMarca, setOtraMarca] = useState("")
  const [progress, setProgress] = useState<{ label: string; percent: number } | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [open, setOpen] = useState("")

  async function refresh() {
    setCatalog(await getModelCatalog(true))
  }
  useEffect(() => { void refresh() }, [])

  const brand = marca === "__OTRA__" ? otraMarca.trim() : marca

  async function handleFile(file?: File | null) {
    if (!file) return
    setError("")
    setMessage("")
    if (!brand) {
      setError("Primero elige la marca de la lista de precios.")
      if (input.current) input.current.value = ""
      return
    }
    try {
      const entry = await uploadAndProcess("precios", file, (label, percent) => setProgress({ label, percent }), { marca: brand })
      setMessage(`Lista de ${brand} cargada: ${(entry as ImportLogEntry & { modelos?: number }).modelos ?? ""} modelos.`)
      await refresh()
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar la lista.")
    } finally {
      setProgress(null)
      if (input.current) input.current.value = ""
    }
  }

  async function remove(name: string) {
    if (!window.confirm(`¿Quitar la lista de ${name}? Sus modelos dejarán de aparecer en las solicitudes.`)) return
    await removeModelBrand(name)
    await refresh()
  }

  const total = catalog.reduce((sum, item) => sum + item.modelos.length, 0)

  return (
    <article className="seg-card datos-card">
      <div className="seg-chip"><SignalLight tone={catalog.length ? "green" : "neutral"} compact /> {catalog.length ? `${catalog.length} marcas · ${total} modelos` : "Sin listas"}</div>
      <h3><Tags size={18} style={{ verticalAlign: "-3px", marginRight: 6 }} />Listas de precios</h3>
      <p>Los modelos de cada lista aparecen para elegir en las solicitudes (eficiencia, seguridad, fichas). Siempre queda la opción “Otro”.</p>
      <div className="seg-meta">
        <span className="seg-fine-print">Formato: Excel (.xlsx) con los modelos en la <strong>primera columna</strong> de la primera hoja. Subir otra lista de la misma marca la reemplaza.</span>
      </div>
      <div className="datos-inline-form">
        <select className="seg-select" value={marca} onChange={(event) => setMarca(event.target.value)}>
          <option value="">Marca de la lista…</option>
          {DEFAULT_BRANDS.map((item) => <option key={item} value={item}>{item}</option>)}
          <option value="__OTRA__">Otra marca…</option>
        </select>
        {marca === "__OTRA__" && (
          <input className="seg-input" placeholder="Nombre de la marca" value={otraMarca} onChange={(event) => setOtraMarca(event.target.value)} />
        )}
      </div>
      {progress && (
        <>
          <div className="datos-progress"><i style={{ width: `${progress.percent}%` }} /></div>
          <div className="seg-meta">{progress.label}</div>
        </>
      )}
      {message && <div className="seg-meta" style={{ color: "#8fe3a6", marginTop: 8 }}>{message}</div>}
      {error && <div className="seg-error" style={{ marginTop: 10 }}>{error}</div>}
      <label className="seg-btn primary" style={{ marginTop: 12, position: "relative" }}>
        <Upload size={16} /> {progress ? "Cargando…" : "Subir lista de precios"}
        <input
          ref={input}
          className="datos-file-input"
          type="file"
          accept=".xlsx,.xlsm,.csv"
          disabled={Boolean(progress)}
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </label>
      {catalog.length > 0 && (
        <div className="datos-brand-list">
          {catalog.map((item) => (
            <div key={item.marca} className="datos-brand">
              <button className="datos-brand-name" onClick={() => setOpen(open === item.marca ? "" : item.marca)}>
                <strong>{item.marca}</strong> · {item.modelos.length} modelos{item.at ? ` · ${fmtDate(item.at)}` : ""}
              </button>
              <button className="seg-btn small" title="Quitar lista" onClick={() => void remove(item.marca)}><Trash2 size={14} /></button>
              {open === item.marca && <div className="datos-brand-models">{item.modelos.join(" · ")}</div>}
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

// ======================================================
// RECURSOS DE ACADEMIA → enlace a la carpeta de SharePoint
// ======================================================

function ResourcesCard() {
  const [url, setUrl] = useState("")
  const [saved, setSaved] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getAcademyResources()
      .then((value) => { setUrl(value.carpetaUrl || ""); setSaved(value.carpetaUrl || "") })
      .catch(() => undefined)
  }, [])

  async function save() {
    setBusy(true)
    setError("")
    setMessage("")
    try {
      const result = await saveAcademyResources(url.trim())
      setSaved(result.carpetaUrl)
      setUrl(result.carpetaUrl)
      setMessage(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar el enlace.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="seg-card datos-card">
      <div className="seg-chip"><SignalLight tone={saved ? "green" : "neutral"} compact /> {saved ? "Enlace configurado" : "Sin enlace"}</div>
      <h3><FolderOpen size={18} style={{ verticalAlign: "-3px", marginRight: 6 }} />Carpeta de Recursos (Academia)</h3>
      <p>Enlace a la carpeta de SharePoint que aparecerá como botón en los Recursos de Academia.</p>
      <div className="datos-inline-form">
        <input className="seg-input" placeholder="https://ditalcar.sharepoint.com/…" value={url} onChange={(event) => setUrl(event.target.value)} />
      </div>
      {message && <div className="seg-meta" style={{ color: "#8fe3a6", marginTop: 8 }}>{message}</div>}
      {error && <div className="seg-error" style={{ marginTop: 10 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button className="seg-btn primary" disabled={busy || url.trim() === saved} onClick={() => void save()}>Guardar enlace</button>
        {saved && (
          <a className="seg-btn" href={saved} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Probar enlace</a>
        )}
      </div>
    </article>
  )
}


// ======================================================
// LOCALES DE LA RED
// ======================================================

function LocalsCard() {
  const [locals, setLocals] = useState<LocalDef[]>(getLocals(true))
  const [name, setName] = useState("")
  const [brands, setBrands] = useState<string[]>([])
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [showAll, setShowAll] = useState(false)

  useEffect(() => { void loadLocals().then((list) => setLocals([...list])) }, [])

  function update(next: LocalDef[]) { setLocals(next); setDirty(true); setMessage("") }

  function add() {
    const clean = name.trim()
    if (!clean) return
    if (locals.some((local) => local.name.toLowerCase() === clean.toLowerCase())) { setError("Ese local ya existe."); return }
    setError("")
    update([...locals, { name: clean, brands, operation: brands.includes("Geely") ? "GEELY" : brands.some((b) => ["Jeep", "RAM", "Peugeot", "Fiat", "Citroën", "Leapmotor"].includes(b)) ? "STELLANTIS" : "GENERAL", active: true }])
    setName("")
    setBrands([])
  }

  async function save() {
    setError("")
    try {
      const result = await saveLocals(locals)
      setLocals([...result.locales])
      setDirty(false)
      setMessage(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar.")
    }
  }

  const sorted = [...locals].sort((a, b) => a.name.localeCompare(b.name, "es"))
  const visible = showAll ? sorted : sorted.slice(0, 8)

  return (
    <article className="seg-card datos-card">
      <div className="seg-chip"><SignalLight tone="green" compact /> {locals.filter((l) => l.active).length} locales activos</div>
      <h3><MapPin size={18} style={{ verticalAlign: "-3px", marginRight: 6 }} />Locales</h3>
      <p>Los locales que aparecen en usuarios, solicitudes y filtros. Escríbelos igual que en 02_Usuarios.</p>
      <div className="datos-brand-list" style={{ borderTop: 0, paddingTop: 0 }}>
        {visible.map((local) => (
          <div key={local.name} className="datos-brand">
            <span className="datos-brand-name" style={{ opacity: local.active ? 1 : 0.5 }}>
              <strong>{local.name}</strong>{local.brands.length ? ` · ${local.brands.join(", ")}` : ""}
            </span>
            <button className="seg-btn small" onClick={() => update(locals.map((l) => l.name === local.name ? { ...l, active: !l.active } : l))}>
              {local.active ? "Desactivar" : "Activar"}
            </button>
          </div>
        ))}
        {sorted.length > 8 && (
          <button className="seg-btn small" onClick={() => setShowAll((v) => !v)}>{showAll ? "Ver menos" : `Ver todos (${sorted.length})`}</button>
        )}
      </div>
      <div className="datos-inline-form">
        <input className="seg-input" placeholder="Nombre del local nuevo" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="user-chips">
          {DEFAULT_BRANDS.map((brand) => (
            <button key={brand} type="button" className={`user-chip ${brands.includes(brand) ? "on" : ""}`} onClick={() => setBrands((cur) => cur.includes(brand) ? cur.filter((b) => b !== brand) : [...cur, brand])}>{brand}</button>
          ))}
        </div>
        <button className="seg-btn" disabled={!name.trim()} onClick={add}>Agregar local</button>
      </div>
      {error && <div className="seg-error" style={{ marginTop: 10 }}>{error}</div>}
      {message && <div className="seg-meta" style={{ color: "#8fe3a6", marginTop: 8 }}>{message}</div>}
      <button className="seg-btn primary" style={{ marginTop: 12 }} disabled={!dirty} onClick={() => void save()}>Guardar cambios</button>
    </article>
  )
}


// ======================================================
// KPI · 4 formas de cargar (archivo, enlace, pegar datos, foto + cifras)
// ======================================================

type KpiTab = "ARCHIVO" | "ENLACE" | "PEGAR" | "FOTO"
const KPI_TABS: { key: KpiTab; label: string }[] = [
  { key: "ARCHIVO", label: "Subir archivo" },
  { key: "ENLACE", label: "Enlace Excel Online" },
  { key: "PEGAR", label: "Pegar datos" },
  { key: "FOTO", label: "Foto + cifras" },
]
const MODE_LABEL: Record<string, string> = { upload: "Archivo subido", url: "Excel Online por enlace", manual: "Cifras ingresadas (pegadas o con foto)" }

function KpiSourceCard() {
  const [info, setInfo] = useState<KpiSourceInfo | null>(null)
  const [tab, setTab] = useState<KpiTab>("ARCHIVO")
  const [progress, setProgress] = useState<number | null>(null)
  const [url, setUrl] = useState("")
  const [pasted, setPasted] = useState("")
  const [values, setValues] = useState<Record<string, string>>({ month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) })
  const [photo, setPhoto] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const input = useRef<HTMLInputElement>(null)

  async function refresh() {
    try { const value = await getKpiSourceInfo(); setInfo(value); setUrl(value.url || "") } catch { setInfo(null) }
  }
  useEffect(() => { void refresh() }, [])

  async function run(task: () => Promise<{ message: string }>) {
    setBusy(true); setError(""); setMessage("")
    try { const result = await task(); setMessage(result.message); await refresh() }
    catch (err) { setError(err instanceof Error ? err.message : "No fue posible guardar.") }
    finally { setBusy(false); setProgress(null) }
  }

  function applyPaste() {
    const { found, unknown } = parsePastedKpi(pasted)
    const count = Object.keys(found).length
    setValues((current) => ({ ...current, ...found }))
    setTab("FOTO")
    setMessage(count ? `Reconocí ${count} cifras. Revísalas y guarda.${unknown.length ? ` No reconocí: ${unknown.slice(0, 5).join(", ")}.` : ""}` : "")
    setError(count ? "" : "No reconocí cifras. Pega dos columnas: indicador y valor.")
  }

  async function saveManual() {
    await run(async () => {
      const prepared = photo ? await prepareUploadFile(photo) : null
      return saveKpiManual(values, prepared ? { fileName: prepared.name, contentType: prepared.type, dataBase64: prepared.base64 } : null, !photo)
    })
    setPhoto(null)
  }

  return (
    <article className="seg-card datos-card" style={{ maxWidth: "none" }}>
      <div className="seg-chip"><SignalLight tone={info?.activeMode ? "green" : "neutral"} compact /> {info?.activeMode ? `Fuente activa: ${MODE_LABEL[info.activeMode] ?? info.activeMode}` : "Sin fuente"}{info?.lastSnapshotAt ? ` · ${fmtDate(info.lastSnapshotAt)}` : ""}</div>
      <h3><BarChart3 size={18} style={{ verticalAlign: "-3px", marginRight: 6 }} />Fuente KPI del dashboard</h3>
      <p>Elige la forma que te acomode. La última que uses queda como fuente activa para Inicio y KPI.</p>
      <div className="datos-tabs">
        {KPI_TABS.map((item) => (
          <button key={item.key} type="button" className={tab === item.key ? "on" : ""} onClick={() => { setTab(item.key); setError(""); setMessage("") }}>{item.label}</button>
        ))}
      </div>

      {tab === "ARCHIVO" && (
        <div className="datos-inline-form">
          <span className="seg-fine-print">Excel del Dashboard (.xlsx / .xlsm) con hojas DASHBOARD y GRAFICOS. Se sube por partes, aunque pese 60 MB o más.</span>
          {progress !== null && <div className="datos-progress"><i style={{ width: `${progress}%` }} /></div>}
          <label className="seg-btn primary" style={{ position: "relative" }}>
            <Upload size={16} /> {busy ? "Subiendo y validando…" : "Subir archivo KPI"}
            <input ref={input} type="file" accept=".xlsx,.xlsm" className="datos-file-input" disabled={busy}
              onChange={(e) => { const file = e.target.files?.[0]; if (file) void run(() => uploadKpiWorkbook(file, setProgress)); e.target.value = "" }} />
          </label>
        </div>
      )}

      {tab === "ENLACE" && (
        <div className="datos-inline-form">
          <input className="seg-input" placeholder="https://…/dashboard.xlsx" value={url} onChange={(e) => setUrl(e.target.value)} />
          <span className="seg-fine-print">Debe abrirse sin iniciar sesión (enlace de descarga). Si Microsoft lo pide, usa "Subir archivo".</span>
          <button className="seg-btn primary" disabled={busy || !url.trim()} onClick={() => void run(() => saveKpiSourceUrl(url.trim()))}>Guardar, probar y activar</button>
        </div>
      )}

      {tab === "PEGAR" && (
        <div className="datos-inline-form">
          <span className="seg-fine-print">Copia desde Excel dos columnas (indicador y valor) y pégalas aquí. Ej.: "Meta	309" · "Facturación mes · nuevos	205".</span>
          <textarea className="seg-input" style={{ minHeight: 140 }} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder={"Meta\t309\nFacturación mes · nuevos\t205\nFacturación mes · usados\t18"} />
          <button className="seg-btn primary" disabled={!pasted.trim()} onClick={applyPaste}>Leer datos pegados</button>
        </div>
      )}

      {tab === "FOTO" && (
        <div className="datos-inline-form">
          <span className="seg-fine-print">Sube una foto o captura del dashboard (se muestra tal cual en KPI) y escribe las cifras principales. La foto no se lee automáticamente.</span>
          <label className="seg-btn" style={{ position: "relative", justifySelf: "start" }}>
            <Upload size={16} /> {photo ? photo.name : "Elegir foto (opcional)"}
            <input type="file" accept="image/*" className="datos-file-input" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          </label>
          <div className="datos-kpi-grid">
            <label className="seg-field"><span>Mes</span>
              <select className="seg-select" value={values.month} onChange={(e) => setValues({ ...values, month: e.target.value })}>
                {["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"].map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
              </select>
            </label>
            <label className="seg-field"><span>Año</span><input className="seg-input" value={values.year} onChange={(e) => setValues({ ...values, year: e.target.value })} /></label>
            {KPI_MANUAL_FIELDS.map((field) => (
              <label key={field.key} className="seg-field"><span>{field.label}</span>
                <input className="seg-input" inputMode="decimal" value={values[field.key] ?? ""} onChange={(e) => setValues({ ...values, [field.key]: e.target.value })} />
              </label>
            ))}
          </div>
          <button className="seg-btn primary" disabled={busy} onClick={() => void saveManual()}>Guardar cifras KPI</button>
        </div>
      )}

      {error && <div className="seg-error" style={{ marginTop: 10 }}>{error}</div>}
      {message && <div className="seg-meta" style={{ color: "#8fe3a6", marginTop: 8 }}>{message}</div>}
    </article>
  )
}
