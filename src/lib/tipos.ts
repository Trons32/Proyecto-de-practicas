import { REGLAS_DEDICACION } from "./catalogos";

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

export interface Asignacion {
  periodo: string;
  facultad: string;
  programa: string;
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

export const nuevoDocente = (): Docente => ({
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
  cursos: [nuevoCurso()],
});

/** Aplica las horas de apoyo que corresponden a la dedicación elegida. */
export function aplicarReglaDedicacion(d: Docente, dedicacion: string): Docente {
  const regla = REGLAS_DEDICACION[dedicacion];
  if (!regla) return { ...d, dedicacion };
  return {
    ...d,
    dedicacion,
    preparacion: regla.preparacion,
    atencion: regla.atencion,
    comunidades: regla.comunidades,
  };
}
