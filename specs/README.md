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
| 002 | Capa de datos preparada para SQL         | P1        | Implementada (SQL Server)       |
| 003 | Página de Novedades                      | P1        | Implementada                    |
| 004 | Reportes                                 | P2        | Borrador, a validar con cliente |
| 005 | Observaciones, novedades y reportes       | P1        | Parcial: A, C y D implementadas; B en borrador |
| 006 | Conexión a SQL Server                    | P1        | Implementada (desarrollo, sin autenticación) |
| 007 | El servidor hace cumplir el ciclo de vida | P0        | Implementada                    |
| 008 | Sesión en el servidor                    | P0        | Implementada (usuarios de prueba; falta Aldea) |
| 009 | Gráficas, comparativo y proyección       | P1        | Implementada; preguntas abiertas al cliente |
| 010 | Despliegue y credenciales por API       | P0        | Implementada; falta el contrato real de la API |

## Definición de terminado

- Cada criterio de aceptación tiene evidencia: prueba automática o prueba
  manual documentada.
- `npx tsc --noEmit` sin errores y `npm run lint` limpio.
- `npx tsx src/lib/verificar.ts` pasa si se tocó cálculo, catálogos o tipos.
- `npx tsx src/lib/verificar-novedades.ts` pasa si se tocó `lib/novedades.ts`.
- `npx tsx src/lib/verificar-respaldo.ts` pasa si se tocó `lib/datos/` o la forma de los tipos.
- `npx tsx src/lib/verificar-reportes.ts` pasa si se tocó `lib/reportes.ts`, `lib/exportar-*.ts` o el cálculo.
- `db/prueba-esquema.sql` pasa si se tocó `db/esquema.sql`.
- `npx tsx src/lib/verificar-transiciones.ts` pasa si se tocó `lib/transiciones.ts`, el store de asignaciones o el ciclo de vida.
- `npx tsx src/lib/servidor/verificar-sesion.ts` pasa si se tocó la sesión o `lib/auth/`.
- `src/lib/servidor/verificar-sql.ts` pasa si se tocó `lib/servidor/`, `db/esquema.sql` o la forma de los tipos.
- Probado con los dos roles.
- Si cambia la forma del estado persistido: se subió `version` y se escribió
  el `migrate` del store.
