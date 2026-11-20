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

/** Fecha y hora, para registros donde importa el orden de lo ocurrido. */
export const fechaHoraLegible = (iso: string): string => {
  const hora = new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  return `${fechaLegible(iso)}, ${hora}`;
};

/**
 * Cuándo conviene avisar de que el plazo aprieta. Tres días es el margen
 * con el que todavía se alcanza a corregir una asignación completa.
 */
export const DIAS_AVISO = 3;

export const plazoApremiante = (limite: string, ahora = Date.now()): boolean => {
  const ms = restante(limite, ahora);
  return ms > 0 && ms <= DIAS_AVISO * 24 * 60 * 60 * 1000;
};

/**
 * Apertura y cierre con hora (SPEC-029). Antes la convocatoria solo tenía
 * fecha de cierre, y cerraba a las 23:59 de ese día; ahora el administrador
 * fija día y hora de las dos. Lo ya abierto conserva su 23:59.
 */

/** Fecha y hora locales de un instante, para <input type="date"> y <input type="time">. */
export const partesFechaHora = (iso: string): { fecha: string; hora: string } => {
  const d = new Date(iso);
  const dos = (n: number) => String(n).padStart(2, "0");
  return {
    fecha: `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`,
    hora: `${dos(d.getHours())}:${dos(d.getMinutes())}`,
  };
};

/**
 * El instante de una fecha y hora locales. 23:59 se guarda con sus 59,999 s:
 * es «hasta el final de ese minuto», y así lo ya abierto (finDelDia) y lo
 * nuevo a la misma hora vencen igual.
 */
export const instanteLocal = (fecha: string, hora: string): string => {
  const [a, m, d] = fecha.split("-").map(Number);
  const [h, min] = hora.split(":").map(Number);
  return new Date(a, m - 1, d, h, min, 59, 999).toISOString();
};

/** Hora en formato de 12 h, como se dice en Colombia: «11:59 p. m.». */
export const horaLegible = (iso: string): string =>
  new Date(iso).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true });

/** «miércoles 25 de noviembre, 11:59 p. m.»: el día de la semana evita contar en el calendario. */
export const momentoLegible = (iso: string): string =>
  `${new Date(iso).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}, ${horaLegible(iso)}`;

/** Días, horas y minutos que faltan, para la cuenta regresiva. Todo en 0 si ya pasó. */
export function cuentaRegresiva(limite: string, ahora = Date.now()): { dias: number; horas: number; minutos: number } {
  const ms = Math.max(0, restante(limite, ahora));
  const minutosTotales = Math.floor(ms / 60000);
  return {
    dias: Math.floor(minutosTotales / 1440),
    horas: Math.floor((minutosTotales % 1440) / 60),
    minutos: minutosTotales % 60,
  };
}

/** Qué tan cerca está el cierre: define el color y el mensaje de la alerta. */
export type Urgencia = "tranquilo" | "pronto" | "ultimo_dia" | "ultimas_horas" | "vencido";

export function urgenciaDe(limite: string, ahora = Date.now()): Urgencia {
  const horas = restante(limite, ahora) / 3_600_000;
  if (horas <= 0) return "vencido";
  if (horas <= 3) return "ultimas_horas";
  if (horas <= 24) return "ultimo_dia";
  if (horas <= DIAS_AVISO * 24) return "pronto";
  return "tranquilo";
}

/**
 * Cuánto falta, en días de calendario y no en horas: «Faltan 3 días» y, el
 * mismo día, «Se cierra hoy a las 11:59 p. m.». El coordinador planea por
 * días; la hora solo importa cuando ya es hoy.
 */
export function faltaLegible(limite: string, ahora = Date.now(), verbo: "cierra" | "abre" = "cierra"): string {
  if (restante(limite, ahora) <= 0) return verbo === "cierra" ? "Ya cerró" : "Ya abrió";
  const dia = (t: number) => {
    const d = new Date(t);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  const dias = Math.round((dia(new Date(limite).getTime()) - dia(ahora)) / 86_400_000);
  const accion = verbo === "cierra" ? "Se cierra" : "Abre";
  if (dias === 0) return `${accion} hoy a las ${horaLegible(limite)}`;
  return dias === 1 ? "Falta 1 día" : `Faltan ${dias} días`;
}

/**
 * Sin convocatoria para su periodo. Si hay otra abierta, se dice cuál: lo
 * más común es que el administrador abriera la del periodo en curso y la
 * asignación sea del siguiente, y «no hay convocatoria» a secas confunde.
 */
export function sinConvocatoria(periodo: string, convocatorias: Record<string, Convocatoria>): string {
  const otra = Object.values(convocatorias).find((c) => c.periodo !== periodo && estadoConvocatoria(c) === "abierta");
  return otra
    ? `Esta asignación es del periodo ${periodo}, y la convocatoria abierta es la de ${otra.periodo}. Pida al administrador que abra la de ${periodo}.`
    : `El administrador todavía no ha abierto la convocatoria del periodo ${periodo}.`;
}
