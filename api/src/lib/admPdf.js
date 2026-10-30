// Contabilidad · texto de los PDF de listas de precio.
// Misma lógica del Cargador PDF de Administración de Ventas: el texto se arma por líneas según la
// posición en la página. Los lectores de cada marca están en admLectores.js.
import { createHash } from "node:crypto"

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex")
}

// Por página: líneas con sus trozos de texto y posición horizontal (x, ancho).
export async function itemsPaginas(buffer) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const pdf = await getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, useSystemFonts: false }).promise
  const paginas = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const tc = await (await pdf.getPage(p)).getTextContent()
    const items = tc.items.filter((i) => i.str && i.str.trim()).map((i) => ({ s: i.str.trim(), x: i.transform[4], y: i.transform[5], w: i.width }))
    items.sort((a, b) => b.y - a.y || a.x - b.x)
    const lines = []
    for (const it of items) {
      const line = lines.find((l) => Math.abs(l.y - it.y) < 2.5)
      if (line) line.items.push(it)
      else lines.push({ y: it.y, items: [it] })
    }
    lines.sort((a, b) => b.y - a.y)
    for (const l of lines) l.items.sort((a, b) => a.x - b.x)
    paginas.push(lines)
  }
  await pdf.destroy()
  return paginas
}

// Texto de cada página: los trozos de una línea se separan con tres espacios si hay un hueco entre ellos.
export async function textoPaginas(buffer) {
  return (await itemsPaginas(buffer)).map((lines) => lines.map((l) => {
    let s = ""
    let end = null
    for (const it of l.items) {
      if (end !== null) s += it.x - end > 4 ? "   " : " "
      s += it.s
      end = it.x + it.w
    }
    return s
  }).join("\n"))
}
