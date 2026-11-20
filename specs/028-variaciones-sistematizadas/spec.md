# SPEC-028 · Variaciones sistematizadas

**Estado:** implementada · **Prioridad:** P1 · **Depende de:** SPEC-027

## Problema

La hoja VARIACIONES del consolidado se escribía a mano, con texto libre:
las mismas causas con otra redacción, imposible de contar. Además mezcla
tres casos y SPEC-027 solo cubría dos: también registra a los que siguen
pero cambian («asume coordinación», «pasa a docente TC»).

## Decisión

- **Tres tipos**: sale, llega y **cambia**. Un cambio es un docente que
  sigue con otra dedicación o con roles (descargas o administrativos) que
  asume o deja. Las horas de cursos no cuentan: cambian cada semestre.
  El sistema escribe el detalle («Hora cátedra → Tiempo completo · Asume:
  …») y propone el motivo.
- **Motivos de un catálogo** (`MOTIVOS`, `lib/variaciones.ts`), sacados de
  las descripciones de la hoja 2025, más «otro motivo», que exige decir
  cuál. La nota queda como observación libre. Lo guardado antes como
  texto libre cuenta como «otro» con esa observación.
- **Para enviar**: todo saliente y todo cambio con motivo.
- **Reporte** `/admin/reportes/variaciones`: todos los programas del
  periodo, filtros por facultad, tipo y motivo, conteo por motivo y Excel
  con las columnas de la hoja. Las importadas no entran.
