/*
  Prueba del esquema (SPEC-002, CA-002.3). Ejecutar sobre una base vacía
  después de esquema.sql y semilla.sql:

    sqlcmd -S <servidor> -E -C -b -f 65001 -d <base> -i db/prueba-esquema.sql

  Comprueba que la base, por sí sola, rechaza lo que la aplicación también
  rechaza. Funciona también sobre una base con datos, pero úsese en una
  desechable: deja datos de prueba, y no se
  pueden revertir con una transacción porque los triggers corren con
  XACT_ABORT ON y su error la dejaría inutilizable a mitad de las pruebas.
  (Tampoco se pueden borrar: es justo lo que se prueba.)
*/
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;

DECLARE @fallos INT = 0;
DECLARE @asig UNIQUEIDENTIFIER = NEWID(), @doc UNIQUEIDENTIFIER = NEWID(), @nov UNIQUEIDENTIFIER = NEWID();
DECLARE @ahora DATETIMEOFFSET = SYSDATETIMEOFFSET();
DECLARE @prog INT = (SELECT id FROM aa.programa WHERE nombre = N'INGENIERÍA DE SISTEMAS');

IF NOT EXISTS (SELECT 1 FROM aa.periodo WHERE codigo = '2026-2') INSERT INTO aa.periodo (codigo) VALUES ('2026-2');
INSERT INTO aa.asignacion (id, periodo, programa_id, estado, creada, actualizada)
  VALUES (@asig, '2026-2', @prog, 'aprobada', @ahora, @ahora);
INSERT INTO aa.docente (id, documento, nombres) VALUES (@doc, RIGHT(CONCAT('9', ABS(CHECKSUM(NEWID()))), 10), N'DOCENTE DE PRUEBA');

/* 1 · La cascada admite TÉRMINO_INDEFINIDO · TIEMPO_COMPLETO · ASOCIADO (SPEC-001) */
BEGIN TRY
  INSERT INTO aa.docente_asignado (id, asignacion_id, docente_id, orden, nivel_formacion, tipo_contrato, dedicacion, categoria, sede, preparacion, atencion, comunidades)
    VALUES (NEWID(), @asig, @doc, 1, N'MAGISTER', N'TÉRMINO_INDEFINIDO', N'TIEMPO_COMPLETO', N'ASOCIADO', N'SINCELEJO', 5, 5, 3);
  PRINT N'✓ acepta TIEMPO_COMPLETO · ASOCIADO';
END TRY
BEGIN CATCH
  SET @fallos += 1; PRINT N'✗ rechazó TIEMPO_COMPLETO · ASOCIADO: ' + ERROR_MESSAGE();
END CATCH;

/* 2 · Un borrador a medio llenar se puede guardar: sin documento, sin categoría */
BEGIN TRY
  INSERT INTO aa.docente_asignado (id, asignacion_id, orden, tipo_contrato, dedicacion, preparacion, atencion, comunidades)
    VALUES (NEWID(), @asig, 2, N'CÁTEDRAS', N'HORA_CÁTEDRA', 0, 0, 0);
  INSERT INTO aa.docente_asignado (id, asignacion_id, orden, preparacion, atencion, comunidades)
    VALUES (NEWID(), @asig, 3, 0, 0, 0);
  PRINT N'✓ acepta docentes incompletos de un borrador';
END TRY
BEGIN CATCH
  SET @fallos += 1; PRINT N'✗ rechazó un docente incompleto: ' + ERROR_MESSAGE();
END CATCH;

/*
  Casos que deben fallar: si la sentencia pasa, es un fallo. Cada una se
  limita a las filas que crea esta prueba (@asig, @nov, @doc): sobre una base
  con datos, una regla rota no puede terminar modificando datos reales.
*/
DECLARE @casos TABLE (orden INT IDENTITY, nombre NVARCHAR(200), sentencia NVARCHAR(MAX));
DECLARE @params NVARCHAR(200) = N'@asig UNIQUEIDENTIFIER, @nov UNIQUEIDENTIFIER, @doc UNIQUEIDENTIFIER';
DECLARE @i INT, @n INT, @nombre NVARCHAR(200), @sql NVARCHAR(MAX);

INSERT INTO @casos (nombre, sentencia) VALUES
 (N'rechaza TIEMPO_COMPLETO · CATEGORÍA III (fila 9 del Excel)',
  N'INSERT INTO aa.docente_asignado (id, asignacion_id, orden, nivel_formacion, tipo_contrato, dedicacion, categoria, sede, preparacion, atencion, comunidades)
    VALUES (NEWID(), @asig, 8, N''MAGISTER'', N''TÉRMINO_INDEFINIDO'', N''TIEMPO_COMPLETO'', N''CATEGORÍA III'', N''SINCELEJO'', 5, 5, 3)'),
 (N'rechaza una dedicación sin contrato',
  N'INSERT INTO aa.docente_asignado (id, asignacion_id, orden, dedicacion, preparacion, atencion, comunidades)
    VALUES (NEWID(), @asig, 9, N''TIEMPO_COMPLETO'', 0, 0, 0)'),
 (N'rechaza un contrato que no existe',
  N'INSERT INTO aa.docente_asignado (id, asignacion_id, orden, tipo_contrato, preparacion, atencion, comunidades)
    VALUES (NEWID(), @asig, 9, N''OTRO'', 0, 0, 0)'),
 (N'rechaza un estado fuera del ciclo de vida',
  N'UPDATE aa.asignacion SET estado = ''completada'' WHERE id = @asig'),
 (N'rechaza un plazo de corrección fuera de en_correccion',
  N'UPDATE aa.asignacion SET plazo_correccion = SYSDATETIMEOFFSET() WHERE id = @asig'),
 (N'rechaza un periodo mal formado',
  N'INSERT INTO aa.periodo (codigo) VALUES (''2026-3'')'),
 (N'rechaza un documento con letras',
  N'INSERT INTO aa.docente (documento, nombres) VALUES (''12AB5678'', N''X'')');

SELECT @i = MIN(orden), @n = MAX(orden) FROM @casos;
WHILE @i <= @n
BEGIN
  SELECT @nombre = nombre, @sql = sentencia FROM @casos WHERE orden = @i;
  BEGIN TRY
    EXEC sp_executesql @sql, @params, @asig = @asig, @nov = @nov, @doc = @doc;
    SET @fallos += 1; PRINT N'✗ ' + @nombre + N' — se aceptó';
  END TRY
  BEGIN CATCH
    PRINT N'✓ ' + @nombre;
  END CATCH;
  SET @i += 1;
END;

/* Bitácora y novedades: solo se añaden */
INSERT INTO aa.novedad (id, numero, fecha, autor, rol_autor, periodo, con_convocatoria_cerrada, motivo)
  VALUES (@nov, (SELECT ISNULL(MAX(numero), 0) + 1 FROM aa.novedad), @ahora, N'ADMIN', 'ADMIN', '2026-2', 1, N'Prueba');
INSERT INTO aa.novedad_afectacion (novedad_id, asignacion_id, programa, facultad, periodo, errores_antes, errores_ahora)
  VALUES (@nov, @asig, N'INGENIERÍA DE SISTEMAS', N'CIENCIAS_BÁSICAS_INGENIERÍAS_Y_ARQUITECTURA', '2026-2', 0, 1);
INSERT INTO aa.evento_asignacion (id, asignacion_id, tipo, fecha, autor, rol_autor, novedad_id)
  VALUES (NEWID(), @asig, 'reabierta_por_parametros', @ahora, N'ADMIN', 'ADMIN', @nov);

DELETE FROM @casos;
INSERT INTO @casos (nombre, sentencia) VALUES
 (N'la bitácora no se edita',        N'UPDATE aa.evento_asignacion SET autor = N''OTRO'' WHERE asignacion_id = @asig'),
 (N'la novedad no se edita',         N'UPDATE aa.novedad SET motivo = N''Otro'' WHERE id = @nov'),
 (N'la novedad no se borra',         N'DELETE FROM aa.novedad WHERE id = @nov'),
 (N'la foto de impacto no se borra', N'DELETE FROM aa.novedad_afectacion WHERE novedad_id = @nov'),
 (N'reabrir exige plazo',
  N'INSERT INTO aa.novedad_decision (novedad_id, asignacion_id, accion, fecha, autor) VALUES (@nov, @asig, ''reabierta'', SYSDATETIMEOFFSET(), N''ADMIN'')'),
 (N'una afectación debe empeorar la asignación',
  N'INSERT INTO aa.novedad_afectacion (novedad_id, asignacion_id, programa, facultad, periodo, errores_antes, errores_ahora) VALUES (@nov, NEWID(), N''P'', N''F'', ''2026-2'', 2, 2)'),
 (N'solo una reapertura por parámetros enlaza novedad',
  N'INSERT INTO aa.evento_asignacion (id, asignacion_id, tipo, fecha, autor, rol_autor, novedad_id) VALUES (NEWID(), @asig, ''aprobada'', SYSDATETIMEOFFSET(), N''ADMIN'', ''ADMIN'', @nov)');

SELECT @i = MIN(orden), @n = MAX(orden) FROM @casos;
WHILE @i <= @n
BEGIN
  SELECT @nombre = nombre, @sql = sentencia FROM @casos WHERE orden = @i;
  BEGIN TRY
    EXEC sp_executesql @sql, @params, @asig = @asig, @nov = @nov, @doc = @doc;
    SET @fallos += 1; PRINT N'✗ ' + @nombre + N' — se aceptó';
  END TRY
  BEGIN CATCH
    PRINT N'✓ ' + @nombre;
  END CATCH;
  SET @i += 1;
END;

/* Una decisión válida sí entra */
BEGIN TRY
  INSERT INTO aa.novedad_decision (novedad_id, asignacion_id, accion, fecha, autor, plazo)
    VALUES (@nov, @asig, 'reabierta', @ahora, N'ADMIN', DATEADD(DAY, 10, @ahora));
  PRINT N'✓ acepta una reapertura con plazo';
END TRY
BEGIN CATCH
  SET @fallos += 1; PRINT N'✗ rechazó una reapertura con plazo: ' + ERROR_MESSAGE();
END CATCH;

IF @fallos = 0 PRINT N'✓ El esquema hace cumplir las reglas.';
ELSE THROW 50000, N'El esquema no hace cumplir todas las reglas.', 1;
