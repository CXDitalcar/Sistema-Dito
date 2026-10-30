import { useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { getShowroomAccess, saveShowroomAccess, type FrogmiAccount } from "../services/showroomAccess"

// Gestión › Datos: enlaces de "Otros formularios" y cuentas Frogmi por local para Gestión de Showroom.
// La clave se guarda en el servidor (no en el código) y solo se muestra a usuarios con sesión.
export default function ShowroomAccessEditor() {
  const [tourManagerUrl, setTour] = useState("")
  const [frogmiUrl, setFrogmi] = useState("")
  const [clave, setClave] = useState("")
  const [cuentas, setCuentas] = useState<FrogmiAccount[]>([])
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getShowroomAccess().then((data) => {
      if (!data) return
      setTour(data.tourManagerUrl || ""); setFrogmi(data.frogmiUrl || ""); setClave(data.clave || ""); setCuentas(data.cuentas || [])
    })
  }, [])

  const update = (i: number, patch: Partial<FrogmiAccount>) => setCuentas((list) => list.map((c, j) => (j === i ? { ...c, ...patch } : c)))

  async function save() {
    setBusy(true); setMessage(""); setError("")
    try {
      const result = await saveShowroomAccess({ tourManagerUrl, frogmiUrl, clave, cuentas: cuentas.filter((c) => c.local && c.usuario) })
      setMessage(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar.")
    } finally { setBusy(false) }
  }

  return (
    <article className="seg-card datos-card portal-editor">
      <h3>Gestión de Showroom · Otros formularios</h3>
      <p>Aparecen debajo de la Ruta de Experiencia, para todos los perfiles. Cada persona ve primero la cuenta Frogmi de su local.</p>
      <div className="showroom-editor-grid">
        <label className="seg-field"><span>Tour Manager Resumido · Stellantis (enlace)</span><input className="seg-input" value={tourManagerUrl} onChange={(e) => setTour(e.target.value)} /></label>
        <label className="seg-field"><span>Formularios Frogmi (enlace)</span><input className="seg-input" value={frogmiUrl} onChange={(e) => setFrogmi(e.target.value)} /></label>
        <label className="seg-field"><span>Clave Frogmi (común para todas las cuentas)</span><input className="seg-input" value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="off" /></label>
      </div>
      <h4>Cuentas Frogmi por local</h4>
      {cuentas.map((c, i) => (
        <div key={i} className="showroom-editor-row">
          <input className="seg-input" placeholder="Local" value={c.local} onChange={(e) => update(i, { local: e.target.value })} aria-label="Local" />
          <input className="seg-input" placeholder="Usuario" value={c.usuario} onChange={(e) => update(i, { usuario: e.target.value })} aria-label="Usuario" />
          <input className="seg-input" placeholder="Clave propia (opcional)" value={c.clave || ""} onChange={(e) => update(i, { clave: e.target.value })} aria-label="Clave propia" autoComplete="off" />
          <button type="button" className="seg-btn small" onClick={() => setCuentas((list) => list.filter((_, j) => j !== i))} aria-label={`Quitar ${c.local}`}><Trash2 size={14} /></button>
        </div>
      ))}
      <div className="seg-actions">
        <button type="button" className="seg-btn" onClick={() => setCuentas((list) => [...list, { local: "", usuario: "" }])}><Plus size={15} /> Agregar cuenta</button>
        <button type="button" className="seg-btn primary" disabled={busy} onClick={() => void save()}>{busy ? "Guardando…" : "Guardar"}</button>
      </div>
      {message && <div className="seg-success">{message}</div>}
      {error && <div className="seg-error">{error}</div>}
    </article>
  )
}
