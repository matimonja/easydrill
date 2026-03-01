# Plan de acción para MVP en producción con EC2

Objetivo: llevar el backend a producción usando una instancia **EC2** (contenedor Docker) y dejar el frontend servido con opción a S3/CloudFront o GitHub Pages, con conexión segura al API.

---

## Fase 0: Requisitos previos (ya hechos o por hacer en código)

- [ ] Backend con Dockerfile construible y funcionando en local.
- [ ] Endpoint `GET /health` que responda 200 (para health checks del ALB o monitoreo).
- [ ] Variables de entorno documentadas: `COGNITO_USER_POOL_ID`, `COGNITO_REGION`, `DATABASE_URL` (y opcionalmente `DATABASE_PATH` para local).
- [ ] CORS configurado por variable (ej. `CORS_ORIGIN`) para restringir en producción.
- [ ] Repositorio en GitHub con el código del backend (o monorepo con carpeta `server/`).

---

## Fase 1: Preparar la imagen Docker del backend

1. **Crear Dockerfile** en la raíz del backend (ej. `server/Dockerfile`):
   - Base image Node 20 Alpine (o similar).
   - Copiar `package*.json`, instalar dependencias con `npm ci --omit=dev`.
   - Copiar código compilado (`dist/`) o compilar en el build (`npm run build`).
   - Exponer puerto 3000.
   - Comando: `node dist/server/src/index.js` (o la ruta que use `npm start`).
   - No incluir `.env` en la imagen; las variables se inyectan en la EC2 (user data o script).

2. **Probar en local:**
   - `docker build -t tactical-api .` desde `server/`.
   - `docker run -p 3000:3000 -e DATABASE_URL=... -e COGNITO_* ... tactical-api`.
   - Verificar `GET http://localhost:3000/health` y `GET /api/me` (401 esperado).

3. **Opcional:** añadir `.dockerignore` (node_modules, .env, dist si se construye en Docker, .git).

---

## Fase 2: Subir la imagen a ECR (para que la EC2 haga pull)

La instancia EC2 hará `docker pull` desde **Amazon ECR** usando el IAM role de la instancia.

### Opción A: ECR manual

1. En AWS Console → **ECR** → Create repository.
   - Nombre: `tactical-board-api`.
   - Dejar opciones por defecto (sin scan on push si quieres simplificar al inicio).

2. Autenticar Docker con ECR:
   - `aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com`.

3. Build y push:
   - `docker tag tactical-api:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/tactical-board-api:latest`.
   - `docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/tactical-board-api:latest`.

### Opción B: CI/CD (GitHub Actions) que construya y suba la imagen

1. Crear workflow en `.github/workflows/deploy-backend.yml`.
2. Triggers: push a `main` (o rama `production`) en carpetas que afecten al backend.
3. Pasos: checkout → configure AWS credentials (OIDC o Access Key) → login ECR → build Docker → push a ECR con tag (ej. `latest` o `sha-xxx`).
4. Opcional: en el mismo workflow, disparar actualización en la EC2 (SSM Run Command, o script que haga SSH + pull + restart del contenedor).

---

## Fase 3: VPC, security groups y RDS

La EC2 debe estar en una VPC donde pueda alcanzar RDS. No hace falta VPC Connector (eso era de App Runner).

1. **Security group de la EC2 (`tactical-api-sg`):**
   - **Inbound:** SSH (22) desde tu IP o bastion; puerto de la app (3000 o 80) desde el ALB (si usas ALB) o desde `0.0.0.0/0` si expones la EC2 directo.
   - **Outbound:** 443 (ECR, Secrets Manager), 5432 (RDS); o "All traffic" para simplificar.

2. **Security group de RDS:**
   - **Inbound** en puerto **5432** solo desde el security group de la EC2 (`tactical-api-sg`).
   - No abrir 5432 a `0.0.0.0/0`.

3. **Subnet:** lanzar la EC2 en una subnet (pública o privada) que tenga ruta a RDS y, si es privada, a un NAT para que pueda hacer `docker pull` de ECR.

---

## Fase 4: Crear la instancia EC2 y desplegar el contenedor

1. **EC2** → Launch instance.

2. **Nombre:** `tactical-board-api` (o el que prefieras).

3. **AMI:** Amazon Linux 2023 o Ubuntu 22.04 LTS.

4. **Instance type:** `t3.small` (2 vCPU, 2 GB RAM) o `t3.medium` si quieres más margen.

5. **Key pair:** crear o seleccionar una para SSH.

6. **Red:** misma VPC que RDS; subnet pública o privada según prefieras; security group `tactical-api-sg`.

7. **IAM instance profile:** crear un role con:
   - **AmazonEC2ContainerRegistryReadOnly** (para `docker pull` de ECR).
   - Política que permita `secretsmanager:GetSecretValue` sobre el secreto `tactical-board/production/database`.

8. **User data (script de arranque):**
   - Instalar Docker.
   - Login ECR: `aws ecr get-login-password --region us-east-1 | docker login ...`.
   - Obtener `DATABASE_URL` de Secrets Manager con `aws secretsmanager get-secret-value`.
   - `docker pull` de la imagen `tactical-board-api:latest`.
   - `docker run -d --restart unless-stopped -p 3000:3000 -e NODE_ENV=production -e DATABASE_URL=... -e COGNITO_* ...` (ver `CONFIGURACION_SERVICIOS_AWS.md` para el script completo).

9. **Variables de entorno** que debe recibir el contenedor: `NODE_ENV`, `COGNITO_USER_POOL_ID`, `COGNITO_REGION`, `CORS_ORIGIN`, `DATABASE_URL` (esta desde Secrets Manager en el script).

10. Tras arrancar la instancia, verificar con SSH que el contenedor está corriendo y que `curl http://localhost:3000/health` responde 200.

11. Si no usas ALB: la URL del API será `http://<IP-pública-EC2>:3000` (o con Elastic IP fija). Si usas ALB, configurar target group y listener (Fase 6).

---

## Fase 5: Frontend apuntando al API en producción

1. **Variable de entorno en el frontend:**
   - En el build del frontend (Vite), definir `VITE_API_URL=https://api.tudominio.com` (o la URL del ALB / IP de la EC2, sin barra final).
   - En el código, usar `import.meta.env.VITE_API_URL` para las llamadas a la API.

2. **Build de producción:**
   - Ejemplo: `VITE_API_URL=https://... npm run build`.
   - En GitHub Actions (o tu CI), inyectar `VITE_API_URL` como secret o variable del repo.

3. **CORS:**
   - En el backend, `CORS_ORIGIN` debe ser exactamente la URL del frontend en producción (ej. `https://tudominio.com` o `https://usuario.github.io` si usas GitHub Pages).

---

## Fase 6: Dominio y HTTPS (opcional pero recomendado)

1. **Dominio propio:**
   - Registrar dominio en Route 53 (o en otro registrador y delegar a Route 53).

2. **Certificado:**
   - En **ACM** (us-east-1), solicitar certificado para `api.tudominio.com` (y/o `tudominio.com`).
   - Validación por DNS (registros CNAME en Route 53).

3. **Application Load Balancer (recomendado):**
   - Crear ALB (Internet-facing) en las mismas subnets públicas (o donde tengas el tráfico entrante).
   - Listener **HTTPS:443** con el certificado ACM; opcional listener HTTP:80 → redirect a 443.
   - Target group: protocolo HTTP, puerto 3000, registrar la instancia EC2.
   - Health check: path `/health`, intervalo 30 s.
   - Security group del ALB: inbound 443 y 80 desde `0.0.0.0/0`; la EC2 solo debe aceptar tráfico en 3000 desde el security group del ALB.

4. **DNS:**
   - En Route 53, crear registro (CNAME o Alias) `api.tudominio.com` apuntando al DNS name del ALB (ej. `tactical-alb-xxxxx.us-east-1.elb.amazonaws.com`).

5. **Frontend:**
   - Actualizar `VITE_API_URL` a `https://api.tudominio.com`.
   - Si sirves el frontend desde S3/CloudFront, configurar dominio y certificado para `tudominio.com` o `www.tudominio.com`.

---

## Fase 7: Monitoreo y despliegues posteriores

1. **Logs:** ver logs del contenedor con `docker logs <container_id>` vía SSH, o configurar el driver de logging de Docker para enviar a **CloudWatch Logs** (opcional).

2. **Métricas:** usar **CloudWatch** (métricas de EC2: CPU, red) y, si usas ALB, métricas del ALB (request count, latencia, 4xx/5xx).

3. **Nuevos despliegues:**
   - Hacer `docker push` a ECR con el tag que use la EC2 (ej. `latest`).
   - En la EC2: SSH y ejecutar `docker pull ... && docker stop ... && docker run ...` (o script de deploy); o automatizar con SSM Run Command / script en CI.

4. **Rollback:** volver a hacer pull de una imagen con tag anterior (ej. `previous`) o conservar tags por commit en ECR y cambiar el script para usar ese tag.

---

## Orden sugerido de ejecución

1. Fase 0 (código: Dockerfile, /health, CORS, VITE_API_URL).
2. Fase 2 (ECR + primer push de imagen).
3. Fase 3 (Security groups: EC2 y RDS).
4. Secrets Manager: crear secreto `tactical-board/production/database` con `DATABASE_URL` (ver `CONFIGURACION_SERVICIOS_AWS.md`).
5. Fase 4 (Crear instancia EC2 con IAM role, user data, y verificar que el contenedor responde).
6. Probar la URL del API (IP de la EC2 o ALB) con `curl` (health y /api/me).
7. Fase 5 (Frontend con VITE_API_URL y build de producción).
8. Fase 6 (ALB, ACM, Route 53 y dominio).
9. Fase 7 (Pipeline CI/CD y monitoreo).
