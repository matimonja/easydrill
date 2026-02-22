# Especificación: Autenticación y Sistema de Suscripciones

**Objetivo:** Este documento define todos los requerimientos y lineamientos para que una IA (o un desarrollador) implemente el sistema de login y el modelo de suscripciones en Tactical Board. Debe leerse junto con la documentación existente del proyecto.

**Documentación obligatoria previa (leer antes de codificar):**
- [ARCHITECTURE.md](ARCHITECTURE.md) – Game como mediador, Tools, Commands, Camera, AnimationManager.
- [AI_GUIDELINES.md](AI_GUIDELINES.md) – Lógica de interacción en Tools (no en Game); Commands para cambios de estado; preventDefault en eventos del canvas.
- [PROMPT.md](PROMPT.md) – Estilo, modularidad y requisitos de respuesta.

---

## 1. Contexto del proyecto

### 1.1 Stack actual

| Capa | Tecnología |
|------|------------|
| Frontend | HTML + TypeScript + Vite (multi-entry por página). Sin React/Vue. |
| Backend | Node.js, Express, TypeScript. Ubicación: `server/src/`. |
| API existente | `POST /api/optimize-drill` – optimización de drill; sin auth. |
| Base de datos | No existe actualmente; hay que añadir persistencia para usuarios y planes. |

### 1.2 Estado actual de “login” y perfil

- En todas las páginas hay enlaces `href="#login"` (index.html, perfil.html, marketplace.html, bolsa-de-trabajo.html, comunidad.html, aprendizaje.html). No hay formulario ni flujo real.
- El perfil (`src/perfil.ts`) lee de localStorage (`easydrill-profile`, `easydrill-profile-name`, etc.). Hay un comentario explícito: *“Cuando exista auth/backend, se cargarán nombre, foto, bio y estadísticas reales.”*
- El rol (entrenador / club) se guarda en localStorage y se muestra en home y perfil; no hay backend de usuarios.

### 1.3 Restricciones de arquitectura (respetar siempre)

- No poner lógica de interacción (clic, arrastrar) directamente en `Game.ts`; usar Tools en `src/tools/`.
- Cualquier cambio de estado del tablero debe usar Commands (Undo/Redo).
- Depender de `IGameContext` (Interfaces.ts), no de la clase `Game` directamente, en tools/ y entities/.
- TypeScript estricto; JSDoc donde ayude; no usar `any` innecesariamente.

---

## 2. Requerimientos funcionales acordados

### 2.1 Infraestructura y despliegue

- **Producción en AWS.** La solución de autenticación y datos debe poder desplegarse y operar en AWS (por ejemplo: frontend en S3/CloudFront, API en Lambda o ECS, base de datos en RDS o equivalente).
- Se prioriza **Amazon Cognito** para autenticación (registro con email/contraseña + inicio de sesión con Google), de modo que todo el flujo de identidad quede dentro de AWS. La base de datos de perfiles y planes puede ser RDS (PostgreSQL) o DynamoDB según se decida.

### 2.2 Autenticación (v1)

- **Dos métodos de autenticación:**
  1. **Registro e inicio de sesión con email y contraseña** (nativo de Cognito).
  2. **Inicio de sesión con Google** (federación OAuth vía Cognito).
- Flujo de **registro con email:**
  1. El usuario completa un formulario con email, contraseña y (opcionalmente) nombre.
  2. Cognito envía un código de verificación al email.
  3. El usuario introduce el código en una pantalla de confirmación.
  4. Tras la confirmación, se inicia sesión automáticamente y se redirige a la URL de origen (`returnUrl`) o a la home.
- Flujo de **inicio de sesión con Google:**
  1. El usuario hace clic en "Continuar con Google".
  2. Se redirige al flujo OAuth de Google (vía Cognito Hosted UI o SDK).
  3. Tras éxito, vuelve a la aplicación con una sesión (JWT de Cognito).
- Flujo de **recuperación de contraseña ("Olvidé mi contraseña"):**
  1. El usuario introduce su email.
  2. Cognito envía un código de recuperación.
  3. El usuario introduce el código y una nueva contraseña.
  4. Se redirige al login con un mensaje de éxito.
- **Experiencia de login:** Página dedicada de login (URL clara). Incluye formulario de "Iniciar sesión" (email/contraseña), enlace a "Crear cuenta", y botón "Continuar con Google". Tras login o registro exitoso, redirigir a la URL de origen (`returnUrl`) si existe; si no, a la home.
- **Vinculación de cuentas:** Si un usuario se registra con email y luego intenta iniciar sesión con Google (mismo email), Cognito vincula ambas identidades al mismo usuario. No se crean cuentas duplicadas.

### 2.3 Perfil de usuario y rol

- **Rol (entrenador / club):** Debe poder **elegirse** y **modificarse** en cualquier momento (no solo al registrarse). Se guarda en la base de datos (perfil de usuario) y se muestra en home y perfil.
- Nombre, avatar (y opcionalmente bio) pueden venir de Google (si aplica) y/o editarse en la app; si se editan en la app, persistir en backend. El email proviene del registro o del proveedor de identidad (Google).
- Las estadísticas del perfil (ejercicios, foros, forks) deben cargarse desde el backend cuando exista auth, reemplazando el uso actual de localStorage.

### 2.4 Planes y suscripciones

- **Cantidad de planes:** 3 o 4. Los nombres comerciales se definen después; a nivel técnico usar IDs (ej. `free`, `basic`, `pro`, `team`).
- **Asignación de plan (v1):** Solo **asignación manual** (sin pasarela de pago). Por ejemplo: cambio directo en base de datos o endpoint interno/admin (ej. `PATCH /api/users/:id/plan`).
- **Plan por defecto:** Al registrarse (primera vez que confirma su email o inicia sesión con Google), el usuario recibe el plan gratuito (ej. `free`).

### 2.5 Modelo de acceso: límites + funciones prohibidas

- **Mismo acceso a secciones:** Todos los usuarios pueden **acceder y usar todas las secciones** de la web (editor, marketplace, bolsa de trabajo, aprendizaje, comunidad, perfil). No se restringe el acceso por ruta según el plan.
- **Diferencias por plan:**
  1. **Límites (quotas):** Por ejemplo:
     - Cantidad máxima de **ejercicios guardados** (por usuario).
     - Cantidad máxima de **resultados visibles** en la bolsa de trabajo.
     (Los valores concretos por plan se definen en configuración o en BD.)
  2. **Funciones prohibidas en algunos planes:** Ciertas acciones solo están permitidas en planes superiores. Ejemplo acordado:
     - **Suscribirse en la bolsa de trabajo y recibir notificaciones:** solo permitido en determinados planes; en el plan gratuito (y quizá en el siguiente) esta función está prohibida.
- En backend y frontend debe existir:
  - Una forma de conocer el **plan actual** del usuario.
  - Una forma de comprobar **límites** (ej. “¿cuántos ejercicios ha guardado?” vs “máximo permitido para su plan?”).
  - Una forma de comprobar **permisos booleanos** (ej. “¿puede suscribirse a notificaciones en bolsa de trabajo?”).

---

## 3. Autenticación con Amazon Cognito

### 3.1 Configuración en AWS

- Crear un **User Pool** de Cognito con **email como atributo de inicio de sesión** (sign-in alias: email).
- **Registro nativo (email/contraseña):**
  - Habilitar auto-registro (self sign-up) en el User Pool.
  - **Política de contraseña:** Configurar requisitos mínimos (ej. 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número). Cognito permite configurar esto en el User Pool.
  - **Verificación de email:** Habilitar la verificación automática por correo (Cognito envía un código al email del usuario tras el registro). Configurar el mensaje de verificación (asunto y cuerpo personalizados con el nombre de la app).
  - **Recuperación de cuenta:** Habilitar la recuperación de contraseña vía email (Cognito envía un código de recuperación).
- **Proveedor federado (Google):**
  - Configurar **Google** como proveedor de identidad federado (IdP). En Google Cloud Console: crear credenciales OAuth 2.0 (tipo "Web application"), configurar URLs de redirect autorizadas con la URL de Cognito (y en desarrollo, localhost si aplica).
  - Mapear atributos de Google a Cognito: `email`, `name`, `picture` (avatar).
- En "App integration": crear un **App client** (público para SPA). Anotar **User Pool ID**, **Region**, **App client ID**. No exponer el client secret en el frontend (en SPA no se usa).
- Para el flujo de Google: habilitar "Hosted UI" de Cognito o usar el SDK (`amazon-cognito-identity-js`) para iniciar el flujo OAuth desde la propia página de login. Si se usa Hosted UI, configurar `VITE_COGNITO_DOMAIN`.

### 3.2 Variables de entorno

- **Frontend (Vite):** `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`, `VITE_COGNITO_REGION`, y si se usa Hosted UI para Google: `VITE_COGNITO_DOMAIN`.
- **Backend (Express/Lambda):** Variables para verificar JWT: región, User Pool ID; el backend usará la JWKS de Cognito para validar el token y extraer `sub` (y claims como email, name si se añaden).

### 3.3 Flujo técnico — Registro con email/contraseña

1. Usuario entra a la página de login (ej. `/login.html`) y selecciona "Crear cuenta".
2. Completa el formulario: **email**, **contraseña**, **nombre** (opcional).
3. El frontend llama a `CognitoUserPool.signUp(email, password, attributes)` usando el SDK (`amazon-cognito-identity-js`).
4. Cognito envía un **código de verificación** al email. La UI muestra un campo para introducir el código.
5. El usuario introduce el código; el frontend llama a `cognitoUser.confirmRegistration(code)`.
6. Tras confirmación exitosa, se inicia sesión automáticamente (llamar a `cognitoUser.authenticateUser(email, password)`) y se obtienen los tokens.
7. Se llama a `GET /api/me` para crear el perfil en la BD y se redirige a `returnUrl` o home.

### 3.4 Flujo técnico — Inicio de sesión con email/contraseña

1. Usuario introduce **email** y **contraseña** en el formulario de login.
2. El frontend llama a `cognitoUser.authenticateUser(authDetails)` con el SDK.
3. Cognito devuelve `id_token`, `access_token`, `refresh_token`.
4. Los tokens se almacenan de forma segura (en memoria para SPA; para v1 puede usarse el almacenamiento estándar del SDK de Cognito).
5. En cada petición al backend, enviar el token en cabecera `Authorization: Bearer <id_token o access_token>`.
6. El backend verifica el JWT con la JWKS de Cognito y obtiene `sub` (identificador único del usuario).

### 3.5 Flujo técnico — Inicio de sesión con Google

1. Usuario hace clic en "Continuar con Google" en la página de login.
2. Se redirige a Cognito Hosted UI (o se inicia flujo OAuth con el SDK). Cognito redirige a Google.
3. Tras éxito en Google, Cognito devuelve al callback de la app con códigos/tokens.
4. La app intercambia el código por tokens (id_token, access_token, refresh_token) y los almacena.
5. Se llama a `GET /api/me` para crear/obtener el perfil y se redirige a `returnUrl` o home.

### 3.6 Flujo técnico — Recuperación de contraseña

1. En la pantalla de login, el usuario hace clic en "Olvidé mi contraseña".
2. Introduce su email. El frontend llama a `cognitoUser.forgotPassword()`.
3. Cognito envía un **código de recuperación** al email.
4. El usuario introduce el código y la nueva contraseña. El frontend llama a `cognitoUser.confirmPassword(code, newPassword)`.
5. Se muestra un mensaje de éxito y se redirige al formulario de login.

> [!NOTE]
> Este flujo solo aplica a usuarios que se registraron con email/contraseña. Los usuarios que solo usan Google no tienen contraseña en Cognito.

### 3.7 Creación de perfil en base de datos

- La primera vez que un usuario inicia sesión (identificado por `sub` de Cognito, sin importar si fue con email o con Google), el backend debe crear un **perfil** en la base de datos. Ese perfil tendrá `plan_id` por defecto (plan gratuito) y campos para rol, nombre, avatar, etc.
- El endpoint `GET /api/me` (o `POST /api/auth/sync`): verificar el JWT, buscar usuario por `sub`; si no existe, crearlo con plan `free` y datos del token (email, nombre, avatar si vienen del token de Google o de los atributos de Cognito), y devolver perfil + plan.
- **Vinculación de cuentas:** Si un usuario tiene el mismo email registrado con ambos métodos, Cognito puede vincular las identidades automáticamente (configurar "Account linking" en el User Pool). El backend debe manejar el `sub` de Cognito como identificador primario.

---

## 4. Modelo de datos

### 4.1 Tablas (o equivalentes) necesarias

- **users (o profiles)**  
  - `id` (UUID o string, PK).  
  - `cognito_sub` (string, único) – identificador del usuario en Cognito.  
  - `email` (string, único, requerido) – email de registro.  
  - `display_name` (string).  
  - `avatar_url` (string, opcional).  
  - `role` (enum o string: `entrenador` | `club`).  
  - `plan_id` (FK a plans, default el plan gratuito).  
  - `created_at`, `updated_at`.  
  - Opcional: `bio`, campos para estadísticas (ejercicios creados, participaciones en foros, etc.).

- **plans**  
  - `id` (string o PK, ej. `free`, `basic`, `pro`, `team`).  
  - `name` o `display_name` (para UI; nombres comerciales TBD).  
  - Opcional: almacenar límites y flags en esta tabla (JSON o columnas) o en código.

- **Límites por plan (en código o en BD)**  
  - Ejemplo: `max_exercises_saved`, `max_bolsa_results`. Definir valores por `plan_id`.

- **Features booleanas por plan (en código o en BD)**  
  - Ejemplo: `can_subscribe_bolsa_notifications` (boolean por plan). Plan free = false; planes superiores = true (o según definición).

### 4.2 Persistencia de “ejercicios guardados” y “resultados bolsa”

- Para aplicar límites hace falta persistir: (1) qué ejercicios ha guardado cada usuario (tabla `user_exercises` o similar con `user_id`, `exercise_id`, `created_at`) y (2) qué “resultados” o listados se consideran para la bolsa de trabajo (y cuántos se muestran según el plan). Definir esquema según el diseño actual de “guardar ejercicio” y “bolsa de trabajo” (hoy pueden ser solo mock o estáticos; la implementación concreta puede ser parte de la tarea).

---

## 5. Frontend: módulos y comportamiento

### 5.1 Cliente de autenticación

- **Archivo sugerido:** `src/auth/client.ts` (o `src/auth/cognito.ts`).
- Dependencia: `amazon-cognito-identity-js` (npm). Este paquete permite registrar, autenticar y gestionar usuarios contra Cognito sin necesidad de Amplify completo.
- Responsabilidades:
  - Inicializar/configurar `CognitoUserPool` con User Pool ID y Client ID.
  - Exportar:
    - `signUp(email, password, name?)` — registrar usuario en Cognito (email/contraseña).
    - `confirmSignUp(email, code)` — confirmar el código de verificación de email.
    - `signIn(email, password)` — autenticar con email y contraseña y obtener tokens.
    - `signInWithGoogle()` — redirigir al flujo OAuth de Google (vía Hosted UI o SDK).
    - `signOut()` — cerrar sesión (invalidar tokens locales).
    - `forgotPassword(email)` — iniciar flujo de recuperación de contraseña.
    - `confirmForgotPassword(email, code, newPassword)` — confirmar nueva contraseña con código.
    - `getCurrentUser()` — obtener usuario actual (si hay sesión activa).
    - `getSession()` — obtener tokens actuales (id_token, access_token).
    - `resendConfirmationCode(email)` — reenviar código de verificación.
  - Si se usa Hosted UI para Google: construir la URL de login y manejar el callback; en la página de callback, intercambiar código por tokens y guardarlos; redirigir a `returnUrl` o home.
- Mantener un estado mínimo de "usuario logueado" (por ejemplo evento o callback al cambiar sesión) para que la navegación y los guards reaccionen.

### 5.2 Estado de usuario y plan

- **Archivo sugerido:** `src/auth/user.ts` (o dentro de `client.ts`).
- Después del login (y en cada carga de app si el usuario ya tiene sesión), obtener el perfil y el plan desde el backend (`GET /api/me`). Guardar en memoria (o en un store mínimo): `user` (id, displayName, avatar, role, email) y `planId` (y opcionalmente el objeto `plan` con límites y flags).
- Exportar: `getCurrentUser()`, `getPlanId()`, `getProfile()`, `refreshProfile()` (llamar a `/api/me` y actualizar estado). Así el resto de la app puede comprobar límites y permisos sin llamar a la API en cada acción (refrescar al iniciar y tras cambios de perfil/plan).

### 5.3 Configuración de planes y permisos

- **Archivo sugerido:** `src/config/plans.ts`.
- Definir:
  - Constantes de IDs de plan: `FREE`, `BASIC`, `PRO`, `TEAM` (o los que se elijan).
  - Mapa de **límites por plan:** por ejemplo `LIMITS_BY_PLAN[planId] = { max_exercises_saved: 5, max_bolsa_results: 10 }`.
  - Mapa de **features booleanas por plan:** por ejemplo `FEATURES_BY_PLAN[planId] = { can_subscribe_bolsa_notifications: true }`.
- Funciones:
  - `getLimits(planId): Limits` – devuelve los límites del plan.
  - `can(planId, feature: string): boolean` – indica si el plan permite esa feature (ej. `can(planId, 'can_subscribe_bolsa_notifications')`).
  - Opcional: `isWithinLimit(planId, usageKey: string, currentCount: number): boolean` usando `getLimits(planId)`.

### 5.4 Página de login y registro

- **Archivo sugerido:** `login.html` + entry en Vite (ej. `src/login.ts`, `src/login.css`).
- **Vistas/estados de la página** (manejados por JS, sin recargar):
  1. **Iniciar sesión (por defecto):** Formulario con campos email y contraseña + botón "Iniciar sesión". Debajo: botón "Continuar con Google" (separado visualmente con un divisor "o"). Enlace "¿Olvidaste tu contraseña?" debajo del formulario. Enlace "¿No tenés cuenta? Crear una" para cambiar a la vista de registro.
  2. **Crear cuenta:** Formulario con campos nombre (opcional), email, contraseña, confirmar contraseña + botón "Crear cuenta". Debajo: botón "Continuar con Google". Enlace "¿Ya tenés cuenta? Iniciar sesión" para volver.
  3. **Verificar email:** Tras el registro con email, mostrar campo para el código de verificación + botón "Confirmar". Enlace "Reenviar código".
  4. **Recuperar contraseña — paso 1:** Campo email + botón "Enviar código".
  5. **Recuperar contraseña — paso 2:** Campos: código, nueva contraseña, confirmar nueva contraseña + botón "Cambiar contraseña".
- **Validaciones en el frontend:**
  - Email: formato válido.
  - Contraseña: mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número (coherente con la política de Cognito).
  - Confirmar contraseña: coincide con el campo de contraseña.
  - Mostrar errores inline debajo de cada campo.
- **Manejo de errores de Cognito:**
  - `UserNotFoundException` → "No existe una cuenta con ese email".
  - `NotAuthorizedException` → "Email o contraseña incorrectos".
  - `UsernameExistsException` → "Ya existe una cuenta con ese email".
  - `CodeMismatchException` → "Código de verificación incorrecto".
  - `ExpiredCodeException` → "El código ha expirado, solicitá uno nuevo".
  - Otros errores → mensaje genérico con detalle del error.
- **Flujo post-login/registro:** Tras autenticarse con éxito (por cualquier método), llamar a `GET /api/me` para crear/obtener perfil, luego `window.location.href = returnUrl || '/'`.
- **Callback de Google:** La misma `login.html` con query param `?code=...` (o ruta dedicada) intercambia el código OAuth por tokens y continúa con el flujo post-login.
- Antes de navegar a la página de login, la app debe guardar en sessionStorage la URL actual como `returnUrl`.
- Sustituir **todos** los `href="#login"` del proyecto por `href="/login.html"` (o la ruta base que se use). Añadir `returnUrl` al enlace si se desea (ej. `/login.html?returnUrl=/marketplace.html`).

### 5.5 Navegación (header)

- En cada página donde exista el nav común: si hay sesión (usuario logueado), mostrar **nombre** y/o **avatar** y enlace/botón **“Cerrar sesión”**. Si no hay sesión, mostrar **“Iniciar sesión”** apuntando a `/login.html` (con `returnUrl` si se quiere). Actualizar los HTML y el JS que construye el nav para que usen el estado de auth.

### 5.6 Guards y comprobación de límites/permisos

- **Rutas:** No se restringe el acceso a páginas por plan; todos pueden entrar a todas las secciones. Sí se debe comprobar en acciones concretas:
  - **Guardar ejercicio:** Antes de guardar, comprobar `isWithinLimit(planId, 'max_exercises_saved', currentCount)`. Si se supera el límite, mostrar mensaje claro (“Has alcanzado el límite de ejercicios guardados para tu plan”) y CTA para ver planes o perfil.
  - **Bolsa de trabajo – resultados:** Al cargar la lista, el backend (o el frontend si la lista viene completa) debe limitar la cantidad de resultados mostrados según `getLimits(planId).max_bolsa_results`.
  - **Bolsa de trabajo – suscripción/notificaciones:** El botón o acción “Suscribirse para recibir notificaciones” solo debe estar visible/habilitado si `can(planId, 'can_subscribe_bolsa_notifications')`. Si no, mostrar mensaje tipo “Disponible en plan X” y enlace a planes o perfil.
- **Editor – optimizar drill:** La acción que llama a `POST /api/optimize-drill` está en `src/core/Game.ts` (método `optimizeDrill()`, aprox. línea 1531; fetch en ~1544). Si se decide que “optimizar” sea una feature de pago, comprobar `can(planId, 'optimize_drill')` antes de llamar a la API; si no, deshabilitar el botón o mostrar aviso. (En la especificación actual no se ha definido si “optimizar” está limitado por plan; dejarlo parametrizable en `plans.ts`.)

### 5.7 Perfil de usuario

- **Archivo a modificar:** `src/perfil.ts`.
- Si hay usuario autenticado: cargar nombre, avatar, bio, rol y estadísticas desde `GET /api/me` (o desde el estado ya cargado en `src/auth/user.ts`). Mostrar también el plan actual y permitir **editar el rol** (entrenador/club). Al guardar el rol, llamar a `PATCH /api/me` (o equivalente) con el nuevo `role` y actualizar el estado local.
- Si no hay usuario autenticado: redirigir a login o mostrar el estado actual (localStorage) con aviso “Inicia sesión para sincronizar tu perfil”. Decisión según producto; lo más coherente es redirigir a login si se entra a perfil sin sesión.

---

## 6. Backend: API y seguridad

### 6.1 Base de datos

- Elegir una base de datos compatible con AWS (por ejemplo RDS PostgreSQL o DynamoDB). Crear tablas `users` (o `profiles`), `plans`, y las que hagan falta para ejercicios guardados y bolsa de trabajo.
- Seed inicial: insertar los 3 o 4 planes con sus IDs y nombres (nombres comerciales TBD pueden ser placeholders).

### 6.2 Middleware de autenticación

- **Archivo sugerido:** `server/src/middleware/auth.ts`.
- Leer cabecera `Authorization: Bearer <token>`. Verificar el JWT con la JWKS de Cognito (usar librería tipo `jsonwebtoken` + `jwks-rsa` o el SDK de Cognito). Extraer `sub` y `email` del token.
- Adjuntar a `req` un objeto `req.user` con al menos `sub` y `email` (y si ya se ha resuelto contra la BD: `userId`, `planId`, `role`). Si no hay token o es inválido, responder **401 Unauthorized**.

### 6.3 Endpoints

- **GET /api/me**  
  - Protegido con middleware auth.  
  - Buscar usuario por `cognito_sub` (req.user.sub). Si no existe, crearlo con plan `free`, rol por defecto (ej. `entrenador`) y datos del token (email del claim; nombre si se configuró como atributo).  
  - Devolver: `{ user: { id, displayName, avatar, role, email }, planId, limits, features }` (o equivalente). Incluir `limits` y `features` derivados del plan para que el frontend no tenga que duplicar la lógica de planes.

- **PATCH /api/me**  
  - Protegido con middleware auth.  
  - Permitir actualizar solo campos permitidos: por ejemplo `role`, `display_name`, `bio`. Actualizar en BD y devolver perfil actualizado.

- **POST /api/optimize-drill**  
  - Protegido con middleware auth (requiere usuario logueado).  
  - Opcional: comprobar que el plan del usuario permita la feature `optimize_drill`; si no, **403 Forbidden**.  
  - Mantener la lógica actual del `DrillController`: recibir drill state, devolver estado optimizado.

- Cualquier otro endpoint que cree o liste “ejercicios guardados” o “resultados de bolsa” debe: (1) estar protegido con auth, (2) aplicar límites según `planId` (ej. no permitir guardar más de N ejercicios; devolver como máximo M resultados en bolsa).

### 6.4 Endpoint admin (opcional, v1)

- **PATCH /api/users/:id/plan** (o similar): Solo para uso interno/admin. Recibir `planId` y actualizar el plan del usuario. En v1 puede protegerse con una API key o no exponerse públicamente; en producción debería estar restringido por IAM o rol de admin.

---

## 7. Archivos a crear y modificar (checklist)

| Área | Crear | Modificar |
|------|--------|-----------|
| Auth frontend | `src/auth/client.ts` (Cognito: email/password + Google), `src/auth/user.ts` (estado + perfil/plan) | `package.json` (añadir `amazon-cognito-identity-js`) |
| Config | `src/config/plans.ts` (límites, features, `getLimits`, `can`) | — |
| Login | `login.html`, `src/login.ts` (entry en Vite, con vistas: login, registro, verificación email, recuperar contraseña), `src/login.css` | `vite.config.ts` (entry login) |
| Guards / uso | `src/auth/guards.ts` opcional (helpers para “dentro de límite”, “puede feature”) | Entries de páginas que usen límites (marketplace, bolsa, etc.), `src/core/Game.ts` (optimize si se restringe) |
| Nav / UI | — | Todos los HTML con `href="#login"` → `/login.html`; lógica del header para mostrar usuario/avatar y “Cerrar sesión” |
| Perfil | — | `src/perfil.ts` (datos desde API, edición de rol, plan actual) |
| Backend | `server/src/middleware/auth.ts`, `GET /api/me`, `PATCH /api/me`, lógica de BD (users, plans) | `server/src/index.ts` (registrar middleware, rutas); `DrillController` o rutas que apliquen límites |
| DB | Migraciones o scripts para tablas `users`, `plans`, y tablas de ejercicios guardados / bolsa | — |
| Env | — | `.env.example` con `VITE_COGNITO_*`, variables de backend para Cognito y BD |

---

## 8. Orden de implementación sugerido

1. **Configurar Cognito:** User Pool con email como alias, política de contraseña, verificación por email, Google como IdP federado, App client. Variables de entorno en front y back.
2. **Base de datos:** Crear tablas `plans` y `users` (o `profiles`); seed de planes. Definir y crear tablas para ejercicios guardados y datos de bolsa si aplica.
3. **Backend auth:** Middleware que verifique JWT de Cognito y exponga `req.user`. Endpoints `GET /api/me` y `PATCH /api/me` con creación de usuario en primer login.
4. **Frontend auth:** Instalar `amazon-cognito-identity-js`. Cliente Cognito en `src/auth/client.ts` con funciones de registro (email), login (email + Google), verificación de email, recuperación de contraseña. Página `login.html` con formularios y botón Google. Sustituir `#login` por `/login.html` y actualizar nav.
5. **Estado usuario y plan:** Módulo `src/auth/user.ts` que llame a `/api/me` y guarde perfil + planId. `src/config/plans.ts` con límites y features.
6. **Aplicar límites y permisos:** En backend, aplicar límites en endpoints de “guardar ejercicio” y “listar bolsa”. En frontend, comprobar límites antes de guardar y ocultar/deshabilitar “suscribirse a notificaciones” según `can(planId, 'can_subscribe_bolsa_notifications')`. Opcional: restringir “optimizar drill” por plan en `Game.ts` y en `POST /api/optimize-drill`.
7. **Perfil:** Adaptar `src/perfil.ts` a datos de API y edición de rol.
8. **Pruebas y ajustes:** Flujo completo login → navegación → límites y mensajes de upgrade; asignación manual de plan para probar cada nivel.

---

## 9. Criterios de aceptación resumidos

- Un usuario puede registrarse e iniciar sesión con **email y contraseña**, o iniciar sesión directamente con **Google**.
- Tras el registro con email, se solicita un código de verificación por email antes de poder iniciar sesión.
- Existe un flujo de "Olvidé mi contraseña" con código de recuperación por email (solo para usuarios registrados con email/contraseña).
- Tras el login se redirige a la página de origen (returnUrl) o a home.
- El usuario tiene un perfil en BD con rol (entrenador/club) y plan; el rol es editable desde el perfil.
- Por defecto el plan es el gratuito. El plan se puede cambiar solo de forma manual (BD o endpoint admin).
- Todas las secciones son accesibles; las diferencias son: (a) límite de ejercicios guardados, (b) límite de resultados en bolsa, (c) función “suscribirse a notificaciones en bolsa” permitida o no según plan.
- La API relevante está protegida con JWT de Cognito; `/api/me` devuelve perfil y plan; los endpoints que modifican datos aplican límites por plan.
- La solución es desplegable en AWS (Cognito + API + BD en AWS).

---

*Documento generado para guiar la implementación completa del sistema de autenticación (email/contraseña + Google) y suscripciones. Actualizar este documento si se añaden planes, features, límites nuevos, o proveedores de identidad adicionales.*
