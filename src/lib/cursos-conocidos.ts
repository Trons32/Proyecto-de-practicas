/**
 * Los cursos que el sistema ya conoce, para no escribirlos dos veces
 * (SPEC-019). PURO: recibe las asignaciones como argumento.
 *
 * Un curso se repite mucho: el mismo docente lo da en varios grupos, otro
 * docente da el mismo curso, y cada semestre vuelve. Sus datos de catálogo
 * (código, pensum, semestre, intensidad, créditos) no cambian entre grupos;
 * lo que cambia es el grupo, la jornada y los estudiantes.
 */
import type { Asignacion, Curso } from "./tipos";

/** Lo que se copia de un curso conocido: su ficha de catálogo. */
export type FichaCurso = Pick<
  Curso,
  "nombrePrograma" | "codigoPrograma" | "codigoCurso" | "nombreCurso" | "codigoPensum" | "semestre" | "intensidadHoraria" | "creditos"
>;

const clave = (programa: string, nombre: string) => `${programa.trim()}|${nombre.trim().toUpperCase()}`;

/** Cuántos datos de catálogo trae: entre dos fichas del mismo curso gana la más completa. */
const completitud = (c: FichaCurso) =>
  [c.codigoCurso, c.codigoPensum].filter((x) => x.trim()).length +
  [c.semestre, c.intensidadHoraria, c.creditos].filter((x) => x !== null).length;

/**
 * Una ficha por curso (programa + nombre), de todas las asignaciones. Se
 * prefieren las más recientes: si el pensum cambió, vale el dato nuevo.
 */
export function catalogoDeCursos(asignaciones: Asignacion[]): FichaCurso[] {
  const recientes = [...asignaciones].sort((a, b) => b.periodo.localeCompare(a.periodo));
  const fichas = new Map<string, FichaCurso>();
  for (const a of recientes) {
    for (const d of a.docentes) {
      for (const c of d.cursos) {
        if (!c.nombreCurso.trim()) continue;
        const k = clave(c.nombrePrograma, c.nombreCurso);
        const ficha: FichaCurso = {
          nombrePrograma: c.nombrePrograma,
          codigoPrograma: c.codigoPrograma,
          codigoCurso: c.codigoCurso,
          nombreCurso: c.nombreCurso.trim().toUpperCase(),
          codigoPensum: c.codigoPensum,
          semestre: c.semestre,
          intensidadHoraria: c.intensidadHoraria,
          creditos: c.creditos,
        };
        const previa = fichas.get(k);
        // La primera que llega es la más reciente; una posterior solo la
        // reemplaza si la reciente vino con huecos.
        if (!previa || completitud(ficha) > completitud(previa)) fichas.set(k, ficha);
      }
    }
  }
  return [...fichas.values()].sort((a, b) => a.nombreCurso.localeCompare(b.nombreCurso, "es"));
}

/** Las fichas de un programa; si el programa no tiene ninguna, todas. */
export function fichasDePrograma(catalogo: FichaCurso[], programa: string): FichaCurso[] {
  const propias = catalogo.filter((f) => f.nombrePrograma === programa);
  return propias.length > 0 ? propias : catalogo;
}

/** La ficha que corresponde a lo escrito, por nombre exacto o por código. */
export function buscarFicha(
  fichas: FichaCurso[],
  { nombreCurso, codigoCurso }: { nombreCurso?: string; codigoCurso?: string }
): FichaCurso | undefined {
  if (nombreCurso !== undefined) {
    const n = nombreCurso.trim().toUpperCase();
    return n ? fichas.find((f) => f.nombreCurso === n) : undefined;
  }
  const c = codigoCurso?.trim();
  return c ? fichas.find((f) => f.codigoCurso.trim() === c) : undefined;
}

/**
 * Completa el curso con la ficha, **solo en lo que está vacío**: lo que el
 * coordinador ya escribió a mano no se pisa. El programa no se toca: es el
 * del curso, no el de la ficha.
 */
export function completarCurso(curso: Curso, ficha: FichaCurso): Partial<Curso> {
  const cambios: Partial<Curso> = {};
  if (!curso.nombreCurso.trim()) cambios.nombreCurso = ficha.nombreCurso;
  if (!curso.codigoCurso.trim() && ficha.codigoCurso) cambios.codigoCurso = ficha.codigoCurso;
  if (!curso.codigoPensum.trim() && ficha.codigoPensum) cambios.codigoPensum = ficha.codigoPensum;
  if (curso.semestre === null && ficha.semestre !== null) cambios.semestre = ficha.semestre;
  if (curso.intensidadHoraria === null && ficha.intensidadHoraria !== null) cambios.intensidadHoraria = ficha.intensidadHoraria;
  if (curso.creditos === null && ficha.creditos !== null) cambios.creditos = ficha.creditos;
  return cambios;
}

/**
 * El grupo que sigue al de un curso duplicado: "1" → "2". Si no es un
 * número o ya es el último, queda vacío para que se elija.
 */
export function grupoSiguiente(grupo: string, grupos: readonly string[]): string {
  const i = grupos.indexOf(grupo);
  return i >= 0 && i < grupos.length - 1 ? grupos[i + 1] : "";
}

/** El resumen de una línea de un curso plegado. */
export function resumenCurso(c: Curso): string[] {
  const minus = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
  return [
    c.codigoCurso && `Cód. ${c.codigoCurso}`,
    c.semestre !== null && `Sem ${c.semestre}`,
    c.grupo && `G${c.grupo}`,
    c.jornada && minus(c.jornada),
    c.modalidad && minus(c.modalidad),
    c.intensidadHoraria !== null && `${c.intensidadHoraria} h`,
    c.creditos !== null && `${c.creditos} cr`,
    c.estudiantes !== null && `${c.estudiantes} est.`,
  ].filter((x): x is string => Boolean(x));
}
