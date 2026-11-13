# Especificaciones

El sistema se construye con **Spec-Driven Development**: ninguna funcionalidad
se programa sin una especificación con criterios de aceptación verificables.
Si al implementar se descubre que la spec estaba mal, se corrige primero la
spec y después el código.

Cada carpeta es una especificación:

```
NNN-nombre/spec.md    problema, reglas, criterios de aceptación (Dado / Cuando / Entonces)
```

| ID  | Especificación                           | Prioridad | Estado                          |
| --- | ---------------------------------------- | --------- | ------------------------------- |
| 001 | Categoría según contrato y dedicación    | P0        | Implementada                    |
| 002 | Capa de datos preparada para SQL         | P1        | Implementada (PostgreSQL desde 011) |
| 003 | Página de Novedades                      | P1        | Implementada                    |
| 004 | Reportes                                 | P2        | Borrador, a validar con cliente |
| 005 | Observaciones, novedades y reportes       | P1        | Parcial: A, C y D implementadas; B en borrador |
| 006 | Conexión a la base (SQL Server → PostgreSQL en 011) | P1        | Implementada (desarrollo, sin autenticación) |
| 007 | El servidor hace cumplir el ciclo de vida | P0        | Implementada                    |
| 008 | Sesión en el servidor                    | P0        | Implementada (usuarios de prueba; falta Aldea) |
| 009 | Gráficas, comparativo y proyección       | P1        | Implementada; preguntas abiertas al cliente |
| 010 | Despliegue y credenciales por API       | P0        | Implementada; falta el contrato real de la API |
| 011 | Migración a PostgreSQL con Prisma       | P0        | Implementada; falta probar en la VPS |
| 012 | Parámetros: cada cambio se guarda por separado | P1 | Implementada; falta prueba manual en la base |
| 013 | Novedad u observación según la convocatoria | P1 | Implementada |
| 018 | Sesión con NextAuth y credenciales de Aldea | P0 | Fase 1 implementada (piloto, claves locales); fase 2 espera la API de Aldea |
| 019 | Cargar muchos cursos sin fatiga | P1 | Implementada |
| 020 | Descargas, actividades y apoyo: sin exceso y más ágiles | P0 | Implementada |

## Definición de terminado

- Cada criterio de aceptación tiene evidencia: prueba automática o prueba
  manual documentada.
- `npx tsc --noEmit` sin errores y `npm run lint` limpio.
- `npx tsx src/lib/verificar.ts` pasa si se tocó cálculo, catálogos o tipos.
- `npx tsx src/lib/verificar-novedades.ts` pasa si se tocó `lib/novedades.ts`.
- `npx tsx src/lib/verificar-respaldo.ts` pasa si se tocó `lib/datos/` o la forma de los tipos.
- `npx tsx src/lib/verificar-reportes.ts` pasa si se tocó `lib/reportes.ts`, `lib/exportar-*.ts` o el cálculo.
- `db/prueba-esquema.sql` pasa si se tocó `prisma/migrations/` (y `prisma db pull` dejó `schema.prisma` al día).
- `npx tsx src/lib/verificar-transiciones.ts` pasa si se tocó `lib/transiciones.ts`, el store de asignaciones o el ciclo de vida.
- `npx tsx src/lib/servidor/verificar-sesion.ts` pasa si se tocó la sesión o `lib/auth/`.
- `src/lib/servidor/verificar-sql.ts` pasa si se tocó `lib/servidor/`, `prisma/` o la forma de los tipos.
- Probado con los dos roles.
- Si cambia la forma del estado persistido: se subió `version` y se escribió
  el `migrate` del store.
