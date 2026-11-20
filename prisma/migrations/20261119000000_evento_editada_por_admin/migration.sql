/*
  SPEC-023 · El administrador corrige lo entregado antes de aprobarlo.

  Antes de editar una asignación enviada o en revisión, el administrador
  deja el evento `editada_por_admin` con su motivo. Solo cambian los CHECK
  de la bitácora: la forma de las tablas sigue igual, por eso
  schema.prisma no cambia (los CHECK no se reflejan).
*/
ALTER TABLE public.evento_asignacion DROP CONSTRAINT ck_evento_tipo;
ALTER TABLE public.evento_asignacion ADD CONSTRAINT ck_evento_tipo CHECK (tipo IN (
  'creada', 'enviada', 'revision_abierta', 'aprobada',
  'devuelta', 'reabierta_por_parametros', 'reenviada', 'importada',
  'editada_por_admin'));

-- Sin motivo no hay rastro de por qué se tocó lo que entregó el coordinador.
ALTER TABLE public.evento_asignacion ADD CONSTRAINT ck_evento_editada_con_nota CHECK (
  tipo <> 'editada_por_admin' OR (nota IS NOT NULL AND btrim(nota) <> ''));
