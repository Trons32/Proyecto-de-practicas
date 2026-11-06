# Base de datos · PostgreSQL + Prisma

La base de la aplicación cuando corre con `ALMACEN=sql` (SPEC-006, SPEC-011).
Para ponerla en producción (la VPS), ver [`DESPLIEGUE.md`](../DESPLIEGUE.md).

Requiere PostgreSQL 13 o posterior. La conexión es una sola variable,
`DATABASE_URL`, en `.env` (copiar de `.env.example`).

## Dónde está cada cosa

| Archivo                                   | Qué es                                                     |
| ----------------------------------------- | ---------------------------------------------------------- |
| `prisma/migrations/`                      | las tablas, triggers, CHECK y permisos — SQL escrito a mano |
| `prisma/seed.ts`                          | catálogos del formato (desde `catalogos.ts`) y usuarios     |
| `prisma/usuarios.ejemplo.json`            | quién entra y con qué rol; se copia a `usuarios.json`       |
| `prisma/schema.prisma`                    | el modelo de Prisma — reflejo de la base con `prisma db pull` |
| `db/respaldo-a-sql.ts`                    | convierte un respaldo JSON en un script de migración        |
| `db/prueba-esquema.sql`                   | comprueba que la base hace cumplir las reglas               |
| `db/generar-historicos.ts`                | regenera `src/lib/historicos.ts` desde el consolidado       |

## Crear o actualizar la base

```bash
npx prisma migrate deploy   # crea las tablas o aplica las migraciones nuevas
npx prisma db seed          # catálogos y usuarios; se puede repetir
```

El seed solo agrega lo que falta: no pisa reglas, límites ni roles, que
después de instalar los cambia el administrador en `/admin/parametros` (y
cada cambio queda en una novedad). Los usuarios de `prisma/usuarios.json` sí
se actualizan.

Si cambia `catalogos.ts` con algo nuevo (un programa, un rol), basta volver
a correr el seed.

## Cambiar el esquema

Las migraciones llevan lo que Prisma no expresa —triggers de "solo se
añade", CHECK, el rol de la aplicación—, así que:

1. `npx prisma migrate dev --create-only --name <cambio>` y completar el SQL a mano.
2. `npx prisma migrate dev` para aplicarla.
3. `npx prisma db pull` para que `schema.prisma` lo refleje, y `npx prisma generate`.

**Nunca `prisma db push`**: crearía las tablas sin esas reglas.

## Verificar contra una base desechable

El nombre de la base tiene que terminar en `_prueba`:

```bash
export DATABASE_URL=postgresql://postgres:<clave>@localhost:5432/asignacion_academica_prueba
npx prisma migrate deploy && npx prisma db seed
npx tsx src/lib/servidor/verificar-sql.ts
psql "$DATABASE_URL" -f db/prueba-esquema.sql
```

## Migrar lo registrado (navegador o la antigua base SQL Server)

1. En la aplicación, como administrador: **Respaldo → Descargar respaldo**.
2. `npx tsx db/respaldo-a-sql.ts asignacion-academica-2026-09-30.json db/migracion.sql`
   — si algo no cabría en la base (programa fuera del catálogo, combinación
   inválida, rol eliminado en uso), se detiene y dice qué corregir.
3. Sobre la base recién creada (migrate deploy + seed):
   `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migracion.sql`
   — va en una transacción: si algo falla, no queda nada a medias.

**El script y el respaldo llevan documentos y nombres reales de docentes.**
Están excluidos de git; no los suba ni los comparta.

## Decisiones del esquema

- **Los borradores caben.** Casi todo en `docente_asignado`, `curso_asignado`
  y `actividad` admite NULL: la base impone la coherencia de lo que está
  lleno, y la completitud la exige el motor antes de enviar.
- **La cascada de SPEC-001 es una FK** compuesta hacia
  `contrato_dedicacion_categoria`. Con `MATCH SIMPLE` no se evalúa si alguna
  columna es NULL, que es justo lo que necesita un borrador.
- **Bitácora y novedades solo admiten INSERT**, por trigger y por permisos.
  La bitácora sí se borra en cascada con su asignación.
- **El orden de inserción lo da `secuencia`** en la bitácora y en la foto de impacto.
- **Las comparaciones distinguen mayúsculas**: la aplicación usa los valores
  exactos del catálogo y guarda el correo en minúsculas.
- **Los roles no se borran**: se marcan `vigente = FALSE`.
- **El motor de cálculo no está aquí.** Sigue en `src/lib/calculo.ts`.

## Pendiente con el cliente

- ¿Una sola asignación por programa y periodo? Si es así, una migración con
  `UNIQUE (programa_id, periodo)` en `public.asignacion`.
