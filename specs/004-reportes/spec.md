# SPEC-004 · Reportes

**Estado:** borrador, a validar con el cliente · **Prioridad:** P2

No se implementa hasta que el cliente confirme la lista.

## Propuesta

| ID | Reporte                        | Contenido                                                            | Rol   | Salida          |
| -- | ------------------------------ | -------------------------------------------------------------------- | ----- | --------------- |
| R1 | Asignación en formato oficial  | una asignación con la estructura del Excel                           | Ambos | Excel           |
| R2 | Consolidado programa/facultad  | docentes por contrato y dedicación; horas por tipo de actividad      | Admin | Pantalla, Excel |
| R3 | Estado de la convocatoria      | asignaciones por estado y programa; faltantes; plazos por vencer     | Admin | Pantalla        |
| R4 | Cumplimiento de carga          | docentes que no cuadran con su dedicación y por qué                  | Ambos | Pantalla, Excel |
| R5 | Novedades y afectación         | cambios del periodo y asignaciones afectadas o reabiertas (SPEC-003) | Admin | Pantalla, PDF   |
| R6 | Histórico por docente          | carga de un docente en varios periodos (depende de SPEC-002)         | Admin | Pantalla        |

## Reglas

- Cálculo en funciones puras (`lib/reportes.ts`), trasladables a vistas SQL.
- Lo aprobado se reporta tal como se aprobó, sin recalcular.
- La librería de Excel se carga bajo demanda, como `sileo`.
- El coordinador solo ve su programa.

## Criterio de referencia

- **CA-004.1** Dada la asignación de Ingeniería de Sistemas 2026-2 con los 45
  docentes del formato, cuando se exporta R1, entonces los totales coinciden
  con el Excel, con la corrección documentada de los roles 49–56.
