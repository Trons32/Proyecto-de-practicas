# SPEC-029 · Apertura y cierre con hora, y la cuenta regresiva del coordinador

**Estado:** implementada · **Prioridad:** P1 · **Depende de:** SPEC-022

## Problema

La convocatoria solo pedía la fecha de cierre (vencía a las 23:59 de ese
día) y abría en el momento de crearla. El coordinador no veía en el inicio
cuándo cerraba ni cuánto le quedaba.

## Decisión

- **Día y hora de apertura y de cierre.** El administrador las fija en
  `/admin/asignaciones`; el cierre propone 11:59 p. m. Una apertura futura
  deja la convocatoria «programada» (`sin_abrir`) hasta esa hora. La base
  ya guardaba los dos instantes: no hay migración.
- **Lo ya abierto no cambia**: su cierre es el fin del día (23:59:59,999),
  el mismo instante que `instanteLocal(fecha, "23:59")`.
- **Inicio del coordinador** (`components/RelojConvocatoria.tsx`): cuándo
  cierra (día de la semana, fecha y hora), cuántos días faltan
  («Faltan 3 días») y, el mismo día, «Se cierra hoy a las 11:59 p. m.»
  (`faltaLegible`), y barra del plazo transcurrido. Sin cuenta regresiva:
  se planea por días. Si la
  asignación está en corrección, rige su plazo propio.
- **Alerta según urgencia** (`urgenciaDe`): verde con más de 3 días, ámbar
  a 3 días, roja a menos de 24 h, con franja «¡Mañana se cierra la entrega!» o
  «¡Hoy se cierra la entrega a las 11:59 p. m.!». Cerrada o sin abrir, un aviso que lo explica.
