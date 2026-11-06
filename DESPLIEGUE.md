# Despliegue en producción

Paso a paso para dejar `https://planificacionacademica.cecar.edu.co`
guardando en PostgreSQL (SPEC-011) y validando claves con la API de
sistemas (SPEC-010). Hay tres piezas y tres responsables:

```
navegador ──HTTPS──► servidor web (Next.js) ──5432──► PostgreSQL (VPS)   (DBA)
                             │
                             └──HTTPS──► API de credenciales           (sistemas)
```

## 1. La base de datos en la VPS (DBA)

Requiere PostgreSQL 13 o posterior (Ubuntu/Debian: `sudo apt install postgresql`).

```bash
# 1.1 En la VPS: la base (UTF-8: hay tildes en los catálogos), su dueño
#     —con el que se crean las tablas— y el usuario de la aplicación.
sudo -u postgres psql <<'SQL'
CREATE ROLE asignacion_admin LOGIN PASSWORD '<clave del dueño>';
CREATE DATABASE asignacion_academica OWNER asignacion_admin ENCODING 'UTF8' TEMPLATE template0;
SQL
```

```bash
# 1.2 Desde la carpeta del proyecto (en la VPS o en cualquier equipo que la
#     alcance), con el DUEÑO: tablas, reglas y catálogos.
DATABASE_URL="postgresql://asignacion_admin:<clave del dueño>@<vps>:5432/asignacion_academica" npx prisma migrate deploy

# 1.3 Quién puede entrar y con qué rol
cp prisma/usuarios.ejemplo.json prisma/usuarios.json     # editar correos, nombres, rol y programa
DATABASE_URL="postgresql://asignacion_admin:<clave del dueño>@<vps>:5432/asignacion_academica" npx prisma db seed
```

```bash
# 1.4 En la VPS: el usuario de la aplicación. La migración ya creó el rol
#     rol_asignacion_app, que no puede editar la bitácora ni las novedades.
sudo -u postgres psql -c "CREATE ROLE app_asignacion LOGIN PASSWORD '<clave de la app>' IN ROLE rol_asignacion_app;"
```

La aplicación se conecta con `app_asignacion`, **nunca** con el dueño ni con
`postgres`: los permisos que protegen la bitácora no alcanzan al dueño.
Para futuras versiones con migraciones nuevas, se repite el paso 1.2.

Si ya hay datos registrados (en el navegador o en la antigua base SQL
Server), se migran con el respaldo JSON (ver `db/README.md` → *Migrar lo
registrado*).

**Red:** si la aplicación y la base están en máquinas distintas, en la VPS:
`listen_addresses` en `postgresql.conf`, una línea
`hostssl asignacion_academica app_asignacion,asignacion_admin <ip>/32 scram-sha-256`
en `pg_hba.conf`, y el puerto 5432 abierto **solo** para esa IP. Si van en
la misma VPS, la URL usa `localhost` y no se abre nada.

**Respaldos de la base:** `pg_dump -Fc asignacion_academica > aa-$(date +%F).dump`
(se restaura con `pg_restore -d asignacion_academica aa-….dump`).

## 2. Las variables del servidor web

En el servidor, en la carpeta del proyecto:

```bash
cp .env.example .env.production.local
```

y completar, como mínimo:

| Variable          | Valor                                                          |
| ----------------- | -------------------------------------------------------------- |
| `DATABASE_URL`    | `postgresql://app_asignacion:<clave de la app>@<vps>:5432/asignacion_academica` (añadir `?sslmode=no-verify` si la base está en otra máquina con certificado propio) |
| `SESION_SECRETO`  | `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `AUTH_API_URL`    | el endpoint que entregue sistemas                              |
| `AUTH_API_TOKEN`  | si la API lo exige                                             |

`.env*` está excluido de git: estas claves **no** se suben a GitHub.
Si el hosting tiene panel de variables, se cargan allí en vez del archivo.

### El contrato con la API de credenciales

La aplicación hace:

```http
POST <AUTH_API_URL>
Content-Type: application/json
Authorization: Bearer <AUTH_API_TOKEN>      (si se definió)

{ "usuario": "jperez@cecar.edu.co", "clave": "..." }
```

- Responde **2xx** → clave válida (salvo que el JSON traiga `valido`,
  `success`, `autenticado`, `ok`… en `false`).
- Cualquier otro código, o sin respuesta en 8 s → no entra.

Si la API usa otros nombres de campo o el usuario sin `@cecar.edu.co`, se
ajusta con `AUTH_API_CAMPO_USUARIO`, `AUTH_API_CAMPO_CLAVE` y
`AUTH_API_SIN_DOMINIO=1`. Si el contrato es otra cosa (GET, form, SOAP), se
cambia solo `consultarApi()` en `src/lib/servidor/aldea.ts`.

La API **solo valida la clave**. Para entrar, el correo debe estar además
activo en `public.usuario` (paso 1.3); de ahí sale el rol.

## 3. Compilar y arrancar

El archivo de variables (`.env.production.local`) tiene que existir en la
carpeta del proyecto antes de arrancar: sin `DATABASE_URL` y `SESION_SECRETO`
la aplicación no puede leer ni guardar nada.

```bash
git pull
npm ci
npm run build
npm run start          # o el servicio que ya use el servidor (pm2, IIS, systemd…)
```

## 4. Comprobar

```bash
curl https://planificacionacademica.cecar.edu.co/api/salud
```

Debe responder `200` con:

```json
{ "autenticacion": "api", "base": "ok", "sesion": "ok" }
```

| Si dice                      | Revisar                                                          |
| ---------------------------- | ---------------------------------------------------------------- |
| `"base": "error"`            | `DATABASE_URL`, firewall, `pg_hba.conf`, o que falte el paso 1.2/1.4 (el detalle sale en el log del servidor) |
| `"sesion": "falta-secreto"`  | `SESION_SECRETO` vacío o de menos de 32 caracteres               |

Luego, en el navegador: entrar con un administrador y un coordinador de
`public.usuario`, crear una asignación, cerrar sesión y volver a entrar desde
otro equipo. Si la asignación sigue ahí, está guardando en la base.

## Ensayo sin la API

Mientras sistemas no entregue la API se puede probar todo lo demás con
`AUTH_PROVEEDOR=prueba` (usuarios `admin@cecar.edu.co` / `admin123`).
**Quitarlo antes de abrir el sistema a los usuarios**: esas claves están
publicadas en el repositorio.
