import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ClipboardList } from "lucide-react"
import type { UserScope } from "../types"
import { getFrogmi, type FrogmiResumen } from "../services/opsApi"
import "../pages/Seguimiento.css"

// Inicio del junior: formularios Frogmi que faltan en su local (corte vigente).
export default function FrogmiPendientes({ currentUser }: { currentUser: UserScope }) {
  const [data, setData] = useState<FrogmiResumen | null>(null)

  useEffect(() => {
    if (currentUser.role !== "ASISTENTE_JUNIOR" || currentUser.testingView) return
    getFrogmi().then(setData).catch(() => setData(null))
  }, [currentUser.email, currentUser.role, currentUser.testingView])

  if (!data) return null
  const rows = data.rows.filter((r) => r.activo && !r.exclusion)
  const faltan = data.forms.map((f) => ({ ...f, n: rows.filter((r) => !r.forms[f.key]).length })).filter((f) => f.n > 0)
  const total = faltan.reduce((s, f) => s + f.n, 0)
  if (!total) return null

  return (
    <section className="seg-pending" aria-label="Formularios Frogmi pendientes">
      <article className="seg-card">
        <h3 style={{ margin: "0 0 10px", fontSize: 17 }}><ClipboardList size={17} style={{ verticalAlign: "-3px" }} /> Formularios Frogmi que faltan en tu local</h3>
        <div className="seg-row">
          <div className="datos-summary" style={{ margin: 0 }}>
            {faltan.map((f) => <span key={f.key}>{f.label}: {f.n}</span>)}
          </div>
          <Link className="seg-btn small primary" to="/frogmi">Ver VIN</Link>
        </div>
      </article>
    </section>
  )
}
