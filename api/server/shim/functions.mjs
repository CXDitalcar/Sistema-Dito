// Reemplazo de @azure/functions: solo registra las rutas http; server.mjs las atiende.
export const routes = []
export const app = {
  http(name, options) {
    routes.push({ name, methods: (options.methods || ["GET", "POST"]).map((m) => m.toUpperCase()), route: options.route || name, handler: options.handler })
  },
}
