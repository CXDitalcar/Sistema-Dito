// ¿La Ruta la hizo la jefatura del local? Cuenta para la adherencia.
// Las Rutas cargadas desde la plantilla histórica traen la respuesta en `byJefatura`; las demás se deducen del cargo
// de quien la envió en 02_Usuarios (Jefatura de local).
import { getUser } from "./store.js"

export async function jefaturaPredicate(executions) {
  const emails = [...new Set(executions.filter((e) => e.mode === "RUTA" && e.status === "SUBMITTED" && e.byJefatura === undefined).map((e) => String(e.completedByEmail || "").toLowerCase()).filter(Boolean))]
  const jefes = new Set()
  await Promise.all(emails.map(async (email) => {
    const user = await getUser(email).catch(() => null)
    if (user?.role === "JEFATURA_LOCAL") jefes.add(email)
  }))
  return (e) => (e.byJefatura !== undefined ? Boolean(e.byJefatura) : jefes.has(String(e.completedByEmail || "").toLowerCase()))
}
