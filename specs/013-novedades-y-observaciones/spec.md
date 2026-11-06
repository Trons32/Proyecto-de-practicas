# SPEC-013 · Novedad u observación según la convocatoria

**Estado:** implementada · **Prioridad:** P1 · **Corrige:** SPEC-003 (el
nombre) y la definición de SPEC-005 B

## Problema

Hoy todo cambio de parámetros se llama "novedad". El cliente distingue dos
cosas según **cuándo** cambia el administrador los parámetros:

| Concepto        | Cuándo                                    | Qué significa                                                   |
| --------------- | ----------------------------------------- | --------------------------------------------------------------- |
| **Observación** | Con la convocatoria **abierta**           | Ajuste mientras los coordinadores todavía cargan. No hay nada entregado que revisar. |
| **Novedad**     | Con la convocatoria **cerrada**           | Cambio sobre algo que ya se entregó o aprobó: puede pedir correcciones. |

El dato ya existía (`novedad.conConvocatoriaCerrada`, que se fija al
registrar), pero solo aparecía como un filtro "Momento" y una insignia. Las
dos clases se mostraban en una sola lista con la misma numeración y el mismo
nombre.

## Solución

- `claseDe(registro)` en `lib/novedades.ts` es la **única definición**:
  convocatoria cerrada → novedad; abierta, o sin convocatoria cerrada →
  observación. Sigue a `periodoDeReferencia`, la convocatoria que se abrió
  más recientemente.
- **Numeración separada**: Novedad N.º 1, 2… y Observación N.º 1, 2…
  (`numeroEnSuClase`). Se deriva del consecutivo general `numero`, que no
  cambia. Como nada se borra, el número que se muestra tampoco cambia.
- **Dos secciones separadas**, cada una con su entrada en el menú y en el
  panel: `/admin/novedades` y `/admin/observaciones` (con su detalle en
  `/[id]`). Se consultan en momentos distintos: durante la convocatoria
  importan las observaciones, y después del cierre las novedades, que son
  las que piden decisiones. Las dos usan los mismos componentes
  (`RegistrosParametros` y `DetalleRegistro`) con la clase como
  parámetro, y tienen los mismos filtros (periodo, estado, parámetro). El
  filtro "Momento" desaparece. Un registro solo se abre desde la sección
  de su clase; `rutaDe()` arma el enlace correcto.
- El detalle se titula con su clase ("Observación N.º 3") y la insignia dice
  si la convocatoria estaba abierta o cerrada.
- En Parámetros, el modal avisa **antes de guardar** cómo quedará registrado
  el cambio ("Se registrará como novedad: la convocatoria 2026-2 está
  cerrada"). El toast de guardado y el origen en la bitácora usan el mismo
  título.

## Reglas

- La clase se decide al registrar y **no cambia**: cerrar la convocatoria
  después no convierte una observación en novedad.
- Las dos clases conservan lo mismo: autor, motivo, antes → después, foto de
  impacto y decisiones de reapertura. Una observación normalmente no afecta
  aprobadas del periodo, pero puede afectar las de periodos anteriores, y
  entonces se decide igual.
- Sin cambio de esquema ni de forma persistida (`novedades` v1).

## Criterios de aceptación

- **CA-013.1** Dada la convocatoria 2026-2 abierta, cuando se guarda un
  cambio de parámetros, entonces el modal anunció "observación" y queda
  registrada en /admin/observaciones como Observación N.º n.
- **CA-013.2** Dada la convocatoria cerrada (por fecha o a mano), cuando se
  guarda un cambio, entonces queda en /admin/novedades como Novedad N.º n.
- **CA-013.3** Dadas las observaciones 1 y 2 y la novedad 1, cuando se cierra
  la convocatoria y se registra otro cambio, entonces es la Novedad N.º 2 y
  las observaciones siguen siendo observaciones.
- **CA-013.4** La bitácora de una asignación reabierta muestra "Origen:
  Novedad N.º n" u "Observación N.º n", según el caso.

## Evidencia

- `src/lib/novedades.ts`: `claseDe`, `numeroEnSuClase` y `tituloDe`.
- `src/lib/verificar-novedades.ts`: clase, numeración y título.
- `src/app/admin/novedades/`, `src/app/admin/observaciones/`, `src/components/RegistrosParametros.tsx`, `src/components/DetalleRegistro.tsx`, `src/app/admin/parametros/page.tsx` y
  `src/components/Bitacora.tsx`.

## Relación con SPEC-005 B

SPEC-005 B proponía llamar "observación" a los señalamientos del
administrador sobre una asignación en revisión. El cliente lo definió de
otra forma, según el momento del cambio de parámetros, y esta spec manda
sobre esa definición. Los señalamientos por asignación siguen siendo la
nota de la devolución. Si se quieren como algo aparte, necesitan otro
nombre.
