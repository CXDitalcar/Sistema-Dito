import crypto from "node:crypto"
import bcrypt from "bcryptjs"

export const SESSION_COOKIE = "ditalcar_session"

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url")
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export function validPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 10 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password)
  )
}

export function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase()
}

export function validCorporateEmail(email) {
  const normalized = normalizeEmail(email)
  const allowed = String(process.env.AUTH_ALLOWED_EMAIL_DOMAINS || "ditalcar.cl")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
  return allowed.some((domain) => normalized.endsWith(`@${domain}`))
}

export function parseCookieHeader(header = "") {
  return Object.fromEntries(
    header.split(";").map((part) => {
      const index = part.indexOf("=")
      if (index < 0) return [part.trim(), ""]
      return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())]
    })
  )
}

export function sessionCookie(token, maxAgeSeconds) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
}
