import { useEffect, useState } from "react"
import { BookMarked, ExternalLink, FileText, FolderOpen, Pin, PinOff, Plus, Trash2 } from "lucide-react"
import {
  DEFAULT_BRANDS,
  getAcademyResources,
  saveAcademyResourceItems,
  type AcademyResourceItem,
  type AcademyResources,
  type ResourceCategory,
} from "../services/catalogoApi"
import "./AcademiaRecursos.css"

// Recursos generales arriba de los cursos: carpeta de SharePoint, fichas de producto e instructivos base.
// Experiencia y PM agregan enlaces y fijan los destacados.

const CATEGORY_LABEL: Record<ResourceCategory, string> = {
  GENERAL: "General",
  FICHAS: "Fichas de producto",
  INSTRUCTIVOS: "Instructivos base",
}

export default function AcademiaRecursos({ admin }: { admin: boolean }) {
  const [data, setData] = useState<AcademyResources | null>(null)
  const [open, setOpen] = useState<ResourceCategory | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<AcademyResourceItem>>({ category: "FICHAS" })
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    getAcademyResources().then(setData).catch(() => setData({ carpetaUrl: "", items: [] }))
  }, [])

  if (!data) return null
  const items = data.items ?? []
  const pinned = items.filter((item) => item.pinned)
  const byCategory = (category: ResourceCategory) => items.filter((item) => item.category === category)

  async function persist(next: AcademyResourceItem[]) {
    setError("")
    setMessage("")
    try {
      const saved = await saveAcademyResourceItems(next)
      setData(saved)
      setMessage(saved.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar.")
    }
  }

  async function add() {
    if (!draft.title?.trim() || !draft.url?.trim()) {
      setError("Escribe un título y pega el enlace.")
      return
    }
    await persist([
      ...items,
      { id: `R${Date.now().toString(36)}`, title: draft.title.trim(), url: draft.url.trim(), category: (draft.category ?? "GENERAL") as ResourceCategory, brand: draft.brand, pinned: Boolean(draft.pinned) },
    ])
    setDraft({ category: draft.category })
  }

  const cards: { key: ResourceCategory | "CARPETA"; title: string; text: string; icon: typeof FolderOpen }[] = [
    { key: "CARPETA", title: "Carpeta de recursos", text: "Todo el material en SharePoint.", icon: FolderOpen },
    { key: "FICHAS", title: "Fichas de producto", text: `${byCategory("FICHAS").length} fichas`, icon: FileText },
    { key: "INSTRUCTIVOS", title: "Instructivos base", text: "SIGA, Pilot y otros sistemas.", icon: BookMarked },
  ]

  return (
    <section className="academy-resources">
      <div className="academy-resources-head">
        <div>
          <span className="academy-eyebrow">RECURSOS</span>
          <h2>Material de consulta</h2>
        </div>
        {admin && (
          <button type="button" className="academy-resources-admin" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cerrar edición" : "Editar recursos"}
          </button>
        )}
      </div>

      {pinned.length > 0 && (
        <div className="academy-resources-pinned">
          {pinned.map((item) => (
            <a key={item.id} href={item.url} target="_blank" rel="noreferrer">
              <Pin size={14} /> {item.title}
            </a>
          ))}
        </div>
      )}

      <div className="academy-resources-grid">
        {cards.map((card) => {
          const Icon = card.icon
          if (card.key === "CARPETA") {
            return data.carpetaUrl ? (
              <a key={card.key} className="academy-resource-card" href={data.carpetaUrl} target="_blank" rel="noreferrer">
                <Icon size={22} /><div><strong>{card.title}</strong><span>{card.text}</span></div><ExternalLink size={16} />
              </a>
            ) : (
              <div key={card.key} className="academy-resource-card disabled">
                <Icon size={22} /><div><strong>{card.title}</strong><span>En construcción</span></div>
              </div>
            )
          }
          const list = byCategory(card.key)
          return (
            <button
              key={card.key}
              type="button"
              className={`academy-resource-card ${open === card.key ? "active" : ""}`}
              onClick={() => setOpen(open === card.key ? null : card.key as ResourceCategory)}
              disabled={!list.length && !admin}
            >
              <Icon size={22} /><div><strong>{card.title}</strong><span>{list.length ? card.text : "En construcción"}</span></div>
            </button>
          )
        })}
      </div>

      {open && (
        <div className="academy-resources-list">
          {byCategory(open).map((item) => (
            <div key={item.id} className="academy-resource-row">
              <a href={item.url} target="_blank" rel="noreferrer">
                {item.brand ? <b>{item.brand}</b> : null}{item.title}<ExternalLink size={13} />
              </a>
              {admin && editing && (
                <span className="academy-resource-actions">
                  <button type="button" title={item.pinned ? "Quitar de destacados" : "Fijar arriba"} onClick={() => void persist(items.map((x) => x.id === item.id ? { ...x, pinned: !x.pinned } : x))}>
                    {item.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                  </button>
                  <button type="button" title="Quitar" onClick={() => void persist(items.filter((x) => x.id !== item.id))}><Trash2 size={14} /></button>
                </span>
              )}
            </div>
          ))}
          {!byCategory(open).length && <div className="academy-resource-empty">Todavía no hay recursos en esta sección.</div>}
        </div>
      )}

      {admin && editing && (
        <div className="academy-resources-form">
          <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as ResourceCategory })}>
            {(Object.keys(CATEGORY_LABEL) as ResourceCategory[]).map((key) => <option key={key} value={key}>{CATEGORY_LABEL[key]}</option>)}
          </select>
          {draft.category === "FICHAS" && (
            <select value={draft.brand ?? ""} onChange={(e) => setDraft({ ...draft, brand: e.target.value })}>
              <option value="">Marca (opcional)</option>
              {DEFAULT_BRANDS.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
            </select>
          )}
          <input placeholder="Título (ej.: Ficha Tiggo 7 Pro)" value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <input placeholder="https://… (enlace de SharePoint)" value={draft.url ?? ""} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
          <label><input type="checkbox" checked={Boolean(draft.pinned)} onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })} /> Fijar arriba</label>
          <button type="button" onClick={() => void add()}><Plus size={15} /> Agregar recurso</button>
          {error && <div className="academy-resource-error">{error}</div>}
          {message && <div className="academy-resource-ok">{message}</div>}
          <small>El enlace de la carpeta general se configura en Gestión › Datos.</small>
        </div>
      )}
    </section>
  )
}
