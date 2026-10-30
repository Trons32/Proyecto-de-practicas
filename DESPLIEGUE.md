# Despliegue en producción

Paso a paso para dejar `https://planificacionacademica.cecar.edu.co`
guardando en SQL Server y validando claves con la API de sistemas
(SPEC-010). Hay tres piezas y tres responsables:

```
navegador ──HTTPS──► servidor web (Next.js) ──1433──► SQL Server   (DBA)
                             │
                             └──HTTPS──► API de credenciales      (sistemas)
```

## 1. La base de datos (DBA)

Requiere SQL Server 2016 o posterior. Desde una máquina con `sqlcmd` y el
repositorio clonado:

```bash
# 1.1 Crear la base (intercalación española, como la de desarrollo)
sqlcmd -S <servidor> -U <admin> -C -Q "CREATE DATABASE asignacion_academica COLLATE Modern_Spanish_CI_AS"

# 1.2 Esquema y catálogos. -f 65001 es obligatorio: hay tildes en las claves.
sqlcmd -S <servidor> -U <admin> -C -b -I -f 65001 -d asignacion_academica -i db/esquema.sql
sqlcmd -S <servidor> -U <admin> -C -b -I -f 65001 -d asignacion_academica -i db/semilla.sql

# 1.3 El login con el que se conecta la aplicación (nunca sa)
sqlcmd -S <servidor> -U <admin> -C -b -f 65001 -d asignacion_academica -v CLAVE_APP="<clave fuerte>" -i db/crear-usuario-app.sql

# 1.4 Quién puede entrar y con qué rol
cp db/usuarios.ejemplo.sql db/usuarios.sql     # editar correos, nombres y roles
sqlcmd -S <servidor> -U <admin> -C -b -f 65001 -d asignacion_academica -i db/usuarios.sql
```

`esquema.sql` ya trae todo lo de `db/migraciones/`: en una base nueva no se
ejecutan. En una base que ya existía, sí, en orden.

Si ya hay datos registrados en el navegador, se migran con el respaldo JSON
(ver `db/README.md` → *Migrar lo registrado en la aplicación*).

**Red:** el servidor web tiene que alcanzar el SQL Server por el puerto 1433
(o el de la instancia). Pedir la regla de firewall si están en máquinas distintas.

## 2. Las variables del servidor web

En el servidor, en la carpeta del proyecto:

```bash
cp db/env.produccion.ejemplo .env.production.local
```

y completar, como mínimo:

| Variable          | Valor                                                          |
| ----------------- | -------------------------------------------------------------- |
| `MSSQL_SERVIDOR`  | nombre o IP del SQL Server, visto desde el servidor web        |
| `MSSQL_CLAVE`     | la `CLAVE_APP` del paso 1.3                                    |
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
activo en `aa.usuario` (paso 1.4); de ahí sale el rol.

## 3. Compilar y arrancar

`NEXT_PUBLIC_ALMACEN=sql` se incrusta al compilar: el archivo de variables
tiene que existir **antes** del build.

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
{ "almacen": "sql", "autenticacion": "api", "base": "ok", "sesion": "ok" }
```

| Si dice                      | Revisar                                                          |
| ---------------------------- | ---------------------------------------------------------------- |
| `"almacen": "navegador"`     | falta `ALMACEN=sql`                                              |
| `"base": "error"`            | servidor, puerto, firewall, clave, o que falte el paso 1.2/1.3 (el detalle sale en el log del servidor) |
| `"sesion": "falta-secreto"`  | `SESION_SECRETO` vacío o de menos de 32 caracteres               |

Luego, en el navegador: entrar con un administrador y un coordinador de
`aa.usuario`, crear una asignación, cerrar sesión y volver a entrar desde
otro equipo. Si la asignación sigue ahí, está guardando en la base.

## Ensayo sin la API

Mientras sistemas no entregue la API se puede probar todo lo demás con
`AUTH_PROVEEDOR=prueba` (usuarios `admin@cecar.edu.co` / `admin123`).
**Quitarlo antes de abrir el sistema a los usuarios**: esas claves están
publicadas en el repositorio.
