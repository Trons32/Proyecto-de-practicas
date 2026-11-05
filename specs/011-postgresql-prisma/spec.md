# SPEC-011 · Migración a PostgreSQL con Prisma

**Estado:** implementada · **Prioridad:** P0 · **Motor:** PostgreSQL 13+ · **Acceso:** Prisma 7

## Problema

El cliente pidió dejar SQL Server: la base va a vivir en una VPS con
PostgreSQL, y la capa de datos debe usar Prisma como ORM. SPEC-002, 006,
007, 009 y 010 se escribieron contra SQL Server (`mssql`, T-SQL, `sqlcmd`).

## Alcance

1. **Migraciones de Prisma** (`prisma/migrations/0001_inicial`): el esquema
   en PostgreSQL con las mismas reglas que tenía en SQL Server —cascada por
   FK compuesta (MATCH SIMPLE), CHECK del ciclo de vida, triggers de "solo
   se añade" y el rol `rol_asignacion_app` con sus REVOKE—. Se aplican con
   `prisma migrate deploy`.
2. **Seed de Prisma** (`prisma/seed.ts`): catálogos leídos de
   `catalogos.ts` y usuarios de `prisma/usuarios.json`. Reemplaza a
   `semilla.sql`, su generador y los SQL de usuarios.
3. **Prisma como cliente**: `lib/servidor/leer.ts`, `escribir.ts` y
   `aldea.ts` usan la API de Prisma con `@prisma/adapter-pg`.
4. **Una sola variable de conexión**, `DATABASE_URL`, en un `.env.example`
   en la raíz con todas las demás. Se eliminan los tres `env.*.ejemplo` de
   `db/`, Docker, `instalar.sql` y la migración SQL Server 001.
5. Se conservan y se pasan a PostgreSQL: `respaldo-a-sql.ts` (para traer los
   datos existentes) y `prueba-esquema.sql`.

Fuera de alcance: la forma del estado, la API `/api/estado` y el ciclo de
vida. Nada visible para el usuario cambia.

## Decisiones

- **Migraciones en SQL escrito a mano.** Prisma no expresa triggers, CHECK
  ni permisos por tabla en `schema.prisma`; un `db push` los perdería. Las
  migraciones sí los llevan, porque son SQL puro. `schema.prisma` es un
  reflejo de la base (`prisma db pull`).
- **El seed no pisa parámetros.** Reglas, límites y roles solo se insertan si
  faltan: después de instalar los cambia el administrador y cada cambio deja
  una novedad.
- **Dueño y usuario de la aplicación separados.** Las migraciones corren con
  el dueño de la base; la aplicación con `app_asignacion`, miembro de
  `rol_asignacion_app`, que no puede editar la bitácora ni las novedades.
- **Bloqueo con `SELECT … FOR UPDATE`** dentro de la transacción interactiva
  de Prisma. Dos ids nuevos iguales no tienen fila que bloquear: ahí decide
  la clave primaria.
- **`secuencia` reemplaza a `%%physloc%%`** para el orden de inserción.
- **Sin intercalación insensible a mayúsculas.** La aplicación ya compara con
  los valores exactos del catálogo y guarda el correo en minúsculas.
- **Los datos de SQL Server se migran por el respaldo JSON**, el mismo camino
  ya probado para los datos del navegador.
- **Rechazos de la base → 422.** `esRechazoDeLaBase()` reconoce los códigos
  P20xx de Prisma y los SQLSTATE 22/23 de PostgreSQL (un CHECK llega así).

## Criterios de aceptación

Evidencia: PostgreSQL 17 (PGlite) por socket, base vacía.

- **CA-011.1** Dada una base vacía, `prisma migrate deploy` + `prisma db seed`
  dejan 25 programas, 36 combinaciones y 56 roles; el seed se puede repetir
  sin error y carga los usuarios de `usuarios.json`. *Evidencia:* ✓.
- **CA-011.2** `db/prueba-esquema.sql` pasa sus 18 casos. *Evidencia:* ✓.
- **CA-011.3** `verificar-sql.ts` pasa sus 23 comprobaciones: ida y vuelta de
  45 docentes, ciclo en el servidor, novedades, línea base, dos clientes,
  rechazo atómico, CHECK reconocido como 422, triggers bajo Prisma y la
  carrera aprobar/devolver. *Evidencia:* ✓.
- **CA-011.4** `app_asignacion` lee y escribe, pero no puede editar la
  bitácora, borrar novedades ni crear tablas. *Evidencia:* ✓.
- **CA-011.5** `schema.prisma` coincide con `prisma db pull` sobre la base
  migrada. *Evidencia:* solo difieren líneas en blanco.
- **CA-011.6** Un respaldo JSON convertido con `respaldo-a-sql.ts` carga sin
  errores sobre el mismo esquema. *Evidencia:* 3 asignaciones, 47 docentes,
  8 eventos y 2 novedades.
- **CA-011.7** `tsc`, `lint`, `build` y las verificaciones de cálculo,
  novedades, respaldo, reportes, transiciones y sesión siguen pasando.

## Pendiente

- Probar contra la VPS real (versión de PostgreSQL, TLS y `pg_hba.conf`).
