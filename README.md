# Tactical Board

Aplicación web de pizarra táctica deportiva: editor de ejercicios sobre un campo (hockey u otros), con jugadores, formas, acciones animadas y optimización de drills. Incluye autenticación (AWS Cognito), perfiles, planes de suscripción y soporte táctil/móvil en el editor.

## Stack

- **Frontend:** HTML, TypeScript, Vite (multi-entry por página). Sin React/Vue. Canvas 2D para el tablero.
- **Backend:** Node.js, Express, TypeScript en `server/`. API REST con JWT (Cognito).
- **Base de datos:** SQLite en desarrollo (`server/data/`); en producción se puede usar RDS (PostgreSQL) o DynamoDB.

## Requisitos

- Node.js 18+
- npm (o pnpm/yarn)

## Instalación

```bash
npm install
cd server && npm install && cd ..
```

## Variables de entorno

Copiar `.env.example` a `.env` en la raíz del proyecto y, si hace falta, en `server/.env`.

**Frontend (raíz `.env`):**

- `VITE_COGNITO_USER_POOL_ID` — ID del User Pool de Cognito
- `VITE_COGNITO_CLIENT_ID` — App client ID (SPA)
- `VITE_COGNITO_REGION` — Región (ej. `us-east-1`)
- `VITE_COGNITO_DOMAIN` — Dominio del Hosted UI (si usas login con Google)

**Backend (`server/.env`):**

- `COGNITO_USER_POOL_ID` — Mismo User Pool ID (para validar JWT)
- `COGNITO_REGION` — Misma región
- `DATABASE_PATH` — Ruta del archivo SQLite (opcional; por defecto `./data/easydrill.db`)

## Desarrollo

Frontend y backend a la vez (Vite + API en el mismo proceso de npm):

```bash
npm run dev
```

Solo frontend (API en otro terminal):

```bash
npm run dev:front
```

Solo backend:

```bash
npm run dev:back
```

- Frontend: [http://localhost:5173](http://localhost:5173) (Vite con proxy `/api` al backend).
- Backend: [http://localhost:3000](http://localhost:3000).

## Build y producción

```bash
npm run build
cd server && npm run build
```

El build del frontend queda en `dist/`. El servidor se ejecuta con:

```bash
cd server && npm start
```

Servir los estáticos de `dist/` con cualquier servidor (nginx, S3/CloudFront, etc.) y apuntar las peticiones `/api` al backend.

## Tests

```bash
npm test
```

## Documentación

En la carpeta **`docs/`**:

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Arquitectura del editor: Game como mediador, Tools, Commands, Camera, AnimationManager, entidades.
- **[AI_GUIDELINES.md](docs/AI_GUIDELINES.md)** — Reglas de código: Tools para interacción, Commands para cambios de estado, uso de `IGameContext`.
- **[PROMPT.md](docs/PROMPT.md)** — Prompt maestro para desarrollo con IA (estilo, modularidad).
- **[REQUIREMENTS_AUTH_AND_SUBSCRIPTIONS.md](docs/REQUIREMENTS_AUTH_AND_SUBSCRIPTIONS.md)** — Autenticación (Cognito, login, perfil) y sistema de planes/límites.
- **[PROMPT_MOBILE_TABLET.md](docs/PROMPT_MOBILE_TABLET.md)** — Soporte móvil/tablet (Pointer Events, pinch, toolbar colapsable).

## Licencia

Proyecto privado.
