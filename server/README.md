# Backend — Tactical Board

API REST (Express + TypeScript) para autenticación (Cognito), perfiles, planes y persistencia de ejercicios. Soporta SQLite en desarrollo y PostgreSQL (p. ej. AWS RDS) en producción.

## Variables de entorno

Crear `server/.env` (no commitear). Ejemplo:

```env
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_REGION=us-east-1
DATABASE_PATH=./data/easydrill.db
```

### Base de datos

- **`DATABASE_PATH`** (opcional)  
  Ruta del archivo SQLite. Por defecto: `./data/easydrill.db`. Solo se usa si **no** está definido `DATABASE_URL`.

- **`DATABASE_URL`** (opcional)  
  Si está definido, el servidor usa **PostgreSQL** en lugar de SQLite (p. ej. para AWS RDS).

  Ejemplo:

  ```env
  DATABASE_URL=postgresql://usuario:password@host:5432/nombre_db?sslmode=require
  ```

  Comportamiento:
  - **Sin `DATABASE_URL`:** se usa SQLite; el archivo se crea en `DATABASE_PATH` (o `./data/easydrill.db`).
  - **Con `DATABASE_URL`:** se usa PostgreSQL; al arrancar se crean las tablas y se hace el seed de planes si no existen.

## Arranque

```bash
npm install
npm run build
npm start
```

- **`npm run dev`** — desarrollo con recarga (`ts-node-dev`).
- **`npm run build`** — compila TypeScript a `dist/`.
- **`npm start`** — ejecuta `node dist/server/src/index.js` (requiere `npm run build` previo).

## Conexión a AWS RDS (PostgreSQL)

Si usas RDS con SSL (`sslmode=require` en la URL), el cliente ya está configurado con `rejectUnauthorized: false` para evitar errores típicos de certificado.

Si aun así aparece **`SELF_SIGNED_CERT_IN_CHAIN`**, puedes:

1. **Entorno de desarrollo / pruebas:** arrancar con verificación TLS desactivada:
   ```bash
   NODE_TLS_REJECT_UNAUTHORIZED=0 npm start
   ```
   (No recomendado en producción.)

2. **Producción:** usar el [CA bundle de Amazon RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html) y configurar Node/pg para usarlo, en lugar de `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## Pruebas rápidas por modo de base de datos

- **Solo SQLite:** asegurarse de que `DATABASE_URL` no esté definido (o dejarlo vacío). Por ejemplo:
  ```bash
  DATABASE_URL= npm start
  ```
- **PostgreSQL (RDS):** tener `DATABASE_URL` en `.env` y ejecutar `npm start`. Si falla por certificado, usar `NODE_TLS_REJECT_UNAUTHORIZED=0 npm start` como en la sección anterior.

En ambos casos, si el servidor arranca correctamente verás `Server running at http://localhost:3000`. Un `GET /api/me` sin token devolverá `401` (esperado).
