import { useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { DEFAULT_CARDS, ROLE_GROUPS, getPortalConfig, savePortalConfig, type PortalOverride, type PortalSection } from "../services/portalAccess"

// Gestión › Datos: tarjetas del inicio por tarjetas (perfiles distintos de Experiencia/PM).
// Permite cambiar nombre, descripción y enlace (por ejemplo, a una interfaz separada),
// apagar una tarjeta y agregar accesos a otros sistemas por grupo de perfiles.
type Row = PortalOverride & { defNombre?: string; defDescripcion?: string; defUrl?: string }

export default function PortalAccessEditor() {
  const [rows, setRows] = useState<Row[]>([])
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getPortalConfig().then((config) => {
      const byId = new Map((config.items || []).map((o) => [o.id, o]))
      const base: Row[] = DEFAULT_CARDS.map((def) => {
        const o = byId.get(def.id)
        return { id: def.id, seccion: def.seccion, nombre: o?.nombre || "", descripcion: o?.descripcion || "", url: o?.url || "", activo: o?.activo !== false, defNombre: def.nombre, defDescripcion: def.descripcion, defUrl: def.url }
      })
      const custom = (config.items || []).filter((o) => o.custom).map((o) => ({ ...o, activo: o.activo !== false }))
      setRows([...base, ...custom])
    })
  }, [])

  const update = (id: string, patch: Partial<Row>) => setRows((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  function addCustom() {
    const id = `acceso-${Date.now().toString(36)}`
    setRows((list) => [...list, { id, seccion: "ACCESOS", nombre: "", descripcion: "", url: "", activo: true, custom: true, grupos: [] }])
  }

  async function save() {
    setBusy(true); setMessage(""); setError("")
    try {
      const missing = rows.find((r) => r.custom && (!r.nombre || !r.url))
      if (missing) throw new Error("Cada acceso nuevo necesita nombre y enlace.")
      const items: PortalOverride[] = rows.map(({ defNombre: _a, defDescripcion: _b, defUrl: _c, ...r }) => r)
      const result = await savePortalConfig(items)
      setMessage(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar.")
    } finally { setBusy(false) }
  }

  const section = (s: PortalSection) => rows.filter((r) => r.seccion === s)

  return (
    <article className="seg-card datos-card portal-editor">
      <h3>Inicio de los demás perfiles</h3>
      <p>Las tarjetas de “Tus tableros” y “Tus accesos”. Deja un campo vacío para usar el texto por defecto. Para mover un tema a otra interfaz, cambia su enlace (https://…).</p>
      {(["TABLEROS", "ACCESOS"] as PortalSection[]).map((s) => (
        <div key={s} className="portal-editor-group">
          <h4>{s === "TABLEROS" ? "Tus tableros" : "Tus accesos"}</h4>
          {section(s).map((r) => (
            <div key={r.id} className={`portal-editor-row ${r.activo ? "" : "off"}`}>
              <label className="ops-toggle"><input type="checkbox" checked={r.activo !== false} onChange={(e) => update(r.id, { activo: e.target.checked })} /> Visible</label>
              <input className="seg-input" placeholder={r.defNombre || "Nombre"} value={r.nombre || ""} onChange={(e) => update(r.id, { nombre: e.target.value })} aria-label="Nombre" />
              <input className="seg-input" placeholder={r.defDescripcion || "Para qué sirve (una línea)"} value={r.descripcion || ""} onChange={(e) => update(r.id, { descripcion: e.target.value })} aria-label="Descripción" />
              <input className="seg-input" placeholder={r.defUrl || "https://…"} value={r.url || ""} onChange={(e) => update(r.id, { url: e.target.value })} aria-label="Enlace" />
              {r.custom && (
                <div className="portal-editor-groups">
                  <span>Lo ven:</span>
                  {ROLE_GROUPS.map((g) => (
                    <label key={g.id} className="ops-toggle">
                      <input type="checkbox" checked={(r.grupos || []).includes(g.id)} onChange={(e) => update(r.id, { grupos: e.target.checked ? [...(r.grupos || []), g.id] : (r.grupos || []).filter((x) => x !== g.id) })} />
                      {g.label}
                    </label>
                  ))}
                  <small>Sin marcar = todos.</small>
                  <button type="button" className="seg-btn small" onClick={() => setRows((list) => list.filter((x) => x.id !== r.id))}><Trash2 size={14} /> Quitar</button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
      <div className="seg-actions">
        <button type="button" className="seg-btn" onClick={addCustom}><Plus size={15} /> Agregar acceso a otro sistema</button>
        <button type="button" className="seg-btn primary" disabled={busy} onClick={() => void save()}>{busy ? "Guardando…" : "Guardar"}</button>
      </div>
      {message && <div className="seg-success">{message}</div>}
      {error && <div className="seg-error">{error}</div>}
    </article>
  )
}
