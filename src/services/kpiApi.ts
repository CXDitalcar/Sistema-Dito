export type KpiPeriod = {
  monthNumber: number
  month: string
  year: number
}

export type KpiSummary = {
  period: KpiPeriod
  notesSales: number
  newVehicleSales: number
  newVehicleValid: number
  newVehicleCancelled: number
  newVehicleOrdersBilled: number
  usedVehicleSales: number
  usedVehicleValid: number
  usedVehicleCancelled: number
  usedVehicleOrdersBilled: number
  validSalesTotal: number
  cancelledTotal: number
  ordersBilledTotal: number
  billingCurrentTotal: number
  billingCurrentNew: number
  billingCurrentUsed: number
  billingPreviousTotal: number
  billingPreviousNew: number
  billingPreviousUsed: number
  variationTotal: number
  variationNew: number
  variationUsed: number
  pendingInvoiceNew: number
  pendingInvoiceUsed: number
  goal: number | string
  compliance: number
  remaining: number
}

export type KpiDetailRow = {
  row: number
  type: "summary" | "detail"
  brand: string
  local: string
  sales: number | string
  billed: number | string
  goal: number | string
  compliance: number
}

export type KpiEvolutionPoint = {
  month: string
  value: number
}

export type KpiData = {
  summary: KpiSummary
  detail: KpiDetailRow[]
  evolution: {
    total: KpiEvolutionPoint[]
    newVehicles: KpiEvolutionPoint[]
    usedVehicles: KpiEvolutionPoint[]
  }
  meta: {
    sourceUrl: string
    finalUrl?: string
    checkedAt: string
    lastModified?: string
    dashboardSheet: string
    graphsSheet: string
    fileName?: string
  }
  stale?: boolean
  warning?: string
}

async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.message || `Error ${response.status}`)
  return payload as T
}

export async function getKpiSource() {
  return apiJson<{ configured: boolean; url: string; lastSnapshotAt?: string | null }>("/api/kpi/source")
}

export async function saveKpiSource(url: string) {
  return apiJson<{ message: string; data: KpiData }>("/api/kpi/source", {
    method: "POST",
    body: JSON.stringify({ url }),
  })
}

export async function getKpiData() {
  return apiJson<KpiData>("/api/kpi/data")
}

// ======================================================
// Administración de la fuente KPI (Gestión › Datos)
// ======================================================

export type KpiSourceInfo = {
  configured: boolean
  url: string
  activeMode?: "url" | "upload" | "manual" | null
  uploadedFile?: { fileName: string; uploadedAt?: string | null; size?: number } | null
  lastSnapshotAt?: string | null
}

export function getKpiSourceInfo() {
  return apiJson<KpiSourceInfo>("/api/kpi/source")
}

export function saveKpiSourceUrl(url: string) {
  return apiJson<{ message: string; data: KpiData }>("/api/kpi/source", { method: "POST", body: JSON.stringify({ url }) })
}

// Carga por bloques de 4 MB: Azure Static Web Apps rechaza (413) un archivo grande en una sola petición.
export async function uploadKpiWorkbook(file: File, onProgress?: (percent: number) => void) {
  const start = await apiJson<{ uploadId: string; chunkBytes: number; totalChunks: number }>("/api/uploads/start", {
    method: "POST",
    body: JSON.stringify({ kind: "kpi", fileName: file.name, size: file.size, contentType: file.type || "application/octet-stream" }),
  })
  for (let index = 0; index < start.totalChunks; index++) {
    const blob = file.slice(index * start.chunkBytes, (index + 1) * start.chunkBytes)
    const response = await fetch(`/api/uploads/chunk?uploadId=${encodeURIComponent(start.uploadId)}&index=${index}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/octet-stream" },
      body: blob,
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload?.message || `No fue posible subir el archivo (error ${response.status}).`)
    }
    onProgress?.(Math.round(((index + 1) / start.totalChunks) * 90))
  }
  return apiJson<{ message: string; data: KpiData }>("/api/uploads/finalize", { method: "POST", body: JSON.stringify({ uploadId: start.uploadId }) })
}

export type KpiManualInput = Record<string, string>

export function saveKpiManual(summary: KpiManualInput, photo?: { fileName: string; contentType: string; dataBase64: string } | null, keepPhoto = false) {
  return apiJson<{ message: string; data: KpiData }>("/api/kpi/manual", {
    method: "POST",
    body: JSON.stringify({ summary, photo, keepPhoto }),
  })
}

export const KPI_MANUAL_FIELDS: { key: string; label: string; aliases: string[] }[] = [
  { key: "goal", label: "Meta de facturación del mes", aliases: ["meta"] },
  { key: "billingCurrentNew", label: "Facturación mes · nuevos", aliases: ["facturacion nuevos", "facturados nuevos", "facturacion actual nuevos"] },
  { key: "billingCurrentUsed", label: "Facturación mes · usados", aliases: ["facturacion usados", "facturados usados", "facturacion actual usados"] },
  { key: "billingPreviousNew", label: "Facturación mes anterior · nuevos", aliases: ["mes anterior nuevos", "anterior nuevos"] },
  { key: "billingPreviousUsed", label: "Facturación mes anterior · usados", aliases: ["mes anterior usados", "anterior usados"] },
  { key: "notesSales", label: "Notas de venta del mes (total)", aliases: ["notas de venta", "nv total", "total notas"] },
  { key: "newVehicleSales", label: "NV nuevos", aliases: ["nv nuevos", "ventas nuevos", "notas nuevos"] },
  { key: "newVehicleValid", label: "NV nuevos vigentes", aliases: ["vigentes nuevos", "nuevos vigentes"] },
  { key: "newVehicleCancelled", label: "NV nuevos anuladas", aliases: ["anuladas nuevos", "nuevos anuladas", "nulas nuevos"] },
  { key: "newVehicleOrdersBilled", label: "Pedidos facturados · nuevos", aliases: ["pedidos facturados nuevos"] },
  { key: "usedVehicleSales", label: "NV usados", aliases: ["nv usados", "ventas usados", "notas usados"] },
  { key: "usedVehicleValid", label: "NV usados vigentes", aliases: ["vigentes usados", "usados vigentes"] },
  { key: "usedVehicleCancelled", label: "NV usados anuladas", aliases: ["anuladas usados", "usados anuladas", "nulas usados"] },
  { key: "usedVehicleOrdersBilled", label: "Pedidos facturados · usados", aliases: ["pedidos facturados usados"] },
  { key: "pendingInvoiceNew", label: "Pendientes de facturar · nuevos", aliases: ["pendientes nuevos", "por facturar nuevos"] },
  { key: "pendingInvoiceUsed", label: "Pendientes de facturar · usados", aliases: ["pendientes usados", "por facturar usados"] },
]

function plain(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()
}

// Lee texto pegado desde Excel: una fila por indicador ("Indicador <tab> valor").
export function parsePastedKpi(text: string) {
  const found: KpiManualInput = {}
  const unknown: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split(/\t|;/).map((cell) => cell.trim()).filter(Boolean)
    if (cells.length < 2) continue
    const label = plain(cells[0])
    const value = cells[cells.length - 1]
    const field = KPI_MANUAL_FIELDS.find((item) => plain(item.label) === label || item.aliases.some((alias) => label.includes(alias)))
    if (field) found[field.key] = value
    else unknown.push(cells[0])
  }
  return { found, unknown }
}
