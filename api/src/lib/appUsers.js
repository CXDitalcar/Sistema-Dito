// Alta de usuarios dentro de DitalApp (Experiencia y PM), mientras 02_Usuarios no se pueda editar desde la app.
import { getUser, listAppUsers, upsertUser } from "./store.js"
import { normalizeEmail, validCorporateEmail } from "./security.js"
import { publicUser } from "./profile.js"

const ROLES = new Set([
  "VENDEDOR","ASISTENTE_JUNIOR","JEFATURA_LOCAL","JEFATURA_MARCA","JEFATURA_ZONAL","GERENCIA_MARCA",
  "GERENCIA_VENTAS","JEFATURA_OPERACIONES_COMERCIALES","JEFATURA_ADMINISTRACION","GERENCIA_ADMINISTRACION",
  "GERENCIA_COMERCIAL","JEFATURA_MARKETING","EXPERIENCIA_CLIENTES","PROJECT_MANAGER","ASISTENTE_GERENCIA",
  "ADMINISTRATIVO","EQUIPO_COMERCIAL","GERENCIA_GENERAL",
])
const NETWORK = new Set([
  "GERENCIA_VENTAS","GERENCIA_COMERCIAL","GERENCIA_ADMINISTRACION","GERENCIA_GENERAL","JEFATURA_OPERACIONES_COMERCIALES",
  "JEFATURA_ADMINISTRACION","JEFATURA_MARKETING","EXPERIENCIA_CLIENTES","PROJECT_MANAGER","ASISTENTE_GERENCIA",
])

function list(value) {
  const items = Array.isArray(value) ? value : String(value ?? "").split(/[;,]/)
  return [...new Set(items.map((x) => String(x).trim()).filter(Boolean))]
}

export function toDirectoryUser(entity) {
  const user = publicUser(entity)
  return { ...user, source: "APP", createdBy: entity.createdBy, createdAt: entity.createdAt }
}

export async function listAppDirectoryUsers() {
  return (await listAppUsers()).map(toDirectoryUser)
}

export async function saveAppUser(input, actorEmail) {
  const email = normalizeEmail(input.email)
  if (!email || !validCorporateEmail(email)) throw new Error("Usa un correo corporativo válido (@ditalcar.cl).")
  const name = String(input.name || "").trim()
  if (!name) throw new Error("Escribe el nombre de la persona.")
  const role = String(input.role || "").toUpperCase()
  if (!ROLES.has(role)) throw new Error("Elige un rol válido.")
  const assignedLocals = list(input.assignedLocals)
  const local = String(input.local || assignedLocals[0] || "").trim()
  // Alcance de 02_Usuarios: si viene, se respeta (Red sin locales = toda la red; con locales = limitado a ellos).
  const inputScope = String(input.scope || "").toUpperCase()
  const validScope = ["LOCAL", "MULTILOCAL", "MARCA", "ZONA", "RED"].includes(inputScope) ? inputScope : ""
  if (!NETWORK.has(role) && !["GERENCIA_MARCA","JEFATURA_MARCA","JEFATURA_ZONAL"].includes(role) && !local && validScope !== "RED") {
    throw new Error("Indica el local de la persona.")
  }
  const existing = await getUser(email)
  if (existing && existing.source !== "APP" && input.mode === "create") {
    throw new Error("Esa persona ya existe en el directorio (02_Usuarios o Excel). Edítala allí.")
  }
  const scope = validScope ? validScope
    : NETWORK.has(role) ? "RED"
    : ["GERENCIA_MARCA","JEFATURA_MARCA"].includes(role) ? "MARCA"
    : role === "JEFATURA_ZONAL" ? "ZONA"
    : assignedLocals.length > 1 ? "MULTILOCAL" : "LOCAL"
  const entity = {
    email,
    name,
    role,
    local: local || "",
    localPrincipal: local || "",
    assignedLocals: JSON.stringify(assignedLocals.length ? assignedLocals : local ? [local] : []),
    scope,
    zone: String(input.zone || ""),
    brands: JSON.stringify(list(input.brands)),
    areaFunctional: String(input.areaFunctional || ""),
    active: input.active !== false,
    source: "APP",
    createdBy: existing?.createdBy || actorEmail,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedBy: actorEmail,
    updatedAt: new Date().toISOString(),
  }
  await upsertUser(entity)
  return toDirectoryUser(await getUser(email))
}

// Importación masiva desde Excel (Usuarios › Importar Excel). Crea o actualiza usuarios APP.
// No toca a quienes ya vienen del directorio oficial (LIST/Excel conectado).
function placeholderName(user) {
  const name = String(user?.name || "").trim().toLowerCase()
  const email = String(user?.email || "").trim().toLowerCase()
  return !name || name === email || name === email.split("@")[0]
}

export async function importAppUsers(users, actorEmail) {
  const summary = { leidos: users.length, nuevos: 0, actualizados: 0, omitidos: 0, errores: [] }
  for (const item of users) {
    try {
      const existing = await getUser(normalizeEmail(item.email))
      if (existing && existing.source !== "APP" && existing.passwordHash) {
        // Cuenta ya activada: no se tocan rol, locales ni clave. Solo se completa el nombre
        // si hoy es el correo o su inicio (por ejemplo "flee" en vez de "Florencia Lee").
        if (placeholderName(existing) && item.name && item.name !== item.email) {
          await upsertUser({ ...existing, name: String(item.name).trim().slice(0, 120) })
          summary.actualizados += 1
        } else summary.omitidos += 1
        continue
      }
      await saveAppUser({
        mode: existing ? "update" : "create",
        email: item.email,
        name: item.name && item.name !== item.email ? item.name : (existing?.name || item.email),
        role: item.role,
        local: item.localPrincipal || item.local || "",
        assignedLocals: item.assignedLocals || [],
        brands: item.brands || [],
        zone: item.zone || "",
        areaFunctional: item.areaFunctional || "",
        scope: item.scope || "",
        active: item.active !== false,
      }, actorEmail)
      if (existing) summary.actualizados += 1
      else summary.nuevos += 1
    } catch (error) {
      summary.errores.push(`${item.email}: ${error?.message || "error"}`)
    }
  }
  return summary
}
