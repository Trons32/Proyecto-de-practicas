/*
  SPEC-025 · Criterios de asignación editables, con borrador y publicación.

  Una fila por versión. Un periodo tiene a lo sumo un borrador (numero 0)
  y varias publicadas (numero 1, 2…). El contenido es el documento entero
  en JSONB: sus secciones, con tablas y listas, no se consultan por partes.

  Lo publicado es el expediente de lo que se comunicó: el trigger impide
  editarlo o borrarlo. Publicar es convertir el borrador en publicada (la
  fila vieja es borrador, así que pasa).
*/
CREATE TABLE public.criterios_version (
  id              UUID         NOT NULL CONSTRAINT pk_criterios_version PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo         CHAR(6)      NOT NULL CONSTRAINT ck_cv_periodo CHECK (periodo ~ '^[12][0-9]{3}-[12]$'),
  numero          INT          NOT NULL CONSTRAINT ck_cv_numero CHECK (numero >= 0),
  estado          VARCHAR(10)  NOT NULL CONSTRAINT ck_cv_estado CHECK (estado IN ('borrador', 'publicada')),
  contenido       JSONB        NOT NULL CONSTRAINT ck_cv_contenido CHECK (jsonb_typeof(contenido) = 'array'),
  actualizado     TIMESTAMPTZ  NOT NULL,
  actualizado_por VARCHAR(150) NOT NULL,
  publicada       TIMESTAMPTZ  NULL,
  publicada_por   VARCHAR(150) NULL,
  motivo          TEXT         NULL,
  CONSTRAINT ck_cv_publicacion CHECK (
    (estado = 'borrador' AND numero = 0 AND publicada IS NULL AND publicada_por IS NULL AND motivo IS NULL)
    OR (estado = 'publicada' AND numero > 0 AND publicada IS NOT NULL AND publicada_por IS NOT NULL
        AND motivo IS NOT NULL AND btrim(motivo) <> ''))
);

CREATE UNIQUE INDEX uq_cv_borrador ON public.criterios_version (periodo) WHERE estado = 'borrador';
CREATE UNIQUE INDEX uq_cv_publicada ON public.criterios_version (periodo, numero) WHERE estado = 'publicada';

CREATE FUNCTION public.criterios_publicados_fijos() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.estado = 'publicada' THEN
    RAISE EXCEPTION 'Una versión publicada de los criterios no se modifica.' USING ERRCODE = 'P0001';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER tr_criterios_publicados_fijos BEFORE UPDATE OR DELETE ON public.criterios_version
  FOR EACH ROW EXECUTE FUNCTION public.criterios_publicados_fijos();

-- El GRANT de 0001_inicial cubrió las tablas que existían entonces.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rol_asignacion_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.criterios_version TO rol_asignacion_app;
  END IF;
END;
$$;
