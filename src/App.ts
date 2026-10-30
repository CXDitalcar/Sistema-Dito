import { useEffect, useState } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import Shell from "./components/Shell"
import PortalShell from "./components/PortalShell"
import Portal from "./pages/Portal"
import Showroom from "./pages/Showroom"
import AcademiaHome from "./pages/AcademiaHome"
import CursoDitalcar from "./pages/CursoDitalcar"
import Contabilidad from "./pages/Contabilidad"
import { getAdmAccess } from "./services/admAccess"
import { INTERFACES, currentInterface, leaveInterface } from "./services/interfaceMode"
import { showroomTasks, useShowroomRequests } from "./services/showroomData"
import { isExperienceProcess } from "./services/requestCatalog"
import AuthScreen from "./components/AuthScreen"

import Home from "./pages/Home"
import Academia from "./pages/Academia"
import MiLocal from "./pages/MiLocal"
import Solicitudes from "./pages/Solicitudes"
import NuevaSolicitud from "./pages/NuevaSolicitud"
import Aprobaciones from "./pages/Aprobaciones"
import SolicitudDetalle from "./pages/SolicitudDetalle"
import Formularios from "./pages/Formularios"
import FormularioDetalle from "./pages/FormularioDetalle"
import PedidoInsumos from "./pages/PedidoInsumos"
import KPI from "./pages/KPI"
import Usuarios from "./pages/Usuarios"
import RutaExperiencia from "./pages/RutaExperiencia"
import Gestion from "./pages/Gestion"
import AdminDito from "./pages/AdminDito"
import { isDitoAdminUser } from "./services/ditoAccess"
import Datos from "./pages/Datos"
import Seguimiento from "./pages/Seguimiento"
import SeguimientoMacro from "./pages/SeguimientoMacro"
import Ventas from "./pages/Ventas"
import Frogmi from "./pages/Frogmi"
import ClienteFicha from "./pages/ClienteFicha"

import { appConfig } from "./config"
import { demoViewUsers } from "./data/mockData"
import { canAccessPilotModule } from "./data/pilotStellantis"
import { canAccessApprovalInbox } from "./services/permissions"
import { getApiSession, logoutApiSession } from "./services/auth"
import { getUsersDirectory } from "./services/usersDirectoryApi"
import {
  getAllOperationalUsers,
  getAllRequestAssignments,
  loadOperationalCatalog,
  setRuntimeUsers,
} from "./services/requestCatalog"
import type { UserScope } from "./types"
import { canSeeDatos, canSeeSeguimiento, hasExperienceAccess } from "./services/experienceAccess"
import { loadLocals } from "./services/localesStore"

// La API decide quién entra a Contabilidad (roles de Administración, Experiencia/PM y correos autorizados).
function ContabilidadGate({ currentUser }: { currentUser: UserScope }) {
  const [access, setAccess] = useState<{ allowed: boolean; canManage: boolean } | null>(null)
  useEffect(() => { getAdmAccess().then(setAccess) }, [])
  if (!access) return <div className="portal-page"><p>Cargando…</p></div>
  if (!access.allowed) {
    return (
      <div className="portal-page">
        <section className="adm-closed">
          <h1>Este enlace es de uso restringido</h1>
          <p>Tu cuenta no tiene acceso a esta sección. Si crees que debería tenerlo, pídeselo al equipo de Experiencia.</p>
          <button type="button" className="adm-btn" onClick={leaveInterface}>Ir a DITO</button>
        </section>
      </div>
    )
  }
  return <Contabilidad currentUser={currentUser} canManage={access.canManage} />
}

export default function App() {
  const [apiUser, setApiUser] = useState<UserScope | null>(null)
  const [viewAsUser, setViewAsUser] = useState<UserScope | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [directoryUsers, setDirectoryUsers] = useState<UserScope[]>([])
  const [catalogVersion, setCatalogVersion] = useState(0)

  useEffect(() => {
    let active = true
    getApiSession()
      .then((user) => {
        if (active) setApiUser(user)
      })
      .finally(() => {
        if (active) setAuthLoading(false)
      })

    return () => {
      active = false
    }
  }, [])


  useEffect(() => {
    if (!apiUser) return
    let active = true
    const refreshCatalog = () => {
      void loadLocals()
      loadOperationalCatalog()
        .finally(() => {
          if (active) setCatalogVersion((value) => value + 1)
        })
    }
    refreshCatalog()
    const timer = window.setInterval(refreshCatalog, 60_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [apiUser?.email])

  useEffect(() => {
    if (!hasExperienceAccess(apiUser)) {
      setDirectoryUsers([])
      return
    }

    let active = true
    const refresh = () => {
      getUsersDirectory()
        .then((result) => {
          if (active) {
            const activeUsers = result.users.filter((user) => user.active)
            setDirectoryUsers(activeUsers)
            setRuntimeUsers(result.users, result.meta)
            setCatalogVersion((value) => value + 1)
          }
        })
        .catch(() => {
          if (active) setDirectoryUsers([])
        })
    }

    refresh()
    window.addEventListener("ditalcar-users-source-updated", refresh)
    return () => {
      active = false
      window.removeEventListener("ditalcar-users-source-updated", refresh)
    }
  }, [apiUser?.role])

  async function exitApi() {
    await logoutApiSession()
    setApiUser(null)
    setViewAsUser(null)
  }

  if (authLoading) {
    return (
      <div className="auth-loading-screen">
        <strong>DITO</strong>
        <span>Validando sesión…</span>
      </div>
    )
  }

  const interfaceId = currentInterface()

  if (!apiUser) {
    return <AuthScreen onAuthenticated={setApiUser} product={interfaceId ? INTERFACES[interfaceId] : undefined} />
  }

  const baseUser = apiUser
  const experienceCanViewAs = hasExperienceAccess(baseUser)
  const baseUserEmail = baseUser.email
  const currentUser = viewAsUser ?? baseUser
  const dataPilotMode = appConfig.data.mode === "pilot"

  const currentBranch =
    currentUser.local ??
    currentUser.localPrincipal ??
    currentUser.zone ??
    "Red Ditalcar"

  const showApprovals = canAccessApprovalInbox(currentUser, getAllRequestAssignments())
  const canSeeAcademia = canAccessPilotModule(currentUser, "ACADEMIA")
  const canSeeMiLocal = canAccessPilotModule(currentUser, "MI_LOCAL")
  const canSeeFormularios = canAccessPilotModule(currentUser, "FORMULARIOS")
  const canSeeInsumos = canAccessPilotModule(currentUser, "INSUMOS")
  const canSeeKPI = canAccessPilotModule(currentUser, "KPI")
  const canSeeSolicitudes = canAccessPilotModule(currentUser, "SOLICITUDES")
  // Gestión aparece si el perfil tiene al menos una herramienta dentro.
  // Usuarios/fuentes dependen del perfil REAL (experienceCanViewAs), no de "Ver como".
  const showGestion = showApprovals || canSeeSolicitudes || canSeeKPI || canSeeFormularios || experienceCanViewAs

  // “Ver como” es una herramienta administrativa de Experiencia, no una vía de ingreso.
  // Experiencia y PM usan DitalApp completa (menú lateral). El resto entra a un inicio
  // por tarjetas ("Para hoy", "Tus tableros", "Tus accesos") sin menú lateral.
  const fullApp = hasExperienceAccess(currentUser)
  const Frame = fullApp ? Shell : PortalShell
  const portalPermissions = {
    kpi: canSeeKPI, miLocal: canSeeMiLocal, solicitudes: canSeeSolicitudes || currentUser.role === "ASISTENTE_JUNIOR",
    bandeja: showApprovals, academia: canSeeAcademia, formularios: canSeeFormularios,
  }

  const operationalUsers = getAllOperationalUsers().filter((user) => user.active)
  void catalogVersion
  const viewAsOptions = (directoryUsers.length ? directoryUsers : operationalUsers.length ? operationalUsers : demoViewUsers).map((user) => ({
    ...user,
    active: true,
    testingView: true,
  }))

  function handleViewAs(email: string) {
    if (!experienceCanViewAs) return
    if (!email || email === baseUserEmail) {
      setViewAsUser(null)
      return
    }
    const profile = viewAsOptions.find((user) => user.email === email)
    setViewAsUser(profile ?? null)
  }

  // Link propio "Gestión de Showroom" (/showroom): solicitudes de Experiencia y Ruta de Experiencia.
  // La Ruta la puede realizar cualquier perfil (pedido 23-10), aunque esté asignada a la Jefatura.
  if (interfaceId === "showroom") {
    return (
      <BrowserRouter>
        <ShowroomApp
          currentUser={currentUser}
          baseUser={baseUser}
          branch={currentBranch}
          onLogout={exitApi}
          viewAsOptions={experienceCanViewAs ? viewAsOptions : undefined}
          viewAsEmail={viewAsUser?.email ?? baseUserEmail}
          onViewAs={experienceCanViewAs ? handleViewAs : undefined}
          canRoute={true}
          canLocalBoard={canSeeMiLocal}
        />
      </BrowserRouter>
    )
  }

  // Link propio "Academia DITALCAR" (/academia-ditalcar): portada con lo que sigue, cursos y material.
  if (interfaceId === "academia") {
    return (
      <BrowserRouter>
        <PortalShell
          currentUser={currentUser}
          authenticatedUser={baseUser}
          onLogout={exitApi}
          viewAsOptions={experienceCanViewAs ? viewAsOptions : undefined}
          viewAsEmail={viewAsUser?.email ?? baseUserEmail}
          onViewAs={experienceCanViewAs ? handleViewAs : undefined}
          homePath={INTERFACES.academia.home}
          productName={INTERFACES.academia.name}
          avisosKey="academia"
          onLeave={leaveInterface}
        >
          <Routes>
            <Route path="/academia-ditalcar" element={<AcademiaHome currentUser={currentUser} />} />
            <Route path="/academia-ditalcar/curso/:courseId" element={<CursoDitalcar currentUser={currentUser} />} />
            <Route path="/academia-ditalcar/curso/:courseId/:step" element={<CursoDitalcar currentUser={currentUser} />} />
            <Route path="/academia" element={<Academia currentUser={currentUser} embedded />} />
            <Route path="*" element={<Navigate to="/academia-ditalcar" replace />} />
          </Routes>
        </PortalShell>
      </BrowserRouter>
    )
  }

  // Link propio "Contabilidad" (/contabilidad): Administración, Experiencia/PM y los correos autorizados.
  if (interfaceId === "contabilidad") {
    return (
      <BrowserRouter>
        <PortalShell
          currentUser={currentUser}
          authenticatedUser={baseUser}
          onLogout={exitApi}
          viewAsOptions={experienceCanViewAs ? viewAsOptions : undefined}
          viewAsEmail={viewAsUser?.email ?? baseUserEmail}
          onViewAs={experienceCanViewAs ? handleViewAs : undefined}
          homePath={INTERFACES.contabilidad.home}
          productName={INTERFACES.contabilidad.name}
          avisosOverride={0}
          onLeave={leaveInterface}
        >
          <Routes>
            <Route path="/contabilidad" element={<ContabilidadGate currentUser={currentUser} />} />
            <Route path="*" element={<Navigate to="/contabilidad" replace />} />
          </Routes>
        </PortalShell>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <Frame
        currentUser={currentUser}
        authenticatedUser={baseUser}
        userName={currentUser.name}
        branch={currentBranch}
        demoMode={false}
        onLogout={exitApi}
        showGestion={showGestion}
        viewAsOptions={experienceCanViewAs ? viewAsOptions : undefined}
        viewAsEmail={viewAsUser?.email ?? baseUserEmail}
        onViewAs={experienceCanViewAs ? handleViewAs : undefined}
        showPilotFeedback={canAccessPilotModule(currentUser, "HOME")}
      >
        <Routes>
          <Route
            path="/"
            element={
              fullApp ? (
                <Home
                  userName={currentUser.name}
                  branch={currentBranch}
                  currentUser={currentUser}
                  demoMode={dataPilotMode}
                />
              ) : (
                <Portal currentUser={currentUser} permissions={portalPermissions} />
              )
            }
          />

          <Route
            path="/academia"
            element={
              canSeeAcademia ? (
                <Academia currentUser={currentUser} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/gestion"
            element={
              // Sin menú lateral, Gestión no existe para los demás perfiles: sus accesos están en el inicio.
              showGestion && fullApp ? (
                <Gestion
                  showApprovals={showApprovals}
                  showRequests={canSeeSolicitudes}
                  showKpi={canSeeKPI}
                  showForms={canSeeFormularios}
                  showAdmin={experienceCanViewAs}
                  showDitoAdmin={isDitoAdminUser(currentUser)}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/seguimiento"
            element={
              canSeeSeguimiento(currentUser) ? (
                <Seguimiento currentUser={currentUser} />
              ) : currentUser.role === "ASISTENTE_JUNIOR" ? (
                <Navigate to="/" replace />
              ) : (
                <SeguimientoMacro />
              )
            }
          />

          <Route path="/ventas" element={<Ventas currentUser={currentUser} />} />

          <Route
            path="/frogmi"
            element={
              hasExperienceAccess(currentUser) || currentUser.role === "ASISTENTE_JUNIOR" || currentUser.role === "JEFATURA_LOCAL"
                ? <Frogmi />
                : <Navigate to="/" replace />
            }
          />

          <Route path="/seguimiento/cliente" element={<ClienteFicha currentUser={currentUser} />} />

          <Route
            path="/dito-admin"
            element={isDitoAdminUser(currentUser) ? <AdminDito /> : <Navigate to="/" replace />}
          />

          <Route
            path="/datos"
            element={canSeeDatos(currentUser) ? <Datos /> : <Navigate to="/" replace />}
          />

          <Route path="/playbooks-venta" element={<Navigate to="/academia?tab=playbooks" replace />} />

          <Route
            path="/mi-local"
            element={
              canSeeMiLocal ? (
                <MiLocal branch={currentBranch} currentUser={currentUser} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/solicitudes"
            element={
              <Solicitudes
                branch={currentBranch}
                currentUser={currentUser}
                demoMode={dataPilotMode}
              />
            }
          />

          <Route path="/solicitudes/nueva" element={<NuevaSolicitud currentUser={currentUser} />} />

          <Route
            path="/aprobaciones"
            element={
              showApprovals ? (
                <Aprobaciones currentUser={currentUser} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route path="/solicitudes/:requestId" element={<SolicitudDetalle currentUser={currentUser} />} />

          <Route
            path="/insumos"
            element={
              canSeeInsumos ? (
                <PedidoInsumos currentUser={currentUser} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/kpi"
            element={
              canSeeKPI ? <KPI currentUser={currentUser} /> : <Navigate to="/" replace />
            }
          />

          <Route
            path="/usuarios"
            element={
              experienceCanViewAs ? (
                <Usuarios />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/ruta-experiencia"
            element={
              canSeeFormularios ? (
                <RutaExperiencia currentUser={currentUser} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/formularios"
            element={
              canSeeFormularios ? (
                <Formularios currentUser={currentUser} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/formularios/:executionId"
            element={
              canSeeFormularios ? (
                <FormularioDetalle currentUser={currentUser} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </Frame>
    </BrowserRouter>
  )
}

function ShowroomApp({
  currentUser, baseUser, branch, onLogout, viewAsOptions, viewAsEmail, onViewAs, canRoute, canLocalBoard,
}: {
  currentUser: UserScope
  baseUser: UserScope
  branch: string
  onLogout: () => Promise<void>
  viewAsOptions?: UserScope[]
  viewAsEmail?: string
  onViewAs?: (email: string) => void
  canRoute: boolean
  canLocalBoard: boolean
}) {
  const requests = useShowroomRequests(currentUser)
  const avisos = showroomTasks(currentUser, requests ?? []).length
  return (
    <PortalShell
      currentUser={currentUser}
      authenticatedUser={baseUser}
      onLogout={onLogout}
      viewAsOptions={viewAsOptions}
      viewAsEmail={viewAsEmail}
      onViewAs={onViewAs}
      homePath={INTERFACES.showroom.home}
      productName={INTERFACES.showroom.name}
      avisosOverride={avisos}
      onLeave={leaveInterface}
    >
      <Routes>
        <Route path="/showroom" element={<Showroom currentUser={currentUser} canRoute={canRoute} canLocalBoard={canLocalBoard} />} />
        <Route path="/solicitudes/nueva" element={<NuevaSolicitud currentUser={currentUser} processFilter={isExperienceProcess} />} />
        <Route path="/solicitudes/:requestId" element={<SolicitudDetalle currentUser={currentUser} />} />
        {canRoute && <Route path="/formularios" element={<Formularios currentUser={currentUser} />} />}
        {canRoute && <Route path="/formularios/:executionId" element={<FormularioDetalle currentUser={currentUser} />} />}
        {canRoute && <Route path="/ruta-experiencia" element={<RutaExperiencia currentUser={currentUser} />} />}
        {canLocalBoard && <Route path="/mi-local" element={<MiLocal branch={branch} currentUser={currentUser} />} />}
        <Route path="*" element={<Navigate to="/showroom" replace />} />
      </Routes>
    </PortalShell>
  )
}
