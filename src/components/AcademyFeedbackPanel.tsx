import { useState } from "react"
import { CheckCircle2, ChevronDown, MessageSquareText } from "lucide-react"
import type { UserScope } from "../types"
import {
  getAcademyFeedback,
  saveAcademyFeedback,
  type AcademyFeedbackValue,
} from "../services/academyStore"

type Props = {
  contentId: string
  contentType: "PLAYBOOK" | "CURSO" | "MATERIAL"
  currentUser: UserScope
  required?: boolean
  onSaved?: () => void
}

const options: Array<{ value: AcademyFeedbackValue; label: string }> = [
  { value: "SI", label: "Sí" },
  { value: "PARCIAL", label: "Parcial" },
  { value: "NO", label: "No" },
]

export default function AcademyFeedbackPanel({
  contentId,
  contentType,
  currentUser,
  required = false,
  onSaved,
}: Props) {
  const existing = getAcademyFeedback(contentId, currentUser.email)
  const [open, setOpen] = useState(required && !existing)
  const [useful, setUseful] = useState<AcademyFeedbackValue | "">(
    existing?.useful ?? ""
  )
  const [understood, setUnderstood] = useState<AcademyFeedbackValue | "">(
    existing?.understood ?? ""
  )
  const [sufficient, setSufficient] = useState<AcademyFeedbackValue | "">(
    existing?.sufficient ?? ""
  )
  const [comment, setComment] = useState(existing?.comment ?? "")
  const [saved, setSaved] = useState(Boolean(existing))

  const valid = Boolean(useful && understood && sufficient)

  function save() {
    if (!valid) return
    saveAcademyFeedback({
      contentId,
      contentType,
      authorEmail: currentUser.email,
      authorName: currentUser.name,
      useful: useful as AcademyFeedbackValue,
      understood: understood as AcademyFeedbackValue,
      sufficient: sufficient as AcademyFeedbackValue,
      comment: comment.trim(),
    })
    setSaved(true)
    setOpen(false)
    onSaved?.()
  }

  return (
    <div className={`academy-feedback ${required ? "required" : "optional"}`}>
      <button
        type="button"
        className="academy-feedback-toggle"
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          {saved ? <CheckCircle2 size={16} /> : <MessageSquareText size={16} />}
          <span>
            <strong>{saved ? "Gracias por tu opinión" : "¿Te sirvió este contenido?"}</strong>
            <small>
              {required
                ? "Encuesta breve obligatoria para completar este curso asignado."
                : "Encuesta breve opcional para ayudarnos a mejorar."}
            </small>
          </span>
        </span>
        <ChevronDown size={17} className={open ? "open" : ""} />
      </button>

      {open && (
        <div className="academy-feedback-body">
          <FeedbackQuestion label="¿Te sirvió?" value={useful} onChange={setUseful} />
          <FeedbackQuestion
            label="¿Se comprendió?"
            value={understood}
            onChange={setUnderstood}
          />
          <FeedbackQuestion
            label="¿Fue suficiente?"
            value={sufficient}
            onChange={setSufficient}
          />
          <label className="academy-feedback-comment">
            <span>¿Qué agregarías o sacarías?</span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Opcional: cuéntanos qué mejorarías."
            />
          </label>
          <button
            type="button"
            className="academy-feedback-save"
            disabled={!valid}
            onClick={save}
          >
            Guardar opinión
          </button>
        </div>
      )}
    </div>
  )
}

function FeedbackQuestion({
  label,
  value,
  onChange,
}: {
  label: string
  value: AcademyFeedbackValue | ""
  onChange: (value: AcademyFeedbackValue) => void
}) {
  return (
    <div className="academy-feedback-question">
      <span>{label}</span>
      <div>
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            className={value === option.value ? "active" : ""}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
