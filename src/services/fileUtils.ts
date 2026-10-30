// Prepara un archivo para enviarlo a la API: las fotos se reducen (máx. 1600 px, JPEG)
// para que suban rápido desde el celular; el resto se envía tal cual (máx. 10 MB).

const MAX_BYTES = 10 * 1024 * 1024
const MAX_SIDE = 1600

function readAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "")
    reader.onerror = () => reject(new Error("No fue posible leer el archivo."))
    reader.readAsDataURL(blob)
  })
}

async function compressImage(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext("2d")
    if (!context) return null
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.82))
  } catch {
    return null
  }
}

export function isImageFile(file: { type?: string; name?: string; contentType?: string; fileName?: string }) {
  const type = file.type || file.contentType || ""
  const name = (file.name || file.fileName || "").toLowerCase()
  return type.startsWith("image/") || /\.(png|jpe?g|webp|gif|heic|heif)$/.test(name)
}

export async function prepareUploadFile(file: File) {
  let blob: Blob = file
  let name = file.name
  let type = file.type || "application/octet-stream"
  if (isImageFile(file) && !/gif$/i.test(type)) {
    const compressed = await compressImage(file)
    if (compressed && compressed.size < file.size) {
      blob = compressed
      type = "image/jpeg"
      name = name.replace(/\.[^.]+$/, "") + ".jpg"
    }
  }
  if (blob.size > MAX_BYTES) throw new Error(`"${file.name}" supera el máximo de 10 MB.`)
  return { name, type, base64: await readAsBase64(blob), size: blob.size }
}
