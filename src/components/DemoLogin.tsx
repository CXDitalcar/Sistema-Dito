import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  Building2,
  ShieldCheck,
  UserRound,
} from "lucide-react"

import type { UserScope } from "../types"
import { PILOT_LOCAL } from "../data/pilotStellantis"
import { ditalcarLocals } from "../data/requestConfig"

import "./DemoLogin.css"

export default function DemoLogin({
  users,
  onEnter,
}: {
  users: UserScope[]
  onEnter: (user: UserScope) => void
}) {
  const activeUsers = useMemo(
    () => users.filter((user) => user.active),
    [users]
  )

  const [selectedEmail, setSelectedEmail] = useState(
    activeUsers[0]?.email ?? ""
  )

  const selectedUser =
    activeUsers.find((user) => user.email === selectedEmail) ?? activeUsers[0]

  const [profileName, setProfileName] = useState("Vendedor Piloto")
  const [profileLocal, setProfileLocal] = useState(PILOT_LOCAL)

  const editablePilotProfile =
    selectedUser?.role === "VENDEDOR" || selectedUser?.role === "JEFATURA_LOCAL"

  useEffect(() => {
    if (!selectedUser || !editablePilotProfile) return

    setProfileName(
      selectedUser.name ||
        (selectedUser.role === "JEFATURA_LOCAL"
          ? "Jefatura de Sucursal"
          : "Vendedor Piloto")
    )
    setProfileLocal(selectedUser.local || PILOT_LOCAL)
  }, [selectedUser?.email, editablePilotProfile])

  if (!selectedUser) return null

  function enterSelectedProfile() {
    if (!editablePilotProfile) {
      onEnter(selectedUser)
      return
    }

    const fallbackName =
      selectedUser.role === "JEFATURA_LOCAL"
        ? "Jefatura de Sucursal"
        : "Vendedor Piloto"

    onEnter({
      ...selectedUser,
      name: profileName.trim() || fallbackName,
      local: profileLocal,
      localPrincipal: profileLocal,
      assignedLocals: [profileLocal],
      scope: "LOCAL",
    })
  }

  return (
    <div className="demo-login">
      <div className="demo-login-head">
        <div className="demo-login-icon">
          <ShieldCheck size={21} />
        </div>

        <div>
          <strong>Modo prueba · Ver como</strong>
          <span>
            Revisa la experiencia de cada cargo durante el piloto. La autenticación
            definitiva será con correo y contraseña propia.
          </span>
        </div>
      </div>

      <label className="demo-user-select">
        <span>Entrar como</span>
        <select
          value={selectedEmail}
          onChange={(event) => setSelectedEmail(event.target.value)}
        >
          {activeUsers.map((user) => (
            <option key={user.email} value={user.email}>
              {user.name}
            </option>
          ))}
        </select>
      </label>

      {editablePilotProfile && (
        <div className="demo-seller-fields">
          <label className="demo-user-select">
            <span>
              {selectedUser.role === "JEFATURA_LOCAL"
                ? "Nombre de la jefatura"
                : "Nombre del vendedor"}
            </span>
            <input
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              placeholder="Nombre y apellido"
            />
          </label>

          <label className="demo-user-select">
            <span>Local</span>
            <select
              value={profileLocal}
              onChange={(event) => setProfileLocal(event.target.value)}
            >
              {ditalcarLocals.map((local) => (
                <option key={local.name} value={local.name}>
                  {local.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="demo-user-card">
        <div className="demo-user-avatar">
          <UserRound size={23} />
        </div>

        <div className="demo-user-data">
          <strong>
            {editablePilotProfile
              ? profileName || selectedUser.name
              : selectedUser.name}
          </strong>
          <span>{formatRole(selectedUser.role)}</span>
          <small>
            <Building2 size={13} />
            {editablePilotProfile
              ? profileLocal
              : selectedUser.local ??
                selectedUser.localPrincipal ??
                selectedUser.zone ??
                "Red Ditalcar"}
          </small>
        </div>
      </div>

      <button
        className="demo-enter-btn"
        type="button"
        onClick={enterSelectedProfile}
      >
        Entrar en modo piloto
        <ArrowRight size={17} />
      </button>

      <small className="demo-warning">
        En modo prueba las solicitudes se guardan localmente en este navegador
        y no modifican SharePoint. Experiencia de Clientes puede usar “Ver como”
        para revisar todos los cargos sin perder su acceso completo.
      </small>
    </div>
  )
}

function formatRole(role: UserScope["role"]) {
  const labels: Record<UserScope["role"], string> = {
    VENDEDOR: "Vendedor",
    JEFATURA_LOCAL: "Jefatura de Sucursal",
    JEFATURA_MARCA: "Gerencia de Marca",
    JEFATURA_ZONAL: "Gerencia de Marca",
    GERENCIA_MARCA: "Gerencia de Marca",
    GERENCIA_VENTAS: "Gerencia de Ventas",
    JEFATURA_COMERCIAL_CLIENTES: "Gerencia de Marca",
    JEFATURA_OPERACIONES_COMERCIALES: "Jefatura Operaciones Comerciales",
    JEFATURA_ADMINISTRACION: "Jefatura de Administración",
    GERENCIA_ADMINISTRACION: "Gerencia de Administración",
    GERENCIA_COMERCIAL: "Gerencia Comercial",
    JEFATURA_MARKETING: "Equipo de Marketing",
    EXPERIENCIA_CLIENTES: "Experiencia de Clientes",
    PROJECT_MANAGER: "Project Manager",
    ASISTENTE_GERENCIA: "Asistente de Gerencia",
    ASISTENTE_JUNIOR: "Junior",
    ADMINISTRATIVO: "Administrativo",
    EQUIPO_COMERCIAL: "Equipo Comercial",
    GERENCIA_GENERAL: "Gerencia General",
  }

  return labels[role]
}
