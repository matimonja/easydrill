# Configuraciones recomendadas por servicio AWS (MVP con EC2)

Guía de qué elegir en cada pantalla o comando al dar de alta los servicios para el MVP.

---

## 1. Amazon ECR (registro de imágenes Docker)

| Campo / Opción | Valor recomendado | Notas |
|----------------|--------------------|--------|
| **Repository name** | `tactical-board-api` | Nombre corto y claro. |
| **Tag immutability** | Disabled | Para MVP está bien poder reusar el tag `latest`. |
| **Scan on push** | Opcional (Enabled si quieres reportes de vulnerabilidades) | Aumenta un poco el tiempo de push. |
| **Encryption** | AES-256 (default) | Mantener por defecto. |
| **Lifecycle policy** | Opcional | Ej: borrar imágenes sin tag o con más de 5 versiones para ahorrar espacio. |

Después de crear: anotar **URI** de la imagen (ej. `123456789.dkr.ecr.us-east-1.amazonaws.com/tactical-board-api`).

---

## 2. EC2 – Security group y red

| Campo / Opción | Valor recomendado | Notas |
|----------------|--------------------|--------|
| **Security group name** | `tactical-api-sg` | Para la instancia donde corre el API. |
| **Inbound** | SSH (22) desde tu IP o bastion; HTTP (80) o app (3000) desde el **ALB** o desde `0.0.0.0/0` si no usas ALB | Si pones un ALB delante, solo permitir tráfico al puerto de la app desde el security group del ALB. |
| **Outbound** | Todo (0.0.0.0/0) o restringir: 443 (ECR, Secrets Manager), 5432 (RDS) | La instancia necesita salida a ECR para `docker pull` y a RDS para la base de datos. |
| **Subnet** | Pública (con IP pública) o privada | Pública si quieres SSH directo y no usas ALB; privada si el tráfico entra solo por un ALB en subnets públicas. La subnet debe poder alcanzar RDS (misma VPC o peering). |

Crear este security group antes de lanzar la instancia EC2 y asignarlo en el paso 5.

---

## 3. Security group de RDS (inbound)

| Tipo | Puerto | Origen | Notas |
|------|--------|--------|--------|
| PostgreSQL | 5432 | Security group de la **instancia EC2** (`tactical-api-sg`) | Solo la instancia donde corre el API puede conectar a RDS. |

No abrir 5432 a `0.0.0.0/0` en producción.

---

## 4. AWS Secrets Manager (para DATABASE_URL)

| Campo / Opción | Valor recomendado | Notas |
|----------------|--------------------|--------|
| **Secret type** | Other type of secret | Clave-valor. |
| **Key** | `DATABASE_URL` | Mismo nombre que espera el backend. |
| **Value** | Cadena completa de conexión PostgreSQL (incluye usuario, contraseña, host, puerto, DB name, `?sslmode=require`) | Ej: `postgresql://user:pass@rds-endpoint:5432/easydrill?sslmode=require`. |
| **Secret name** | `tactical-board/production/database` | Nombre lógico para el entorno. |
| **Encryption** | Default (KMS key por defecto) | OK para MVP. |

En la EC2 cargar este secreto como variable de entorno en el script de arranque (por ejemplo con AWS CLI: `aws secretsmanager get-secret-value`) o usar un script que inyecte `DATABASE_URL` al levantar el contenedor. La instancia necesita un IAM role con permiso `secretsmanager:GetSecretValue`.

---

## 5. EC2 – Instancia para el API

### 5.1 Configuración de la instancia

| Campo / Opción | Valor recomendado | Notas |
|----------------|--------------------|--------|
| **Name** | `tactical-board-api` | Nombre para identificar la instancia. |
| **AMI** | Amazon Linux 2023 o Ubuntu 22.04 LTS | Incluyen Docker en los repos o fácil de instalar. |
| **Instance type** | `t3.small` (2 vCPU, 2 GB RAM) o `t3.medium` (2 vCPU, 4 GB) | Suficiente para el contenedor Node; subir si hay picos. |
| **Key pair** | Crear o seleccionar una existente | Necesaria para SSH. |
| **Subnet** | Pública (con IP pública asignada) o privada si usas ALB | Debe tener ruta a internet (para ECR) y a RDS. |
| **Security group** | `tactical-api-sg` (creado en paso 2) | — |
| **Storage** | 20–30 GB gp3 | Para SO, Docker e imágenes. |

### 5.2 IAM role de la instancia

| Permiso / Política | Uso |
|--------------------|-----|
| **AmazonEC2ContainerRegistryReadOnly** | Para que la instancia pueda hacer `docker pull` desde ECR sin credenciales en disco. |
| **SecretsManagerReadWrite** (restringida al secreto `tactical-board/production/database`) o política custom con `secretsmanager:GetSecretValue` | Para leer `DATABASE_URL` en el script de arranque. |

Crear un role (ej. `tactical-board-ec2-role`), adjuntar estas políticas y asignarlo a la instancia en **Advanced details → IAM instance profile**.

### 5.3 User data (script de arranque)

**Dónde pegarlo:** Al lanzar la EC2, en **Advanced details** → **User data**, pega el script (como texto). La instancia lo ejecutará una vez al arrancar.

**Antes de pegar:** Sustituye los placeholders por tus valores reales:

| Placeholder | Dónde obtenerlo | Ejemplo |
|-------------|-----------------|---------|
| `AWS_REGION` | Región donde está ECR y RDS | `us-east-1` |
| `AWS_ACCOUNT_ID` | Consola → cuenta (arriba derecha) o `aws sts get-caller-identity --query Account --output text` | `300248999379` |
| `COGNITO_USER_POOL_ID` | Cognito → User Pools → tu pool → Pool ID | `us-east-1_Ab1Cd2Ef3` |
| `CORS_ORIGIN` | URL del frontend en producción, sin barra final | `https://tudominio.com` |

**Pasos que realiza el script:** (1) Instalar Docker y jq, (2) Login en ECR, (3) Leer `DATABASE_URL` de Secrets Manager, (4) Pull de la imagen, (5) Ejecutar el contenedor con las variables de entorno.

**Script (Amazon Linux 2023):**

```bash
#!/bin/bash
set -e
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="300248999379"
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_URI="${ECR_URI}/tactical-board-api:latest"
SECRET_ID="tactical-board/production/database"
COGNITO_USER_POOL_ID="us-east-1_xxxxx"
CORS_ORIGIN="https://tudominio.com"

yum update -y
yum install -y docker jq
systemctl start docker && systemctl enable docker

aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_URI"

# Secrets Manager devuelve JSON {"DATABASE_URL":"..."}; extraer el valor
SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id "$SECRET_ID" --query SecretString --output text --region "$AWS_REGION")
export DATABASE_URL=$(echo "$SECRET_JSON" | jq -r '.DATABASE_URL // .')

docker pull "$IMAGE_URI"
docker run -d --restart unless-stopped --name tactical-api -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="$DATABASE_URL" \
  -e COGNITO_USER_POOL_ID="$COGNITO_USER_POOL_ID" \
  -e COGNITO_REGION="$AWS_REGION" \
  -e CORS_ORIGIN="$CORS_ORIGIN" \
  "$IMAGE_URI"
```

**Notas:** Si en Secrets Manager guardaste el secreto como **texto plano** (solo la URL) en lugar de clave-valor, sustituye las dos líneas del secreto por:

```bash
export DATABASE_URL=$(aws secretsmanager get-secret-value --secret-id "$SECRET_ID" --query SecretString --output text --region "$AWS_REGION")
```

**Ubuntu 22.04:** Cambia `yum update -y` / `yum install -y docker jq` por `apt-get update && apt-get install -y docker.io jq` y `systemctl start docker` igual.

---

#### Si la instancia ya está creada (ejecutar 5.3 a mano)

Si lanzaste la EC2 sin user data o el script no llegó a ejecutarse, puedes hacer lo mismo por SSH:

**1. Conectarte por SSH**

Desde tu máquina (con la clave `.pem` y la IP pública de la EC2):

```bash
ssh -i /ruta/a/tu-key.pem ec2-user@<IP-PUBLICA-EC2>
```

(Si usaste Ubuntu: `ubuntu@<IP-PUBLICA-EC2>`.)

**2. Ejecutar el despliegue en la EC2**

En la sesión SSH, **edita primero** las variables si hace falta (región, cuenta, Cognito, CORS), luego pega y ejecuta todo el bloque. En Amazon Linux 2023:

```bash
# Sustituir por tus valores
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID="300248999379"
export COGNITO_USER_POOL_ID="us-east-1_xxxxx"
export CORS_ORIGIN="https://tudominio.com"

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_URI="${ECR_URI}/tactical-board-api:latest"
SECRET_ID="tactical-board/production/database"

sudo yum install -y docker jq 2>/dev/null || true
sudo systemctl start docker && sudo systemctl enable docker

aws ecr get-login-password --region "$AWS_REGION" | sudo docker login --username AWS --password-stdin "$ECR_URI"

SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id "$SECRET_ID" --query SecretString --output text --region "$AWS_REGION")
export DATABASE_URL=$(echo "$SECRET_JSON" | jq -r '.DATABASE_URL // .')

sudo docker pull "$IMAGE_URI"
sudo docker stop tactical-api 2>/dev/null || true
sudo docker rm tactical-api 2>/dev/null || true
sudo docker run -d --restart unless-stopped --name tactical-api -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="$DATABASE_URL" \
  -e COGNITO_USER_POOL_ID="$COGNITO_USER_POOL_ID" \
  -e COGNITO_REGION="$AWS_REGION" \
  -e CORS_ORIGIN="$CORS_ORIGIN" \
  "$IMAGE_URI"
```

Si tu secreto en Secrets Manager es **solo texto** (no JSON con clave `DATABASE_URL`), sustituye las dos líneas del secreto por:

```bash
export DATABASE_URL=$(aws secretsmanager get-secret-value --secret-id "$SECRET_ID" --query SecretString --output text --region "$AWS_REGION")
```

**3. Comprobar que el API responde**

En la misma EC2:

```bash
curl -s http://localhost:3000/health
```

Deberías ver una respuesta 200. Desde tu navegador o tu máquina (si el security group permite tráfico al puerto 3000): `http://<IP-PUBLICA-EC2>:3000/health`.

**4. Ver logs del contenedor**

```bash
sudo docker logs -f tactical-api
```

(Pulsa Ctrl+C para salir.)

---

### 5.4 Variables de entorno del API

Todas se inyectan en el **user data** (script 5.3). No hace falta configurarlas en otra pantalla.

| Variable | Origen | Dónde obtener el valor |
|----------|--------|------------------------|
| `NODE_ENV` | Fija en script | Siempre `production`. |
| `COGNITO_USER_POOL_ID` | Fija en script | Cognito → User Pools → tu pool → **Pool ID** (ej. `us-east-1_Ab1Cd2Ef3`). |
| `COGNITO_REGION` | Fija en script | Región donde creaste el User Pool (ej. `us-east-1`). |
| `CORS_ORIGIN` | Fija en script | URL pública del frontend, sin barra final (ej. `https://tudominio.com` o `https://xxx.cloudfront.net`). |
| `DATABASE_URL` | Secrets Manager (leída en el script con AWS CLI) | No escribir en el script; el script la obtiene del secreto `tactical-board/production/database`. |

---

### 5.5 Health check (solo si usas ALB)

Se configura en el **Target group** del ALB, no en la EC2. Cuando crees el target group (paso 5.6):

| Campo | Valor recomendado |
|-------|-------------------|
| **Protocol** | HTTP |
| **Path** | `/health` |
| **Port** | 3000 (o 80 si en el user data mapeaste el contenedor a 80) |
| **Healthy threshold** | 2 |
| **Unhealthy threshold** | 3 |
| **Timeout** | 5 s |
| **Interval** | 30 s |

Tu API debe exponer `GET /health` y devolver **200**; si no existe, el ALB marcará la instancia como unhealthy.

---

### 5.6 Application Load Balancer (opcional; recomendado para HTTPS y dominio)

Orden recomendado al crear recursos:

1. **Crear el ALB** (EC2 → Load Balancing → Load Balancers → Create):
   - **Scheme:** Internet-facing.
   - **Network mapping:** misma VPC que la EC2; elegir al menos 2 subnets públicas (en distintas AZ).
   - **Security group (nuevo o existente):** Inbound **80** y **443** desde `0.0.0.0/0`; Outbound puede quedar por defecto o permitir solo el puerto del target (3000) hacia el SG de la EC2.

2. **Crear Target group** (Target Groups → Create):
   - **Target type:** Instances.
   - **Protocol:** HTTP, **Port:** 3000.
   - **VPC:** la misma que la EC2.
   - **Health check:** como en la tabla de 5.5 (path `/health`, etc.).
   - Después de crear: **Register targets** → seleccionar la instancia EC2 del API → puerto 3000.

3. **Añadir listeners al ALB** (en el ALB → Listeners):
   - **HTTPS:443** → Forward to el target group creado; asociar certificado ACM (crear antes en ACM para `api.tudominio.com`).
   - **HTTP:80** (opcional) → Redirect to HTTPS 443.

4. **Security group de la EC2:** Asegurar que en **Inbound** el puerto 3000 permita tráfico desde el **security group del ALB** (no desde 0.0.0.0/0 si ya no quieres exponer la EC2 directo).

Con esto el tráfico entra por el ALB (HTTPS) y el ALB reenvía a la EC2 en el puerto 3000.

---

## 6. Cognito (User Pool) – Revisión para producción

| Opción | Valor recomendado | Notas |
|--------|--------------------|--------|
| **App client – Allowed callback URLs** | Añadir la URL real del frontend (ej. `https://tudominio.com`, `https://tudominio.com/callback`) | Quitar `localhost` en producción o mantener solo para pruebas. |
| **App client – Sign out URLs** | Añadir la URL real del frontend | Mismo criterio. |
| **Domain – Cognito domain** | Mantener el que ya usas (ej. `xxx.auth.us-east-1.amazoncognito.com`) | Para OAuth/Google. |
| **Resource server / Scopes** | Solo si usas scopes; para MVP con JWT estándar no obligatorio | — |

---

## 7. RDS (PostgreSQL)

| Opción | Valor recomendado | Notas |
|--------|--------------------|--------|
| **Backups** | Automated backups enabled, retention 7 days | Por defecto suele estar; verificar. |
| **Public access** | No | RDS solo accesible desde la VPC (y por tanto desde la instancia EC2). |
| **Security group** | Como en sección 3: solo entrada 5432 desde el security group de la EC2 (`tactical-api-sg`) | — |
| **Parameter group** | Default o uno que tenga `ssl = 1` si quieres forzar SSL | Coherente con `sslmode=require` en la URL. |

---

## 8. ACM (certificado para dominio propio)

| Campo / Opción | Valor recomendado | Notas |
|----------------|--------------------|--------|
| **Domain name** | `api.tudominio.com` (y/o `tudominio.com` si usas mismo cert) | Un cert por dominio o wildcard. |
| **Validation method** | DNS validation | Crear el CNAME que indique ACM en Route 53 (o en tu DNS). |
| **Region** | us-east-1 | Necesario para asociar el certificado al ALB (HTTPS) o a CloudFront. |

---

## 9. Route 53 (DNS)

| Tipo de registro | Nombre | Valor / Destino | Notas |
|------------------|--------|----------------|--------|
| **CNAME / Alias** (para API) | `api.tudominio.com` | DNS name del **Application Load Balancer** (ej. `tactical-alb-xxxxx.us-east-1.elb.amazonaws.com`) o IP elástica de la EC2 si no usas ALB | Tráfico del API. |
| **A / AAAA** (para frontend) | `tudominio.com` o `www` | Si usas S3/CloudFront: alias al bucket o a la distribución CloudFront | Para la web del frontend. |

---

## Resumen de servicios a tocar

1. **ECR** – Repositorio de la imagen Docker.
2. **VPC** – Subnets y security group para la instancia EC2 (`tactical-api-sg`).
3. **RDS** – Security group que permita 5432 solo desde el security group de la EC2.
4. **Secrets Manager** – Secreto con `DATABASE_URL`; la EC2 lo lee vía IAM en el arranque.
5. **EC2** – Instancia (AMI, tipo, IAM role, user data con Docker + ECR + Secrets Manager + `docker run`).
6. **ALB** (opcional) – Para HTTPS, health checks y dominio propio delante de la EC2.
7. **Cognito** – Callback/sign-out URLs de producción.
8. **ACM + Route 53** – Si usas dominio propio (certificado en ALB o CloudFront; DNS apuntando al ALB o a la IP de la EC2).
