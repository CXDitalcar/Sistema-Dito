import { useCallback, useEffect, useState } from "react"
import { routeLocals } from "../data/routeExperience"
import {
  descargarPlantillaHistorico,
  descargarRespaldo,
  getImplementacion,
  getResumenRespaldo,
  guardarMacroManual,
  importarHistorico,
  listMacroManual,
  setImplementacion,
  vaciarDetalle,
  type Implementacion,
  type ImportResult,
  type MacroManual,
  type ResumenRespaldo,
} from "../services/ditoAdminApi"
import "./AdminDito.css"

const fmtDate = (v?: string | null) => (v ? new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(v)) : "—")
const isoDaysAgo = (days: number) => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10) }

export default function AdminDito() {
  return (
    <div className="dadm-page">
      <header className="dadm-head">
        <span className="dadm-eyebrow">GESTIÓN INTERNA · SOLO ADMINISTRADORES DE DITO</span>
        <h1>Administración de DITO</h1>
        <p>Interruptor de la Ruta de Experiencia, respaldo y vaciado del detalle, carga de evolutivos anteriores.</p>
      </header>
      <ImplementacionCard />
      <RespaldoCard />
      <HistoricoCard />
      <CifrasCard />
    </div>
  )
}

function ImplementacionCard() {
  const [state, setState] = useState<Implementacion | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")
  useEffect(() => { getImplementacion().then(setState).catch((e) => setMsg(e.message)) }, [])
  const toggle = async () => {
    if (!state) return
    const next = !state.active
    if (!window.confirm(next ? "Se activa la implementación: la Adherencia empezará a contarse desde hoy (1 Ruta por semana de la jefatura)." : "Se desactiva la implementación: la tarjeta Adherencia mostrará “En implementación”. Lo ya medido se conserva.")) return
    setBusy(true); setMsg("")
    try { setState(await setImplementacion(next)) } catch (e) { setMsg((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <section className="dadm-card">
      <h2>Implementación de la Ruta de Experiencia</h2>
      <p>Cuando está activa, la <b>Adherencia</b> mide 1 Ruta por semana realizada por la jefatura del local, contada desde la fecha de activación. Apagada, la tarjeta muestra “En implementación”.</p>
      {state ? (
        <div className="dadm-row">
          <span className={`dadm-pill ${state.active ? "on" : "off"}`}>{state.active ? "Activa" : "Apagada"}</span>
          <small>{state.activatedAt ? `Activada el ${fmtDate(state.activatedAt)}` : "Nunca activada"}{state.updatedBy ? ` · último cambio: ${state.updatedBy}` : ""}</small>
          <button className="dadm-btn" disabled={busy} onClick={toggle}>{state.active ? "Desactivar" : "Activar implementación"}</button>
        </div>
      ) : <small>Cargando…</small>}
      {msg && <p className="dadm-err">{msg}</p>}
    </section>
  )
}

function RespaldoCard() {
  const [corte, setCorte] = useState(isoDaysAgo(60))
  const [resumen, setResumen] = useState<ResumenRespaldo | null>(null)
  const [respaldo, setRespaldo] = useState<{ respaldoId: string; sha256: string; fileName: string } | null>(null)
  const [conf, setConf] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")
  const [err, setErr] = useState("")

  const cargar = useCallback(() => {
    setErr("")
    getResumenRespaldo(corte).then(setResumen).catch((e) => setErr(e.message))
  }, [corte])
  useEffect(() => { cargar(); setRespaldo(null); setConf("") }, [cargar])

  const bajar = async () => {
    setBusy(true); setErr(""); setMsg("")
    try {
      const r = await descargarRespaldo(corte)
      setRespaldo(r)
      setMsg(`Respaldo descargado (${r.fileName}). Guárdalo en SharePoint/OneDrive antes de vaciar.`)
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  const vaciar = async () => {
    if (!respaldo) return
    setBusy(true); setErr(""); setMsg("")
    try {
      const r = await vaciarDetalle({ corte, respaldoId: respaldo.respaldoId, sha256: respaldo.sha256, confirmacion: conf })
      setMsg(r.message); setRespaldo(null); setConf(""); cargar()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <section className="dadm-card">
      <h2>Botón maestro · respaldar y vaciar detalle</h2>
      <p>Descarga todos los datos y luego saca del detalle lo anterior al corte. Quedan guardados solo los números macro por semana y mes, para seguir viendo evolutivos sin ocupar espacio. Las solicitudes y las fotos no se borran.</p>
      <div className="dadm-row">
        <label>Vaciar lo anterior al <input type="date" value={corte} max={isoDaysAgo(30)} onChange={(e) => setCorte(e.target.value)} /></label>
        <button className="dadm-btn ghost" onClick={cargar}>Actualizar resumen</button>
      </div>
      {resumen && (
        <ul className="dadm-list">
          <li>Rutas y Auditorías en detalle: <b>{resumen.rutas.total}</b> ({resumen.rutas.enviadas} enviadas)</li>
          <li>Saldrían del detalle con este corte: <b>{resumen.rutas.aVaciar}</b></li>
          <li>Semanas macro ya guardadas: <b>{resumen.macro.semanasGuardadas}</b>{resumen.macro.detalleDesde ? ` · detalle desde ${resumen.macro.detalleDesde}` : ""}</li>
          <li>Solicitudes (solo respaldo): <b>{resumen.solicitudes.total}</b></li>
          {resumen.corte && !resumen.corte.valida && <li className="dadm-err">{resumen.corte.mensaje}</li>}
        </ul>
      )}
      <div className="dadm-step"><b>1.</b> Descarga el respaldo<button className="dadm-btn" disabled={busy || !resumen?.corte?.valida} onClick={bajar}>Descargar respaldo (.zip)</button></div>
      <div className="dadm-step"><b>2.</b> Escribe VACIAR para confirmar
        <input value={conf} onChange={(e) => setConf(e.target.value)} placeholder="VACIAR" disabled={!respaldo} />
        <button className="dadm-btn danger" disabled={busy || !respaldo || conf !== "VACIAR" || !resumen?.rutas.aVaciar} onClick={vaciar}>Vaciar detalle</button>
      </div>
      <small>El vaciado solo se habilita con un respaldo descargado en las últimas 24 horas por ti, y verifica que el archivo coincida.</small>
      {resumen?.ultimosVaciados?.length ? <small>Último vaciado: {fmtDate(resumen.ultimosVaciados[0].at)} · {resumen.ultimosVaciados[0].by}</small> : null}
      {msg && <p className="dadm-ok">{msg}</p>}
      {err && <p className="dadm-err">{err}</p>}
    </section>
  )
}

function HistoricoCard() {
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<ImportResult | null>(null)
  const [err, setErr] = useState("")
  const subir = async (file?: File | null) => {
    if (!file) return
    setBusy(true); setErr(""); setRes(null)
    try { setRes(await importarHistorico(file)) } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <section className="dadm-card">
      <h2>Cargar Rutas y Auditorías anteriores (Excel)</h2>
      <p>Descarga la plantilla, complétala con el formato “cruce VIN” de cada Ruta o Auditoría y súbela. Si alguna fila tiene errores no se guarda nada y te digo cuáles corregir.</p>
      <div className="dadm-row">
        <button className="dadm-btn ghost" onClick={() => descargarPlantillaHistorico().catch((e) => setErr(e.message))}>Descargar plantilla</button>
        <label className="dadm-file">{busy ? "Subiendo…" : "Subir plantilla completada"}<input type="file" accept=".xlsx" disabled={busy} onChange={(e) => { subir(e.target.files?.[0]); e.target.value = "" }} /></label>
      </div>
      {res && <p className={res.errores?.length ? "dadm-err" : "dadm-ok"}>{res.message}</p>}
      {res?.errores?.length ? <ul className="dadm-list">{res.errores.map((x, i) => <li key={i}>Fila {x.fila}: {x.mensaje}</li>)}</ul> : null}
      {err && <p className="dadm-err">{err}</p>}
    </section>
  )
}

function CifrasCard() {
  const [items, setItems] = useState<MacroManual[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")
  const [err, setErr] = useState("")
  const refresh = () => listMacroManual().then((r) => setItems(r.items)).catch(() => undefined)
  useEffect(() => { refresh() }, [])
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true); setErr(""); setMsg("")
    try { const r = await guardarMacroManual(form); setMsg(r.message); e.currentTarget.reset(); refresh() } catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
  }
  return (
    <section className="dadm-card">
      <h2>Cifras de meses anteriores (foto + números)</h2>
      <p>Para meses sin Excel: escribe las cifras que ves en la imagen y adjúntala como respaldo. Se muestran en el evolutivo mensual del local.</p>
      <form className="dadm-form" onSubmit={submit}>
        <label>Local<select name="local" required defaultValue="">{<option value="" disabled>Elige…</option>}{routeLocals.map((l) => <option key={l}>{l}</option>)}</select></label>
        <label>Mes<input type="month" name="periodo" required /></label>
        <label>Adherencia %<input name="adherencia" inputMode="decimal" /></label>
        <label>Cumplimiento de estándares %<input name="estandares" inputMode="decimal" /></label>
        <label>Cumplimiento de la auditoría %<input name="auditoria" inputMode="decimal" /></label>
        <label>Exactitud %<input name="exactitud" inputMode="decimal" /></label>
        <label className="wide">Nota<input name="nota" maxLength={300} /></label>
        <label className="wide">Imagen de respaldo (PNG, JPG o WebP)<input type="file" name="imagen" accept="image/png,image/jpeg,image/webp" /></label>
        <button className="dadm-btn" disabled={busy}>Guardar cifras</button>
      </form>
      {msg && <p className="dadm-ok">{msg}</p>}
      {err && <p className="dadm-err">{err}</p>}
      {items.length ? (
        <table className="dadm-table"><thead><tr><th>Mes</th><th>Local</th><th>Adher.</th><th>Estánd.</th><th>Audit.</th><th>Exact.</th></tr></thead>
          <tbody>{items.map((i) => <tr key={`${i.local}${i.periodo}`}><td>{i.periodo}</td><td>{i.local}</td><td>{i.adherencia ?? "—"}</td><td>{i.estandares ?? "—"}</td><td>{i.auditoria ?? "—"}</td><td>{i.exactitud ?? "—"}</td></tr>)}</tbody></table>
      ) : null}
    </section>
  )
}
