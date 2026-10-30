/*
  El login con el que la aplicación se conecta en producción (SPEC-010).
  Lo ejecuta el DBA, una sola vez, DESPUÉS de esquema.sql y semilla.sql:

    sqlcmd -S <servidor> -U <admin> -C -b -f 65001 -d asignacion_academica ^
           -v CLAVE_APP="<clave fuerte>" -i db/crear-usuario-app.sql

  La aplicación nunca debe conectarse como `sa` ni como db_owner: el rol
  rol_asignacion_app (esquema.sql) le niega editar la bitácora y las
  novedades, y esos DENY no alcanzan a db_owner.
*/
SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'app_asignacion')
  CREATE LOGIN app_asignacion WITH PASSWORD = N'$(CLAVE_APP)', CHECK_POLICY = ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'app_asignacion')
  CREATE USER app_asignacion FOR LOGIN app_asignacion WITH DEFAULT_SCHEMA = aa;
GO

ALTER ROLE rol_asignacion_app ADD MEMBER app_asignacion;
GO

PRINT 'Usuario app_asignacion listo en ' + DB_NAME() + '.';
