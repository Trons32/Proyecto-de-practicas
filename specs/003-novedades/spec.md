# SPEC-003 · Página de Novedades

**Estado:** implementada · **Prioridad:** P1

## Problema

El cliente pide trazabilidad de los cambios de parámetros hechos al cerrar la
convocatoria y de las asignaciones que afectaron. Antes:

- los cambios de parámetros no dejaban rastro (ni autor, ni fecha, ni motivo,
  ni valor anterior);
- la página los aplicaba al teclear: 40 → 38 quedaba como 40 → 4 → 38;
- las afectadas se calculaban en vivo y cambiaban con el siguiente ajuste;
- la reapertura quedaba en la bitácora, desconectada del cambio que la motivó.

## Solución

1. Parámetros se editan en un **borrador**; "Revisar y aplicar" muestra el
   antes → después, el impacto previsto y pide un **motivo obligatorio**.
2. Aplicar registra una **novedad**: autor, fecha, periodo, si la
   convocatoria estaba cerrada, motivo, cambios campo por campo.
3. La novedad guarda la **foto del impacto**: las aprobadas que el cambio
   dejó peor que antes (comparando con la configuración anterior, no con la
   oficial), con docentes y motivos.
4. Por cada afectada el administrador **decide**: solicitar corrección
   (reabre con plazo) o no reabrir (con nota opcional). La reapertura deja en
   la bitácora un evento con `novedadId`.
5. `/admin/novedades` lista con filtros (periodo, estado, momento, ámbito);
   `/admin/novedades/[id]` muestra el detalle y las decisiones.

## Reglas

- Las novedades solo se añaden; las decisiones solo se suman.
- Nada se reabre solo.
- Una reapertura registrada no se puede convertir después en "no reabrir";
  un "no reabrir" sí puede seguirse de una reapertura (cambio de criterio).
- Restaurar valores oficiales es un borrador más: se aplica con motivo.
- Se registran también los cambios con la convocatoria abierta; se marcan
  los posteriores al cierre (propuesta por defecto, a confirmar).
- Solo el administrador ve la página (lo impone `GuardiaSesion`).

## Criterios de aceptación

- **CA-003.1** Dada la convocatoria cerrada y TIEMPO_COMPLETO en 40 h,
  cuando se cambia a 38 h y se aplica con motivo, entonces hay una única
  novedad con 40 h → 38 h, autor, fecha, motivo y marca de cierre.
- **CA-003.2** Dada una aprobada con un docente de 39 h, cuando se aplica el
  cambio anterior, entonces la novedad la lista con el docente y el motivo, y
  la foto no cambia con ajustes posteriores.
- **CA-003.3** Dada una novedad con afectadas, cuando se solicita corrección
  a una, entonces se registra la decisión con su plazo y la bitácora de esa
  asignación enlaza a la novedad.
- **CA-003.4** Dados cambios en el borrador, cuando se intenta aplicar sin
  motivo, entonces no se aplican.
- **CA-003.5** Dada una sesión de coordinador, cuando abre
  `/admin/novedades`, entonces no ve contenido y vuelve a su inicio.
- **CA-003.6** Dada una novedad, no existe forma de editarla ni borrarla.

## Evidencia

- `src/lib/novedades.ts` — diferencias, foto de impacto, periodo (puro).
- `src/lib/stores/novedades-store.ts` — única vía para aplicar parámetros.
- `src/lib/verificar-novedades.ts` — CA-003.1 y CA-003.2 a nivel de lógica.
- `src/app/admin/parametros/page.tsx` — borrador y modal de aplicación.
- `src/app/admin/novedades/` — listado y detalle.

## Preguntas abiertas

- ¿Registrar solo lo posterior al cierre? Hoy se registra todo.
- ¿Notificar a los coordinadores afectados?
