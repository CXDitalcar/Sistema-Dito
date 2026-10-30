import { useMemo, useState } from "react"
import { CheckCircle2, MessageSquareText, X } from "lucide-react"
import { useLocation } from "react-router-dom"
import type { UserScope } from "../types"
import "./PilotFeedback.css"

type FeedbackCategory = "DISEÑO" | "CONTENIDO" | "FUNCIONALIDAD" | "OTRO"

type PilotFeedbackItem = {
  id: string
  createdAt: string
  path: string
  userName: string
  userEmail: string
  userRole: string
  category: FeedbackCategory
  liked: string
  unclear: string
  change: string
}

const KEY = "ditalcar-pilot-feedback-v1"

function readFeedback(): PilotFeedbackItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function PilotFeedback({ currentUser }: { currentUser: UserScope }) {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [category, setCategory] = useState<FeedbackCategory>("FUNCIONALIDAD")
  const [liked, setLiked] = useState("")
  const [unclear, setUnclear] = useState("")
  const [change, setChange] = useState("")

  const screenLabel = useMemo(() => `${location.pathname}${location.search}`, [location])

  function save() {
    if (!liked.trim() && !unclear.trim() && !change.trim()) return

    const item: PilotFeedbackItem = {
      id: `feedback-${Date.now()}`,
      createdAt: new Date().toISOString(),
      path: screenLabel,
      userName: currentUser.name,
      userEmail: currentUser.email,
      userRole: currentUser.role,
      category,
      liked: liked.trim(),
      unclear: unclear.trim(),
      change: change.trim(),
    }

    localStorage.setItem(KEY, JSON.stringify([item, ...readFeedback()]))
    setSaved(true)
    setLiked("")
    setUnclear("")
    setChange("")
    setTimeout(() => {
      setSaved(false)
      setOpen(false)
    }, 900)
  }

  return (
    <>
      <button className="pilot-feedback-fab" type="button" onClick={() => setOpen(true)}>
        <MessageSquareText size={17} />
        Comentar esta pantalla
      </button>

      {open && (
        <div className="pilot-feedback-overlay" role="presentation">
          <section className="pilot-feedback-modal" role="dialog" aria-modal="true">
            <div className="pilot-feedback-head">
              <div>
                <span>PILOTO DITALCAR</span>
                <h3>Cuéntanos qué mejorar</h3>
                <p>Tu comentario quedará asociado a esta pantalla: {screenLabel}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <div className="pilot-feedback-categories">
              {(["DISEÑO", "CONTENIDO", "FUNCIONALIDAD", "OTRO"] as FeedbackCategory[]).map(
                (item) => (
                  <button
                    type="button"
                    className={category === item ? "active" : ""}
                    onClick={() => setCategory(item)}
                    key={item}
                  >
                    {item.charAt(0) + item.slice(1).toLowerCase()}
                  </button>
                )
              )}
            </div>

            <label>
              <span>¿Qué te gusta o te sirve?</span>
              <textarea value={liked} onChange={(event) => setLiked(event.target.value)} />
            </label>
            <label>
              <span>¿Qué no se entiende?</span>
              <textarea value={unclear} onChange={(event) => setUnclear(event.target.value)} />
            </label>
            <label>
              <span>¿Qué agregarías, sacarías o cambiarías?</span>
              <textarea value={change} onChange={(event) => setChange(event.target.value)} />
            </label>

            <div className="pilot-feedback-footer">
              <small>Durante el piloto se guarda en este navegador; luego lo conectaremos al registro central.</small>
              <button type="button" onClick={save} disabled={!liked.trim() && !unclear.trim() && !change.trim()}>
                {saved ? <CheckCircle2 size={16} /> : <MessageSquareText size={16} />}
                {saved ? "Guardado" : "Guardar comentario"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
