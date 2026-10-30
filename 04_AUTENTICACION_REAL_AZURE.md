# Ditalcar Colaboradores · Autenticación real

Esta versión elimina el selector de perfiles como método de ingreso. Todos los usuarios entran mediante correo corporativo + contraseña propia. `Ver como` se mantiene únicamente dentro de la sesión del rol `EXPERIENCIA_CLIENTES`.

## Qué se agregó

- Backend Azure Functions en `/api`.
- Endpoints reales:
  - `POST /api/auth/request-activation`
  - `POST /api/auth/activate`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `POST /api/auth/request-reset`
  - `POST /api/auth/reset-password`
  - `POST /api/auth/logout`
- Contraseñas con bcrypt (cost 12). Nunca se guarda contraseña en texto plano.
- Sesión mediante cookie `HttpOnly + Secure + SameSite=Strict`.
- Tokens de activación/reset de un solo uso, guardados sólo como SHA-256 y con vencimiento.
- Bloqueo de 15 minutos tras 5 intentos fallidos consecutivos.
- Perfil/cargo/local/permisos obtenidos de `02_Usuarios` mediante Microsoft Graph desde el backend.
- Envío de activación y recuperación mediante Microsoft Graph desde una casilla Ditalcar.
- Datos operativos separados de autenticación: por defecto `VITE_DATA_MODE=pilot` hasta conectar SharePoint para las solicitudes.

## Configuración en Azure Static Web Apps

En **Configuration / Environment variables** agrega:

### Obligatorias para autenticación + usuarios SharePoint

- `AUTH_STORAGE_CONNECTION_STRING`: connection string de una Storage Account de Azure. Si el backend dispone de `AzureWebJobsStorage`, puede omitirse esta variable.
- `GRAPH_TENANT_ID`: tenant Microsoft 365 de Ditalcar.
- `GRAPH_CLIENT_ID`: App Registration utilizada por el backend.
- `GRAPH_CLIENT_SECRET`: secreto de esa App Registration. **Nunca subirlo a GitHub.**
- `GRAPH_SENDER_EMAIL`: casilla desde la que se enviarán invitaciones y recuperaciones, por ejemplo una casilla de colaboradores/sistemas autorizada.
- `APP_PUBLIC_URL`: URL pública exacta de la Static Web App, sin `/` final.

### Recomendadas

- `AUTH_ALLOWED_EMAIL_DOMAINS=ditalcar.cl`
- `AUTH_SESSION_DAYS=1`
- `SHAREPOINT_HOSTNAME=ditalcarchile.sharepoint.com`
- `SHAREPOINT_SITE_PATH=/sites/DITALCARSA`
- `SHAREPOINT_USERS_LIST=02_Usuarios`

### Frontend

- `VITE_DATA_MODE=pilot` mientras solicitudes/formularios sigan en almacenamiento piloto.
- Cambiar a `VITE_DATA_MODE=live` sólo cuando el acceso a datos reales también esté proxyado por backend.

## Permisos de Microsoft Graph de la App Registration

Como el backend usa `client_credentials`, los permisos deben ser **Application permissions** y requieren consentimiento de administrador.

Mínimo esperado:

- Lectura del sitio/lista donde vive `02_Usuarios` (idealmente `Sites.Selected` acotado al sitio Ditalcar; alternativamente el permiso aprobado por TI).
- `Mail.Send` para la casilla definida en `GRAPH_SENDER_EMAIL`.

Recomendación: usar `Sites.Selected` y una política de acceso de aplicación a la casilla de correo, en lugar de permisos globales cuando TI pueda configurarlo.

## Columnas de 02_Usuarios

El backend reconoce las mismas columnas ya previstas por la app:

- `Email`
- `Nombre` o `Title`
- `RolApp` o `Rol`
- `LocalPrincipal` / `Local` / `Sucursal`
- `LocalesAsignados`
- `Alcance`
- `Zona`
- `Marcas`
- `AreaFuncional`
- `Activo`

La contraseña **NO** va en esta lista.

## Primer ingreso

1. El usuario abre Ditalcar Colaboradores.
2. Selecciona **Primera vez · Activar cuenta**.
3. Escribe su correo Ditalcar.
4. La API confirma que el correo existe y está activo en `02_Usuarios`.
5. Envía un enlace de un solo uso, válido por 60 minutos.
6. El usuario crea su contraseña.
7. Desde ahí ingresa normalmente.

## Importante

`Ver como` ya no permite saltarse el login. Sólo aparece después de autenticar a un usuario cuyo rol real sea `EXPERIENCIA_CLIENTES`.
