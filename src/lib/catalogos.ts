// Catálogos extraídos del formato oficial CECAR
// (ASIGNACION_IS_2026_2PV3). Generado desde el .xlsx — no editar a mano.

export type TipoRol = "DOCENCIA" | "INVESTIGACION" | "EXTENSION";

export interface Rol {
  id: number;
  nombre: string;
  tipo: TipoRol;
  /** Roles que en el Excel quedaban fuera de todo rango SUMIF (DU57:DU64)
   *  y cuyas horas se perdían. Aquí se clasifican como DOCENCIA. */
  reclasificado?: boolean;
}

export const ROLES: Rol[] = [
  { id: 1, nombre: "DECANO", tipo: "DOCENCIA" },
  { id: 2, nombre: "COORDINADORES ACADÉMICOS", tipo: "DOCENCIA" },
  { id: 3, nombre: "DOCENTE DE APOYO A MAESTRÍAS", tipo: "DOCENCIA" },
  { id: 4, nombre: "COORDINADOR ACADÉMICO POSGRADO", tipo: "DOCENCIA" },
  { id: 5, nombre: "COORDINADOR ACADÉMICO EDUCACIÓN CONTINUA", tipo: "DOCENCIA" },
  { id: 6, nombre: "COORDINADOR DE EVALUACIÓN PARA EL APRENDIZAJE", tipo: "DOCENCIA" },
  { id: 7, nombre: "COORDINADOR DE GESTIÓN ACADÉMICA", tipo: "DOCENCIA" },
  { id: 8, nombre: "COORDINADOR DE DESARROLLO PROFESORAL", tipo: "DOCENCIA" },
  { id: 9, nombre: "JEFE DE DEPARTAMENTO HUMANIDADES", tipo: "DOCENCIA" },
  { id: 10, nombre: "JEFE DEPARTAMENTO CIENCIAS BÁSICAS", tipo: "DOCENCIA" },
  { id: 11, nombre: "DOCENTE COORDINADOR DE INGLÉS INSTITUCIONAL", tipo: "DOCENCIA" },
  { id: 12, nombre: "DOCENTE CON FUNCIONES ADMINISTRATIVAS", tipo: "DOCENCIA" },
  { id: 13, nombre: "DOCENTE CON FUNCIONES DIRECTIVAS", tipo: "DOCENCIA" },
  { id: 14, nombre: "DOCENTE DE APOYO A REGISTRO CALIFICADO", tipo: "DOCENCIA" },
  { id: 15, nombre: "COORDINADOR DE INVESTIGACIÓN DE LA FACULTAD", tipo: "DOCENCIA" },
  { id: 16, nombre: "DOCENTE CON CLASES DIRECTAS", tipo: "DOCENCIA" },
  { id: 17, nombre: "DOCENTE LIDER DE ÁREA", tipo: "DOCENCIA" },
  { id: 18, nombre: "DOCENTE DE APOYO A COORDINACIÓN ACADÉMICA", tipo: "DOCENCIA" },
  { id: 19, nombre: "DOCENTE DE APOYO A EVENTOS ACADÉMICOS", tipo: "DOCENCIA" },
  { id: 20, nombre: "DOCENTE CON ACTIVIDADES DE AUTOEVALUACIÓN", tipo: "DOCENCIA" },
  { id: 21, nombre: "DOCENTE DE APOYO A CENTRO DE EXCELENCIA", tipo: "DOCENCIA" },
  { id: 22, nombre: "DOCENTE ASESOR DE CONSULTORIO JURÍDICO", tipo: "DOCENCIA" },
  { id: 23, nombre: "DOCENTE COORDINACIÓN DE CONSULTORÍO JURÍDICO Y CENTRO DE CONCILIACIÓN", tipo: "DOCENCIA" },
  { id: 24, nombre: "DOCENTE COORDINADOR DE ESPECIALIZACIONES", tipo: "DOCENCIA" },
  { id: 25, nombre: "DOCENTE DE APOYO A MAESTRIAS", tipo: "DOCENCIA" },
  { id: 26, nombre: "DOCENTE INVESTIGADOR PRINCIPAL DE PROYECTO DE FINANCIACIÓN INTERNA", tipo: "INVESTIGACION" },
  { id: 27, nombre: "DOCENTE COINVESTIGADOR DE PROYECTO DE FINANCIACIÓN INTERNA", tipo: "INVESTIGACION" },
  { id: 28, nombre: "INVESTIGADOR PRINCIPAL PROYECTO CON FINANCIACIÓN EXTERNA", tipo: "INVESTIGACION" },
  { id: 29, nombre: "CO - INVESTIGADOR PROYECTO CON FINANCIACIÓN EXTERNA*", tipo: "INVESTIGACION" },
  { id: 30, nombre: "TUTOR DE JOVEN INVESTIGADOR", tipo: "INVESTIGACION" },
  { id: 31, nombre: "TUTOR DE JOVEN PROGRAMA DELFÍN", tipo: "INVESTIGACION" },
  { id: 32, nombre: "DOCENTE EDITOR DE REVISTA CIENTÍFICA", tipo: "INVESTIGACION" },
  { id: 33, nombre: "COEDITOR DE REVISTA", tipo: "INVESTIGACION" },
  { id: 34, nombre: "DOCENTE APOYO ADTVO DIRECCIÓN DE INVESTIGACIÓN", tipo: "INVESTIGACION" },
  { id: 35, nombre: "DIRECTOR DE SEMILLERO DE INVESTIGACIÓN", tipo: "INVESTIGACION" },
  { id: 36, nombre: "DIRECTOR GRUPO DE INVESTIGACIÓN", tipo: "INVESTIGACION" },
  { id: 37, nombre: "LIDER DE LINEA DE INVESTIGACIÓN", tipo: "INVESTIGACION" },
  { id: 38, nombre: "DOCENTE CON ACTIVIDADES EN INVESTIGACIÓN", tipo: "INVESTIGACION" },
  { id: 39, nombre: "DOCENTE COORDINADOR CENTRO DE INNOVACIÓN Y EMPRENDIMIENTO CIEM DOCENTE DE APOYO A EMPRENDIMIENTO", tipo: "EXTENSION" },
  { id: 40, nombre: "DOCENTE COORDINADOR DE PRÁCTICAS DE PROGRAMA", tipo: "EXTENSION" },
  { id: 41, nombre: "DOCENTE COORDINADOR DE CENTROS Y CONSULTORIOS", tipo: "EXTENSION" },
  { id: 42, nombre: "DOCENTE ASESOR DE CENTROS Y CONSULTORIOS", tipo: "EXTENSION" },
  { id: 43, nombre: "DOCENTE COORDINADOR DE PUNTO BVC", tipo: "EXTENSION" },
  { id: 44, nombre: "DOCENTE CON ACTIVIDADES DE EXTENSIÓN Y PROYECCIÓN SOCIAL", tipo: "EXTENSION" },
  { id: 45, nombre: "DOCENTE DE APOYO A CENTRO DE CONSULTORÍA", tipo: "EXTENSION" },
  { id: 46, nombre: "DOCENTE ASESOR DE CENTRO DE ATENCIÓN PSICOLÓGICA CAPS", tipo: "EXTENSION" },
  { id: 47, nombre: "DOCENTE COORDINADOR DE CENTRO DE ATENCIÓN PSICOLÓGICA – CAPS", tipo: "EXTENSION" },
  { id: 48, nombre: "DOCENTE COORDINADOR DE PRÁCTICA DOCENCIA - SERVICIO", tipo: "EXTENSION" },
  { id: 49, nombre: "COORDINADOR DE LABORATORIO", tipo: "DOCENCIA", reclasificado: true },
  { id: 50, nombre: "COORDINADOR PUNTO BVC", tipo: "DOCENCIA", reclasificado: true },
  { id: 51, nombre: "DOCENTE SECRETARIO DEL CONSEJO DE FACULTAD", tipo: "DOCENCIA", reclasificado: true },
  { id: 52, nombre: "DOCENTE APOYO A FACULTADES", tipo: "DOCENCIA", reclasificado: true },
  { id: 53, nombre: "DOCENTE APOYO A EVENTOS", tipo: "DOCENCIA", reclasificado: true },
  { id: 54, nombre: "DOCENTE APOYO CONVENIO CPNAA", tipo: "DOCENCIA", reclasificado: true },
  { id: 55, nombre: "DOCENTE DE APOYO A NAFF", tipo: "DOCENCIA", reclasificado: true },
  { id: 56, nombre: "DOCENTE DE APOYO A LA SECRETARÍA DE FACULTADES", tipo: "DOCENCIA", reclasificado: true },
];

export const FACULTADES: string[] = [
  "CIENCIAS_BÁSICAS_INGENIERÍAS_Y_ARQUITECTURA",
  "CIENCIAS_ECONÓMICAS_Y_ADMINISTRATIVAS",
  "DERECHO_Y_CIENCIAS_POLÍTICAS",
  "HUMANIDADES_Y_EDUCACIÓN",
];

export interface Programa { nombre: string; facultad: string; }

export const PROGRAMAS: Programa[] = [
  { nombre: "DERECHO", facultad: "DERECHO_Y_CIENCIAS_POLÍTICAS" },
  { nombre: "CONTADURÍA PÚBLICA PRESENCIAL", facultad: "CIENCIAS_ECONÓMICAS_Y_ADMINISTRATIVAS" },
  { nombre: "CONTADURÍA PÚBLICA VIRTUAL", facultad: "CIENCIAS_ECONÓMICAS_Y_ADMINISTRATIVAS" },
  { nombre: "AMDINISTRACIÓN DE EMPRESAS PRESENCIAL", facultad: "CIENCIAS_ECONÓMICAS_Y_ADMINISTRATIVAS" },
  { nombre: "ADMINISTRACIÓN DE EMPRESAS VIRTUAL", facultad: "CIENCIAS_ECONÓMICAS_Y_ADMINISTRATIVAS" },
  { nombre: "ADMINISTRACIÓN DE EMPRESAS EAD", facultad: "CIENCIAS_ECONÓMICAS_Y_ADMINISTRATIVAS" },
  { nombre: "ADMINISTRACIÓN PÚBLICA EAD", facultad: "CIENCIAS_ECONÓMICAS_Y_ADMINISTRATIVAS" },
  { nombre: "ADMINISTRACIÓN PÚBLICA VIRTUAL", facultad: "CIENCIAS_ECONÓMICAS_Y_ADMINISTRATIVAS" },
  { nombre: "CICLOS PROPEDEUTICOS", facultad: "CIENCIAS_ECONÓMICAS_Y_ADMINISTRATIVAS" },
  { nombre: "ECONOMÍA", facultad: "CIENCIAS_ECONÓMICAS_Y_ADMINISTRATIVAS" },
  { nombre: "ARQUITECTURA", facultad: "CIENCIAS_BÁSICAS_INGENIERÍAS_Y_ARQUITECTURA" },
  { nombre: "DEPARTAMENTO DE CIENCIAS BÁSICAS", facultad: "CIENCIAS_BÁSICAS_INGENIERÍAS_Y_ARQUITECTURA" },
  { nombre: "DISEÑO INDUSTRIAL", facultad: "CIENCIAS_BÁSICAS_INGENIERÍAS_Y_ARQUITECTURA" },
  { nombre: "INGENIERÍA DE SISTEMAS", facultad: "CIENCIAS_BÁSICAS_INGENIERÍAS_Y_ARQUITECTURA" },
  { nombre: "INGENIERÍA INDUSTRIAL", facultad: "CIENCIAS_BÁSICAS_INGENIERÍAS_Y_ARQUITECTURA" },
  { nombre: "CIENCIAS DEL DEPORTE Y LA ACTIVIAD FÍSICA", facultad: "HUMANIDADES_Y_EDUCACIÓN" },
  { nombre: "DEPARTAMENTO DE HUMANIDADES", facultad: "HUMANIDADES_Y_EDUCACIÓN" },
  { nombre: "INGLÉS INSTITUCIONAL", facultad: "HUMANIDADES_Y_EDUCACIÓN" },
  { nombre: "LIC. CIENCIAS NATURALES Y EDUC. AMBIENTAL", facultad: "HUMANIDADES_Y_EDUCACIÓN" },
  { nombre: "LIC. EDUCACIÓN INFANTIL PRESENCIAL", facultad: "HUMANIDADES_Y_EDUCACIÓN" },
  { nombre: "LIC. EDUCACIÓN INTANTIL VIRTUAL", facultad: "HUMANIDADES_Y_EDUCACIÓN" },
  { nombre: "LIC. LENGUAS EXTRANJERAS", facultad: "HUMANIDADES_Y_EDUCACIÓN" },
  { nombre: "LIC. LINGUISTICA Y LITERATURA", facultad: "HUMANIDADES_Y_EDUCACIÓN" },
  { nombre: "PSICOLOGÍA", facultad: "HUMANIDADES_Y_EDUCACIÓN" },
  { nombre: "TRABAJO SOCIAL", facultad: "HUMANIDADES_Y_EDUCACIÓN" },
];

/** TIPO DE CONTRATO → DEDICACIÓN → CATEGORÍAS (las listas en cascada INDIRECT) */
export const CONTRATOS: Record<string, Record<string, string[]>> = {
  "TÉRMINO_FIJO": {
    "TIEMPO_COMPLETO": ["AUXILIAR", "ASISTENTE"],
    "MEDIO_TIEMPO": ["ASOCIADO", "TITULAR"],
  },
  "TÉRMINO_INDEFINIDO": {
    "TIEMPO_COMPLETO": ["AUXILIAR", "ASISTENTE"],
    "MEDIO_TIEMPO": ["ASOCIADO", "TITULAR"],
  },
  "LABOR_CONTRATADA": {
    "HORA_LABOR": ["CATEGORÍA I", "CATEGORÍA II", "CATEGORÍA III", "CATEGORÍA IV", "CATEGORÍA ÚNICA"],
  },
  "CÁTEDRAS": {
    "HORA_CÁTEDRA": ["CATEGORÍA I", "CATEGORÍA II", "CATEGORÍA III", "CATEGORÍA IV", "CATEGORÍA ÚNICA"],
  },
  "TUTOR_VIRTUAL": {
    "TUTOR_VIRTUAL": ["CATEGORÍA I", "CATEGORÍA II", "CATEGORÍA III", "CATEGORÍA IV", "CATEGORÍA ÚNICA"],
  },
  "TUTOR_EAD": {
    "TUTOR_EAD": ["CATEGORÍA I", "CATEGORÍA II", "CATEGORÍA III", "CATEGORÍA IV", "CATEGORÍA ÚNICA"],
  },
};

export const NIVELES_FORMACION = ["PREGRADO", "ESPECIALIZACIÓN", "MAGISTER", "DOCTOR", "POSDOCTOR"];
export const CATEGORIAS_MINCIENCIAS = ["ASOCIADO", "JUNIOR", "SENIOR", "RECONOCIDO", "NO POSEE", "ÚNICA"];
export const SECTORES = ["SECTOR PRIVADO", "SECTOR PÚBLICO", "SECTOR PÚBLICO Y SECTOR PRIVADO"];
export const SEDES = ["SINCELEJO", "CAT_VILLAVICENCIO", "CAT"];
export const JORNADAS = ["DIURNA", "NOCTURNA", "MIXTA"];
export const MODALIDADES = ["PRESENCIAL", "VIRTUAL", "EAD"];

/** Máximo de horas semanales y horas de apoyo académico por dedicación.
 *  Deducido de los 45 docentes del formato: TC=40/13, MT=20/7, cátedra≤12/0. */
export interface ReglaDedicacion {
  maxHoras: number;
  preparacion: number;
  atencion: number;
  comunidades: number;
}

export const REGLAS_DEDICACION: Record<string, ReglaDedicacion> = {
  TIEMPO_COMPLETO: { maxHoras: 40, preparacion: 5, atencion: 5, comunidades: 3 },
  MEDIO_TIEMPO:    { maxHoras: 20, preparacion: 2, atencion: 2, comunidades: 3 },
  HORA_CÁTEDRA:    { maxHoras: 12, preparacion: 0, atencion: 0, comunidades: 0 },
  HORA_LABOR:      { maxHoras: 12, preparacion: 0, atencion: 0, comunidades: 0 },
  TUTOR_VIRTUAL:   { maxHoras: 12, preparacion: 0, atencion: 0, comunidades: 0 },
  TUTOR_EAD:       { maxHoras: 12, preparacion: 0, atencion: 0, comunidades: 0 },
};

export const MAX_DESCARGAS = 3;
export const MAX_ADMINISTRATIVAS = 3;
export const MAX_CURSOS = 10;
