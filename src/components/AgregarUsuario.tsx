import { useEffect, useMemo, useState } from "react"
import { FileUp, Pencil, UserPlus } from "lucide-react"
import { prepareUploadFile } from "../services/fileUtils"
import type { UserRole, UserScope } from "../types"
import { getLocals } from "../services/localesStore"
import { DEFAULT_BRANDS } from "../services/catalogoApi"
import { roleLabel } from "../services/workflow"
import "../pages/Seguimiento.css"

// Alta de usuarios dentro de la app (Experiencia y PM). Quedan junto a 02_Usuarios en el directorio;
// si la persona luego aparece en la LIST, manda la LIST.

type AppUser = UserScope & { source?: string; createdBy?: string; createdAt?: string }

const ROLES: UserRole[] = [
  "VENDEDOR", "ASISTENTE_JUNIOR", "JEFATURA_LOCAL", "GERENCIA_MARCA", "ASISTENTE_GERENCIA",
  "EQUIPO_COMERCIAL", "JEFATURA_MARKETING", "ADMINISTRATIVO", "JEFATURA_ADMINISTRACION",
  "GERENCIA_ADMINISTRACION", "JEFATURA_OPERACIONES_COMERCIALES", "GERENCIA_VENTAS", "GERENCIA_COMERCIAL",
  "GERENCIA_GENERAL", "EXPERIENCIA_CLIENTES", "PROJECT_MANAGER",
]
const NETWORK_ROLES: UserRole[] = [
  "ASISTENTE_GERENCIA", "JEFATURA_MARKETING", "JEFATURA_ADMINISTRACION", "GERENCIA_ADMINISTRACION",
  "JEFATURA_OPERACIONES_COMERCIALES", "GERENCIA_VENTAS", "GERENCIA_COMERCIAL", "GERENCIA_GENERAL",
  "EXPERIENCIA_CLIENTES", "PROJECT_MANAGER",
]

type FormState = { email: string; name: string; role: UserRole; local: string; extraLocals: string[]; brands: string[]; active: boolean }
const EMPTY: FormState = { email: "", name: "", role: "VENDEDOR", local: "", extraLocals: [], brands: [], active: true }

async function apiJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { credentials: "include", ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.message || `Error ${response.status}`)
  return payload as T
}

export default function AgregarUsuario({ onSaved }: { onSaved: () => void }) {
  const [appUsers, setAppUsers] = useState<AppUser[]>([])
  const [form, setForm] = useState<FormState>(EMPTY)
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ message: string; errores: string[]; omitidos: number; sinCorreo: number } | null>(null)

  async function importFile(file?: File | null) {
    if (!file) return
    setImporting(true)
    setError("")
    setImportResult(null)
    try {
      const prepared = await prepareUploadFile(file)
      const result = await apiJson<{ message: string; summary: { errores: string[]; omitidos: number; sinCorreo: number } }>("/api/users/app/import", {
        method: "POST",
        body: JSON.stringify({ fileName: prepared.name, dataBase64: prepared.base64 }),
      })
      setImportResult({ message: result.message, ...result.summary })
      await load()
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible importar el archivo.")
    } finally {
      setImporting(false)
    }
  }

  async function load() {
    try { setAppUsers((await apiJson<{ users: AppUser[] }>("/api/users/app")).users) } catch { setAppUsers([]) }
  }
  useEffect(() => { void load() }, [])

  const isNetwork = NETWORK_ROLES.includes(form.role)
  const isBrand = form.role === "GERENCIA_MARCA"
  const localNames = useMemo(() => getLocals().map((local) => local.name).sort((a, b) => a.localeCompare(b, "es")), [])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function toggle(list: "extraLocals" | "brands", value: string) {
    setForm((current) => ({
      ...current,
      [list]: current[list].includes(value) ? current[list].filter((x) => x !== value) : [...current[list], value],
    }))
  }

  function edit(user: AppUser) {
    const locals = user.assignedLocals ?? []
    setForm({
      email: user.email,
      name: user.name,
      role: user.role,
      local: user.localPrincipal || user.local || "",
      extraLocals: locals.filter((local) => local !== (user.localPrincipal || user.local)),
      brands: user.brands ?? [],
      active: user.active !== false,
    })
    setEditing(true)
    setOpen(true)
    setMessage("")
    setError("")
  }

  async function save(patch?: Partial<FormState>, target?: FormState) {
    const data = { ...(target ?? form), ...(patch ?? {}) }
    setBusy(true)
    setMessage("")
    setError("")
    try {
      const result = await apiJson<{ message: string }>("/api/users/app", {
        method: "POST",
        body: JSON.stringify({
          mode: editing || target ? "update" : "create",
          email: data.email.trim().toLowerCase(),
          name: data.name.trim(),
          role: data.role,
          local: isNetworkRole(data.role) ? "" : data.local,
          assignedLocals: isNetworkRole(data.role) ? [] : [data.local, ...data.extraLocals].filter(Boolean),
          brands: data.brands,
          active: data.active,
        }),
      })
      setMessage(result.message)
      if (!target) {
        setForm(EMPTY)
        setEditing(false)
        setOpen(false)
      }
      await load()
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="seg-card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: "0 0 6px", fontSize: 18 }}><UserPlus size={18} style={{ verticalAlign: "-3px" }} /> Agregar usuario</h2>
          <p className="seg-meta" style={{ margin: 0 }}>
            Para dar de alta a alguien sin esperar a 02_Usuarios. Después le generas una clave temporal para que entre.
          </p>
        </div>
        {!open && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="seg-btn primary" onClick={() => { setForm(EMPTY); setEditing(false); setOpen(true); setMessage(""); setError("") }}>
              <UserPlus size={16} /> Nuevo usuario
            </button>
            <label className="seg-btn" style={{ position: "relative" }}>
              <FileUp size={16} /> {importing ? "Importando…" : "Importar Excel o CSV"}
              <input type="file" accept=".xlsx,.xlsm,.csv" className="datos-file-input" disabled={importing} onChange={(e) => { void importFile(e.target.files?.[0]); e.target.value = "" }} />
            </label>
          </div>
        )}
      </div>

      {open && (
        <div className="user-form">
          <div className="seg-form-row">
            <label className="seg-field">
              <span>Correo corporativo *</span>
              <input className="seg-input" type="email" value={form.email} disabled={editing} onChange={(e) => set("email", e.target.value)} placeholder="nombre@ditalcar.cl" />
            </label>
            <label className="seg-field">
              <span>Nombre completo *</span>
              <input className="seg-input" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </label>
            <label className="seg-field">
              <span>Rol *</span>
              <select className="seg-select" value={form.role} onChange={(e) => set("role", e.target.value as UserRole)}>
                {ROLES.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
              </select>
            </label>
          </div>

          {!isNetwork && (
            <div className="seg-form-row">
              <label className="seg-field">
                <span>{isBrand ? "Local principal" : "Local *"}</span>
                <select className="seg-select" value={form.local} onChange={(e) => set("local", e.target.value)}>
                  <option value="">Seleccionar…</option>
                  {localNames.map((local) => <option key={local} value={local}>{local}</option>)}
                </select>
              </label>
            </div>
          )}

          {!isNetwork && (form.role === "GERENCIA_MARCA" || form.role === "JEFATURA_LOCAL" || form.role === "ASISTENTE_JUNIOR") && (
            <div className="seg-field">
              <span>Otros locales a cargo (opcional)</span>
              <div className="user-chips">
                {localNames.filter((local) => local !== form.local).map((local) => (
                  <button key={local} type="button" className={`user-chip ${form.extraLocals.includes(local) ? "on" : ""}`} onClick={() => toggle("extraLocals", local)}>{local}</button>
                ))}
              </div>
            </div>
          )}

          {isBrand && (
            <div className="seg-field">
              <span>Marcas a cargo</span>
              <div className="user-chips">
                {DEFAULT_BRANDS.map((brand) => (
                  <button key={brand} type="button" className={`user-chip ${form.brands.includes(brand) ? "on" : ""}`} onClick={() => toggle("brands", brand)}>{brand}</button>
                ))}
              </div>
            </div>
          )}

          <label className="user-check">
            <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /> Activo
          </label>

          {error && <div className="seg-error" style={{ marginTop: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button className="seg-btn primary" disabled={busy || !form.email.trim() || !form.name.trim()} onClick={() => void save()}>
              {editing ? "Guardar cambios" : "Agregar usuario"}
            </button>
            <button className="seg-btn" disabled={busy} onClick={() => { setOpen(false); setEditing(false); setForm(EMPTY) }}>Cancelar</button>
          </div>
        </div>
      )}

      {message && <div className="seg-meta" style={{ color: "#8fe3a6", marginTop: 10 }}>{message}</div>}
      {!open && error && <div className="seg-error" style={{ marginTop: 10 }}>{error}</div>}
      {importResult && (
        <div className="seg-meta" style={{ marginTop: 10 }}>
          <span style={{ color: "#8fe3a6" }}>{importResult.message}</span>
          {importResult.omitidos > 0 && <> · {importResult.omitidos} ya activos desde 02_Usuarios (sin cambios)</>}
          {importResult.sinCorreo > 0 && <> · {importResult.sinCorreo} filas sin correo</>}
          {importResult.errores.length > 0 && (
            <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: "#ff9097" }}>
              {importResult.errores.slice(0, 15).map((line) => <li key={line}>{line}</li>)}
            </ul>
          )}
        </div>
      )}
      <div className="seg-meta" style={{ marginTop: 6 }}>Importar Excel o CSV: mismo formato que 02_Usuarios (Email, Title, Rol, Activo, Alcance, Local(es)), con títulos en la primera fila. Cada persona queda limitada a sus locales.</div>

      {appUsers.length > 0 && (
        <div className="seg-table-wrap" style={{ marginTop: 14 }}>
          <table className="seg-table">
            <thead><tr><th>Persona</th><th>Rol</th><th>Local</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {appUsers.map((user) => (
                <tr key={user.email}>
                  <td>{user.name}<div className="seg-meta">{user.email}</div></td>
                  <td>{roleLabel(user.role)}</td>
                  <td>{user.localPrincipal || user.local || (user.scope === "RED" ? "Red" : "—")}</td>
                  <td>{user.active ? "Activo" : "Inactivo"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="seg-btn small" onClick={() => edit(user)}><Pencil size={13} /> Editar</button>{" "}
                    <button
                      className="seg-btn small"
                      disabled={busy}
                      onClick={() => void save({ active: !user.active }, {
                        email: user.email, name: user.name, role: user.role,
                        local: user.localPrincipal || user.local || "",
                        extraLocals: (user.assignedLocals ?? []).filter((l) => l !== (user.localPrincipal || user.local)),
                        brands: user.brands ?? [], active: user.active !== false,
                      })}
                    >
                      {user.active ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="seg-meta" style={{ marginTop: 6 }}>Usuarios creados en la app. Si luego los agregas a 02_Usuarios, manda la LIST.</div>
        </div>
      )}
    </section>
  )
}

function isNetworkRole(role: UserRole) {
  return NETWORK_ROLES.includes(role)
}
