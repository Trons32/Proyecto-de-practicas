/*
  Prueba del esquema (SPEC-002, CA-002.3; PostgreSQL desde SPEC-011).
  Ejecutar sobre una base desechable después de `prisma migrate deploy` y
  `prisma db seed`:

    psql -v ON_ERROR_STOP=1 -d <base>_prueba -f db/prueba-esquema.sql

  Comprueba que la base, por sí sola, rechaza lo que la aplicación también
  rechaza. Cada caso corre en su propio bloque con manejo de excepción (un
  subtransacción): un caso que falla no arrastra a los demás. Deja datos de
  prueba que no se pueden borrar —es justo lo que se prueba—.
*/
DO $$
DECLARE
  fallos INT := 0;
  asig UUID := gen_random_uuid();
  doc  UUID := gen_random_uuid();
  nov  UUID := gen_random_uuid();
  ahora TIMESTAMPTZ := now();
  prog INT := (SELECT id FROM public.programa WHERE nombre = 'INGENIERÍA DE SISTEMAS');
  caso RECORD;
BEGIN
  INSERT INTO public.periodo (codigo) VALUES ('2026-2') ON CONFLICT DO NOTHING;
  INSERT INTO public.asignacion (id, periodo, programa_id, estado, creada, actualizada)
    VALUES (asig, '2026-2', prog, 'aprobada', ahora, ahora);
  INSERT INTO public.docente (id, documento, nombres)
    VALUES (doc, '9' || lpad((floor(random() * 1e9))::bigint::text, 9, '0'), 'DOCENTE DE PRUEBA');

  /* 1 · La cascada admite TÉRMINO_INDEFINIDO · TIEMPO_COMPLETO · ASOCIADO (SPEC-001) */
  BEGIN
    INSERT INTO public.docente_asignado (id, asignacion_id, docente_id, orden, nivel_formacion, tipo_contrato, dedicacion, categoria, sede, preparacion, atencion, comunidades)
      VALUES (gen_random_uuid(), asig, doc, 1, 'MAGISTER', 'TÉRMINO_INDEFINIDO', 'TIEMPO_COMPLETO', 'ASOCIADO', 'SINCELEJO', 5, 5, 3);
    RAISE NOTICE '✓ acepta TIEMPO_COMPLETO · ASOCIADO';
  EXCEPTION WHEN OTHERS THEN
    fallos := fallos + 1; RAISE NOTICE '✗ rechazó TIEMPO_COMPLETO · ASOCIADO: %', SQLERRM;
  END;

  /* 2 · Un borrador a medio llenar se puede guardar: sin documento, sin categoría */
  BEGIN
    INSERT INTO public.docente_asignado (id, asignacion_id, orden, tipo_contrato, dedicacion, preparacion, atencion, comunidades)
      VALUES (gen_random_uuid(), asig, 2, 'CÁTEDRAS', 'HORA_CÁTEDRA', 0, 0, 0);
    INSERT INTO public.docente_asignado (id, asignacion_id, orden, preparacion, atencion, comunidades)
      VALUES (gen_random_uuid(), asig, 3, 0, 0, 0);
    RAISE NOTICE '✓ acepta docentes incompletos de un borrador';
  EXCEPTION WHEN OTHERS THEN
    fallos := fallos + 1; RAISE NOTICE '✗ rechazó un docente incompleto: %', SQLERRM;
  END;

  /* Bitácora y novedades de prueba, para los casos de "solo se añade" */
  INSERT INTO public.novedad (id, numero, fecha, autor, rol_autor, periodo, con_convocatoria_cerrada, motivo)
    VALUES (nov, (SELECT coalesce(max(numero), 0) + 1 FROM public.novedad), ahora, 'ADMIN', 'ADMIN', '2026-2', TRUE, 'Prueba');
  INSERT INTO public.novedad_afectacion (novedad_id, asignacion_id, programa, facultad, periodo, errores_antes, errores_ahora)
    VALUES (nov, asig, 'INGENIERÍA DE SISTEMAS', 'CIENCIAS_BÁSICAS_INGENIERÍAS_Y_ARQUITECTURA', '2026-2', 0, 1);
  INSERT INTO public.evento_asignacion (id, asignacion_id, tipo, fecha, autor, rol_autor, novedad_id)
    VALUES (gen_random_uuid(), asig, 'reabierta_por_parametros', ahora, 'ADMIN', 'ADMIN', nov);

  /*
    Casos que deben fallar: si la sentencia pasa, es un fallo. Cada una se
    limita a las filas que crea esta prueba ($1 = asig, $2 = nov, $3 = doc).
  */
  FOR caso IN SELECT * FROM (VALUES
    ('rechaza TIEMPO_COMPLETO · CATEGORÍA III (fila 9 del Excel)',
     $q$INSERT INTO public.docente_asignado (id, asignacion_id, orden, nivel_formacion, tipo_contrato, dedicacion, categoria, sede, preparacion, atencion, comunidades)
        VALUES (gen_random_uuid(), $1, 8, 'MAGISTER', 'TÉRMINO_INDEFINIDO', 'TIEMPO_COMPLETO', 'CATEGORÍA III', 'SINCELEJO', 5, 5, 3)$q$),
    ('rechaza una dedicación sin contrato',
     $q$INSERT INTO public.docente_asignado (id, asignacion_id, orden, dedicacion, preparacion, atencion, comunidades)
        VALUES (gen_random_uuid(), $1, 9, 'TIEMPO_COMPLETO', 0, 0, 0)$q$),
    ('rechaza un contrato que no existe',
     $q$INSERT INTO public.docente_asignado (id, asignacion_id, orden, tipo_contrato, preparacion, atencion, comunidades)
        VALUES (gen_random_uuid(), $1, 9, 'OTRO', 0, 0, 0)$q$),
    ('rechaza un estado fuera del ciclo de vida',
     $q$UPDATE public.asignacion SET estado = 'completada' WHERE id = $1$q$),
    ('rechaza un plazo de corrección fuera de en_correccion',
     $q$UPDATE public.asignacion SET plazo_correccion = now() WHERE id = $1$q$),
    ('rechaza un periodo mal formado',
     $q$INSERT INTO public.periodo (codigo) VALUES ('2026-3')$q$),
    ('rechaza un documento con letras',
     $q$INSERT INTO public.docente (documento, nombres) VALUES ('12AB5678', 'X')$q$),
    ('la bitácora no se edita',
     $q$UPDATE public.evento_asignacion SET autor = 'OTRO' WHERE asignacion_id = $1$q$),
    ('la novedad no se edita',
     $q$UPDATE public.novedad SET motivo = 'Otro' WHERE id = $2$q$),
    ('la novedad no se borra',
     $q$DELETE FROM public.novedad WHERE id = $2$q$),
    ('la foto de impacto no se borra',
     $q$DELETE FROM public.novedad_afectacion WHERE novedad_id = $2$q$),
    ('reabrir exige plazo',
     $q$INSERT INTO public.novedad_decision (novedad_id, asignacion_id, accion, fecha, autor) VALUES ($2, $1, 'reabierta', now(), 'ADMIN')$q$),
    ('una afectación debe empeorar la asignación',
     $q$INSERT INTO public.novedad_afectacion (novedad_id, asignacion_id, programa, facultad, periodo, errores_antes, errores_ahora)
        VALUES ($2, gen_random_uuid(), 'P', 'F', '2026-2', 2, 2)$q$),
    ('solo una reapertura por parámetros enlaza novedad',
     $q$INSERT INTO public.evento_asignacion (id, asignacion_id, tipo, fecha, autor, rol_autor, novedad_id)
        VALUES (gen_random_uuid(), $1, 'aprobada', now(), 'ADMIN', 'ADMIN', $2)$q$)
  ) AS c (nombre, sentencia)
  LOOP
    BEGIN
      EXECUTE caso.sentencia USING asig, nov, doc;
      fallos := fallos + 1; RAISE NOTICE '✗ % — se aceptó', caso.nombre;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '✓ %', caso.nombre;
    END;
  END LOOP;

  /* Una decisión válida sí entra */
  BEGIN
    INSERT INTO public.novedad_decision (novedad_id, asignacion_id, accion, fecha, autor, plazo)
      VALUES (nov, asig, 'reabierta', ahora, 'ADMIN', ahora + interval '10 days');
    RAISE NOTICE '✓ acepta una reapertura con plazo';
  EXCEPTION WHEN OTHERS THEN
    fallos := fallos + 1; RAISE NOTICE '✗ rechazó una reapertura con plazo: %', SQLERRM;
  END;

  IF fallos = 0 THEN
    RAISE NOTICE '✓ El esquema hace cumplir las reglas.';
  ELSE
    RAISE EXCEPTION 'El esquema no hace cumplir todas las reglas (% fallos).', fallos;
  END IF;
END
$$;
