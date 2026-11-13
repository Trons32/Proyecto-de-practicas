/*
  SPEC-021 · Directorio de docentes.

  public.docente ya es la persona, identificada por su cédula: hasta ahora
  solo nacía al entregar una asignación. Con el listado institucional se
  llena de antemano, para que al registrar un docente baste la cédula o el
  código.

  - codigo: el código institucional (DOC0001649). Único, pero opcional: las
    personas creadas por asignaciones no lo traen.
  - origen: quién puso el nombre vigente. El listado trae apellidos primero
    y la ficha nombres primero; el de una asignación se conserva, y una
    recarga del listado solo reescribe los nombres que vinieron de él.
  - actualizado: la última carga del listado que tocó a la persona.

  Las columnas nuevas quedan cubiertas por el GRANT de la tabla a
  rol_asignacion_app (0001_inicial): no hace falta otro.
*/
ALTER TABLE public.docente
  ADD COLUMN codigo      VARCHAR(12)  NULL CONSTRAINT uq_docente_codigo UNIQUE,
  ADD COLUMN origen      VARCHAR(12)  NOT NULL DEFAULT 'asignacion'
                                      CONSTRAINT ck_docente_origen CHECK (origen IN ('asignacion', 'listado')),
  ADD COLUMN actualizado TIMESTAMPTZ  NULL;

-- La búsqueda por nombre recorre la tabla con ILIKE: con unos 2.000
-- docentes no compensa un índice trigram ni la extensión que pide.
