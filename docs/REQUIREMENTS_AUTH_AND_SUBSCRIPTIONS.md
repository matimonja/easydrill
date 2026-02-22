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
- Se prioriza **Amazon Cognito** para autenticación (federación con Google), de modo que todo el flujo de identidad quede dentro de AWS. La base de datos de perfiles y planes puede ser RDS (PostgreSQL) o DynamoDB según se decida.

### 2.2 Autenticación (v1)

- **Solo “Iniciar sesión con Google”** en la primera versión. No implementar registro ni login con email y contraseña.
- Flujo: el usuario hace clic en “Iniciar sesión con Google”, se redirige al flujo OAuth de Google y, tras éxito, vuelve a la aplicación con una sesión (JWT de Cognito).
- **Experiencia de login:** Página dedicada de login (URL clara, adecuada para redirect OAuth). Tras login correcto, redirigir a la URL de origen (la página desde la que se pulsó “Iniciar sesión”) si existe `returnUrl`; si no, a la home.

### 2.3 Perfil de usuario y rol

- **Rol (entrenador / club):** Debe poder **elegirse** y **modificarse** en cualquier momento (no solo al registrarse). Se guarda en la base de datos (perfil de usuario) y se muestra en home y perfil.
- Nombre, avatar (y opcionalmente bio) pueden venir de Google y/o editarse en la app; si se editan en la app, persistir en backend.
- Las estadísticas del perfil (ejercicios, foros, forks) deben cargarse desde el backend cuando exista auth, reemplazando el uso actual de localStorage.

### 2.4 Planes y suscripciones

- **Cantidad de planes:** 3 o 4. Los nombres comerciales se definen después; a nivel técnico usar IDs (ej. `free`, `basic`, `pro`, `team`).
- **Asignación de plan (v1):** Solo **asignación manual** (sin pasarela de pago). Por ejemplo: cambio directo en base de datos o endpoint interno/admin (ej. `PATCH /api/users/:id/plan`).
- **Plan por defecto:** Al registrarse (primera vez que inicia sesión con Google), el usuario recibe el plan gratuito (ej. `free`).

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

- Crear un **User Pool** de Cognito.
- Configurar **Google** como proveedor de identidad federado (IdP). En Google Cloud Console: crear credenciales OAuth 2.0 (tipo “Web application”), configurar URLs de redirect autorizadas con la URL de Cognito (y en desarrollo, localhost si aplica).
- En el User Pool, en “App integration”: crear un **App client** (público para SPA). Anotar **User Pool ID**, **Region**, **App client ID**. No exponer el client secret en el frontend (en SPA no se usa).
- Opcional pero recomendado: habilitar “Hosted UI” de Cognito para el flujo de login con Google (redirect a la página de Cognito que muestra “Sign in with Google”), o implementar el flujo con el SDK (amplify-ui o amazon-cognito-identity-js) en la propia página de login.

### 3.2 Variables de entorno

- **Frontend (Vite):** Por ejemplo `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`, `VITE_COGNITO_REGION`, y si se usa Hosted UI: `VITE_COGNITO_DOMAIN` (dominio del Hosted UI).
- **Backend (Express/Lambda):** Variables para verificar JWT: región, User Pool ID; el backend usará la JWKS de Cognito para validar el token y extraer `sub` (y claims personalizados si se añaden).

### 3.3 Flujo técnico

1. Usuario entra a la página de login (ej. `/login.html`).
2. Clic en “Continuar con Google”: redirigir a Cognito Hosted UI (o iniciar flujo OAuth con el SDK). Cognito redirige a Google y, tras éxito, Cognito devuelve al callback de la app con códigos/tokens.
3. La app intercambia código por tokens (id_token, access_token, refresh_token) y los almacena de forma segura (por ejemplo en memoria + refresh con HttpOnly cookie si el backend gestiona sesión, o solo en memoria para SPA; evitar localStorage para tokens si hay requisitos estrictos de seguridad; para v1 puede usarse el enfoque estándar de Cognito para SPA).
4. En cada petición al backend, enviar el token en cabecera `Authorization: Bearer <id_token o access_token>` (según lo que el backend espere).
5. El backend verifica el JWT con la JWKS de Cognito y obtiene `sub` (identificador único del usuario) para asociar peticiones a un usuario.

### 3.4 Creación de perfil en base de datos

- La primera vez que un usuario inicia sesión (identificado por `sub` de Cognito), el backend debe crear un **perfil** en la base de datos (o un job/trigger que lo haga). Ese perfil tendrá `plan_id` por defecto (plan gratuito) y campos para rol, nombre, avatar, etc.
- Si se usa solo backend propio (Express + RDS), un endpoint tipo `GET /api/me` o `POST /api/auth/sync` puede: verificar el JWT, buscar usuario por `sub`; si no existe, crearlo con plan `free` y datos básicos de Google (nombre, email, avatar si vienen en el token), y devolver perfil + plan.

---

## 4. Modelo de datos

### 4.1 Tablas (o equivalentes) necesarias

- **users (o profiles)**  
  - `id` (UUID o string, PK).  
  - `cognito_sub` (string, único) – identificador del usuario en Cognito.  
  - `email` (string, opcional si viene de Google).  
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
- Responsabilidades:
  - Inicializar/configurar el cliente de Cognito (User Pool ID, Client ID, región).
  - Exportar: `getCurrentUser()`, `getSession()` (o equivalente para obtener tokens), `signInWithGoogle()` (que redirija a Hosted UI o use SDK), `signOut()`.
  - Si se usa Hosted UI: construir la URL de login y la URL de callback; en la página de callback, intercambiar código por tokens y guardarlos; redirigir a `returnUrl` o home.
- Mantener un estado mínimo de “usuario logueado” (por ejemplo evento o callback al cambiar sesión) para que la navegación y los guards reaccionen.

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

### 5.4 Página de login

- **Archivo sugerido:** `login.html` + entry en Vite (ej. `src/login.ts`).
- Contenido:
  - Un único CTA principal: “Continuar con Google” (o “Iniciar sesión con Google”). Al hacer clic, iniciar flujo Cognito (Hosted UI o SDK).
  - Antes de redirigir a login, la app debe guardar en sessionStorage (o similar) la URL actual como `returnUrl` para redirigir después del login.
  - Página de callback (puede ser la misma `login.html` con query param `?code=...` o ruta `/login/callback`): intercambiar código por tokens, llamar a `GET /api/me` para crear/obtener perfil, luego `window.location.href = returnUrl || '/'`.
  - Mostrar mensajes de error si el login falla (token inválido, usuario canceló, etc.).
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
- Leer cabecera `Authorization: Bearer <token>`. Verificar el JWT con la JWKS de Cognito (usar librería tipo `jsonwebtoken` + `jwks-rsa` o el SDK de Cognito). Extraer `sub` y opcionalmente email/name si vienen en el token.
- Adjuntar a `req` un objeto `req.user` con al menos `sub` (y si ya se ha resuelto contra la BD: `userId`, `planId`, `role`). Si no hay token o es inválido, responder **401 Unauthorized**.

### 6.3 Endpoints

- **GET /api/me**  
  - Protegido con middleware auth.  
  - Buscar usuario por `cognito_sub` (req.user.sub). Si no existe, crearlo con plan `free`, rol por defecto (ej. `entrenador`) y datos del token (nombre, email, avatar si están).  
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
| Auth frontend | `src/auth/client.ts` (Cognito), `src/auth/user.ts` (estado + perfil/plan) | — |
| Config | `src/config/plans.ts` (límites, features, `getLimits`, `can`) | — |
| Login | `login.html`, `src/login.ts` (entry en Vite), página callback si aplica | `vite.config.ts` (entry login) |
| Guards / uso | `src/auth/guards.ts` opcional (helpers para “dentro de límite”, “puede feature”) | Entries de páginas que usen límites (marketplace, bolsa, etc.), `src/core/Game.ts` (optimize si se restringe) |
| Nav / UI | — | Todos los HTML con `href="#login"` → `/login.html`; lógica del header para mostrar usuario/avatar y “Cerrar sesión” |
| Perfil | — | `src/perfil.ts` (datos desde API, edición de rol, plan actual) |
| Backend | `server/src/middleware/auth.ts`, `GET /api/me`, `PATCH /api/me`, lógica de BD (users, plans) | `server/src/index.ts` (registrar middleware, rutas); `DrillController` o rutas que apliquen límites |
| DB | Migraciones o scripts para tablas `users`, `plans`, y tablas de ejercicios guardados / bolsa | — |
| Env | — | `.env.example` con `VITE_COGNITO_*`, variables de backend para Cognito y BD |

---

## 8. Orden de implementación sugerido

1. **Configurar Cognito:** User Pool, Google como IdP, App client. Variables de entorno en front y back.
2. **Base de datos:** Crear tablas `plans` y `users` (o `profiles`); seed de planes. Definir y crear tablas para ejercicios guardados y datos de bolsa si aplica.
3. **Backend auth:** Middleware que verifique JWT de Cognito y exponga `req.user`. Endpoints `GET /api/me` y `PATCH /api/me` con creación de usuario en primer login.
4. **Frontend auth:** Cliente Cognito en `src/auth/client.ts`, flujo de login con Google (Hosted UI o SDK), página `login.html` y callback. Sustituir `#login` por `/login.html` y actualizar nav.
5. **Estado usuario y plan:** Módulo `src/auth/user.ts` que llame a `/api/me` y guarde perfil + planId. `src/config/plans.ts` con límites y features.
6. **Aplicar límites y permisos:** En backend, aplicar límites en endpoints de “guardar ejercicio” y “listar bolsa”. En frontend, comprobar límites antes de guardar y ocultar/deshabilitar “suscribirse a notificaciones” según `can(planId, 'can_subscribe_bolsa_notifications')`. Opcional: restringir “optimizar drill” por plan en `Game.ts` y en `POST /api/optimize-drill`.
7. **Perfil:** Adaptar `src/perfil.ts` a datos de API y edición de rol.
8. **Pruebas y ajustes:** Flujo completo login → navegación → límites y mensajes de upgrade; asignación manual de plan para probar cada nivel.

---

## 9. Criterios de aceptación resumidos

- Un usuario puede iniciar sesión solo con Google; no hay formulario de email/contraseña.
- Tras el login se redirige a la página de origen (returnUrl) o a home.
- El usuario tiene un perfil en BD con rol (entrenador/club) y plan; el rol es editable desde el perfil.
- Por defecto el plan es el gratuito. El plan se puede cambiar solo de forma manual (BD o endpoint admin).
- Todas las secciones son accesibles; las diferencias son: (a) límite de ejercicios guardados, (b) límite de resultados en bolsa, (c) función “suscribirse a notificaciones en bolsa” permitida o no según plan.
- La API relevante está protegida con JWT de Cognito; `/api/me` devuelve perfil y plan; los endpoints que modifican datos aplican límites por plan.
- La solución es desplegable en AWS (Cognito + API + BD en AWS).

---

*Documento generado para guiar la implementación completa del sistema de autenticación y suscripciones. Actualizar este documento si se añaden planes, features o límites nuevos.*
