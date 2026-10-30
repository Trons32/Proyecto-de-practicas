/*
  SPEC-009 · Línea base de la proyección, para bases creadas antes.
  Idempotente: correrla dos veces no hace nada la segunda.

    sqlcmd -S <servidor> -E -C -b -I -f 65001 -d <base> -i db/migraciones/001-linea-base.sql
*/
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF COL_LENGTH('aa.asignacion', 'linea_base_fecha') IS NULL
  ALTER TABLE aa.asignacion ADD linea_base_fecha DATETIMEOFFSET NULL, linea_base_version INT NULL;
GO

IF OBJECT_ID('aa.linea_base_curso') IS NULL
CREATE TABLE aa.linea_base_curso (
  asignacion_id      UNIQUEIDENTIFIER NOT NULL CONSTRAINT fk_lbc_asignacion REFERENCES aa.asignacion (id) ON DELETE CASCADE,
  orden              SMALLINT         NOT NULL,
  curso_id           UNIQUEIDENTIFIER NOT NULL,
  docente_id         UNIQUEIDENTIFIER NOT NULL,
  docente            NVARCHAR(150)    NULL,
  codigo_curso       NVARCHAR(20)     NULL,
  nombre_curso       NVARCHAR(150)    NULL,
  semestre           TINYINT          NULL,
  grupo              NVARCHAR(5)      NULL,
  intensidad_horaria DECIMAL(5, 1)    NULL,
  estudiantes        SMALLINT         NULL,
  CONSTRAINT pk_linea_base_curso PRIMARY KEY (asignacion_id, orden)
);
GO

IF OBJECT_ID('aa.tr_linea_base_solo_insert') IS NULL
  EXEC ('CREATE TRIGGER aa.tr_linea_base_solo_insert ON aa.linea_base_curso INSTEAD OF UPDATE AS THROW 50004, ''La línea base de la proyección no se modifica.'', 1;');
GO

DENY UPDATE ON aa.linea_base_curso TO rol_asignacion_app;
GO
