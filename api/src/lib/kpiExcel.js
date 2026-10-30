import ExcelJS from "exceljs"

const MONTHS = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
]

function excelDownloadUrl(rawUrl) {
  const url = new URL(String(rawUrl || "").trim())
  if (!/^https?:$/.test(url.protocol)) throw new Error("El enlace debe comenzar con https://")

  const host = url.hostname.toLowerCase()
  if (host.includes("sharepoint.com") || host.includes("onedrive.live.com") || host === "1drv.ms") {
    url.searchParams.delete("web")
    url.searchParams.set("download", "1")
  }
  return url.toString()
}

function resolvedValue(value) {
  if (value === undefined || value === null) return null
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "object") {
    if (Object.prototype.hasOwnProperty.call(value, "result")) return resolvedValue(value.result)
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("")
    if (typeof value.text === "string") return value.text
    if (typeof value.hyperlink === "string") return value.text || value.hyperlink
  }
  return String(value)
}

function value(ws, address) {
  return resolvedValue(ws.getCell(address).value)
}

function number(ws, address, fallback = 0) {
  const raw = value(ws, address)
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  const parsed = Number(String(raw ?? "").replace(",", "."))
  return Number.isFinite(parsed) ? parsed : fallback
}

function text(ws, address) {
  const raw = value(ws, address)
  return raw === null || raw === undefined ? "" : String(raw).trim()
}

function readEvolution(graphs, year, rowStart, rowEnd) {
  let targetRow = null
  for (let row = rowStart; row <= rowEnd; row += 1) {
    if (number(graphs, `B${row}`, NaN) === year) {
      targetRow = row
      break
    }
  }
  if (!targetRow) return []

  return MONTHS.map((month, index) => ({
    month,
    value: number(graphs, `${String.fromCharCode(67 + index)}${targetRow}`),
  }))
}

function readCommercialDetail(graphs) {
  const rows = []
  for (let row = 93; row <= 261; row += 1) {
    const brand = text(graphs, `B${row}`)
    const local = text(graphs, `C${row}`)
    const salesRaw = value(graphs, `D${row}`)
    const billedRaw = value(graphs, `E${row}`)
    const goalRaw = value(graphs, `F${row}`)
    const complianceRaw = value(graphs, `G${row}`)

    const hasMetric = [salesRaw, billedRaw, goalRaw, complianceRaw].some((item) => item !== null && item !== "")
    if (!hasMetric) continue

    const isSummary = Boolean(brand) && !local
    const isDetail = Boolean(local)
    if (!isSummary && !isDetail) continue

    rows.push({
      row,
      type: isSummary ? "summary" : "detail",
      brand: brand || "",
      local: local || "",
      sales: salesRaw ?? "",
      billed: billedRaw ?? "",
      goal: goalRaw ?? "",
      compliance: typeof complianceRaw === "number" ? complianceRaw : Number(complianceRaw) || 0,
    })
  }
  return rows
}

async function parseWorkbook(buffer, sourceMeta = {}) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const dashboard = workbook.getWorksheet("DASHBOARD")
  const graphs = workbook.getWorksheet("GRAFICOS")
  if (!dashboard || !graphs) {
    throw new Error("La estructura no coincide: el archivo debe contener las hojas DASHBOARD y GRAFICOS.")
  }

  const monthNumber = number(dashboard, "A1", 0)
  const year = number(dashboard, "B1", 0)
  if (monthNumber < 1 || monthNumber > 12 || year < 2000) {
    throw new Error("No pude identificar el periodo en DASHBOARD!A1:B1.")
  }

  const summary = {
    period: { monthNumber, month: MONTHS[monthNumber - 1], year },
    notesSales: number(dashboard, "C4"),
    newVehicleSales: number(dashboard, "D4"),
    newVehicleValid: number(dashboard, "F4"),
    newVehicleCancelled: number(dashboard, "H4"),
    newVehicleOrdersBilled: number(dashboard, "J4"),
    usedVehicleSales: number(dashboard, "D6"),
    usedVehicleValid: number(dashboard, "F6"),
    usedVehicleCancelled: number(dashboard, "H6"),
    usedVehicleOrdersBilled: number(dashboard, "J6"),
    validSalesTotal: number(dashboard, "F2"),
    cancelledTotal: number(dashboard, "H2"),
    ordersBilledTotal: number(dashboard, "J2"),
    billingCurrentTotal: number(dashboard, "M3"),
    billingCurrentNew: number(dashboard, "L4"),
    billingCurrentUsed: number(dashboard, "L6"),
    billingPreviousTotal: number(dashboard, "O3"),
    billingPreviousNew: number(dashboard, "P4"),
    billingPreviousUsed: number(dashboard, "P6"),
    variationTotal: number(dashboard, "R3"),
    variationNew: number(dashboard, "Q4"),
    variationUsed: number(dashboard, "Q6"),
    pendingInvoiceNew: number(dashboard, "T4"),
    pendingInvoiceUsed: number(dashboard, "T6"),
    goal: value(dashboard, "U4") ?? "",
    compliance: number(dashboard, "BK3"),
    remaining: number(dashboard, "BL3"),
  }

  return {
    summary,
    detail: readCommercialDetail(graphs),
    evolution: {
      total: readEvolution(graphs, year, 21, 24),
      newVehicles: readEvolution(graphs, year, 7, 10),
      usedVehicles: readEvolution(graphs, year, 14, 17),
    },
    meta: {
      sourceUrl: String(sourceMeta.sourceUrl || ""),
      finalUrl: sourceMeta.finalUrl || undefined,
      checkedAt: new Date().toISOString(),
      lastModified: sourceMeta.lastModified || undefined,
      dashboardSheet: dashboard.name,
      graphsSheet: graphs.name,
      fileName: sourceMeta.fileName || "Excel KPI",
      sourceType: sourceMeta.sourceType || "url",
      uploadedAt: sourceMeta.uploadedAt || undefined,
    },
  }
}

let cache = null
const CACHE_MS = 60_000

export async function loadKpiFromBuffer(buffer, sourceMeta = {}) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error("El archivo KPI está vacío.")
  return parseWorkbook(buffer, sourceMeta)
}

export async function loadKpiFromExcel(rawUrl, options = {}) {
  const sourceUrl = String(rawUrl || "").trim()
  if (!sourceUrl) throw new Error("No hay un enlace KPI configurado.")

  if (!options.force && cache?.key === sourceUrl && Date.now() - cache.loadedAt < CACHE_MS) {
    return cache.value
  }

  const downloadUrl = excelDownloadUrl(sourceUrl)
  const response = await fetch(downloadUrl, {
    method: "GET",
    redirect: "follow",
    headers: {
      Accept: "application/vnd.ms-excel.sheet.macroEnabled.12,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream;q=0.9,*/*;q=0.1",
      "User-Agent": "DitalApp/1.0",
    },
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("El Excel KPI exige inicio de sesión. Mientras Graph siga bloqueado, usa Subir archivo desde tu computador.")
    }
    throw new Error(`No fue posible descargar el Excel KPI (HTTP ${response.status}).`)
  }

  const contentType = String(response.headers.get("content-type") || "").toLowerCase()
  const buffer = Buffer.from(await response.arrayBuffer())
  const prefix = buffer.subarray(0, 64).toString("utf8").toLowerCase()
  if (contentType.includes("text/html") || prefix.includes("<!doctype html") || prefix.includes("<html")) {
    throw new Error("El enlace abre una página web en vez del archivo Excel. Usa Subir archivo o un enlace de descarga directa.")
  }

  const result = await parseWorkbook(buffer, {
    sourceUrl,
    finalUrl: response.url,
    lastModified: response.headers.get("last-modified") || undefined,
    fileName: decodeURIComponent(response.url.split("/").pop()?.split("?")[0] || "Excel KPI"),
    sourceType: "url",
  })

  cache = { key: sourceUrl, loadedAt: Date.now(), value: result }
  return result
}
