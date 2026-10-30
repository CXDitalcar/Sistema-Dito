import { useEffect, useState } from "react"
import { ClipboardCopy, KeyRound, XCircle } from "lucide-react"
import type { UserScope } from "../types"
import { crearClaveTemporal, desactivarClaveTemporal, fmtDate, getClavesTemporales, type ClaveTemporal } from "../services/seguimientoApi"
import "../pages/Seguimiento.css"

// Claves temporales de activación: alternativa al correo mientras TI no habilite Mail.Send.
// La clave se muestra una sola vez; Experiencia/PM la entrega a la persona por un canal seguro.
export default function ClavesTemporales({ users }: { users: UserScope[] }) {
  const [claves, setClaves] = useState<ClaveTemporal[]>([])
  const [email, setEmail] = useState("")
  const [dias, setDias] = useState(7)
  const [nueva, setNueva] = useState<{ clave: string; email: string } | null>(null)
  const [msg, setMsg] = useState("")
  const [busy, setBusy] = useState(false)

  async function load() {
    try { setClaves((await getClavesTemporales()).claves) } catch (err) { setMsg(err instanceof Error ? err.message : "Error") }
  }
  useEffect(() => { void load() }, [])

  async function generar() {
    setBusy(true)
    setMsg("")
    setNueva(null)
    try {
      const res = await crearClaveTemporal(email.trim().toLowerCase(), dias)
      setNueva({ clave: res.clave, email: res.email })
      setEmail("")
      void load()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "No fue posible crear la clave.")
    } finally {
      setBusy(false)
    }
  }

  async function desactivar(target: string) {
    try {
      const res = await desactivarClaveTemporal(target)
      setMsg(res.message)
      void load()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error")
    }
  }

  return (
    <section className="seg-card" style={{ marginBottom: 16 }}>
      <h2 style={{ margin: "0 0 6px", fontSize: 18 }}><KeyRound size={18} style={{ verticalAlign: "-3px" }} /> Claves temporales de activación</h2>
      <p className="seg-meta" style={{ marginTop: 0 }}>
        Para activar perfiles sin esperar el correo automático. La persona entra con su correo y la clave en
        “Tengo una clave temporal” y crea su contraseña. Cada clave sirve una vez, vence y se puede desactivar.
      </p>
      <div className="seg-form-row" style={{ alignItems: "end" }}>
        <label className="seg-field">
          <span>Correo de la persona (debe estar en el directorio)</span>
          <input className="seg-input" list="claves-usuarios" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@ditalcar.cl" />
          <datalist id="claves-usuarios">
            {users.filter((u) => u.active).map((u) => <option key={u.email} value={u.email}>{u.name}</option>)}
          </datalist>
        </label>
        <label className="seg-field">
          <span>Vigencia</span>
          <select className="seg-select" value={dias} onChange={(e) => setDias(Number(e.target.value))}>
            <option value={1}>1 día</option><option value={3}>3 días</option><option value={7}>7 días</option><option value={14}>14 días</option>
          </select>
        </label>
        <button className="seg-btn primary" disabled={busy || !email.trim()} onClick={generar}><KeyRound size={16} /> Generar clave</button>
      </div>

      {nueva && (
        <div className="seg-key-box" style={{ marginTop: 14 }}>
          <div>
            <div className="seg-meta">Clave para {nueva.email} · se muestra sólo esta vez</div>
            <code>{nueva.clave}</code>
          </div>
          <button className="seg-btn small" onClick={() => void navigator.clipboard?.writeText(nueva.clave)}><ClipboardCopy size={14} /> Copiar</button>
        </div>
      )}
      {msg && <div className="seg-meta" style={{ marginTop: 10 }}>{msg}</div>}

      {claves.length > 0 && (
        <div className="seg-table-wrap" style={{ marginTop: 14 }}>
          <table className="seg-table">
            <thead><tr><th>Persona</th><th>Estado</th><th>Creada</th><th>Vence</th><th></th></tr></thead>
            <tbody>
              {claves.map((c) => (
                <tr key={c.email}>
                  <td>{c.nombre || c.email}<div className="seg-meta">{c.email}</div></td>
                  <td>{estadoLabel(c.estado)}{c.usadaAt ? ` · ${fmtDate(c.usadaAt)}` : ""}</td>
                  <td>{fmtDate(c.creadaAt)}</td>
                  <td>{fmtDate(c.expiresAt)}</td>
                  <td>{c.estado === "ACTIVA" && <button className="seg-btn small" onClick={() => void desactivar(c.email)}><XCircle size={14} /> Desactivar</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function estadoLabel(estado: string) {
  return ({ ACTIVA: "Activa", USADA: "Usada", DESACTIVADA: "Desactivada", VENCIDA: "Vencida", BLOQUEADA: "Bloqueada por intentos" } as Record<string, string>)[estado] || estado
}
