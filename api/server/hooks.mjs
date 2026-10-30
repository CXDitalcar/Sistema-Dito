// Redirige los paquetes de Azure a reemplazos locales (SQLite + carpetas).
// Solo se usa al correr el servidor propio; el despliegue en Azure no cambia.
const here = new URL("./shim/", import.meta.url)
const MAP = {
  "@azure/data-tables": new URL("data-tables.mjs", here).href,
  "@azure/storage-blob": new URL("storage-blob.mjs", here).href,
  "@azure/functions": new URL("functions.mjs", here).href,
}
export async function resolve(specifier, context, next) {
  if (MAP[specifier]) return { url: MAP[specifier], shortCircuit: true }
  return next(specifier, context)
}
