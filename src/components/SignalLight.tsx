import type { RequestItem } from "../types"

export type SignalTone = "green" | "orange" | "red" | "neutral"

export function signalFromPercent(value?: number): SignalTone {
  if (value === undefined || Number.isNaN(value)) return "neutral"
  if (value >= 90) return "green"
  if (value >= 60) return "orange"
  return "red"
}

export function signalFromRequest(request: RequestItem): SignalTone {
  if (["RESUELTA", "RECHAZADA"].includes(request.status)) return "neutral"
  if (request.status === "INFORMACION_REQUERIDA" || request.slaPausedReason) return "orange"

  const due = requestDueDate(request)
  if (due) {
    const remainingHours = (due.getTime() - Date.now()) / 3600000
    if (remainingHours <= 0) return "red"
    if (remainingHours <= 6) return "orange"
  }

  // Verde = actividad disponible / dentro de plazo.
  return "green"
}

function requestDueDate(request: RequestItem) {
  let hours: number | undefined
  let startedAt: string | undefined

  if (request.status === "RECIBIDA") {
    hours = request.acceptanceSLAHours
    startedAt = request.acceptanceSLAStartedAt
  } else if (request.status === "PENDIENTE_APROBACION") {
    hours = request.approvalSLAHours
    startedAt = request.approvalSLAStartedAt
  } else if (request.status === "EN_GESTION") {
    hours = request.resolutionSLAHours
    startedAt = request.resolutionSLAStartedAt
  } else if (request.status === "RESUELTA_POR_CONFIRMAR") {
    return request.resolutionConfirmationDeadline
      ? new Date(request.resolutionConfirmationDeadline)
      : undefined
  }

  if (!hours || !startedAt) return undefined
  const start = new Date(startedAt)
  if (hours === 24) return addBusinessDays(start, 1)
  return new Date(start.getTime() + hours * 3600000)
}

function addBusinessDays(date: Date, days: number) {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const day = result.getDay()
    if (day !== 0 && day !== 6) added += 1
  }
  return result
}

export default function SignalLight({
  tone,
  label,
  compact = false,
}: {
  tone: SignalTone
  label?: string
  compact?: boolean
}) {
  return (
    <span className={`signal-light signal-${tone} ${compact ? "signal-compact" : ""}`}>
      <i aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </span>
  )
}
