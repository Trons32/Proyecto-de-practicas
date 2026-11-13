/**
 * Qué columna es qué, sin depender de su posición (SPEC-017).
 *
 * No hay ejemplos de los formatos viejos, así que no se mapean celdas fijas:
 * cada campo se reconoce por cómo suele titularse, y el grupo de encabezado
 * de arriba («DESCARGAS DIRECTAS», «CURSOS») deshace los empates —en el
 * formato oficial «DEDICACIÓN HORAS» y «No.» aparecen varias veces—. Lo
 * que aquí no se reconozca lo asigna el administrador a mano.
 *
 * Los patrones se prueban contra el texto ya normalizado (sin tildes, en
 * mayúsculas, sin signos): «NÚMERO DE CRÉDITOS» llega como
 * «NUMERO DE CREDITOS».
 */

export type Ambito = "docente" | "curso" | "descarga" | "administrativa" | "control";

export type CampoId =
  | "numero"
  | "documento"
  | "nombres"
  | "nivelFormacion"
  | "perfilProfesional"
  | "categoriaMinciencias"
  | "activoSectorExterno"
  | "sectorEjerce"
  | "tipoContrato"
  | "dedicacion"
  | "categoria"
  | "sede"
  | "evaluacionDocente"
  | "observaciones"
  | "descargaRol"
  | "descargaHoras"
  | "adminRol"
  | "adminHoras"
  | "preparacion"
  | "atencion"
  | "comunidades"
  | "codigoPrograma"
  | "nombrePrograma"
  | "codigoPensum"
  | "codigoCurso"
  | "nombreCurso"
  | "semestre"
  | "grupo"
  | "jornada"
  | "intensidadHoraria"
  | "creditos"
  | "estudiantes"
  | "modalidad"
  | "ctrlEstudiantes"
  | "ctrlHorasClase"
  | "ctrlDescargas"
  | "ctrlApoyo"
  | "ctrlGranTotal"
  | "ctrlTotalSemanal";

export interface DefCampo {
  id: CampoId;
  etiqueta: string;
  ambito: Ambito;
  /** Contra el título de la columna. */
  patrones: RegExp[];
  /** El grupo de encabezado tiene que decir esto… */
  grupo?: RegExp;
  /** …y no puede decir esto. */
  noGrupo?: RegExp;
  /** Admite varias columnas (formatos con «ROL 1», «ROL 2»…). */
  varias?: boolean;
}

const DESC = /DESCARGA/;
const ADM = /ADMINISTRATIV|APOYO ACADEMICO/;
const CURSOS = /CURSO|ASIGNATURA|ACADEMICA ASIGNADA|CARGA ACADEMICA/;
const NO_DOCENTE = /DESCARGA|ADMINISTRATIV|CURSO|ASIGNATURA|DEDICACION SEMANAL/;

export const CAMPOS: DefCampo[] = [
  // ---- El docente ----
  { id: "numero", etiqueta: "No.", ambito: "docente", patrones: [/^(NO|N|NRO|NUM|ITEM|CONSECUTIVO)$/], noGrupo: NO_DOCENTE },
  {
    id: "documento",
    etiqueta: "Número de documento",
    ambito: "docente",
    patrones: [/DOCUMENTO|CEDULA|^C ?C$|IDENTIFICACION/],
  },
  {
    id: "nombres",
    etiqueta: "Nombres y apellidos",
    ambito: "docente",
    patrones: [/NOMBRES? (Y|COMPLETO)|APELLIDOS|^NOMBRE DEL DOCENTE$|^DOCENTE$|^NOMBRES?$/],
    noGrupo: CURSOS,
  },
  { id: "nivelFormacion", etiqueta: "Nivel de formación", ambito: "docente", patrones: [/NIVEL (DE )?FORMACION|^FORMACION$|TITULO MAXIMO|MAXIMO NIVEL/] },
  { id: "perfilProfesional", etiqueta: "Perfil profesional", ambito: "docente", patrones: [/PERFIL/] },
  { id: "categoriaMinciencias", etiqueta: "Categoría Minciencias", ambito: "docente", patrones: [/MINCIENCIAS|COLCIENCIAS/] },
  { id: "activoSectorExterno", etiqueta: "¿Activo en el sector externo?", ambito: "docente", patrones: [/ACTIVO EN EL SECTOR|SECTOR EXTERNO/] },
  { id: "sectorEjerce", etiqueta: "Sector donde ejerce", ambito: "docente", patrones: [/SECTOR DONDE|EJERCE/] },
  { id: "tipoContrato", etiqueta: "Tipo de contrato", ambito: "docente", patrones: [/CONTRATO|VINCULACION$|TIPO DE VINCULACION/] },
  {
    id: "dedicacion",
    etiqueta: "Dedicación",
    ambito: "docente",
    patrones: [/^DEDICACION$|^TIPO DE DEDICACION$|^DEDICACION DOCENTE$/],
    noGrupo: /DESCARGA|ADMINISTRATIV/,
  },
  { id: "categoria", etiqueta: "Categoría (escalafón)", ambito: "docente", patrones: [/^CATEGORIA$|ESCALAFON|CATEGORIA DOCENTE/] },
  { id: "sede", etiqueta: "Sede", ambito: "docente", patrones: [/^SEDE$|^SEDE |^CAT$|CENTRO DE ATENCION/] },
  { id: "evaluacionDocente", etiqueta: "Evaluación docente", ambito: "docente", patrones: [/EVALUACION/] },
  { id: "observaciones", etiqueta: "Observaciones", ambito: "docente", patrones: [/OBSERVACION/] },

  // ---- Descargas y actividades administrativas ----
  {
    id: "descargaRol",
    etiqueta: "Rol de descarga",
    ambito: "descarga",
    patrones: [/^HORAS DIRECTAS$|^ROL( \d)?$|^ROLES?$|DESCARGA DIRECTA$|^TIPO DE DESCARGA|^ACTIVIDAD$/],
    grupo: DESC,
    varias: true,
  },
  {
    id: "descargaRol",
    etiqueta: "Rol de descarga",
    ambito: "descarga",
    patrones: [/^ROL (DE )?DESCARGA|^DESCARGAS? DIRECTAS?$/],
    varias: true,
  },
  {
    id: "descargaHoras",
    etiqueta: "Horas de descarga (por rol)",
    ambito: "descarga",
    patrones: [/^DEDICACION HORAS$|^HORAS( \d)?$|^DEDICACION$|^HORAS ROL/],
    grupo: DESC,
    varias: true,
  },
  // Sin grupo encima, «ROL» y «HORAS» a secas se leen como descarga: el
  // motor clasifica las horas por el tipo del rol, no por la columna, así
  // que el total por función sale igual.
  { id: "descargaRol", etiqueta: "Rol de descarga", ambito: "descarga", patrones: [/^ROL( \d+)?$|^ROLES?$/], noGrupo: ADM, varias: true },
  { id: "descargaHoras", etiqueta: "Horas de descarga (por rol)", ambito: "descarga", patrones: [/^HORAS( (DEL? )?ROL)?( \d+)?$/], noGrupo: ADM, varias: true },
  {
    id: "adminRol",
    etiqueta: "Rol administrativo",
    ambito: "administrativa",
    patrones: [/^HORAS ADMINISTRATIVAS$|^ROL( \d)?$|^ROLES?$|^ACTIVIDAD( ADMINISTRATIVA)?$/],
    grupo: ADM,
    varias: true,
  },
  {
    id: "adminRol",
    etiqueta: "Rol administrativo",
    ambito: "administrativa",
    patrones: [/^ROL ADMINISTRATIVO|^ACTIVIDADES? ADMINISTRATIVAS?$/],
    varias: true,
  },
  {
    id: "adminHoras",
    etiqueta: "Horas administrativas (por rol)",
    ambito: "administrativa",
    patrones: [/^DEDICACION HORAS$|^HORAS( \d)?$|^DEDICACION$|^HORAS ROL/],
    grupo: ADM,
    varias: true,
  },
  { id: "preparacion", etiqueta: "Preparación de clases", ambito: "docente", patrones: [/PREPARACION/] },
  { id: "atencion", etiqueta: "Atención a estudiantes", ambito: "docente", patrones: [/ATENCION/] },
  { id: "comunidades", etiqueta: "Comunidades académicas", ambito: "docente", patrones: [/COMUNIDAD/] },

  // ---- Los cursos, una fila cada uno ----
  { id: "codigoPrograma", etiqueta: "Código del programa", ambito: "curso", patrones: [/CODIGO (DEL )?PROGRAMA|COD PROGRAMA/] },
  { id: "nombrePrograma", etiqueta: "Nombre del programa", ambito: "curso", patrones: [/^(NOMBRE (DEL )?)?PROGRAMA$/] },
  { id: "codigoPensum", etiqueta: "Código del pensum", ambito: "curso", patrones: [/PENSUM|PLAN DE ESTUDIO/] },
  { id: "codigoCurso", etiqueta: "Código del curso", ambito: "curso", patrones: [/CODIGO (DEL |DE LA )?(CURSO|ASIGNATURA|MATERIA)|COD (CURSO|ASIGNATURA)/] },
  {
    id: "nombreCurso",
    etiqueta: "Nombre del curso",
    ambito: "curso",
    patrones: [/NOMBRE (DEL |DE LA )?(CURSO|ASIGNATURA|MATERIA)|^(CURSO|ASIGNATURA|MATERIA)S?$/],
  },
  { id: "semestre", etiqueta: "Semestre", ambito: "curso", patrones: [/^SEMESTRE|^NIVEL$/] },
  { id: "grupo", etiqueta: "Grupo / bloque", ambito: "curso", patrones: [/^GRUPO|BLOQUE/] },
  { id: "jornada", etiqueta: "Jornada", ambito: "curso", patrones: [/JORNADA/] },
  {
    id: "intensidadHoraria",
    etiqueta: "Intensidad horaria semanal",
    ambito: "curso",
    patrones: [/INTENSIDAD|HORAS SEMANALES (DEL CURSO|POR CURSO)|^IH$|^I H S?$|HORAS CURSO/],
  },
  { id: "creditos", etiqueta: "Créditos", ambito: "curso", patrones: [/CREDITO/] },
  { id: "estudiantes", etiqueta: "Estudiantes del curso", ambito: "curso", patrones: [/ESTUDIANTES|MATRICULADOS|ALUMNOS/], grupo: CURSOS },
  { id: "modalidad", etiqueta: "Modalidad", ambito: "curso", patrones: [/^MODALIDAD/] },

  // ---- Lo que el Excel ya calculó: sirve para comprobar la lectura ----
  { id: "ctrlEstudiantes", etiqueta: "Total de estudiantes del docente", ambito: "control", patrones: [/ESTUDIANTES|MATRICULADOS|ALUMNOS/], noGrupo: CURSOS },
  { id: "ctrlHorasClase", etiqueta: "Total horas de clase", ambito: "control", patrones: [/^HORAS DE CLASE$|TOTAL HORAS (DE )?CLASE/] },
  { id: "ctrlDescargas", etiqueta: "Total horas de descarga", ambito: "control", patrones: [/^HORAS DE DESCARGA$|TOTAL (HORAS )?(DE )?DESCARGA/] },
  { id: "ctrlApoyo", etiqueta: "Total apoyo académico", ambito: "control", patrones: [/TOTAL HORAS DE APOYO|TOTAL APOYO/] },
  { id: "ctrlGranTotal", etiqueta: "Gran total de horas", ambito: "control", patrones: [/GRAN TOTAL/] },
  { id: "ctrlTotalSemanal", etiqueta: "Total horas semanales", ambito: "control", patrones: [/^TOTAL HORAS SEMANALES$|^TOTAL SEMANAL/] },
];

/** Un campo por id, para mostrarlo (la primera definición manda la etiqueta). */
export const CAMPO_POR_ID: Record<CampoId, DefCampo> = Object.fromEntries(
  [...CAMPOS].reverse().map((c) => [c.id, c])
) as Record<CampoId, DefCampo>;

export const CAMPOS_UNICOS: DefCampo[] = Object.values(CAMPO_POR_ID);

/** ¿Cuánto se parece una columna a un campo? 0 si no se parece. */
export function puntaje(def: DefCampo, columna: string, grupo: string): number {
  if (!def.patrones.some((p) => p.test(columna))) return 0;
  if (def.grupo && !def.grupo.test(grupo)) return 0;
  if (def.noGrupo && grupo && def.noGrupo.test(grupo)) return 0;
  // Un grupo que confirma vale más que un título suelto: deshace empates
  // como «NÚMERO DE ESTUDIANTES», que es del docente o del curso según dónde esté.
  return 2 + (def.grupo ? 1 : 0) + (def.patrones.some((p) => p.source.startsWith("^") && p.test(columna)) ? 0.5 : 0);
}
