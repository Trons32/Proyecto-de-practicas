/*
  SPEC-027 · Docentes que salen y que llegan.

  Las tablas DOCENTES SALIENTES y DOCENTES NUEVOS del formato, por
  asignación. Se reescriben enteras con la asignación, como sus docentes.
  Los nombres y la dedicación se guardan como texto: son la foto de lo que
  el coordinador declaró, y un saliente ya no está en la asignación.
*/
CREATE TABLE public.variacion_docente (
  id            UUID         NOT NULL CONSTRAINT pk_variacion_docente PRIMARY KEY,
  asignacion_id UUID         NOT NULL CONSTRAINT fk_variacion_asignacion REFERENCES public.asignacion (id) ON DELETE CASCADE,
  orden         SMALLINT     NOT NULL,
  tipo          VARCHAR(10)  NOT NULL CONSTRAINT ck_variacion_tipo CHECK (tipo IN ('saliente', 'nuevo')),
  documento     VARCHAR(15)  NULL,
  nombres       VARCHAR(150) NOT NULL,
  dedicacion    VARCHAR(40)  NULL,
  nota          TEXT         NULL,
  reemplaza_a   VARCHAR(150) NULL CONSTRAINT ck_variacion_reemplaza CHECK (reemplaza_a IS NULL OR tipo = 'nuevo'),
  manual        BOOLEAN      NOT NULL DEFAULT false
);

CREATE INDEX ix_variacion_asignacion ON public.variacion_docente (asignacion_id, orden);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rol_asignacion_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.variacion_docente TO rol_asignacion_app;
  END IF;
END;
$$;
