import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Database, FileSpreadsheet, Link2, RefreshCw, Save, UsersRound, XCircle } from "lucide-react"
import type { UserScope } from "../types"
import {
  getUsersDirectory,
  getUsersSource,
  saveUsersSource,
  type UsersDirectoryMeta,
} from "../services/usersDirectoryApi"
import { fetchOperationsStatus, type OperationsStatus } from "../services/operationalCatalogApi"
import ClavesTemporales from "../components/ClavesTemporales"
import AgregarUsuario from "../components/AgregarUsuario"
function roleLabel(role: UserScope["role"]) {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function dateLabel(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

export default function Usuarios() {
  const [url, setUrl] = useState("")
  const [users, setUsers] = useState<UserScope[]>([])
  const [meta, setMeta] = useState<UsersDirectoryMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [operationsStatus, setOperationsStatus] = useState<OperationsStatus | null>(null)

  async function load() {
    setLoading(true)
    setError("")
    try {
      const [source, directory, status] = await Promise.all([
        getUsersSource(),
        getUsersDirectory(),
        fetchOperationsStatus().catch(() => null),
      ])
      setUrl(source.url || "")
      setUsers(directory.users)
      setMeta(directory.meta)
      setOperationsStatus(status)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar usuarios.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleSave() {
    setSaving(true)
    setMessage("")
    setError("")
    try {
      const result = await saveUsersSource(url.trim())
      setMessage(result.message)
      const directory = await getUsersDirectory()
      setUsers(directory.users)
      setMeta(directory.meta)
      window.dispatchEvent(new Event("ditalcar-users-source-updated"))
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible conectar el Excel.")
    } finally {
      setSaving(false)
    }
  }

  const activeUsers = useMemo(() => users.filter((user) => user.active), [users])
  const locals = useMemo(() => {
    const values = new Set<string>()
    users.forEach((user) => {
      if (user.localPrincipal) values.add(user.localPrincipal)
      user.assignedLocals?.forEach((local) => values.add(local))
    })
    return values.size
  }, [users])
  const roles = useMemo(() => new Set(users.map((user) => user.role)).size, [users])

  return (
    <div className="users-page">
      <div className="users-heading">
        <div>
          <span className="users-eyebrow">ADMINISTRACIÓN · EXPERIENCIA</span>
          <h1>Usuarios</h1>
          <p>La fuente maestra es la LIST <strong>02_Usuarios</strong>. El Excel queda disponible sólo como respaldo temporal mientras Graph no esté habilitado.</p>
        </div>
        <button className="users-refresh" type="button" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={17} /> Actualizar
        </button>
      </div>

      <AgregarUsuario onSaved={() => { void load(); window.dispatchEvent(new Event("ditalcar-users-source-updated")) }} />

      <ClavesTemporales users={users} />

      <section className="users-source-card">
        <div className="users-source-title">
          <div className="users-source-icon"><FileSpreadsheet size={23} /></div>
          <div>
            <strong>Fuente de Usuarios</strong>
            <span>{meta?.source === "SHAREPOINT_LIST" ? `LIST ${meta.listName || "02_Usuarios"}` : meta ? `Respaldo temporal · ${meta.sheet}` : "Pendiente de conexión"}</span>
          </div>
          <div className={`users-source-state ${meta ? "ok" : "pending"}`}>
            {meta ? <CheckCircle2 size={16} /> : <Link2 size={16} />}
            {meta?.source === "SHAREPOINT_LIST" ? "LIST ACTIVA" : meta ? "FALLBACK" : "SIN CONEXIÓN"}
          </div>
        </div>

        <label className="users-url-field">
          <span>LINK DEL EXCEL TEMPORAL</span>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://.../Usuarios.xlsx"
            type="url"
          />
          <small>Este enlace sólo se usa si 02_Usuarios no puede leerse desde SharePoint. Cuando Graph esté habilitado, la LIST gobierna automáticamente.</small>
        </label>

        <div className="users-source-actions">
          <button type="button" className="users-save" onClick={() => void handleSave()} disabled={saving || !url.trim()}>
            <Save size={17} /> {saving ? "Probando conexión…" : "Guardar y probar"}
          </button>
          {meta && <span>Última lectura: {dateLabel(meta.checkedAt)}</span>}
        </div>

        {message && <div className="users-alert success"><CheckCircle2 size={17} /> {message}</div>}
        {meta?.warning && <div className="users-alert error"><XCircle size={17} /> {meta.warning}</div>}
        {error && <div className="users-alert error"><XCircle size={17} /> {error}</div>}
      </section>

      <section className="users-source-card">
        <div className="users-source-title">
          <div className="users-source-icon"><Database size={23} /></div>
          <div>
            <strong>Fuentes operativas de la app</strong>
            <span>Usuarios, procesos, campos, asignaciones y SLA se administran desde LISTs.</span>
          </div>
        </div>
        <div className="users-table-wrap">
          <table>
            <thead><tr><th>Fuente</th><th>LIST</th><th>Estado</th><th>Registros</th></tr></thead>
            <tbody>
              {[
                ["Usuarios", operationsStatus?.users],
                ["Procesos", operationsStatus?.processes],
                ["Campos de proceso", operationsStatus?.fields],
                ["Asignaciones", operationsStatus?.assignments],
                ["SLA", operationsStatus?.sla],
              ].map(([label, info]: any) => (
                <tr key={label}>
                  <td><strong>{label}</strong></td>
                  <td>{info?.listName || "—"}</td>
                  <td><span className={`users-status ${info?.source === "SHAREPOINT_LIST" ? "active" : "inactive"}`}>{info?.source === "SHAREPOINT_LIST" ? "LIST activa" : info?.source === "CACHE" ? "Caché" : "Fallback"}</span></td>
                  <td>{info?.count ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {operationsStatus?.sla && (
          <div className={`users-alert ${operationsStatus.sla.requiredCount && operationsStatus.sla.resolvedCount === operationsStatus.sla.requiredCount ? "success" : "error"}`}>
            {operationsStatus.sla.requiredCount && operationsStatus.sla.resolvedCount === operationsStatus.sla.requiredCount ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
            SLA técnicos resueltos: {operationsStatus.sla.resolvedCount ?? 0}/{operationsStatus.sla.requiredCount ?? 0}. {operationsStatus.sla.warning || "22_Procesos y 09_AcuerdosSLA están sincronizados."}
          </div>
        )}
        {operationsStatus?.requestStorage && (
          <div className="users-alert success">
            <Database size={17} /> Solicitudes: Azure Table Storage ({operationsStatus.requestStorage.requestsTable || "DitalcarRequests"}) mientras Graph no esté habilitado. La capa queda preparada para Tablero General Solicitudes + 20_ValoresSolicitud + 21_SeguimientoSolicitudes.
          </div>
        )}
      </section>

      <section className="users-summary">
        <article><UsersRound size={20} /><span>Usuarios activos</span><strong>{activeUsers.length}</strong></article>
        <article><span>Locales</span><strong>{locals}</strong><small>según asignación</small></article>
        <article><span>Perfiles</span><strong>{roles}</strong><small>roles distintos</small></article>
        <article><span>Total filas</span><strong>{users.length}</strong><small>{meta?.inactiveCount || 0} inactivos</small></article>
      </section>

      <section className="users-table-card">
        <div className="users-table-header">
          <div>
            <strong>Directorio operativo</strong>
            <span>{loading ? "Leyendo fuente…" : `${users.length} usuarios encontrados`}</span>
          </div>
          <span className="users-structure">LIST primero · Excel sólo fallback</span>
        </div>

        <div className="users-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Local principal</th>
                <th>Locales asignados</th>
                <th>Alcance</th>
                <th>Marcas</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {!loading && users.length === 0 && (
                <tr><td colSpan={8} className="users-empty">No fue posible cargar el directorio desde 02_Usuarios ni desde el respaldo temporal.</td></tr>
              )}
              {users.map((user) => (
                <tr key={user.email}>
                  <td><strong>{user.name}</strong></td>
                  <td>{user.email}</td>
                  <td>{roleLabel(user.role)}</td>
                  <td>{user.localPrincipal || user.local || "—"}</td>
                  <td>{user.assignedLocals?.join(" · ") || "—"}</td>
                  <td>{user.scope || "—"}</td>
                  <td>{user.brands?.join(" · ") || "—"}</td>
                  <td><span className={`users-status ${user.active ? "active" : "inactive"}`}>{user.active ? "Activo" : "Inactivo"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
