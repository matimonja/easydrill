# Plan de Implementación: Persistencia de Ejercicios y Sincronización

**Objetivo:** Implementar la persistencia de los ejercicios en la base de datos del servidor (Backend), manteniendo el uso de `localStorage` en el Frontend para garantizar una experiencia de usuario rápida y fluida (enfoque "Local-First" / "Offline-Tolerant"). Todo el diseño debe estar preparado para un despliegue nativo en AWS (Cognito, API Gateway/ALB, ECS/Lambda, y RDS/DynamoDB).

Este documento divide el trabajo en fases iterativas (Sprints), asegurando que al final de cada fase exista un producto funcional, testeable y desplegable.

---

## Sprint 1: Infraestructura de Base de Datos y API Base (Backend)

**Meta:** Preparar el backend para recibir, almacenar y devolver ejercicios asociados a un usuario específico, y preparar la base de datos para soportar el modelo completo de un ejercicio.

### 1. Modelado de Datos (Base de Datos)
- **Tabla `exercises` (SQLite para dev, preparable para RDS PostgreSQL):**
  - `id` (UUID, Primary Key)
  - `user_id` (FK a la tabla `users`)
  - `title` (String)
  - `status` (String: 'draft' | 'complete')
  - `metadata` (JSONB o TEXT: descripción, tags, categorías)
  - `zone_config` (JSONB o TEXT: configuración de la cancha)
  - `entities` (JSONB o TEXT: objetos, jugadores, acciones)
  - `scenes` (JSONB o TEXT: contadores y estado de escenas)
  - `editor_state` (JSONB o TEXT: posición de la cámara)
  - `thumbnail` (TEXT: imagen base64, *en AWS luego se migrará a S3*)
  - `created_at` (Timestamp)
  - `updated_at` (Timestamp)
- **Implementación (`server/src/database.ts`):** 
  - Crear la migración/script para `CREATE TABLE exercises`.
  - Crear funciones CRUD base: `insertExercise`, `updateExercise`, `getExercise`, `getExercisesByUser`, `deleteExercise`.
  - Actualizar `getUserExerciseCount(userId)` para que ejecute un `SELECT COUNT(*) FROM exercises WHERE user_id = ?`.

### 2. Endpoints CRUD y Middleware de Límites (`server/src/index.ts` y Controladores)
- Crear `ExerciseController.ts`.
- **POST `/api/exercises` (Crear):**
  - Requisito: `requireAuth` (usuario autenticado).
  - **Lógica Crítica:** Consultar la base de datos para ver el conteo actual de ejercicios del usuario. Comparar contra el límite de su plan (`plan.max_exercises_saved`).
  - Si supera el límite devolver HTTP 403 Forbidden indicando "Límite de plan alcanzado".
  - Si está dentro del límite, guardar en base de datos.
- **GET `/api/exercises` (Listar):**
  - Devuelve todos los ejercicios pertenecientes al `req.user.id`. Solo devuelve campos ligeros (básicamente todo menos `entities` para no saturar la red).
- **GET `/api/exercises/:id` (Cargar uno):**
  - Devuelve el JSON completo del ejercicio. Validar que el ejercicio pertenece al `req.user.id`.
- **PATCH/PUT `/api/exercises/:id` (Actualizar):**
  - Actualiza metadatos o el canvas completo. Validar propiedad.
- **DELETE `/api/exercises/:id` (Eliminar):**
  - Borra física o lógicamente el registro.

### Entregable Sprint 1:
Una API REST completa y segura que puede recibir POSTs con JSONs de ejercicios, validando que el usuario logueado no sobrepase la cuota de su plan, y guardando de forma exitosa en la base de datos local (SQLite).

---

## Sprint 2: Estrategia "Local-First" en el Frontend

**Meta:** Modificar `ExerciseStorage.ts` para que siga usando `localStorage` para la inmediatez, pero sincronice los datos de fondo (background) con la nueva API.

### 1. Refactor de `ExerciseStorage.ts`
- **Guardado (Save):**
  1. Guardar siempre primero en `localStorage` (como se hace hoy).
  2. Si el usuario está logueado (`isLoggedIn()`), lanzar la petición `POST` o `PATCH /api/exercises` en segundo plano (asíncrono) usando `fetchWithAuth`.
  3. **Manejo de Errores (Límite de Plan):** Si la API responde `HTTP 403` (límite alcanzado), se debe notificar a la UI para disparar un modal o cartel informativo ("Has alcanzado tu límite. Tu ejercicio se guardó localmente en este dispositivo, pero no se sincronizará a tu cuenta en la nube. ¡Mejora tu plan!").
- **Carga (Load):**
  1. Si no hay conexión o no está logueado, intentar cargar de `localStorage`.
  2. Si está logueado, intentar cargar desde `GET /api/exercises/:id`. Si es exitoso, actualizar el caché local en `localStorage`. Si falla (ej. sin internet), hacer fallback a `localStorage`.
- **Listado (List para el Perfil/Dashboard):**
  1. Si está logueado, usar `GET /api/exercises` para traer la fuente de verdad y renderizar la pantalla.
  2. (Opcional) Unificar listas mostrando cuáles están "Solo locales" vs "En la nube".
- **Sincronización de Autoguardado (Auto-Save):**
  - El auto-save (cada X milisegundos) debe seguir guardando principalmente en `localStorage`. Solo enviar al servidor cuando el usuario dispare una acción explícita de "Guardar" o al pausar la edición, para no inundar el backend con peticiones.

### Entregable Sprint 2:
El usuario inicia sesión, entra al editor y crea un ejercicio. Al darle a guardar, la interfaz responde instantáneamente gracias a LocalStorage, pero en la pestaña "Network" (Red) del navegador se ve la petición a la API. Al recargar la página o entrar desde modo incógnito, el ejercicio se recupera exitosamente desde el servidor. Si el usuario supera su límite, recibe un aviso bonito sin que el código de front-end se rompa.

---

## Sprint 3: Optimización para AWS y Estado de Sincronización UI

**Meta:** Mejorar la experiencia de usuario (UX) comunicando el estado de envío de la información y adaptar el manejo de imágenes pesadas (`thumbnails`) para el entorno de producción en AWS.

### 1. Indicadores de Sincronización en UI
- Agregar pequeños componentes visuales (ej. en la barra superior del editor):
  - 🔄 "Guardando en la nube..."
  - ✅ "Sincronizado"
  - ⚠️ "Solo guardado localmente (Sin conexión o límite excedido)"
- Esto evitará que el usuario cierre agresivamente la pestaña antes de que termine el `fetch` al backend.

### 2. Manejo de Imágenes (Thumbnails) para S3
- Actualmente, `generateThumbnail` crea un Data URI (un string larguísimo en Base64).
- En AWS, guardar strings gigantes en las bases de datos (RDS o DynamoDB) degrada el rendimiento significativamente.
- **Flujo propuesto para AWS (Presigned URLs):**
  1. El backend expone `POST /api/upload-url` que devuelve una URL prefirmada (Presigned URL) de Amazon S3.
  2. El frontend convierte el Canvas del thumbnail a un archivo binario (`Blob`) y hace `PUT` directamente al bucket de S3.
  3. El frontend envía a la base de datos (`POST /api/exercises`) únicamente la URL (`https://bucket.s3.../thumb.jpg`), no el Base64.
- *(Nota para Desarrollo: En el entorno local se pueden seguir guardando como Base64 en un directorio local del backend usando multer, de modo que el código esté listo para ser intercambiado por la integración S3)*.

### 3. Resolución de Conflictos Básica (Opcional para v1)
- Si el usuario edita en dos computadoras a la vez. Implementar un campo de *versión* en el objeto `ExerciseDocument`.
- Si el servidor detecta que el update viene de una versión anterior a la almacenada, rechaza guardarlo y pide al usuario refrescar.

### Entregable Sprint 3:
Aplicación lista para subirse a AWS. La UX del editor muestra el estado de sincronización. Las imágenes ya no engordan la base de datos SQL sino que se suben preparadas como "archivos", dejando el sistema preparado para escalar a miles de usuarios.

---

## Conclusión Arquitectónica
Este marco de trabajo garantiza que el sistema siga sintiéndose igual de rápido y responsivo (ya que el tablero dibuja dependiente del estado en memoria y LocalStorage) mientras la "pesada" tarea de serializar componentes y viajar a la base de datos ocurre de manera asíncrona de fondo, aplicando a la vez de forma estricta las cuotas definidas en el plan de Amazon Cognito.
