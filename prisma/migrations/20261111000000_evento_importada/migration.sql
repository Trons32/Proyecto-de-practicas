/*
  SPEC-017 · Asignaciones importadas de periodos anteriores.

  Una asignación cargada desde el Excel de un periodo pasado nace aprobada
  con un único evento, `importada`, cuya nota dice de qué archivo y hoja
  salió. Solo cambia el CHECK de tipos de evento: la forma de las tablas
  sigue igual, por eso schema.prisma no cambia (los CHECK no se reflejan).
*/
ALTER TABLE public.evento_asignacion DROP CONSTRAINT ck_evento_tipo;
ALTER TABLE public.evento_asignacion ADD CONSTRAINT ck_evento_tipo CHECK (tipo IN (
  'creada', 'enviada', 'revision_abierta', 'aprobada',
  'devuelta', 'reabierta_por_parametros', 'reenviada', 'importada'));
