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
 * El ciclo de vida de una asignación.
 *
 *   BORRADOR ──envía──► ENVIADA ──cierra la convocatoria──► EN_REVISION
 *                          ▲                                   │
 *                          │                       ┌───────────┴───────────┐
 *                          │                    aprueba                devuelve
 *                          │                       │                       │
 *                          │                       ▼                       ▼
 *                          └──reenvía──── EN_CORRECCION ◄──────────── APROBADA
 *                                                     (cambio de parámetros)
 *
 * La asignación solo es editable en `borrador` y en `en_correccion`. En
 * todo lo demás está en manos del administrador y se congela: es el punto
 * del proceso en que el coordinador ya no puede cambiar lo que entregó.
 */
export type EstadoAsignacion =
  | "borrador"
  | "enviada"
  | "en_revision"
  | "aprobada"
  | "en_correccion";

export const ETIQUETA_ESTADO: Record<EstadoAsignacion, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  en_revision: "En revisión",
  aprobada: "Aprobada",
  en_correccion: "En corrección",
};

/** Estados en los que el coordinador todavía puede tocar los docentes. */
export const esEditable = (estado: EstadoAsignacion): boolean =>
  estado === "borrador" || estado === "en_correccion";

/** Estados que el coordinador puede enviar al administrador. */
export const esEnviable = (estado: EstadoAsignacion): boolean => esEditable(estado);

/**
 * Qué ocurrió en una asignación. La bitácora es append-only: los eventos
 * no se editan ni se borran, porque su valor está justamente en que nadie
 * pueda reescribir lo que pasó.
 */
export type TipoEvento =
  | "creada"
  | "enviada"
  | "revision_abierta"
  | "aprobada"
  | "devuelta"
  | "reabierta_por_parametros"
  | "reenviada";

export interface Evento {
  id: string;
  tipo: TipoEvento;
  /** ISO 8601. */
  fecha: string;
  /** Quién lo hizo, con el nombre que tenía en ese momento. */
  autor: string;
  rolAutor: "ADMIN" | "COORDINADOR";
  /** Motivo de una devolución, o nota del administrador. */
  nota?: string;
  /** Plazo fijado al devolver o al reabrir, si lo hubo. ISO 8601. */
  plazo?: string;
  /** Número de envío al que corresponde el evento. */
  version?: number;
}

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
  /**
   * Cuántas veces se ha enviado. Empieza en 0 y sube con cada envío, de
   * modo que "v2" significa que hubo una devolución de por medio.
   */
  version: number;
  /**
   * Plazo propio para corregir, fijado por el administrador al devolver o
   * al reabrir por cambio de parámetros. Fuera de `en_correccion` no
   * aplica. ISO 8601.
   */
  plazoCorreccion?: string;
  /** Trazabilidad, del evento más antiguo al más reciente. */
  bitacora: Evento[];
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

/** Un evento nuevo para la bitácora, ya fechado. */
export const nuevoEvento = (
  datos: Omit<Evento, "id" | "fecha"> & { fecha?: string }
): Evento => ({
  id: uid(),
  fecha: datos.fecha ?? new Date().toISOString(),
  ...datos,
});

export const nuevaAsignacion = (
  datos: Pick<Asignacion, "periodo" | "facultad" | "programa">,
  autor = "—"
): Asignacion => {
  const ahora = new Date().toISOString();
  return {
    id: uid(),
    ...datos,
    estado: "borrador",
    creada: ahora,
    actualizada: ahora,
    version: 0,
    bitacora: [
      nuevoEvento({ tipo: "creada", autor, rolAutor: "COORDINADOR", fecha: ahora }),
    ],
    // Se crea vacía: el coordinador agrega los docentes uno a uno.
    docentes: [],
  };
};

/**
 * El periodo académico en curso. El año se parte por la mitad: de enero a
 * junio corre el primer semestre; de julio en adelante, el segundo.
 */
export function periodoActual(hoy = new Date()): string {
  const semestre = hoy.getMonth() < 6 ? 1 : 2;
  return `${hoy.getFullYear()}-${semestre}`;
}

/** El periodo que sigue a otro. Tras el 2 del año viene el 1 del siguiente. */
export function periodoSiguiente(periodo: string): string {
  const [año, semestre] = periodo.split("-").map(Number);
  return semestre === 1 ? `${año}-2` : `${año + 1}-1`;
}

/**
 * Los periodos entre los que se puede crear una asignación: el actual y el
 * siguiente, nada más. Crear es un acto sobre el futuro inmediato —el
 * histórico se consulta en el listado, no se alimenta desde aquí—, y
 * ofrecer diez años hacia atrás solo facilitaba equivocar la fecha.
 */
export function periodosAsignables(hoy = new Date()): string[] {
  const actual = periodoActual(hoy);
  return [actual, periodoSiguiente(actual)];
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
