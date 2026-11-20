/*
  SPEC-028 · Variaciones sistematizadas.

  - tipo 'cambio': un docente que sigue pero cambia de dedicación o de rol
    («asume coordinación», «pasa a docente TC»), como en la hoja VARIACIONES.
  - motivo: código de un catálogo (lib/variaciones.ts), para poder contar
    las variaciones por motivo. La nota queda como observación libre.
  - detalle: qué cambió, deducido por el sistema.
*/
ALTER TABLE public.variacion_docente DROP CONSTRAINT ck_variacion_tipo;
ALTER TABLE public.variacion_docente ADD CONSTRAINT ck_variacion_tipo CHECK (tipo IN ('saliente', 'nuevo', 'cambio'));

ALTER TABLE public.variacion_docente
  ADD COLUMN motivo  VARCHAR(30) NULL,
  ADD COLUMN detalle TEXT        NULL;
