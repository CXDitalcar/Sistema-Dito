import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Mail,
  RotateCcw,
  ShieldCheck,
} from "lucide-react"
import Brand from "./Brand"
import {
  activateAccount,
  activateWithTempKey,
  loginWithPassword,
  manualActivateAccount,
  requestActivation,
  requestPasswordReset,
  resetPassword,
} from "../services/auth"
import type { UserScope } from "../types"
import "./AuthScreen.css"
import "./ditalcar-theme.css"

type AuthView = "LOGIN" | "ACTIVATE" | "ACTIVATE_REQUEST" | "RESET_REQUEST" | "RESET" | "MANUAL_SETUP" | "TEMP_KEY"

export default function AuthScreen({
  onAuthenticated,
  product,
}: {
  onAuthenticated: (user: UserScope) => void
  // Interfaz separada (por ejemplo "Gestión de Showroom"): mismo ingreso y mismos usuarios.
  product?: { name: string; description: string }
}) {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const activationToken = params.get("activation") ?? ""
  const resetToken = params.get("reset") ?? ""
  const manualSetup = params.get("setup") === "1"

  const initialView: AuthView = activationToken
    ? "ACTIVATE"
    : resetToken
      ? "RESET"
      : manualSetup
        ? "MANUAL_SETUP"
        : "LOGIN"

  const [view, setView] = useState<AuthView>(initialView)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [setupKey, setSetupKey] = useState("")
  const [tempKey, setTempKey] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setMessage("")
    setSuccess(false)
  }, [view])

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage("")
    const result = await loginWithPassword(email.trim().toLowerCase(), password)
    setBusy(false)

    if (!result.ok || !result.data) {
      setMessage(result.message ?? "No fue posible iniciar sesión.")
      return
    }
    onAuthenticated(result.data)
  }

  async function handleManualSetup(event: FormEvent) {
    event.preventDefault()
    if (password.length < 10) {
      setMessage("La contraseña debe tener al menos 10 caracteres.")
      return
    }
    if (password !== confirmPassword) {
      setMessage("Las contraseñas no coinciden.")
      return
    }
    if (setupKey.length < 16) {
      setMessage("La clave temporal de instalación debe tener al menos 16 caracteres.")
      return
    }

    setBusy(true)
    setMessage("")
    const result = await manualActivateAccount(
      email.trim().toLowerCase(),
      password,
      setupKey
    )
    setBusy(false)

    if (!result.ok || !result.data) {
      setMessage(result.message ?? "No fue posible activar el acceso manual.")
      return
    }

    setSuccess(true)
    setMessage("Acceso activado correctamente.")
    window.history.replaceState({}, "", window.location.pathname)
    onAuthenticated(result.data)
  }

  async function handleTempKey(event: FormEvent) {
    event.preventDefault()
    if (password.length < 10) {
      setMessage("La contraseña debe tener al menos 10 caracteres.")
      return
    }
    if (password !== confirmPassword) {
      setMessage("Las contraseñas no coinciden.")
      return
    }
    setBusy(true)
    setMessage("")
    const result = await activateWithTempKey(email.trim().toLowerCase(), tempKey, password)
    setBusy(false)
    if (!result.ok || !result.data) {
      setMessage(result.message ?? "No fue posible activar tu cuenta.")
      return
    }
    onAuthenticated(result.data)
  }

  async function handleActivationRequest(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage("")
    const result = await requestActivation(email.trim().toLowerCase())
    setBusy(false)
    setSuccess(result.ok)
    setMessage(
      result.message ??
        "Si tu correo está habilitado en Ditalcar, recibirás un enlace para activar tu cuenta."
    )
  }

  async function handleActivate(event: FormEvent) {
    event.preventDefault()
    if (!activationToken) {
      setMessage("Solicita primero tu enlace de activación.")
      return
    }
    if (password.length < 10) {
      setMessage("La contraseña debe tener al menos 10 caracteres.")
      return
    }
    if (password !== confirmPassword) {
      setMessage("Las contraseñas no coinciden.")
      return
    }

    setBusy(true)
    setMessage("")
    const result = await activateAccount(activationToken, password)
    setBusy(false)

    if (!result.ok) {
      setMessage(result.message ?? "No fue posible activar la cuenta.")
      return
    }

    setSuccess(true)
    setMessage("Cuenta activada. Ya puedes ingresar con tu correo y contraseña.")
    setPassword("")
    setConfirmPassword("")
    window.history.replaceState({}, "", window.location.pathname)
    setView("LOGIN")
  }

  async function handleResetRequest(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage("")
    const result = await requestPasswordReset(email.trim().toLowerCase())
    setBusy(false)
    setSuccess(result.ok)
    setMessage(
      result.message ??
        "Si el correo está registrado, recibirás un enlace para crear una nueva contraseña."
    )
  }

  async function handleReset(event: FormEvent) {
    event.preventDefault()
    if (!resetToken) {
      setMessage("Abre el enlace de recuperación recibido en tu correo.")
      return
    }
    if (password.length < 10) {
      setMessage("La contraseña debe tener al menos 10 caracteres.")
      return
    }
    if (password !== confirmPassword) {
      setMessage("Las contraseñas no coinciden.")
      return
    }
    setBusy(true)
    const result = await resetPassword(resetToken, password)
    setBusy(false)
    setSuccess(result.ok)
    setMessage(
      result.ok
        ? "Contraseña actualizada. Ya puedes ingresar."
        : result.message ?? "No fue posible actualizar la contraseña."
    )
    if (result.ok) {
      window.history.replaceState({}, "", window.location.pathname)
      setView("LOGIN")
      setPassword("")
      setConfirmPassword("")
    }
  }

  return (
    <div className={`auth-page ${product ? "auth-ditalcar" : ""}`}>
      <div className="auth-card">
        {product ? <img className="auth-brand-logo" src="/assets/logo-principal-con-slogan.png" alt="Ditalcar · Experiencia que te lleva lejos" /> : <Brand large />}
        <div className="auth-title">
          <span>{product ? "INGRESA CON TU CUENTA DITO" : "DITO"}</span>
          <h1>{view === "LOGIN" && product ? product.name : titleFor(view)}</h1>
          <p>{view === "LOGIN" && product ? product.description : descriptionFor(view)}</p>
        </div>

        <div className="auth-pilot-banner">
          <ShieldCheck size={18} />
          <div>
            <strong>Acceso protegido</strong>
            <span>Tu perfil, local y permisos se cargan automáticamente después de iniciar sesión.</span>
          </div>
        </div>

        {view === "LOGIN" && (
          <form className="auth-form" onSubmit={handleLogin}>
            <EmailField email={email} onEmail={setEmail} />
            <label>
              <span>Contraseña</span>
              <div className="auth-input">
                <KeyRound size={16} />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Tu contraseña"
                  required
                />
              </div>
            </label>
            <button className="auth-primary" disabled={busy}>
              {busy ? "Ingresando…" : "Ingresar"}
              <ArrowRight size={16} />
            </button>
            <div className="auth-links">
              <button type="button" onClick={() => setView("ACTIVATE_REQUEST")}>
                Primera vez · Activar cuenta
              </button>
              <button type="button" onClick={() => setView("RESET_REQUEST")}>
                Olvidé mi contraseña
              </button>
            </div>
            <button className="auth-back" type="button" onClick={() => setView("TEMP_KEY")}>
              Tengo una clave temporal
            </button>
          </form>
        )}

        {view === "TEMP_KEY" && (
          <form className="auth-form" onSubmit={handleTempKey}>
            <EmailField email={email} onEmail={setEmail} />
            <label>
              <span>Clave temporal</span>
              <div className="auth-input">
                <ShieldCheck size={16} />
                <input
                  type="text"
                  autoComplete="one-time-code"
                  autoCapitalize="characters"
                  value={tempKey}
                  onChange={(event) => setTempKey(event.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX-XXXX"
                  required
                />
              </div>
            </label>
            <PasswordFields
              password={password}
              confirmPassword={confirmPassword}
              onPassword={setPassword}
              onConfirm={setConfirmPassword}
            />
            <button className="auth-primary" disabled={busy}>
              {busy ? "Activando…" : "Crear mi contraseña e ingresar"}
              <ArrowRight size={16} />
            </button>
            <small className="auth-password-help">
              La clave temporal te la entrega Experiencia de Clientes. Es personal, se usa una sola vez y vence.
            </small>
            <button className="auth-back" type="button" onClick={() => setView("LOGIN")}>
              Volver al ingreso
            </button>
          </form>
        )}

        {view === "MANUAL_SETUP" && (
          <form className="auth-form" onSubmit={handleManualSetup}>
            <EmailField email={email} onEmail={setEmail} />
            <label>
              <span>Clave temporal de instalación</span>
              <div className="auth-input">
                <ShieldCheck size={16} />
                <input
                  type="password"
                  autoComplete="off"
                  value={setupKey}
                  onChange={(event) => setSetupKey(event.target.value)}
                  placeholder="La misma clave configurada en Azure"
                  required
                />
              </div>
            </label>
            <PasswordFields
              password={password}
              confirmPassword={confirmPassword}
              onPassword={setPassword}
              onConfirm={setConfirmPassword}
            />
            <button className="auth-primary" disabled={busy}>
              {busy ? "Activando…" : "Activar mi acceso"}
              <ArrowRight size={16} />
            </button>
            <small className="auth-password-help">
              Esta vía es temporal. Después de activar tu cuenta, elimina AUTH_SETUP_KEY y AUTH_SETUP_EMAIL de Azure.
            </small>
            <button className="auth-back" type="button" onClick={() => setView("LOGIN")}>
              Volver al ingreso
            </button>
          </form>
        )}

        {view === "ACTIVATE_REQUEST" && (
          <form className="auth-form" onSubmit={handleActivationRequest}>
            <EmailField email={email} onEmail={setEmail} />
            <button className="auth-primary" disabled={busy}>
              {busy ? "Enviando…" : "Enviar enlace de activación"}
              <Mail size={16} />
            </button>
            <button className="auth-back" type="button" onClick={() => setView("LOGIN")}>
              Volver al ingreso
            </button>
          </form>
        )}

        {view === "ACTIVATE" && (
          <form className="auth-form" onSubmit={handleActivate}>
            <div className="auth-token-state">
              {activationToken ? (
                <><CheckCircle2 size={17} /><span>Invitación personal detectada.</span></>
              ) : (
                <><Mail size={17} /><span>Solicita tu enlace desde la pantalla de ingreso.</span></>
              )}
            </div>
            <PasswordFields
              password={password}
              confirmPassword={confirmPassword}
              onPassword={setPassword}
              onConfirm={setConfirmPassword}
            />
            <button className="auth-primary" disabled={busy || !activationToken}>
              {busy ? "Activando…" : "Crear mi contraseña"}
              <ArrowRight size={16} />
            </button>
            <button className="auth-back" type="button" onClick={() => setView("LOGIN")}>
              Volver al ingreso
            </button>
          </form>
        )}

        {view === "RESET_REQUEST" && (
          <form className="auth-form" onSubmit={handleResetRequest}>
            <EmailField email={email} onEmail={setEmail} />
            <button className="auth-primary" disabled={busy}>
              {busy ? "Enviando…" : "Enviar enlace de recuperación"}
              <RotateCcw size={16} />
            </button>
            <button className="auth-back" type="button" onClick={() => setView("LOGIN")}>
              Volver al ingreso
            </button>
          </form>
        )}

        {view === "RESET" && (
          <form className="auth-form" onSubmit={handleReset}>
            <PasswordFields
              password={password}
              confirmPassword={confirmPassword}
              onPassword={setPassword}
              onConfirm={setConfirmPassword}
            />
            <button className="auth-primary" disabled={busy || !resetToken}>
              {busy ? "Guardando…" : "Guardar nueva contraseña"}
              <RotateCcw size={16} />
            </button>
          </form>
        )}

        {message && (
          <div className={`auth-message ${success ? "success" : ""}`}>{message}</div>
        )}
      </div>
    </div>
  )
}

function EmailField({ email, onEmail }: { email: string; onEmail: (value: string) => void }) {
  return (
    <label>
      <span>Correo corporativo</span>
      <div className="auth-input">
        <Mail size={16} />
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => onEmail(event.target.value)}
          placeholder="nombre@ditalcar.cl"
          required
        />
      </div>
    </label>
  )
}

function PasswordFields({
  password,
  confirmPassword,
  onPassword,
  onConfirm,
}: {
  password: string
  confirmPassword: string
  onPassword: (value: string) => void
  onConfirm: (value: string) => void
}) {
  return (
    <>
      <label>
        <span>Nueva contraseña</span>
        <div className="auth-input">
          <KeyRound size={16} />
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => onPassword(event.target.value)}
            placeholder="Mínimo 10 caracteres"
            required
          />
        </div>
      </label>
      <label>
        <span>Confirmar contraseña</span>
        <div className="auth-input">
          <KeyRound size={16} />
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => onConfirm(event.target.value)}
            placeholder="Repite tu contraseña"
            required
          />
        </div>
      </label>
      <small className="auth-password-help">
        La contraseña se guarda sólo como hash seguro en el backend; no se almacena en SharePoint ni en el navegador.
      </small>
    </>
  )
}

function titleFor(view: AuthView) {
  if (view === "MANUAL_SETUP") return "Activación manual"
  if (view === "TEMP_KEY") return "Ingreso con clave temporal"
  if (view === "ACTIVATE_REQUEST") return "Activa tu cuenta"
  if (view === "ACTIVATE") return "Crea tu contraseña"
  if (view === "RESET_REQUEST") return "Recupera tu acceso"
  if (view === "RESET") return "Crea una nueva contraseña"
  return "Bienvenido"
}

function descriptionFor(view: AuthView) {
  if (view === "MANUAL_SETUP") return "Crea tu acceso de Experiencia sin depender del correo de invitación."
  if (view === "TEMP_KEY") return "Ingresa tu correo, la clave temporal que te entregaron y crea tu contraseña personal."
  if (view === "ACTIVATE_REQUEST") return "Ingresa tu correo corporativo para recibir tu enlace personal."
  if (view === "ACTIVATE") return "Crea una contraseña personal para tu cuenta Ditalcar."
  if (view === "RESET_REQUEST") return "Te enviaremos un enlace personal para crear una nueva contraseña."
  if (view === "RESET") return "El enlace es de un solo uso y vence automáticamente."
  return "Ingresa con tu correo corporativo y tu contraseña personal."
}
