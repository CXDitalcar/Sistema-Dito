export const appConfig = {
  // La autenticación ya no tiene modo visual/demo: siempre usa /api/auth/*.
  auth: {
    mode: "api" as const,
  },

  // Los datos operativos siguen separados de la autenticación. Mientras SharePoint
  // no se conecte por backend, solicitudes/formularios pueden continuar en piloto.
  data: {
    mode: (import.meta.env.VITE_DATA_MODE === "live" ? "live" : "pilot") as
      | "live"
      | "pilot",
  },

  entra: {
    clientId: "f27a4b9f-c243-4285-85bd-31a0487665cc",
    tenantId: "aec02c85-4e78-480d-a519-041253187771",
  },
  sharePoint: {
    hostname: "ditalcarchile.sharepoint.com",
    sitePath: "/sites/DITALCARSA",
    solicitudesListId: "3ae1d625-c96b-42ee-b5f5-bbb8cc122d0b",
  },
  pilot: {
    branch: "Stellantis Nueva Tobalaba",
  },
}
