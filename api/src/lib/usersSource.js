import { getAppConfig, setAppConfig } from "./store.js"

const CONFIG_KEY = "USERS_EXCEL_URL"

export async function getUsersExcelUrl() {
  const stored = await getAppConfig(CONFIG_KEY)
  return String(stored?.value || process.env.USERS_EXCEL_URL || "").trim()
}

export async function saveUsersExcelUrl(url, updatedBy) {
  const value = String(url || "").trim()
  if (!value.startsWith("https://")) throw new Error("El enlace debe comenzar con https://")
  return setAppConfig(CONFIG_KEY, value, { updatedBy: String(updatedBy || "") })
}
