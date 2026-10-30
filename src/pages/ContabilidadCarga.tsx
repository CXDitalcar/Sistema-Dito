import { useEffect, useRef, useState } from "react"
import { Download, FileText, FolderOpen, RefreshCw, Upload } from "lucide-react"
import { getResumenAcumulado, releerListas, subirArchivoLista, type ResumenAcumulado } from "../services/contabilidadApi"
import "./Contabilidad.css"

type ResultadoArchivo = { ruta: string; estado: string; tipo?: string; marca?: string | null; filas?: number; error?: string }
const ESTADO_ARCHIVO: Record<string, string> = { OK: "Leída", REVISAR: "Revisar", FALTA_LECTOR: "Falta lector", GUARDADO: "Guardada", DUPLICADO: "Ya estaba", ERROR: "Error" }
const fechaHora = (iso?: string | null) => (iso ? new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "—")
const nombreMes = (mes?: string | null) => (mes && /^\d{4}-\d{2}$/.test(mes) ? new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(new Date(`${mes}-15T12:00:00`)) : mes || "Sin mes")

// Pestaña "Cargar archivos": solo los administradores de DITO. Cada carga queda registrada en el resumen acumulado.
export function CargarArchivos({ onDone }: { onDone: () => void }) {
  const carpeta = useRef<HTMLInputElement>(null)
  const archivos = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<{ label: string; percent: number } | null>(null)
  const [resultados, setResultados] = useState<ResultadoArchivo[]>([])
  const [message, setMessage] = useState("")
  const [version, setVersion] = useState(0)

  // Para elegir una carpeta completa (Chrome y Edge).
  useEffect(() => { carpeta.current?.setAttribute("webkitdirectory", "") }, [])

  async function subir(lista?: FileList | null) {
    const files = [...(lista ?? [])].filter((f) => /\.(pdf|xlsx|xlsm)$/i.test(f.name) && !f.name.startsWith("~$"))
    if (!files.length) return
    setMessage("")
    setResultados([])
    const out: ResultadoArchivo[] = []
    for (const [i, file] of files.entries()) {
      const ruta = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
      setProgress({ label: `Leyendo ${i + 1} de ${files.length}: ${file.name}`, percent: Math.round((i / files.length) * 100) })
      try {
        const r = await subirArchivoLista(file)
        out.push({ ruta, estado: r.duplicado ? "DUPLICADO" : r.lista.estado, tipo: r.lista.tipo, marca: r.lista.marca, filas: r.lista.filas })
      } catch (err) {
        out.push({ ruta, estado: "ERROR", error: err instanceof Error ? err.message : "No se pudo cargar." })
      }
      setResultados([...out])
    }
    setProgress(null)
    const leidas = out.filter((r) => r.estado === "OK").length
    setMessage(`${files.length} archivos: ${leidas} listas leídas, ${out.filter((r) => r.estado === "FALTA_LECTOR").length} esperan lector, ${out.filter((r) => r.tipo === "FLOTA").length} de flota guardadas aparte.`)
    if (carpeta.current) carpeta.current.value = ""
    if (archivos.current) archivos.current.value = ""
    setVersion((v) => v + 1)
    onDone()
  }

  async function releer() {
    setProgress({ label: "Volviendo a leer pendientes…", percent: 50 })
    try { setMessage((await releerListas()).message); setVersion((v) => v + 1); onDone() } catch (err) { setMessage(err instanceof Error ? err.message : "No fue posible volver a leer.") }
    setProgress(null)
  }

  return (
    <>
      <section className="conta-card">
        <h2><FolderOpen size={19} style={{ verticalAlign: "-3px", marginRight: 6 }} />Carpeta mensual de listas de precio</h2>
        <p className="conta-msg">Sube la carpeta del mes tal como llega (una carpeta por marca). De aquí salen los bonos y los modelos de las solicitudes. PDF y Excel; volver a subir un archivo no lo duplica. Las listas de flota se guardan aparte y las circulares quedan de respaldo.</p>
        {progress && (
          <div className="conta-progress"><i style={{ width: `${progress.percent}%` }} /><span>{progress.label}</span></div>
        )}
        {message && <p className="conta-msg conta-ok">{message}</p>}
        <div className="conta-actions">
          <label className="conta-btn conta-file">
            <FolderOpen size={17} /> {progress ? "Cargando…" : "Subir carpeta del mes"}
            <input ref={carpeta} type="file" multiple disabled={Boolean(progress)} onChange={(e) => void subir(e.target.files)} />
          </label>
          <label className="conta-btn ghost conta-file">
            <Upload size={17} /> Archivos sueltos
            <input ref={archivos} type="file" multiple accept=".pdf,.xlsx,.xlsm" disabled={Boolean(progress)} onChange={(e) => void subir(e.target.files)} />
          </label>
          <button type="button" className="conta-btn ghost" disabled={Boolean(progress)} onClick={() => void releer()}><RefreshCw size={16} /> Volver a leer pendientes</button>
        </div>
        {resultados.length > 0 && (
          <ul className="conta-lists">
            {resultados.map((r) => (
              <li key={r.ruta}>
                <FileText size={20} />
                <div>
                  <strong>{r.marca || "—"} · {r.tipo === "FLOTA" ? "Flota" : r.tipo === "CIRCULAR" ? "Circular" : "Retail"}</strong>
                  <small>{r.ruta}{r.filas ? ` · ${r.filas} modelos` : ""}</small>
                  {r.error && <small className="conta-note warn">{r.error}</small>}
                </div>
                <span className={`conta-tag ${r.estado === "OK" ? "calculado" : r.estado === "ERROR" ? "sin_modelo" : "solo_marca"}`}>{ESTADO_ARCHIVO[r.estado] ?? r.estado}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <ResumenAcumuladoCard version={version} />
    </>
  )
}

// Lo acumulado hasta el momento: listas por marca y mes y últimas cargas. Se descarga como CSV para guardarlo o reenviarlo.
export function ResumenAcumuladoCard({ version = 0 }: { version?: number }) {
  const [data, setData] = useState<ResumenAcumulado | null>(null)
  const [error, setError] = useState("")
  useEffect(() => {
    let active = true
    getResumenAcumulado().then((r) => { if (active) setData(r) }).catch((e) => { if (active) setError(e instanceof Error ? e.message : "No fue posible cargar el resumen.") })
    return () => { active = false }
  }, [version])

  function descargar() {
    if (!data) return
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`
    const lines = [
      `Resumen acumulado de Contabilidad;generado ${data.generado}`,
      "",
      ["Marca", "Mes", "Archivos", "Leídas", "Por revisar", "Filas"].map(esc).join(";"),
      ...data.listas.map((l) => [l.marca, l.mes, l.archivos, l.leidas, l.porRevisar, l.filas].map(esc).join(";")),
      "",
      ["Fecha", "Subido por", "Archivo", "Resultado", "Marca", "Mes"].map(esc).join(";"),
      ...data.cargas.map((c) => [c.en, c.por, c.archivo, c.resultado, c.marca ?? "", c.mes ?? ""].map(esc).join(";")),
    ]
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `resumen-contabilidad-${data.generado.slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (error) return <section className="conta-card conta-muted">{error}</section>
  if (!data) return <section className="conta-card conta-muted">Cargando resumen acumulado…</section>
  return (
    <section className="conta-card">
      <div className="conta-toolbar">
        <div>
          <h2>Resumen acumulado</h2>
          <p className="conta-msg" style={{ margin: 0 }}>{data.totalListas} archivos cargados hasta {fechaHora(data.generado)}.</p>
        </div>
        <button type="button" className="conta-btn ghost" onClick={descargar}><Download size={16} /> Descargar resumen</button>
      </div>
      {data.listas.length === 0 ? (
        <p className="conta-msg">Aún no hay archivos cargados.</p>
      ) : (
        <div className="conta-table-wrap">
          <table className="conta-table">
            <thead><tr><th>Marca</th><th>Mes</th><th className="num">Archivos</th><th className="num">Leídas</th><th className="num">Por revisar</th></tr></thead>
            <tbody>
              {data.listas.map((l) => (
                <tr key={`${l.marca}-${l.mes}`}><td><strong>{l.marca}</strong></td><td>{nombreMes(l.mes)}</td><td className="num">{l.archivos}</td><td className="num">{l.leidas}</td><td className="num">{l.porRevisar}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.cargas.length > 0 && (
        <details className="conta-details">
          <summary>Últimas cargas · {data.cargas.length}</summary>
          <ul className="conta-lists">
            {data.cargas.slice(0, 30).map((c, i) => (
              <li key={`${c.en}-${i}`}>
                <FileText size={18} />
                <div><strong>{c.archivo}</strong><small>{c.por} · {fechaHora(c.en)}{c.marca ? ` · ${c.marca}` : ""}</small></div>
                <span className={`conta-tag ${c.resultado === "OK" ? "calculado" : "solo_marca"}`}>{ESTADO_ARCHIVO[c.resultado] ?? c.resultado}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="conta-foot">Cuando TI habilite el envío de correos desde DITO, este mismo resumen se enviará a los administradores después de cada carga.</p>
    </section>
  )
}
