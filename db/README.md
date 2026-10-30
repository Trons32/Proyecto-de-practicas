# Base de datos · SQL Server

La base de la aplicación cuando corre con `ALMACEN=sql` (SPEC-006). Para
ponerla en producción, ver [`DESPLIEGUE.md`](../DESPLIEGUE.md).

Requiere SQL Server 2016 o posterior. Probado en SQL Server 2022.

| Archivo               | Qué es                                                          |
| --------------------- | --------------------------------------------------------------- |
| `esquema.sql`         | tablas, restricciones y triggers (esquema `aa`)                 |
| `generar-semilla.ts`  | genera `semilla.sql` desde `src/lib/catalogos.ts`               |
| `semilla.sql`         | catálogos, cascada, reglas y roles del formato — **generado**   |
| `respaldo-a-sql.ts`   | convierte un respaldo JSON en un script de migración            |
| `prueba-esquema.sql`  | comprueba que la base hace cumplir las reglas                   |
| `crear-usuario-app.sql` | el login de mínimo privilegio para la aplicación (SPEC-010)   |
| `usuarios.ejemplo.sql`  | quién entra y con qué rol; se copia a `usuarios.sql`          |
| `env.produccion.ejemplo` | variables del servidor de producción                         |

## Base local con Docker

Para desarrollar no hace falta instalar SQL Server: el compose levanta el
mismo motor que usa la universidad y carga esquema y semilla solo la primera
vez.

```bash
cp db/env.db.ejemplo .env.db        # y poner una clave propia
docker compose -f db/docker-compose.yml --env-file .env.db up -d
```

Queda en `localhost,1433`, base `asignacion_academica`, usuario `sa`. Los
datos viven en el volumen `aa-datos`: `down` los conserva, `down -v` los
borra y el siguiente `up` recrea la base desde cero.

### Conectar la aplicación (SPEC-006)

```bash
cp db/env.local.ejemplo .env.local   # y poner la clave de .env.db en MSSQL_CLAVE
npm run dev
```

Con `NEXT_PUBLIC_ALMACEN=sql` los stores leen y escriben por
`/api/estado`; sin ella todo sigue en localStorage. La API exige la cookie
de sesión que deja `/api/sesion` (SPEC-008), firmada con `SESION_SECRETO`.
En desarrollo se entra con los usuarios de prueba; en producción, con la
API de credenciales y `aa.usuario` (SPEC-010).

Para verificarla, en una base desechable:

```bash
docker compose -f db/docker-compose.yml --env-file .env.db run --rm -e MSSQL_BASE=asignacion_academica_prueba inicializar
MSSQL_BASE=asignacion_academica_prueba MSSQL_CLAVE=<clave> npx tsx src/lib/servidor/verificar-sql.ts
```

## Bases que ya existen: `db/migraciones/`

`esquema.sql` crea una base nueva. Una base ya creada se pone al día con las
migraciones, en orden; cada una es idempotente:

```bash
sqlcmd -S <servidor> -E -C -b -I -f 65001 -d <base> -i db/migraciones/001-linea-base.sql
```

## Históricos del consolidado

`src/lib/historicos.ts` trae las cifras de 2022-1 a 2025-2 de la hoja
COMPARATIVO ESTADÍSTICO. Se generan, no se editan:

```bash
npx tsx db/generar-historicos.ts "../CONSOLIDADO ASIGNACIÓN ACADÉMICA 2025-para revisión.xlsx"
```

## Crear la base

```bash
sqlcmd -S <servidor> -E -C -b -f 65001 -d <base> -i db/esquema.sql
sqlcmd -S <servidor> -E -C -b -f 65001 -d <base> -i db/semilla.sql
sqlcmd -S <servidor> -E -C -b -f 65001 -d <base> -i db/prueba-esquema.sql   # opcional, en una base desechable
```

`-f 65001` es obligatorio: los catálogos llevan tildes (`TÉRMINO_FIJO`,
`CATEGORÍA ÚNICA`) y sin UTF-8 las claves no coinciden.

Si cambia `catalogos.ts`, se regenera la semilla:

```bash
npx tsx db/generar-semilla.ts
```

## Migrar lo registrado en la aplicación

1. En la aplicación, como administrador: **Respaldo → Descargar respaldo**.
2. Generar el script:
   ```bash
   npx tsx db/respaldo-a-sql.ts asignacion-academica-2026-09-30.json db/migracion.sql
   ```
   Si el respaldo trae algo que la base rechazaría (un programa fuera del
   catálogo, una combinación contrato-dedicación-categoría inválida, un rol
   eliminado que sigue en uso), se detiene y dice qué corregir en la
   aplicación.
3. Ejecutarlo sobre la base recién creada:
   ```bash
   sqlcmd -S <servidor> -E -C -b -f 65001 -d <base> -i db/migracion.sql
   ```
   Va en una transacción: si algo falla, no queda nada a medias.

**El script y el respaldo llevan documentos y nombres reales de docentes.**
Están excluidos de git (`.gitignore`); no los suba ni los comparta.

## Decisiones del esquema

- **Los borradores caben.** Casi todo en `docente_asignado`, `curso_asignado`
  y `actividad` admite NULL: la base impone la coherencia de lo que está
  lleno, y la completitud la exige el motor de la aplicación antes de
  enviar.
- **La cascada de SPEC-001 es una FK** compuesta hacia
  `contrato_dedicacion_categoria`. SQL Server no la evalúa si alguna columna
  es NULL, que es justo lo que necesita un borrador.
- **Bitácora y novedades solo admiten INSERT**, por trigger y por permisos.
  La bitácora sí se borra en cascada con su asignación.
- **Los roles no se borran**: se marcan `vigente = 0`, porque las
  asignaciones cerradas los siguen referenciando.
- **El motor de cálculo no está aquí.** Sigue en `src/lib/calculo.ts`,
  verificado contra el formato oficial.

## Pendiente con el cliente

- ¿Una sola asignación por programa y periodo? Si es así, activar
  `uq_asignacion_programa_periodo` (comentada en `esquema.sql`).
