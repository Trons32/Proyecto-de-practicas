# SPEC-007 · El servidor hace cumplir el ciclo de vida

**Estado:** implementada · **Prioridad:** P0 · **Depende de:** SPEC-006

## Problema

Con SPEC-006 el servidor guarda lo que el store decidió. El store respeta
el ciclo (`esEditable`, las acciones `enviar`, `aprobar`…), pero vive en el
navegador: una petición manipulada podía guardar una asignación aprobada
con otros docentes, aprobarse a sí misma o borrar la bitácora. Y dos
administradores que actuaban a la vez sobre la misma asignación se pisaban.

## Solución

`lib/transiciones.ts` (puro) compara lo que hay en la base con lo que llega
y exige que toda diferencia se explique con los **eventos nuevos** de la
bitácora, recorridos en orden desde el estado guardado:

| Evento                     | Desde                   | Hacia           | Exige                 |
| -------------------------- | ----------------------- | --------------- | --------------------- |
| `enviada`                  | borrador                | enviada         | versión + 1           |
| `reenviada`                | en_correccion           | enviada         | versión + 1           |
| `revision_abierta`         | enviada                 | en_revision     | rol ADMIN             |
| `aprobada`                 | enviada · en_revision   | aprobada        | rol ADMIN             |
| `devuelta`                 | enviada · en_revision   | en_correccion   | rol ADMIN y plazo     |
| `reabierta_por_parametros` | aprobada                | en_correccion   | rol ADMIN y plazo     |

`escribir.ts` bloquea las filas (`UPDLOCK, HOLDLOCK`), lee lo guardado y
valida **dentro de la misma transacción**. Un cambio ilegal responde 409 y
el cliente pide recargar.

## Reglas

- Una asignación nueva solo nace como borrador, versión 0, con un único
  evento `creada`.
- Lo guardado en la bitácora tiene que seguir ahí, en el mismo orden.
- Los docentes, el programa y el periodo solo cambian si lo guardado era
  editable (`borrador`, `en_correccion`).
- El plazo de corrección solo lo fijan `devuelta` y
  `reabierta_por_parametros`; el reenvío lo borra.
- Solo se elimina un borrador que nunca se entregó (versión 0).
- Varios pasos en un guardado se admiten si son legales en orden: es lo que
  pasa cuando un guardado falló y el siguiente lo reintenta.
- Con SQL, importar un respaldo desde `/admin/datos` queda deshabilitado:
  se carga con `db/respaldo-a-sql.ts`.

## Límite conocido

`rolAutor` lo declara el cliente. Hasta que el servidor tenga sesión
(credenciales de Aldea), la regla "solo el administrador aprueba" detiene
un error, no a alguien que falsifique la petición. Con la sesión, se
compara con el rol del usuario autenticado.

## Criterios de aceptación

- **CA-007.1** Cada acción del store produce un cambio que el servidor
  admite (si no, la aplicación no podría guardar).
- **CA-007.2** El servidor rechaza: nacer en otro estado, tocar docentes
  de una entregada, saltarse un paso, borrar o reordenar la bitácora,
  devolver sin plazo, alargar el plazo sin evento, borrar una entregada.
- **CA-007.3** Un rechazo no deja nada a medias.
- **CA-007.4** Si dos administradores aprueban y devuelven a la vez, gana
  uno y el otro recibe 409; la bitácora registra solo al ganador.

## Evidencia

- CA-007.1 y .2: `src/lib/verificar-transiciones.ts` (29 casos, con las
  acciones reales del store).
- CA-007.2, .3 y .4: `src/lib/servidor/verificar-sql.ts`, contra SQL Server.
