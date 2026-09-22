/**
 * Convocatorias: el plazo que tienen los coordinadores para subir las
 * asignaciones de un periodo.
 *
 * El administrador abre una convocatoria por periodo académico y fija su
 * fecha límite. Mientras está abierta, los coordinadores envían; cuando
 * vence, nadie más puede enviar y el administrador pasa a revisar lo que
 * llegó. Las correcciones no dependen de este plazo: llevan uno propio por
 * asignación (`plazoCorreccion`), porque se devuelven de a una y en
 * momentos distintos.
 */

export interface Convocatoria {
  /** El periodo que se está asignando, p. ej. "2026-2". */
  periodo: string;
  /** ISO 8601. Desde cuándo se puede enviar. */
  apertura: string;
  /** ISO 8601. El instante en que se cierra; después ya no se admite nada. */
  limite: string;
  /**
   * El administrador puede cerrarla antes de tiempo, o mantenerla cerrada
   * aunque la fecha no haya llegado. Sin esto habría que esperar al reloj.
   */
  cerradaManualmente: boolean;
}

export type EstadoConvocatoria = "sin_abrir" | "abierta" | "cerrada";

/**
 * El día se cierra al final, no al comienzo: una fecha límite del 15 de
 * agosto significa que el 15 entero sigue siendo hábil. Guardar el plazo
 * al arranque del día le quitaría al coordinador las 24 horas que cree
 * tener.
 */
export const finDelDia = (fecha: string): string => {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(a, m - 1, d, 23, 59, 59, 999).toISOString();
};

/** La fecha en el formato que espera un <input type="date">. */
export const comoFechaInput = (iso: string): string => {
  const d = new Date(iso);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
};

export function estadoConvocatoria(
  c: Convocatoria | null | undefined,
  ahora = Date.now()
): EstadoConvocatoria {
  if (!c) return "sin_abrir";
  if (c.cerradaManualmente) return "cerrada";
  if (ahora < new Date(c.apertura).getTime()) return "sin_abrir";
  return ahora <= new Date(c.limite).getTime() ? "abierta" : "cerrada";
}

/** Milisegundos que faltan para un plazo; negativo si ya venció. */
export const restante = (limite: string, ahora = Date.now()): number =>
  new Date(limite).getTime() - ahora;

/**
 * El tiempo que queda, dicho como lo diría una persona. El coordinador
 * necesita saber si le quedan días o si es cuestión de horas; el minuto
 * exacto solo añade ruido.
 */
export function plazoLegible(limite: string, ahora = Date.now()): string {
  const ms = restante(limite, ahora);
  if (ms <= 0) return "Plazo vencido";

  const minutos = Math.floor(ms / 60000);
  if (minutos < 60) return `Quedan ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Quedan ${horas} h`;

  const dias = Math.ceil(horas / 24);
  return dias === 1 ? "Queda 1 día" : `Quedan ${dias} días`;
}

/** Fecha larga en español, para mostrar el límite completo. */
export const fechaLegible = (iso: string): string =>
  new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * Cuándo conviene avisar de que el plazo aprieta. Tres días es el margen
 * con el que todavía se alcanza a corregir una asignación completa.
 */
export const DIAS_AVISO = 3;

export const plazoApremiante = (limite: string, ahora = Date.now()): boolean => {
  const ms = restante(limite, ahora);
  return ms > 0 && ms <= DIAS_AVISO * 24 * 60 * 60 * 1000;
};
