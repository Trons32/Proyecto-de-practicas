/**
 * Novedades: la trazabilidad de los cambios de parámetros.
 *
 * El panel de impacto responde "¿qué rompen los parámetros de hoy?", pero lo
 * calcula en vivo y cambia con el siguiente ajuste. Lo que no respondía es
 * "¿quién cambió qué, cuándo, por qué, y a quién afectó en ese momento?".
 * Una novedad es esa respuesta congelada: se guarda al aplicar el cambio,
 * con la foto del impacto de ese instante, y no se reescribe después.
 *
 * Funciones puras, como el motor de cálculo: el store las orquesta, pero se
 * pueden verificar fuera de React.
 */

import type { ReglaDedicacion, Rol } from "./catalogos";
import type { Configuracion } from "./calculo";
import { estadoConvocatoria, type Convocatoria } from "./convocatoria";
import { asignacionesAfectadas } from "./impacto";
import type { Asignacion } from "./tipos";

export interface Limites {
  maxCursos: number;
  maxDescargas: number;
  maxAdministrativas: number;
}

/** Todo lo que el administrador parametriza, en una sola pieza. */
export interface Parametros {
  reglas: Record<string, ReglaDedicacion>;
  roles: Rol[];
  limites: Limites;
}

export type AmbitoCambio = "regla" | "limite" | "rol";

export interface CambioParametro {
  ambito: AmbitoCambio;
  /** Qué se tocó, dicho para una persona: "TIEMPO COMPLETO · máximo de horas". */
  parametro: string;
  /** `null` cuando no existía (rol nuevo) o dejó de existir (rol eliminado). */
  antes: string | null;
  despues: string | null;
}

/** Una asignación aprobada que el cambio dejó incumpliendo, tal como estaba. */
export interface AfectacionRegistrada {
  asignacionId: string;
  programa: string;
  facultad: string;
  periodo: string;
  erroresAntes: number;
  erroresAhora: number;
  docentes: { nombres: string; motivos: string[] }[];
}

export type AccionDecision = "reabierta" | "sin_accion";

export interface Decision {
  asignacionId: string;
  accion: AccionDecision;
  /** ISO 8601. */
  fecha: string;
  autor: string;
  nota?: string;
  /** Plazo de corrección, si se reabrió. ISO 8601. */
  plazo?: string;
}

export interface Novedad {
  id: string;
  /** Consecutivo, para poder citarla: "novedad N.º 4". */
  numero: number;
  /** ISO 8601. */
  fecha: string;
  autor: string;
  rolAutor: "ADMIN" | "COORDINADOR";
  /** El periodo de la convocatoria más reciente, si había alguna. */
  periodo: string | null;
  /**
   * Si se hizo con la convocatoria ya cerrada. Son las que pidió seguir el
   * cliente: cambian las reglas de algo que ya se entregó.
   */
  conConvocatoriaCerrada: boolean;
  motivo: string;
  cambios: CambioParametro[];
  afectadas: AfectacionRegistrada[];
  /**
   * Lo que el administrador resolvió con cada afectada. Solo crece: una
   * decisión nueva se suma a las anteriores, no las reemplaza.
   */
  decisiones: Decision[];
}

const ETIQUETA_REGLA: Record<keyof ReglaDedicacion, string> = {
  maxHoras: "máximo de horas",
  preparacion: "preparación",
  atencion: "atención",
  comunidades: "comunidades",
};

const ETIQUETA_LIMITE: Record<keyof Limites, string> = {
  maxCursos: "máximo de cursos",
  maxDescargas: "máximo de descargas",
  maxAdministrativas: "máximo de administrativas",
};

const ETIQUETA_TIPO: Record<Rol["tipo"], string> = {
  DOCENCIA: "Docencia",
  INVESTIGACION: "Investigación",
  EXTENSION: "Extensión y P. Social",
};

const legible = (s: string) => s.replace(/_/g, " ");

/** Qué cambia entre dos juegos de parámetros, campo por campo. */
export function diferenciasParametros(antes: Parametros, despues: Parametros): CambioParametro[] {
  const cambios: CambioParametro[] = [];

  const dedicaciones = new Set([...Object.keys(antes.reglas), ...Object.keys(despues.reglas)]);
  for (const ded of dedicaciones) {
    for (const campo of Object.keys(ETIQUETA_REGLA) as (keyof ReglaDedicacion)[]) {
      const a = antes.reglas[ded]?.[campo];
      const d = despues.reglas[ded]?.[campo];
      if (a !== d) {
        cambios.push({
          ambito: "regla",
          parametro: `${legible(ded)} · ${ETIQUETA_REGLA[campo]}`,
          antes: a === undefined ? null : `${a} h`,
          despues: d === undefined ? null : `${d} h`,
        });
      }
    }
  }

  for (const campo of Object.keys(ETIQUETA_LIMITE) as (keyof Limites)[]) {
    if (antes.limites[campo] !== despues.limites[campo]) {
      cambios.push({
        ambito: "limite",
        parametro: ETIQUETA_LIMITE[campo],
        antes: String(antes.limites[campo]),
        despues: String(despues.limites[campo]),
      });
    }
  }

  // Por id y no por nombre: renombrar un rol es cambiarlo, no borrar uno y
  // crear otro, y las asignaciones lo siguen referenciando por id.
  const previos = new Map(antes.roles.map((r) => [r.id, r]));
  const nuevos = new Map(despues.roles.map((r) => [r.id, r]));
  const describir = (r: Rol) => `${r.nombre} (${ETIQUETA_TIPO[r.tipo]})`;

  for (const [id, r] of previos) {
    const n = nuevos.get(id);
    if (!n) {
      cambios.push({ ambito: "rol", parametro: `Rol ${id}`, antes: describir(r), despues: null });
      continue;
    }
    if (n.nombre !== r.nombre) {
      cambios.push({ ambito: "rol", parametro: `Rol ${id} · nombre`, antes: r.nombre, despues: n.nombre });
    }
    if (n.tipo !== r.tipo) {
      cambios.push({
        ambito: "rol",
        parametro: `Rol ${id} · ${n.nombre} · tipo`,
        antes: ETIQUETA_TIPO[r.tipo],
        despues: ETIQUETA_TIPO[n.tipo],
      });
    }
  }
  for (const [id, n] of nuevos) {
    if (!previos.has(id)) {
      cambios.push({ ambito: "rol", parametro: `Rol ${id}`, antes: null, despues: describir(n) });
    }
  }

  return cambios;
}

/**
 * Las aprobadas que el cambio deja peor que antes.
 *
 * Se compara contra la configuración anterior —no contra la oficial— para
 * atribuirle al cambio solo lo que él introdujo: una asignación que ya
 * arrastraba errores y sigue igual no es consecuencia de esta novedad.
 */
export function fotoDeImpacto(
  asignaciones: Asignacion[],
  nueva: Configuracion,
  anterior: Configuracion
): AfectacionRegistrada[] {
  return asignacionesAfectadas(asignaciones, nueva, anterior)
    .filter((x) => x.erroresAhora > x.erroresAntes)
    .map(({ asignacion: a, docentes, erroresAntes, erroresAhora }) => ({
      asignacionId: a.id,
      programa: a.programa,
      facultad: a.facultad,
      periodo: a.periodo,
      erroresAntes,
      erroresAhora,
      docentes: docentes.map((d) => ({ nombres: d.nombres, motivos: d.motivos })),
    }));
}

/**
 * El periodo al que se atribuye un cambio: el de la convocatoria abierta
 * más recientemente. Sin convocatorias no hay periodo que atribuirle.
 */
export function periodoDeReferencia(
  convocatorias: Record<string, Convocatoria>,
  ahora = Date.now()
): { periodo: string | null; cerrada: boolean } {
  const ultima = Object.values(convocatorias).sort(
    (a, b) => new Date(b.apertura).getTime() - new Date(a.apertura).getTime()
  )[0];
  if (!ultima) return { periodo: null, cerrada: false };
  return { periodo: ultima.periodo, cerrada: estadoConvocatoria(ultima, ahora) === "cerrada" };
}

/** La última decisión tomada sobre una afectada; manda sobre las previas. */
export const decisionVigente = (n: Novedad, asignacionId: string): Decision | undefined =>
  n.decisiones.findLast((d) => d.asignacionId === asignacionId);

/** Atendida: cada afectada tiene una decisión. Sin afectadas, no hay nada que atender. */
export const estaAtendida = (n: Novedad): boolean =>
  n.afectadas.every((a) => decisionVigente(n, a.asignacionId));

/** La novedad más reciente que registró a esta asignación como afectada. */
export const novedadDeAfectada = (novedades: Novedad[], asignacionId: string) =>
  novedades.findLast((n) => n.afectadas.some((a) => a.asignacionId === asignacionId));

export const ETIQUETA_AMBITO: Record<AmbitoCambio, string> = {
  regla: "Dedicación",
  limite: "Límites",
  rol: "Roles",
};
