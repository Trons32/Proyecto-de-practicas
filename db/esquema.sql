/*
  Asignación Académica · CECAR — esquema de referencia para SQL Server
  (SPEC-002). Requiere SQL Server 2016+ (ISJSON, DATETIMEOFFSET).

  Refleja el dominio de src/lib/tipos.ts y src/lib/novedades.ts. Los
  identificadores son UNIQUEIDENTIFIER porque la aplicación ya los genera
  como UUID: así los datos de un respaldo JSON migran sin cambiar sus ids.

  Orden de ejecución:  esquema.sql  →  semilla.sql  (generada:
  npx tsx db/generar-semilla.ts > db/semilla.sql)

  Lo que el esquema impone por sí mismo, sin confiar en la aplicación:
    · la cascada contrato → dedicación → categoría (SPEC-001), por FK;
    · los estados del ciclo de vida, por CHECK;
    · que la bitácora y las novedades solo admitan INSERT, por trigger.
  Las fórmulas de carga NO están aquí: el motor de cálculo sigue siendo
  src/lib/calculo.ts, verificado contra el formato oficial.
*/

/* Los índices filtrados lo exigen; sqlcmd lo trae apagado si no se pasa -I. */
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

CREATE SCHEMA aa;
GO

/* ─────────────────────────── Catálogo académico ─────────────────────────── */

CREATE TABLE aa.facultad (
  codigo  NVARCHAR(80)  NOT NULL CONSTRAINT pk_facultad PRIMARY KEY  -- 'CIENCIAS_BÁSICAS_INGENIERÍAS_Y_ARQUITECTURA'
);

CREATE TABLE aa.programa (
  id        INT IDENTITY  NOT NULL CONSTRAINT pk_programa PRIMARY KEY,
  nombre    NVARCHAR(120) NOT NULL CONSTRAINT uq_programa_nombre UNIQUE,
  facultad  NVARCHAR(80)  NOT NULL CONSTRAINT fk_programa_facultad REFERENCES aa.facultad (codigo),
  codigo    NVARCHAR(10)  NULL      -- no todos los programas del formato traen código
);

/* ───────────────────── Cascada de vinculación (SPEC-001) ─────────────────── */

CREATE TABLE aa.tipo_contrato (
  codigo NVARCHAR(40) NOT NULL CONSTRAINT pk_tipo_contrato PRIMARY KEY
);

CREATE TABLE aa.dedicacion (
  codigo NVARCHAR(40) NOT NULL CONSTRAINT pk_dedicacion PRIMARY KEY
);

CREATE TABLE aa.categoria (
  codigo NVARCHAR(40) NOT NULL CONSTRAINT pk_categoria PRIMARY KEY
);

/*
  Las combinaciones que admite el formato oficial. En el Excel la categoría
  depende solo de la dedicación (INDIRECT($J9)); se guarda la terna completa
  para que la FK del docente valide las tres columnas a la vez y para admitir,
  si algún día se diferencian, escalafones distintos por contrato.
*/
CREATE TABLE aa.contrato_dedicacion_categoria (
  tipo_contrato NVARCHAR(40) NOT NULL CONSTRAINT fk_cdc_contrato   REFERENCES aa.tipo_contrato (codigo),
  dedicacion    NVARCHAR(40) NOT NULL CONSTRAINT fk_cdc_dedicacion REFERENCES aa.dedicacion (codigo),
  categoria     NVARCHAR(40) NOT NULL CONSTRAINT fk_cdc_categoria  REFERENCES aa.categoria (codigo),
  CONSTRAINT pk_contrato_dedicacion_categoria PRIMARY KEY (tipo_contrato, dedicacion, categoria)
);

/* ──────────────────────────── Parametrización ───────────────────────────── */

CREATE TABLE aa.regla_dedicacion (
  dedicacion  NVARCHAR(40) NOT NULL CONSTRAINT pk_regla_dedicacion PRIMARY KEY
                                    CONSTRAINT fk_regla_dedicacion REFERENCES aa.dedicacion (codigo),
  max_horas   SMALLINT NOT NULL CONSTRAINT ck_regla_max  CHECK (max_horas   >= 0),
  preparacion SMALLINT NOT NULL CONSTRAINT ck_regla_prep CHECK (preparacion >= 0),
  atencion    SMALLINT NOT NULL CONSTRAINT ck_regla_aten CHECK (atencion    >= 0),
  comunidades SMALLINT NOT NULL CONSTRAINT ck_regla_com  CHECK (comunidades >= 0)
);

/* Una sola fila: los límites son globales. */
CREATE TABLE aa.limite (
  id                  TINYINT  NOT NULL CONSTRAINT pk_limite PRIMARY KEY CONSTRAINT ck_limite_unico CHECK (id = 1),
  max_cursos          SMALLINT NOT NULL CONSTRAINT ck_limite_cursos CHECK (max_cursos >= 1),
  max_descargas       SMALLINT NOT NULL CONSTRAINT ck_limite_desc   CHECK (max_descargas >= 1),
  max_administrativas SMALLINT NOT NULL CONSTRAINT ck_limite_adm    CHECK (max_administrativas >= 1)
);

/*
  Id explícito, no IDENTITY: los roles 1..56 son los del formato y las
  asignaciones los referencian por número.
*/
CREATE TABLE aa.rol (
  id            INT           NOT NULL CONSTRAINT pk_rol PRIMARY KEY,
  nombre        NVARCHAR(150) NOT NULL CONSTRAINT uq_rol_nombre UNIQUE,
  tipo          VARCHAR(15)   NOT NULL CONSTRAINT ck_rol_tipo CHECK (tipo IN ('DOCENCIA', 'INVESTIGACION', 'EXTENSION')),
  -- Roles 49–56: fuera de todo rango SUMIF en el Excel; sus horas se perdían.
  reclasificado BIT           NOT NULL CONSTRAINT df_rol_reclasificado DEFAULT (0),
  /*
    Eliminar un rol en la aplicación lo quita de la lista, pero las
    asignaciones ya cerradas lo siguen referenciando: aquí se marca como no
    vigente en vez de borrarse.
  */
  vigente       BIT           NOT NULL CONSTRAINT df_rol_vigente DEFAULT (1)
);

/* ─────────────────────────── Usuarios y periodos ────────────────────────── */

CREATE TABLE aa.usuario (
  id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_usuario PRIMARY KEY CONSTRAINT df_usuario_id DEFAULT (NEWID()),
  email       NVARCHAR(254)    NOT NULL CONSTRAINT uq_usuario_email UNIQUE,
  nombres     NVARCHAR(150)    NOT NULL,
  rol         VARCHAR(12)      NOT NULL CONSTRAINT ck_usuario_rol CHECK (rol IN ('ADMIN', 'COORDINADOR')),
  -- El programa que gestiona un coordinador; el administrador no tiene.
  programa_id INT              NULL CONSTRAINT fk_usuario_programa REFERENCES aa.programa (id),
  activo      BIT              NOT NULL CONSTRAINT df_usuario_activo DEFAULT (1)
);

CREATE TABLE aa.periodo (
  codigo CHAR(6) NOT NULL CONSTRAINT pk_periodo PRIMARY KEY
                          CONSTRAINT ck_periodo_formato CHECK (codigo LIKE '[12][0-9][0-9][0-9]-[12]')  -- '2026-2'
);

/* Una convocatoria por periodo. El límite ya viene a las 23:59 (finDelDia). */
CREATE TABLE aa.convocatoria (
  periodo             CHAR(6)        NOT NULL CONSTRAINT pk_convocatoria PRIMARY KEY
                                              CONSTRAINT fk_convocatoria_periodo REFERENCES aa.periodo (codigo),
  apertura            DATETIMEOFFSET NOT NULL,
  limite              DATETIMEOFFSET NOT NULL,
  cerrada_manualmente BIT            NOT NULL CONSTRAINT df_convocatoria_cerrada DEFAULT (0),
  CONSTRAINT ck_convocatoria_fechas CHECK (limite > apertura)
);

/* ────────────────────────────── Asignaciones ────────────────────────────── */

CREATE TABLE aa.asignacion (
  id                UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_asignacion PRIMARY KEY,
  periodo           CHAR(6)          NOT NULL CONSTRAINT fk_asignacion_periodo REFERENCES aa.periodo (codigo),
  programa_id       INT              NOT NULL CONSTRAINT fk_asignacion_programa REFERENCES aa.programa (id),
  estado            VARCHAR(15)      NOT NULL CONSTRAINT ck_asignacion_estado
                      CHECK (estado IN ('borrador', 'enviada', 'en_revision', 'aprobada', 'en_correccion')),
  -- Cuántas veces se ha enviado: v2 significa que hubo una devolución.
  version           INT              NOT NULL CONSTRAINT df_asignacion_version DEFAULT (0)
                                              CONSTRAINT ck_asignacion_version CHECK (version >= 0),
  -- Solo aplica en en_correccion.
  plazo_correccion  DATETIMEOFFSET   NULL,
  creada            DATETIMEOFFSET   NOT NULL,
  actualizada       DATETIMEOFFSET   NOT NULL,
  -- Concurrencia optimista: dos administradores no pueden pisarse una aprobación.
  fila_version      ROWVERSION       NOT NULL,
  CONSTRAINT ck_asignacion_plazo CHECK (plazo_correccion IS NULL OR estado = 'en_correccion')
  /*
    Pendiente con el cliente: ¿una sola asignación por programa y periodo?
    Si es así:  CONSTRAINT uq_asignacion_programa_periodo UNIQUE (programa_id, periodo)
  */
);

/* La persona, identificada por documento. Habilita el histórico por docente. */
CREATE TABLE aa.docente (
  id        UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_docente PRIMARY KEY CONSTRAINT df_docente_id DEFAULT (NEWID()),
  documento VARCHAR(15)      NOT NULL CONSTRAINT uq_docente_documento UNIQUE
                                      CONSTRAINT ck_docente_documento CHECK (documento NOT LIKE '%[^0-9]%' AND LEN(documento) >= 6),
  nombres   NVARCHAR(150)    NOT NULL
);

/*
  La vinculación de un docente en una asignación: lo que el formato captura
  por periodo. El id es el del Docente de la aplicación.

  Casi todo admite NULL a propósito: un borrador tiene docentes a medio
  llenar, y la base tiene que poder guardarlo. La base impone la coherencia
  de lo que está lleno —la cascada, los rangos—; la completitud la exige el
  motor de la aplicación (validarDocente) antes de dejar enviar.

  documento y nombres se guardan como se escribieron en ese periodo;
  docente_id enlaza a la persona cuando el documento ya es válido.
*/
CREATE TABLE aa.docente_asignado (
  id                     UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_docente_asignado PRIMARY KEY,
  asignacion_id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT fk_da_asignacion REFERENCES aa.asignacion (id) ON DELETE CASCADE,
  docente_id             UNIQUEIDENTIFIER NULL CONSTRAINT fk_da_docente REFERENCES aa.docente (id),
  orden                  SMALLINT         NOT NULL,
  documento              VARCHAR(15)      NULL,
  nombres                NVARCHAR(150)    NULL,
  nivel_formacion        NVARCHAR(30)     NULL,
  perfil_profesional     NVARCHAR(MAX)    NULL,
  categoria_minciencias  NVARCHAR(20)     NULL,
  activo_sector_externo  CHAR(2)          NULL CONSTRAINT ck_da_activo CHECK (activo_sector_externo IN ('SI', 'NO')),
  sector_ejerce          NVARCHAR(60)     NULL,
  tipo_contrato          NVARCHAR(40)     NULL CONSTRAINT fk_da_contrato REFERENCES aa.tipo_contrato (codigo),
  dedicacion             NVARCHAR(40)     NULL,
  categoria              NVARCHAR(40)     NULL,
  sede                   NVARCHAR(40)     NULL,
  evaluacion_docente     DECIMAL(3, 2)    NULL CONSTRAINT ck_da_evaluacion CHECK (evaluacion_docente BETWEEN 0 AND 5),
  observaciones          NVARCHAR(MAX)    NULL,
  preparacion            DECIMAL(5, 1)    NOT NULL CONSTRAINT ck_da_prep CHECK (preparacion >= 0),
  atencion               DECIMAL(5, 1)    NOT NULL CONSTRAINT ck_da_aten CHECK (atencion    >= 0),
  comunidades            DECIMAL(5, 1)    NOT NULL CONSTRAINT ck_da_com  CHECK (comunidades >= 0),
  /*
    SPEC-001: la terna tiene que existir en la cascada del formato. SQL Server
    no comprueba una FK compuesta si alguna columna es NULL: el borrador que
    aún no elige categoría pasa, y una terna completa inválida no.
  */
  CONSTRAINT fk_da_cascada FOREIGN KEY (tipo_contrato, dedicacion, categoria)
    REFERENCES aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria),
  -- Puede faltar la categoría, pero no hay dedicación sin contrato.
  CONSTRAINT ck_da_orden_cascada CHECK (
    (dedicacion IS NULL OR tipo_contrato IS NOT NULL) AND (categoria IS NULL OR dedicacion IS NOT NULL))
);

/* La misma persona no va dos veces en una asignación. Filtrado: UNIQUE a secas
   admitiría un solo docente sin identificar por asignación. */
CREATE UNIQUE INDEX uq_da_docente_por_asignacion
  ON aa.docente_asignado (asignacion_id, docente_id) WHERE docente_id IS NOT NULL;

CREATE TABLE aa.curso_asignado (
  id                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_curso_asignado PRIMARY KEY,
  docente_asignado_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT fk_curso_da REFERENCES aa.docente_asignado (id) ON DELETE CASCADE,
  orden               SMALLINT      NOT NULL,
  codigo_programa     NVARCHAR(10)  NULL,
  nombre_programa     NVARCHAR(120) NULL,
  codigo_pensum       NVARCHAR(20)  NULL,
  codigo_curso        NVARCHAR(20)  NULL,
  nombre_curso        NVARCHAR(150) NULL,
  semestre            TINYINT       NULL CONSTRAINT ck_curso_semestre CHECK (semestre BETWEEN 1 AND 10),
  grupo               NVARCHAR(5)   NULL,
  jornada             NVARCHAR(15)  NULL,
  intensidad_horaria  DECIMAL(5, 1) NULL CONSTRAINT ck_curso_ih CHECK (intensidad_horaria >= 0),
  creditos            TINYINT       NULL CONSTRAINT ck_curso_creditos CHECK (creditos >= 0),
  estudiantes         SMALLINT      NULL CONSTRAINT ck_curso_estudiantes CHECK (estudiantes >= 0),
  modalidad           NVARCHAR(15)  NULL
);

/* Descargas y actividades administrativas: misma forma, distinta clase. */
CREATE TABLE aa.actividad (
  id                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_actividad PRIMARY KEY,
  docente_asignado_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT fk_actividad_da REFERENCES aa.docente_asignado (id) ON DELETE CASCADE,
  clase               VARCHAR(15)   NOT NULL CONSTRAINT ck_actividad_clase CHECK (clase IN ('DESCARGA', 'ADMINISTRATIVA')),
  orden               SMALLINT      NOT NULL,
  -- NULL mientras el borrador no elige rol. Sin ON DELETE: los roles no se
  -- borran, se dejan de ofrecer (rol.vigente).
  rol_id              INT           NULL CONSTRAINT fk_actividad_rol REFERENCES aa.rol (id),
  horas               DECIMAL(5, 1) NOT NULL CONSTRAINT ck_actividad_horas CHECK (horas >= 0)
);

/* ─────────────────────────────── Novedades ──────────────────────────────── */

CREATE TABLE aa.novedad (
  id                      UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_novedad PRIMARY KEY,
  numero                  INT              NOT NULL CONSTRAINT uq_novedad_numero UNIQUE,
  fecha                   DATETIMEOFFSET   NOT NULL,
  autor                   NVARCHAR(150)    NOT NULL,  -- el nombre que tenía al hacerlo
  rol_autor               VARCHAR(12)      NOT NULL CONSTRAINT ck_novedad_rol CHECK (rol_autor IN ('ADMIN', 'COORDINADOR')),
  periodo                 CHAR(6)          NULL CONSTRAINT fk_novedad_periodo REFERENCES aa.periodo (codigo),
  con_convocatoria_cerrada BIT             NOT NULL,
  motivo                  NVARCHAR(MAX)    NOT NULL CONSTRAINT ck_novedad_motivo CHECK (LEN(motivo) > 0)
);

CREATE TABLE aa.novedad_cambio (
  novedad_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT fk_nc_novedad REFERENCES aa.novedad (id),
  orden      SMALLINT         NOT NULL,
  ambito     VARCHAR(10)      NOT NULL CONSTRAINT ck_nc_ambito CHECK (ambito IN ('regla', 'limite', 'rol')),
  parametro  NVARCHAR(200)    NOT NULL,
  antes      NVARCHAR(200)    NULL,  -- NULL: no existía
  despues    NVARCHAR(200)    NULL,  -- NULL: se eliminó
  CONSTRAINT pk_novedad_cambio PRIMARY KEY (novedad_id, orden),
  CONSTRAINT ck_nc_hay_cambio CHECK (antes IS NOT NULL OR despues IS NOT NULL)
);

/*
  La foto: cómo estaba la asignación al aplicar el cambio. Sin FK a
  asignacion a propósito: la foto debe sobrevivir aunque la asignación se
  elimine después, y por eso copia programa, facultad y periodo.
*/
CREATE TABLE aa.novedad_afectacion (
  novedad_id    UNIQUEIDENTIFIER NOT NULL CONSTRAINT fk_na_novedad REFERENCES aa.novedad (id),
  asignacion_id UNIQUEIDENTIFIER NOT NULL,
  programa      NVARCHAR(120)    NOT NULL,
  facultad      NVARCHAR(80)     NOT NULL,
  periodo       CHAR(6)          NOT NULL,
  errores_antes INT              NOT NULL,
  errores_ahora INT              NOT NULL,
  CONSTRAINT pk_novedad_afectacion PRIMARY KEY (novedad_id, asignacion_id),
  CONSTRAINT ck_na_empeora CHECK (errores_ahora > errores_antes)
);

CREATE TABLE aa.novedad_afectacion_docente (
  novedad_id    UNIQUEIDENTIFIER NOT NULL,
  asignacion_id UNIQUEIDENTIFIER NOT NULL,
  orden         SMALLINT         NOT NULL,
  nombres       NVARCHAR(150)    NOT NULL,
  motivos       NVARCHAR(MAX)    NOT NULL CONSTRAINT ck_nad_motivos CHECK (ISJSON(motivos) = 1),  -- arreglo JSON de textos
  CONSTRAINT pk_novedad_afectacion_docente PRIMARY KEY (novedad_id, asignacion_id, orden),
  CONSTRAINT fk_nad_afectacion FOREIGN KEY (novedad_id, asignacion_id)
    REFERENCES aa.novedad_afectacion (novedad_id, asignacion_id)
);

CREATE TABLE aa.novedad_decision (
  id            INT IDENTITY     NOT NULL CONSTRAINT pk_novedad_decision PRIMARY KEY,
  novedad_id    UNIQUEIDENTIFIER NOT NULL,
  asignacion_id UNIQUEIDENTIFIER NOT NULL,
  accion        VARCHAR(12)      NOT NULL CONSTRAINT ck_nd_accion CHECK (accion IN ('reabierta', 'sin_accion')),
  fecha         DATETIMEOFFSET   NOT NULL,
  autor         NVARCHAR(150)    NOT NULL,
  nota          NVARCHAR(MAX)    NULL,
  plazo         DATETIMEOFFSET   NULL,
  CONSTRAINT fk_nd_afectacion FOREIGN KEY (novedad_id, asignacion_id)
    REFERENCES aa.novedad_afectacion (novedad_id, asignacion_id),
  -- Reabrir exige plazo; no reabrir no lo lleva.
  CONSTRAINT ck_nd_plazo CHECK (
    (accion = 'reabierta' AND plazo IS NOT NULL) OR (accion = 'sin_accion' AND plazo IS NULL))
);
GO

/* ────────────────────────────── Bitácora ────────────────────────────────── */

CREATE TABLE aa.evento_asignacion (
  id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_evento PRIMARY KEY,
  asignacion_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT fk_evento_asignacion REFERENCES aa.asignacion (id) ON DELETE CASCADE,
  tipo          VARCHAR(30)      NOT NULL CONSTRAINT ck_evento_tipo CHECK (tipo IN (
                  'creada', 'enviada', 'revision_abierta', 'aprobada',
                  'devuelta', 'reabierta_por_parametros', 'reenviada')),
  fecha         DATETIMEOFFSET   NOT NULL,
  autor         NVARCHAR(150)    NOT NULL,
  rol_autor     VARCHAR(12)      NOT NULL CONSTRAINT ck_evento_rol CHECK (rol_autor IN ('ADMIN', 'COORDINADOR')),
  nota          NVARCHAR(MAX)    NULL,
  plazo         DATETIMEOFFSET   NULL,
  version       INT              NULL,
  -- La novedad que motivó una reapertura por parámetros.
  novedad_id    UNIQUEIDENTIFIER NULL CONSTRAINT fk_evento_novedad REFERENCES aa.novedad (id),
  CONSTRAINT ck_evento_novedad CHECK (novedad_id IS NULL OR tipo = 'reabierta_por_parametros')
);

CREATE INDEX ix_evento_asignacion ON aa.evento_asignacion (asignacion_id, fecha);
CREATE INDEX ix_asignacion_periodo ON aa.asignacion (periodo, estado);
CREATE INDEX ix_da_asignacion ON aa.docente_asignado (asignacion_id, orden);
GO

/* ─────────────────────── Solo se añade: bitácora y novedades ────────────── */
/*
  Un trigger y no solo permisos: DENY no alcanza a db_owner, y el valor de
  estos registros está en que nadie —tampoco un administrador de la base—
  pueda reescribir lo que pasó sin dejar de hacerlo a propósito
  (DISABLE TRIGGER queda en el log del servidor).

  Excepción deliberada: la bitácora se borra en cascada con su asignación.
  Un expediente sin asignación no tiene de qué dar cuenta; lo que no puede
  pasar es que se reescriba. (SQL Server no admite INSTEAD OF DELETE en una
  tabla con FK ON DELETE CASCADE, así que ahí el trigger es solo de UPDATE.)
*/
CREATE TRIGGER aa.tr_evento_solo_insert ON aa.evento_asignacion
INSTEAD OF UPDATE
AS
  THROW 50001, 'La bitácora solo admite inserciones.', 1;
GO

CREATE TRIGGER aa.tr_novedad_solo_insert ON aa.novedad
INSTEAD OF UPDATE, DELETE
AS
  THROW 50002, 'Las novedades no se editan ni se borran.', 1;
GO

CREATE TRIGGER aa.tr_novedad_cambio_solo_insert ON aa.novedad_cambio
INSTEAD OF UPDATE, DELETE
AS
  THROW 50002, 'Las novedades no se editan ni se borran.', 1;
GO

CREATE TRIGGER aa.tr_novedad_afectacion_solo_insert ON aa.novedad_afectacion
INSTEAD OF UPDATE, DELETE
AS
  THROW 50002, 'Las novedades no se editan ni se borran.', 1;
GO

CREATE TRIGGER aa.tr_novedad_afectacion_docente_solo_insert ON aa.novedad_afectacion_docente
INSTEAD OF UPDATE, DELETE
AS
  THROW 50002, 'Las novedades no se editan ni se borran.', 1;
GO

CREATE TRIGGER aa.tr_novedad_decision_solo_insert ON aa.novedad_decision
INSTEAD OF UPDATE, DELETE
AS
  THROW 50003, 'Las decisiones solo se suman.', 1;
GO

/* ───────────────────────── Usuario de la aplicación ─────────────────────── */
/*
  La API se conecta con un usuario miembro de este rol. Crear el login y el
  usuario es tarea del DBA de CECAR:
    CREATE USER app_asignacion FOR LOGIN ...;
    ALTER ROLE rol_asignacion_app ADD MEMBER app_asignacion;
*/
CREATE ROLE rol_asignacion_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::aa TO rol_asignacion_app;
DENY  UPDATE, DELETE ON aa.novedad                    TO rol_asignacion_app;
DENY  UPDATE, DELETE ON aa.novedad_cambio             TO rol_asignacion_app;
DENY  UPDATE, DELETE ON aa.novedad_afectacion         TO rol_asignacion_app;
DENY  UPDATE, DELETE ON aa.novedad_afectacion_docente TO rol_asignacion_app;
DENY  UPDATE, DELETE ON aa.novedad_decision           TO rol_asignacion_app;
DENY  UPDATE         ON aa.evento_asignacion          TO rol_asignacion_app;
GO
