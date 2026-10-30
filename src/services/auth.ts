import type { UserScope } from "../types"

type ApiResult<T> = {
  ok: boolean
  message?: string
  data?: T
}

async function apiRequest<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    })

    const payload = (await response.json().catch(() => ({}))) as {
      message?: string
      user?: T
      data?: T
    }

    return {
      ok: response.ok,
      message: payload.message,
      data: payload.user ?? payload.data,
    }
  } catch {
    return {
      ok: false,
      message:
        "No fue posible conectar con el servicio de autenticación. Revisa el despliegue de /api y vuelve a intentar.",
    }
  }
}

export async function getApiSession(): Promise<UserScope | null> {
  const result = await apiRequest<UserScope>("/api/auth/me", {
    method: "GET",
  })
  return result.ok ? result.data ?? null : null
}

export async function loginWithPassword(
  email: string,
  password: string
): Promise<ApiResult<UserScope>> {
  return apiRequest<UserScope>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export async function manualActivateAccount(
  email: string,
  password: string,
  setupKey: string
): Promise<ApiResult<UserScope>> {
  return apiRequest<UserScope>("/api/auth/manual-activate", {
    method: "POST",
    body: JSON.stringify({ email, password, setupKey }),
  })
}

export async function activateWithTempKey(
  email: string,
  clave: string,
  password: string
): Promise<ApiResult<UserScope>> {
  return apiRequest<UserScope>("/api/auth/activate-temp", {
    method: "POST",
    body: JSON.stringify({ email, clave, password }),
  })
}

export async function requestActivation(
  email: string
): Promise<ApiResult<unknown>> {
  return apiRequest("/api/auth/request-activation", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

export async function activateAccount(
  token: string,
  password: string
): Promise<ApiResult<UserScope>> {
  return apiRequest<UserScope>("/api/auth/activate", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  })
}

export async function requestPasswordReset(
  email: string
): Promise<ApiResult<unknown>> {
  return apiRequest("/api/auth/request-reset", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(
  token: string,
  password: string
): Promise<ApiResult<unknown>> {
  return apiRequest("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  })
}

export async function logoutApiSession() {
  await apiRequest("/api/auth/logout", { method: "POST" })
}

/**
 * Compatibilidad transitoria con la capa Graph heredada.
 * El nuevo acceso por correo no entrega tokens Microsoft al navegador.
 * Mientras el backend/API no esté conectado, cualquier intento de usar
 * Graph en modo real debe detenerse de forma explícita en vez de exponer
 * credenciales o simular una sesión Microsoft.
 */
export async function getAccessToken(): Promise<string> {
  throw new Error(
    "Microsoft Graph directo está deshabilitado. Usa modo piloto o conecta la API Ditalcar antes de usar SharePoint real."
  )
}


/** Inicio de autenticación. En modo piloto no requiere configuración previa. */
export async function initAuth(): Promise<void> {
  return
}
