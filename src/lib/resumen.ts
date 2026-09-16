import {
  calcularTotales,
  validarDocente,
  CONFIG_OFICIAL,
  type Totales,
  type Hallazgo,
  type Configuracion,
} from "./calculo";
import type { Asignacion, Docente } from "./tipos";

export interface AnalisisDocente {
  docente: Docente;
  totales: Totales;
  hallazgos: Hallazgo[];
  errores: number;
}

export interface ResumenAsignacion {
  docentes: AnalisisDocente[];
  totalDocentes: number;
  horasTotales: number;
  estudiantesTotales: number;
  cursosTotales: number;
  totalErrores: number;
  /** Docentes sin ningún dato obligatorio pendiente. */
  completos: number;
}

/**
 * Totales y validaciones de una asignación completa. Es la fuente única
 * para la tarjeta de inicio y para la cabecera de la vista de asignación,
 * de modo que ambas no puedan contradecirse.
 */
export function resumirAsignacion(
  a: Asignacion,
  config: Configuracion = CONFIG_OFICIAL
): ResumenAsignacion {
  const docentes = a.docentes.map((d) => {
    const totales = calcularTotales(d, config);
    const hallazgos = validarDocente(d, totales);
    return {
      docente: d,
      totales,
      hallazgos,
      errores: hallazgos.filter((h) => h.severidad === "error").length,
    };
  });

  const sumar = (fn: (x: AnalisisDocente) => number) =>
    docentes.reduce((s, x) => s + fn(x), 0);

  return {
    docentes,
    totalDocentes: docentes.length,
    horasTotales: sumar((x) => x.totales.totalSemanal),
    estudiantesTotales: sumar((x) => x.totales.totalEstudiantes),
    cursosTotales: sumar((x) => x.totales.cursosDiferentes),
    totalErrores: sumar((x) => x.errores),
    completos: docentes.filter((x) => x.errores === 0).length,
  };
}

/**
 * Los catálogos guardan los nombres con guiones bajos, tal como salieron
 * del formato oficial. Al mostrarlos fuera de un <select> hay que limpiarlos.
 */
export const legible = (texto: string) => texto.replace(/_/g, " ");

/** "hace 5 minutos", "ayer"… para la marca de última edición. */
export function desde(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return "ayer";
  if (dias < 30) return `hace ${dias} días`;
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
