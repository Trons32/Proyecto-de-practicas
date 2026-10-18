# Base de datos · SQL Server

Esquema de referencia para cuando exista la API (SPEC-002). La aplicación
**todavía no se conecta** a esta base: hoy persiste en el navegador, y el
paso a SQL se hace con el respaldo JSON.

Requiere SQL Server 2016 o posterior. Probado en SQL Server 2022.

| Archivo               | Qué es                                                          |
| --------------------- | --------------------------------------------------------------- |
| `esquema.sql`         | tablas, restricciones y triggers (esquema `aa`)                 |
| `generar-semilla.ts`  | genera `semilla.sql` desde `src/lib/catalogos.ts`               |
| `semilla.sql`         | catálogos, cascada, reglas y roles del formato — **generado**   |
| `respaldo-a-sql.ts`   | convierte un respaldo JSON en un script de migración            |
| `prueba-esquema.sql`  | comprueba que la base hace cumplir las reglas                   |

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
