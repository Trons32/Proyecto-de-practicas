import { REGLAS_DEDICACION, codigoDePrograma, type ReglaDedicacion } from "./catalogos";

export interface Descarga {
  id: string;
  rolId: number | null;
  horas: number;
}

export interface Administrativa {
  id: string;
  rolId: number | null;
  horas: number;
}

export interface Curso {
  id: string;
  codigoPrograma: string;
  nombrePrograma: string;
  codigoPensum: string;
  codigoCurso: string;
  nombreCurso: string;
  semestre: number | null;
  grupo: string;
  jornada: string;
  intensidadHoraria: number | null;
  creditos: number | null;
  estudiantes: number | null;
  modalidad: string;
}

export interface Docente {
  id: string;
  documento: string;
  nombres: string;
  nivelFormacion: string;
  perfilProfesional: string;
  categoriaMinciencias: string;
  activoSectorExterno: "SI" | "NO" | "";
  sectorEjerce: string;
  tipoContrato: string;
  dedicacion: string;
  categoria: string;
  sede: string;
  evaluacionDocente: number | null;
  observaciones: string;
  /** Horas de apoyo académico. Se autocompletan según la dedicación. */
  preparacion: number;
  atencion: number;
  comunidades: number;
  descargas: Descarga[];
  administrativas: Administrativa[];
  cursos: Curso[];
}

/**
 * Una asignación pasa a "completada" cuando el coordinador la cierra;
 * mientras tanto sigue siendo un borrador al que puede volver.
 */
export type EstadoAsignacion = "borrador" | "completada";

export interface Asignacion {
  id: string;
  periodo: string;
  facultad: string;
  programa: string;
  estado: EstadoAsignacion;
  /** ISO 8601. Sirve para ordenar el histórico y mostrar "última edición". */
  creada: string;
  actualizada: string;
  docentes: Docente[];
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const nuevaDescarga = (): Descarga => ({ id: uid(), rolId: null, horas: 0 });
export const nuevaAdministrativa = (): Administrativa => ({ id: uid(), rolId: null, horas: 0 });

export const nuevoCurso = (): Curso => ({
  id: uid(),
  codigoPrograma: "",
  nombrePrograma: "",
  codigoPensum: "",
  codigoCurso: "",
  nombreCurso: "",
  semestre: null,
  grupo: "",
  jornada: "",
  intensidadHoraria: null,
  creditos: null,
  estudiantes: null,
  modalidad: "",
});

/**
 * `programa` precarga el primer curso con el programa de la asignación,
 * que es el caso habitual; el coordinador puede cambiarlo por curso.
 */
export const nuevoDocente = (programa = ""): Docente => ({
  id: uid(),
  documento: "",
  nombres: "",
  nivelFormacion: "",
  perfilProfesional: "",
  categoriaMinciencias: "",
  activoSectorExterno: "",
  sectorEjerce: "",
  tipoContrato: "",
  dedicacion: "",
  categoria: "",
  sede: "",
  evaluacionDocente: null,
  observaciones: "",
  preparacion: 0,
  atencion: 0,
  comunidades: 0,
  descargas: [],
  administrativas: [],
  cursos: [{ ...nuevoCurso(), nombrePrograma: programa, codigoPrograma: codigoDePrograma(programa) }],
});

export const nuevaAsignacion = (
  datos: Pick<Asignacion, "periodo" | "facultad" | "programa">
): Asignacion => {
  const ahora = new Date().toISOString();
  return {
    id: uid(),
    ...datos,
    estado: "borrador",
    creada: ahora,
    actualizada: ahora,
    // Se crea vacía: el coordinador agrega los docentes uno a uno.
    docentes: [],
  };
};

/**
 * Periodos académicos seleccionables, del año en curso hacia atrás hasta
 * 2015, dos por año. Los más recientes primero: son los que se usan.
 */
export function periodosAcademicos(hasta = new Date().getFullYear()): string[] {
  const periodos: string[] = [];
  for (let año = hasta; año >= 2015; año--) {
    periodos.push(`${año}-2`, `${año}-1`);
  }
  return periodos;
}

/**
 * Aplica las horas de apoyo que corresponden a la dedicación elegida.
 * `reglas` permite usar las que el administrador haya parametrizado; por
 * defecto son las del formato oficial.
 */
export function aplicarReglaDedicacion(
  d: Docente,
  dedicacion: string,
  reglas: Record<string, ReglaDedicacion> = REGLAS_DEDICACION
): Docente {
  const regla = reglas[dedicacion];
  if (!regla) return { ...d, dedicacion };
  return {
    ...d,
    dedicacion,
    preparacion: regla.preparacion,
    atencion: regla.atencion,
    comunidades: regla.comunidades,
  };
}
