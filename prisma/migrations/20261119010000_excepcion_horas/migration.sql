/*
  SPEC-024 · Las horas tienen que cuadrar, salvo excepción del administrador.

  Un docente cuyo total semanal no cuadra con su dedicación solo se guarda
  si el administrador lo autoriza con un motivo. La excepción vale para el
  total con que se autorizó (excepcion_horas): si las horas cambian, deja
  de aplicar. Las cuatro columnas van juntas o ninguna.
*/
ALTER TABLE public.docente_asignado
  ADD COLUMN excepcion_motivo TEXT         NULL,
  ADD COLUMN excepcion_autor  VARCHAR(150) NULL,
  ADD COLUMN excepcion_fecha  TIMESTAMPTZ  NULL,
  ADD COLUMN excepcion_horas  DECIMAL(5,1) NULL,
  ADD CONSTRAINT ck_da_excepcion_completa CHECK (
    (excepcion_motivo IS NULL AND excepcion_autor IS NULL AND excepcion_fecha IS NULL AND excepcion_horas IS NULL)
    OR (btrim(excepcion_motivo) <> '' AND excepcion_autor IS NOT NULL AND excepcion_fecha IS NOT NULL AND excepcion_horas IS NOT NULL));
