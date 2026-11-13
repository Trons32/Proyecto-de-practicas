# SPEC-022 · El cierre bloquea, y un cambio de parámetros reabre con plazo

**Estado:** implementada · **Prioridad:** P0 · **Depende de:** SPEC-007, SPEC-012, SPEC-013

## Problema

1. **Cerrar la convocatoria no bloqueaba.** Solo se deshabilitaba el botón
   Enviar: el borrador del coordinador que no alcanzó a entregar seguía
   editable, y lo mismo una corrección con el plazo vencido. Además el
   bloqueo del envío vivía solo en la pantalla: una pestaña abierta desde
   antes del cierre podía entregar fuera de plazo y el servidor lo aceptaba.
2. **La ficha del docente** era editable para el coordinador aunque la
   asignación ya estuviera entregada: el store descartaba el cambio en
   silencio y la pantalla decía «Cambios guardados».
3. **Un cambio de parámetros con la convocatoria cerrada** solo podía
   reabrir asignaciones **aprobadas** y que **dejaran de cumplir** una
   validación. El administrador no podía pedir corrección a lo enviado, a
   lo que está en revisión, ni a una coordinación cuyo cálculo siguiera
   cuadrando.
4. **El coordinador no sabía qué cambió**: la bitácora decía «origen:
   novedad N.º 4», sin el detalle.

## Solución

### El reloj (`lib/plazos.ts`, puro)

- `bloqueoPorPlazo(asignación, convocatoria)`: un **borrador** se bloquea
  cuando la convocatoria de su periodo cierra (por fecha o a mano); una
  **corrección** cuando vence su plazo. Devuelve el motivo, para mostrarlo.
- `editableAhora` = `esEditable(estado)` y sin bloqueo. La usan el store
  (agregar, editar, quitar docentes y enviar), la vista de la asignación y
  la ficha del docente.
- **El servidor aplica la misma regla** (`revisarGuardado`, con la
  convocatoria leída de la base y la hora del servidor): fuera de plazo,
  el coordinador ni edita ni entrega (409). Las decisiones del
  administrador siguen: aprobar, devolver y reabrir.
- Para dar más tiempo: ampliar la convocatoria, o reabrir con un plazo.

### Reabrir por parámetros

- `reabierta_por_parametros` ahora sale de **borrador, enviada,
  en_revision o aprobada** (`REABRIBLES`), nunca de una importada. Un
  borrador solo se ofrece si el cierre lo bloqueó (`reabrible`).
- En `/admin/parametros`, el panel sugiere las que **dejan de cumplir**
  las reglas (ahora también las enviadas y en revisión) y, con la
  convocatoria cerrada, deja **elegir cualquier otra** del periodo, con su
  estado a la vista. Motivo y plazo comunes; al confirmar, quedan en
  `en_correccion` con ese plazo.
- Cada reapertura apunta a su novedad: la que la marcó como afectada, o la
  más reciente. La decisión se registra en la novedad solo para sus
  afectadas (la base lo exige con `fk_nd_afectacion`); para las demás, la
  constancia es el evento de la bitácora.
- Las novedades guardan como afectadas también las enviadas y en revisión
  que el cambio deja incumpliendo (`fotoDeImpacto`).

### Lo que ve el coordinador

- En su asignación reabierta, `CambiosParametros`: el motivo del
  administrador, el plazo y cada parámetro **antes → después**.
- Fuera de plazo, un aviso «Fuera de plazo» con el motivo, en la asignación
  y en la ficha del docente (que queda en solo lectura).

## Criterios de aceptación

- **CA-022.1** Con la convocatoria cerrada, el coordinador no puede editar
  ni enviar un borrador: ni desde la pantalla ni llamando a la API.
- **CA-022.2** Vencido el plazo de corrección, igual con la corrección.
- **CA-022.3** Con la convocatoria cerrada, el administrador sigue abriendo
  revisión, aprobando y devolviendo.
- **CA-022.4** El administrador puede reabrir por parámetros una enviada,
  una en revisión, una aprobada o un borrador bloqueado, aunque cumplan
  las reglas; queda en corrección con el plazo indicado.
- **CA-022.5** Un borrador con la convocatoria abierta no se ofrece para
  reabrir: su coordinador puede corregirlo.
- **CA-022.6** El coordinador de una asignación reabierta ve el motivo, el
  plazo y los cambios antes → después.
- **CA-022.7** Una ficha de docente de una asignación entregada o fuera de
  plazo se ve en solo lectura, con el motivo.

## Evidencia

- CA-022.1 a .5: `src/lib/verificar-transiciones.ts` (sección «El reloj»).
- CA-022.6 y .7: manual, con los dos roles.
