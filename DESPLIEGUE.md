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
| `SESION_SECRETO`  | `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` (también vale con el nombre `AUTH_SECRET`) |
| `AUTH_URL`        | `https://planificacionacademica.cecar.edu.co` (sin barra final; también vale `NEXTAUTH_URL`). Sin ella, detrás del proxy, `/api/estado` responde 500 |
| `AUTH_PROVEEDOR`  | `local` en el piloto; `api` cuando se conecte Aldea (ver "Del piloto a Aldea") |
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
| `"sesion": "falta-secreto"`  | `SESION_SECRETO` (o `AUTH_SECRET`) vacío o de menos de 32 caracteres |

Luego, en el navegador: entrar con un administrador y un coordinador de
`public.usuario`, crear una asignación, cerrar sesión y volver a entrar desde
otro equipo. Si la asignación sigue ahí, está guardando en la base.

## Directorio de docentes (SPEC-021)

**Orden:** la migración `20261113000000_directorio_docentes` va **antes**
de desplegar el código que la usa (al entregar una asignación se escribe
`docente.origen`):

```bash
DATABASE_URL="postgresql://<dueño>:<clave>@<vps>:5432/asignacion_academica" npx prisma migrate deploy
```

Luego el listado se carga desde `/admin/datos/docentes` (administrador), o
desde la consola con `db/cargar-listado-docentes.ts` (primero sin
`--aplicar`, para ver la vista previa).

## Del piloto a Aldea (SPEC-018)

La sesión la maneja NextAuth y dura 8 horas **sin actividad**: mientras el
coordinador trabaje no se cierra. Al desplegar esta versión por primera vez,
todos tienen que volver a iniciar sesión una vez (cambió la cookie): hacerlo
fuera del horario de trabajo o avisar antes.

- **Piloto:** `AUTH_PROVEEDOR=local`. El administrador crea cada cuenta en
  `/admin/usuarios`; el sistema le muestra la clave temporal para entregarla (copiar, WhatsApp
  o correo) y el coordinador la cambia en el
  primer ingreso.
- **Con Aldea:** completar `AUTH_API_*`, poner `AUTH_PROVEEDOR=api` y
  reiniciar. Los usuarios del piloto siguen siendo los mismos y entran con
  su clave de Aldea; las cuentas nuevas se crean sin clave. Comprobar con
  `npx tsx src/lib/servidor/verificar-sesion.ts` y entrando con un
  coordinador real.
- **Volver atrás:** `AUTH_PROVEEDOR=local` y reiniciar. Las claves locales
  del piloto vuelven a funcionar.

`npm ci` instala `next-auth` con un `override` de `nodemailer` en
`package.json`: NextAuth lo declara opcional para un proveedor que no se usa.
No hace falta `--legacy-peer-deps`.

## Ensayo sin la API

Mientras sistemas no entregue la API se puede probar todo lo demás con
`AUTH_PROVEEDOR=prueba` (usuarios `admin@cecar.edu.co` / `admin123`).
**Quitarlo antes de abrir el sistema a los usuarios**: esas claves están
publicadas en el repositorio.
