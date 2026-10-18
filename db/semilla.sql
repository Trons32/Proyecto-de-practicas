/*
  Asignación Académica · CECAR — datos iniciales (SQL Server).
  GENERADO por db/generar-semilla.ts desde src/lib/catalogos.ts. No editar a mano.
  Ejecutar después de db/esquema.sql.
*/
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- Facultades
INSERT INTO aa.facultad (codigo) VALUES (N'CIENCIAS_BÁSICAS_INGENIERÍAS_Y_ARQUITECTURA');
INSERT INTO aa.facultad (codigo) VALUES (N'CIENCIAS_ECONÓMICAS_Y_ADMINISTRATIVAS');
INSERT INTO aa.facultad (codigo) VALUES (N'DERECHO_Y_CIENCIAS_POLÍTICAS');
INSERT INTO aa.facultad (codigo) VALUES (N'HUMANIDADES_Y_EDUCACIÓN');

-- Programas
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'DERECHO', N'DERECHO_Y_CIENCIAS_POLÍTICAS', NULL);
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'CONTADURÍA PÚBLICA PRESENCIAL', N'CIENCIAS_ECONÓMICAS_Y_ADMINISTRATIVAS', NULL);
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'CONTADURÍA PÚBLICA VIRTUAL', N'CIENCIAS_ECONÓMICAS_Y_ADMINISTRATIVAS', NULL);
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'AMDINISTRACIÓN DE EMPRESAS PRESENCIAL', N'CIENCIAS_ECONÓMICAS_Y_ADMINISTRATIVAS', NULL);
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'ADMINISTRACIÓN DE EMPRESAS VIRTUAL', N'CIENCIAS_ECONÓMICAS_Y_ADMINISTRATIVAS', NULL);
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'ADMINISTRACIÓN DE EMPRESAS EAD', N'CIENCIAS_ECONÓMICAS_Y_ADMINISTRATIVAS', NULL);
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'ADMINISTRACIÓN PÚBLICA EAD', N'CIENCIAS_ECONÓMICAS_Y_ADMINISTRATIVAS', NULL);
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'ADMINISTRACIÓN PÚBLICA VIRTUAL', N'CIENCIAS_ECONÓMICAS_Y_ADMINISTRATIVAS', NULL);
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'CICLOS PROPEDEUTICOS', N'CIENCIAS_ECONÓMICAS_Y_ADMINISTRATIVAS', NULL);
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'ECONOMÍA', N'CIENCIAS_ECONÓMICAS_Y_ADMINISTRATIVAS', NULL);
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'ARQUITECTURA', N'CIENCIAS_BÁSICAS_INGENIERÍAS_Y_ARQUITECTURA', NULL);
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'DEPARTAMENTO DE CIENCIAS BÁSICAS', N'CIENCIAS_BÁSICAS_INGENIERÍAS_Y_ARQUITECTURA', NULL);
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'DISEÑO INDUSTRIAL', N'CIENCIAS_BÁSICAS_INGENIERÍAS_Y_ARQUITECTURA', NULL);
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'INGENIERÍA DE SISTEMAS', N'CIENCIAS_BÁSICAS_INGENIERÍAS_Y_ARQUITECTURA', N'181');
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'INGENIERÍA INDUSTRIAL', N'CIENCIAS_BÁSICAS_INGENIERÍAS_Y_ARQUITECTURA', N'182');
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'CIENCIAS DEL DEPORTE Y LA ACTIVIAD FÍSICA', N'HUMANIDADES_Y_EDUCACIÓN', NULL);
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'DEPARTAMENTO DE HUMANIDADES', N'HUMANIDADES_Y_EDUCACIÓN', NULL);
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'INGLÉS INSTITUCIONAL', N'HUMANIDADES_Y_EDUCACIÓN', NULL);
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'LIC. CIENCIAS NATURALES Y EDUC. AMBIENTAL', N'HUMANIDADES_Y_EDUCACIÓN', NULL);
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'LIC. EDUCACIÓN INFANTIL PRESENCIAL', N'HUMANIDADES_Y_EDUCACIÓN', NULL);
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'LIC. EDUCACIÓN INTANTIL VIRTUAL', N'HUMANIDADES_Y_EDUCACIÓN', NULL);
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'LIC. LENGUAS EXTRANJERAS', N'HUMANIDADES_Y_EDUCACIÓN', NULL);
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'LIC. LINGUISTICA Y LITERATURA', N'HUMANIDADES_Y_EDUCACIÓN', NULL);
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'PSICOLOGÍA', N'HUMANIDADES_Y_EDUCACIÓN', NULL);
INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (N'TRABAJO SOCIAL', N'HUMANIDADES_Y_EDUCACIÓN', NULL);

-- Tipos de contrato
INSERT INTO aa.tipo_contrato (codigo) VALUES (N'TÉRMINO_FIJO');
INSERT INTO aa.tipo_contrato (codigo) VALUES (N'TÉRMINO_INDEFINIDO');
INSERT INTO aa.tipo_contrato (codigo) VALUES (N'LABOR_CONTRATADA');
INSERT INTO aa.tipo_contrato (codigo) VALUES (N'CÁTEDRAS');
INSERT INTO aa.tipo_contrato (codigo) VALUES (N'TUTOR_VIRTUAL');
INSERT INTO aa.tipo_contrato (codigo) VALUES (N'TUTOR_EAD');

-- Dedicaciones
INSERT INTO aa.dedicacion (codigo) VALUES (N'TIEMPO_COMPLETO');
INSERT INTO aa.dedicacion (codigo) VALUES (N'MEDIO_TIEMPO');
INSERT INTO aa.dedicacion (codigo) VALUES (N'HORA_LABOR');
INSERT INTO aa.dedicacion (codigo) VALUES (N'HORA_CÁTEDRA');
INSERT INTO aa.dedicacion (codigo) VALUES (N'TUTOR_VIRTUAL');
INSERT INTO aa.dedicacion (codigo) VALUES (N'TUTOR_EAD');

-- Categorías
INSERT INTO aa.categoria (codigo) VALUES (N'AUXILIAR');
INSERT INTO aa.categoria (codigo) VALUES (N'ASISTENTE');
INSERT INTO aa.categoria (codigo) VALUES (N'ASOCIADO');
INSERT INTO aa.categoria (codigo) VALUES (N'TITULAR');
INSERT INTO aa.categoria (codigo) VALUES (N'CATEGORÍA I');
INSERT INTO aa.categoria (codigo) VALUES (N'CATEGORÍA II');
INSERT INTO aa.categoria (codigo) VALUES (N'CATEGORÍA III');
INSERT INTO aa.categoria (codigo) VALUES (N'CATEGORÍA IV');
INSERT INTO aa.categoria (codigo) VALUES (N'CATEGORÍA ÚNICA');

-- Cascada contrato → dedicación → categoría (36 combinaciones, SPEC-001)
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TÉRMINO_FIJO', N'TIEMPO_COMPLETO', N'AUXILIAR');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TÉRMINO_FIJO', N'TIEMPO_COMPLETO', N'ASISTENTE');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TÉRMINO_FIJO', N'TIEMPO_COMPLETO', N'ASOCIADO');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TÉRMINO_FIJO', N'TIEMPO_COMPLETO', N'TITULAR');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TÉRMINO_FIJO', N'MEDIO_TIEMPO', N'AUXILIAR');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TÉRMINO_FIJO', N'MEDIO_TIEMPO', N'ASISTENTE');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TÉRMINO_FIJO', N'MEDIO_TIEMPO', N'ASOCIADO');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TÉRMINO_FIJO', N'MEDIO_TIEMPO', N'TITULAR');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TÉRMINO_INDEFINIDO', N'TIEMPO_COMPLETO', N'AUXILIAR');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TÉRMINO_INDEFINIDO', N'TIEMPO_COMPLETO', N'ASISTENTE');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TÉRMINO_INDEFINIDO', N'TIEMPO_COMPLETO', N'ASOCIADO');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TÉRMINO_INDEFINIDO', N'TIEMPO_COMPLETO', N'TITULAR');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TÉRMINO_INDEFINIDO', N'MEDIO_TIEMPO', N'AUXILIAR');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TÉRMINO_INDEFINIDO', N'MEDIO_TIEMPO', N'ASISTENTE');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TÉRMINO_INDEFINIDO', N'MEDIO_TIEMPO', N'ASOCIADO');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TÉRMINO_INDEFINIDO', N'MEDIO_TIEMPO', N'TITULAR');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'LABOR_CONTRATADA', N'HORA_LABOR', N'CATEGORÍA I');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'LABOR_CONTRATADA', N'HORA_LABOR', N'CATEGORÍA II');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'LABOR_CONTRATADA', N'HORA_LABOR', N'CATEGORÍA III');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'LABOR_CONTRATADA', N'HORA_LABOR', N'CATEGORÍA IV');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'LABOR_CONTRATADA', N'HORA_LABOR', N'CATEGORÍA ÚNICA');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'CÁTEDRAS', N'HORA_CÁTEDRA', N'CATEGORÍA I');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'CÁTEDRAS', N'HORA_CÁTEDRA', N'CATEGORÍA II');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'CÁTEDRAS', N'HORA_CÁTEDRA', N'CATEGORÍA III');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'CÁTEDRAS', N'HORA_CÁTEDRA', N'CATEGORÍA IV');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'CÁTEDRAS', N'HORA_CÁTEDRA', N'CATEGORÍA ÚNICA');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TUTOR_VIRTUAL', N'TUTOR_VIRTUAL', N'CATEGORÍA I');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TUTOR_VIRTUAL', N'TUTOR_VIRTUAL', N'CATEGORÍA II');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TUTOR_VIRTUAL', N'TUTOR_VIRTUAL', N'CATEGORÍA III');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TUTOR_VIRTUAL', N'TUTOR_VIRTUAL', N'CATEGORÍA IV');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TUTOR_VIRTUAL', N'TUTOR_VIRTUAL', N'CATEGORÍA ÚNICA');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TUTOR_EAD', N'TUTOR_EAD', N'CATEGORÍA I');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TUTOR_EAD', N'TUTOR_EAD', N'CATEGORÍA II');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TUTOR_EAD', N'TUTOR_EAD', N'CATEGORÍA III');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TUTOR_EAD', N'TUTOR_EAD', N'CATEGORÍA IV');
INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (N'TUTOR_EAD', N'TUTOR_EAD', N'CATEGORÍA ÚNICA');

-- Reglas por dedicación
INSERT INTO aa.regla_dedicacion (dedicacion, max_horas, preparacion, atencion, comunidades) VALUES (N'TIEMPO_COMPLETO', 40, 5, 5, 3);
INSERT INTO aa.regla_dedicacion (dedicacion, max_horas, preparacion, atencion, comunidades) VALUES (N'MEDIO_TIEMPO', 20, 2, 2, 3);
INSERT INTO aa.regla_dedicacion (dedicacion, max_horas, preparacion, atencion, comunidades) VALUES (N'HORA_CÁTEDRA', 12, 0, 0, 0);
INSERT INTO aa.regla_dedicacion (dedicacion, max_horas, preparacion, atencion, comunidades) VALUES (N'HORA_LABOR', 12, 0, 0, 0);
INSERT INTO aa.regla_dedicacion (dedicacion, max_horas, preparacion, atencion, comunidades) VALUES (N'TUTOR_VIRTUAL', 12, 0, 0, 0);
INSERT INTO aa.regla_dedicacion (dedicacion, max_horas, preparacion, atencion, comunidades) VALUES (N'TUTOR_EAD', 12, 0, 0, 0);

-- Límites
INSERT INTO aa.limite (id, max_cursos, max_descargas, max_administrativas) VALUES (1, 10, 3, 3);

-- Roles del formato oficial
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (1, N'DECANO', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (2, N'COORDINADORES ACADÉMICOS', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (3, N'DOCENTE DE APOYO A MAESTRÍAS', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (4, N'COORDINADOR ACADÉMICO POSGRADO', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (5, N'COORDINADOR ACADÉMICO EDUCACIÓN CONTINUA', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (6, N'COORDINADOR DE EVALUACIÓN PARA EL APRENDIZAJE', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (7, N'COORDINADOR DE GESTIÓN ACADÉMICA', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (8, N'COORDINADOR DE DESARROLLO PROFESORAL', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (9, N'JEFE DE DEPARTAMENTO HUMANIDADES', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (10, N'JEFE DEPARTAMENTO CIENCIAS BÁSICAS', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (11, N'DOCENTE COORDINADOR DE INGLÉS INSTITUCIONAL', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (12, N'DOCENTE CON FUNCIONES ADMINISTRATIVAS', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (13, N'DOCENTE CON FUNCIONES DIRECTIVAS', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (14, N'DOCENTE DE APOYO A REGISTRO CALIFICADO', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (15, N'COORDINADOR DE INVESTIGACIÓN DE LA FACULTAD', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (16, N'DOCENTE CON CLASES DIRECTAS', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (17, N'DOCENTE LIDER DE ÁREA', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (18, N'DOCENTE DE APOYO A COORDINACIÓN ACADÉMICA', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (19, N'DOCENTE DE APOYO A EVENTOS ACADÉMICOS', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (20, N'DOCENTE CON ACTIVIDADES DE AUTOEVALUACIÓN', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (21, N'DOCENTE DE APOYO A CENTRO DE EXCELENCIA', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (22, N'DOCENTE ASESOR DE CONSULTORIO JURÍDICO', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (23, N'DOCENTE COORDINACIÓN DE CONSULTORÍO JURÍDICO Y CENTRO DE CONCILIACIÓN', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (24, N'DOCENTE COORDINADOR DE ESPECIALIZACIONES', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (25, N'DOCENTE DE APOYO A MAESTRIAS', 'DOCENCIA', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (26, N'DOCENTE INVESTIGADOR PRINCIPAL DE PROYECTO DE FINANCIACIÓN INTERNA', 'INVESTIGACION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (27, N'DOCENTE COINVESTIGADOR DE PROYECTO DE FINANCIACIÓN INTERNA', 'INVESTIGACION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (28, N'INVESTIGADOR PRINCIPAL PROYECTO CON FINANCIACIÓN EXTERNA', 'INVESTIGACION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (29, N'CO - INVESTIGADOR PROYECTO CON FINANCIACIÓN EXTERNA*', 'INVESTIGACION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (30, N'TUTOR DE JOVEN INVESTIGADOR', 'INVESTIGACION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (31, N'TUTOR DE JOVEN PROGRAMA DELFÍN', 'INVESTIGACION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (32, N'DOCENTE EDITOR DE REVISTA CIENTÍFICA', 'INVESTIGACION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (33, N'COEDITOR DE REVISTA', 'INVESTIGACION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (34, N'DOCENTE APOYO ADTVO DIRECCIÓN DE INVESTIGACIÓN', 'INVESTIGACION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (35, N'DIRECTOR DE SEMILLERO DE INVESTIGACIÓN', 'INVESTIGACION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (36, N'DIRECTOR GRUPO DE INVESTIGACIÓN', 'INVESTIGACION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (37, N'LIDER DE LINEA DE INVESTIGACIÓN', 'INVESTIGACION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (38, N'DOCENTE CON ACTIVIDADES EN INVESTIGACIÓN', 'INVESTIGACION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (39, N'DOCENTE COORDINADOR CENTRO DE INNOVACIÓN Y EMPRENDIMIENTO CIEM DOCENTE DE APOYO A EMPRENDIMIENTO', 'EXTENSION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (40, N'DOCENTE COORDINADOR DE PRÁCTICAS DE PROGRAMA', 'EXTENSION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (41, N'DOCENTE COORDINADOR DE CENTROS Y CONSULTORIOS', 'EXTENSION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (42, N'DOCENTE ASESOR DE CENTROS Y CONSULTORIOS', 'EXTENSION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (43, N'DOCENTE COORDINADOR DE PUNTO BVC', 'EXTENSION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (44, N'DOCENTE CON ACTIVIDADES DE EXTENSIÓN Y PROYECCIÓN SOCIAL', 'EXTENSION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (45, N'DOCENTE DE APOYO A CENTRO DE CONSULTORÍA', 'EXTENSION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (46, N'DOCENTE ASESOR DE CENTRO DE ATENCIÓN PSICOLÓGICA CAPS', 'EXTENSION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (47, N'DOCENTE COORDINADOR DE CENTRO DE ATENCIÓN PSICOLÓGICA – CAPS', 'EXTENSION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (48, N'DOCENTE COORDINADOR DE PRÁCTICA DOCENCIA - SERVICIO', 'EXTENSION', 0);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (49, N'COORDINADOR DE LABORATORIO', 'DOCENCIA', 1);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (50, N'COORDINADOR PUNTO BVC', 'DOCENCIA', 1);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (51, N'DOCENTE SECRETARIO DEL CONSEJO DE FACULTAD', 'DOCENCIA', 1);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (52, N'DOCENTE APOYO A FACULTADES', 'DOCENCIA', 1);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (53, N'DOCENTE APOYO A EVENTOS', 'DOCENCIA', 1);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (54, N'DOCENTE APOYO CONVENIO CPNAA', 'DOCENCIA', 1);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (55, N'DOCENTE DE APOYO A NAFF', 'DOCENCIA', 1);
INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (56, N'DOCENTE DE APOYO A LA SECRETARÍA DE FACULTADES', 'DOCENCIA', 1);

COMMIT TRANSACTION;
