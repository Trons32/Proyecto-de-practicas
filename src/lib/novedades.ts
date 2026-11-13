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

/**
 * Un rol de la parametrización. Los roles no se borran: se desactivan
 * (SPEC-012). Uno inactivo ya no se ofrece al coordinador, pero las
 * asignaciones que lo usan siguen sumando sus horas; borrarlo se las quitaba.
 */
export type RolParametro = Rol & { inactivo?: true };

/** Todo lo que el administrador parametriza, en una sola pieza. */
export interface Parametros {
  reglas: Record<string, ReglaDedicacion>;
  roles: RolParametro[];
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
    if (Boolean(n.inactivo) !== Boolean(r.inactivo)) {
      cambios.push({
        ambito: "rol",
        parametro: `Rol ${id} · ${n.nombre} · estado`,
        antes: r.inactivo ? "Inactivo" : "Activo",
        despues: n.inactivo ? "Inactivo" : "Activo",
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
 * Las entregadas (aprobadas, enviadas o en revisión) que el cambio deja peor que antes.
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

/**
 * El motivo cuando el administrador no escribió uno (SPEC-012). Solo se usa
 * si el cambio no afecta aprobadas: con impacto, el motivo lo escribe él,
 * porque de esa novedad salen las decisiones de reapertura.
 */
export function motivoPorDefecto(cambios: CambioParametro[]): string {
  if (cambios.length === 0) return "";
  const ambitos = new Set(cambios.map((c) => c.ambito));
  if (ambitos.size > 1) return "Cambios de parámetros";
  if (ambitos.has("limite")) return "Cambio en los límites del formato";
  if (ambitos.has("regla")) {
    const dedicaciones = new Set(cambios.map((c) => c.parametro.split(" · ")[0]));
    return dedicaciones.size === 1
      ? `Cambio en la dedicación ${[...dedicaciones][0]}`
      : "Cambios en la dedicación docente";
  }
  const c = cambios[0];
  if (cambios.length === 1 && c.antes === null) return `Creación del rol ${c.despues}`;
  if (cambios.length === 1 && c.parametro.endsWith(" · estado")) {
    const nombre = c.parametro.split(" · ")[1];
    return `${c.despues === "Inactivo" ? "Desactivación" : "Reactivación"} del rol ${nombre}`;
  }
  const ids = new Set(cambios.map((x) => x.parametro.split(" · ")[0]));
  return ids.size === 1 ? `Cambio en el ${[...ids][0].toLowerCase()}` : `Cambios en ${ids.size} roles`;
}

/**
 * Novedad u observación (SPEC-013). Las dos son un cambio de parámetros con
 * su rastro; las separa el momento. Con la convocatoria **abierta** es una
 * observación: los coordinadores todavía están cargando y el ajuste es parte
 * de preparar el periodo. Con la convocatoria **cerrada** es una novedad: lo
 * entregado ya se está revisando y el cambio puede tocar lo aprobado.
 *
 * Sale de `conConvocatoriaCerrada`, que se fija al registrar y no cambia: un
 * registro no pasa de una clase a otra porque la convocatoria se cierre después.
 */
export type ClaseRegistro = "novedad" | "observacion";

export const claseDe = (n: Novedad): ClaseRegistro => (n.conConvocatoriaCerrada ? "novedad" : "observacion");

export const ETIQUETA_CLASE: Record<ClaseRegistro, { singular: string; plural: string }> = {
  novedad: { singular: "Novedad", plural: "Novedades" },
  observacion: { singular: "Observación", plural: "Observaciones" },
};

/**
 * El número que se muestra: cada clase cuenta por su lado (novedad N.º 1,
 * observación N.º 1). `numero` sigue siendo el consecutivo general que
 * guarda la base; este se deriva de él y no cambia, porque nada se borra.
 */
export const numeroEnSuClase = (todas: Novedad[], n: Novedad): number =>
  todas.filter((x) => claseDe(x) === claseDe(n) && x.numero <= n.numero).length;

/** "Novedad N.º 3" / "Observación N.º 5". */
export const tituloDe = (todas: Novedad[], n: Novedad): string =>
  `${ETIQUETA_CLASE[claseDe(n)].singular} N.º ${numeroEnSuClase(todas, n)}`;

/** Cada clase vive en su propia sección: se consultan en momentos distintos. */
export const RUTA_CLASE: Record<ClaseRegistro, string> = {
  novedad: "/admin/novedades",
  observacion: "/admin/observaciones",
};

export const rutaDe = (n: Novedad): string => `${RUTA_CLASE[claseDe(n)]}/${n.id}`;
