/*
  Quién puede entrar a la aplicación (SPEC-010). La API institucional valida
  la clave; esta tabla decide si la persona entra y con qué rol. Quien no
  esté aquí, o esté con activo = 0, no entra aunque su clave sea correcta.

  Copiar a db/usuarios.sql (excluido de git: lleva correos reales), ajustar
  y ejecutar:

    sqlcmd -S <servidor> -U <admin> -C -b -f 65001 -d asignacion_academica -i db/usuarios.sql

  Es idempotente: volver a ejecutarlo actualiza nombres y roles.
  El correo va en minúsculas: así lo busca el inicio de sesión.
  Para quitar el acceso: UPDATE aa.usuario SET activo = 0 WHERE email = N'...';
  (no se borra: la bitácora conserva el nombre de quien actuó).
*/
SET NOCOUNT ON;

MERGE aa.usuario AS u
USING (VALUES
  -- (email,                          nombres,                    rol,           programa_id)
  (N'administrador@cecar.edu.co',     N'Nombre del administrador', 'ADMIN',       NULL),
  (N'coordinador.sistemas@cecar.edu.co', N'Nombre del coordinador', 'COORDINADOR', NULL)
) AS n (email, nombres, rol, programa_id)
ON u.email = LOWER(n.email)
WHEN MATCHED THEN
  UPDATE SET nombres = n.nombres, rol = n.rol, programa_id = n.programa_id, activo = 1
WHEN NOT MATCHED THEN
  INSERT (email, nombres, rol, programa_id) VALUES (LOWER(n.email), n.nombres, n.rol, n.programa_id);

SELECT email, nombres, rol, programa_id, activo FROM aa.usuario ORDER BY rol, email;
