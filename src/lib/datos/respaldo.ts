/**
 * Respaldo: todo el estado del sistema en un solo JSON.
 *
 * Sirve hoy para no depender de un navegador —exportar, cambiar de equipo,
 * importar— y mañana para migrar a la base de datos lo que los usuarios ya
 * registraron. Por eso su forma es la del dominio (`lib/tipos.ts`,
 * `lib/novedades.ts`) y no la de cada store: es el contrato que recibirá la
 * API, no un volcado de localStorage.
 *
 * Puro: se verifica fuera de React con `verificar-respaldo.ts`.
 */

import type { Convocatoria } from "../convocatoria";
import type { Novedad, Parametros } from "../novedades";
import type { Asignacion, EstadoAsignacion } from "../tipos";

export const FORMATO_RESPALDO = "cecar-asignacion-academica/respaldo";
/**
 * Versión del formato, independiente de las versiones de los stores. Si
 * cambia la forma, se sube y `leerRespaldo` aprende a convertir la anterior.
 */
export const VERSION_RESPALDO = 1;

export interface DatosRespaldo {
  asignaciones: Asignacion[];
  configuracion: Parametros & { convocatorias: Record<string, Convocatoria> };
  novedades: Novedad[];
}

export interface Respaldo {
  formato: typeof FORMATO_RESPALDO;
  version: number;
  /** ISO 8601. */
  exportado: string;
  exportadoPor: string;
  datos: DatosRespaldo;
}

export const crearRespaldo = (datos: DatosRespaldo, autor: string, ahora = new Date()): Respaldo => ({
  formato: FORMATO_RESPALDO,
  version: VERSION_RESPALDO,
  exportado: ahora.toISOString(),
  exportadoPor: autor,
  datos,
});

export type Lectura = { ok: true; respaldo: Respaldo } | { ok: false; error: string };

const ESTADOS: EstadoAsignacion[] = ["borrador", "enviada", "en_revision", "aprobada", "en_correccion"];

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Lee y valida un respaldo. Importar reemplaza todo lo que hay, así que un
 * archivo a medias no puede entrar: o pasa entero o no pasa. La validación
 * cubre lo que rompería el sistema al cargarlo (identificadores, estados,
 * listas), no reglas de negocio: una asignación con errores de carga es un
 * dato legítimo y el motor ya la señala.
 */
export function leerRespaldo(texto: string): Lectura {
  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    return { ok: false, error: "El archivo no es un JSON válido." };
  }

  if (!esObjeto(crudo) || crudo.formato !== FORMATO_RESPALDO) {
    return { ok: false, error: "El archivo no es un respaldo de Asignación Académica." };
  }
  if (typeof crudo.version !== "number" || crudo.version > VERSION_RESPALDO) {
    return {
      ok: false,
      error: "El respaldo es de una versión más nueva del sistema. Actualice antes de importarlo.",
    };
  }

  const datos = crudo.datos;
  if (!esObjeto(datos)) return { ok: false, error: "El respaldo no trae datos." };

  const { asignaciones, configuracion, novedades } = datos;

  if (!Array.isArray(asignaciones)) return { ok: false, error: "Faltan las asignaciones." };
  for (const [i, a] of asignaciones.entries()) {
    const donde = `Asignación ${i + 1}`;
    if (!esObjeto(a) || typeof a.id !== "string" || !a.id) {
      return { ok: false, error: `${donde}: falta el identificador.` };
    }
    if (!ESTADOS.includes(a.estado as EstadoAsignacion)) {
      return { ok: false, error: `${donde}: estado desconocido «${String(a.estado)}».` };
    }
    if (!Array.isArray(a.docentes) || !Array.isArray(a.bitacora)) {
      return { ok: false, error: `${donde}: faltan los docentes o la bitácora.` };
    }
  }
  if (new Set(asignaciones.map((a) => a.id)).size !== asignaciones.length) {
    return { ok: false, error: "Hay asignaciones con el identificador repetido." };
  }

  if (
    !esObjeto(configuracion) ||
    !esObjeto(configuracion.reglas) ||
    !Array.isArray(configuracion.roles) ||
    !esObjeto(configuracion.limites) ||
    !esObjeto(configuracion.convocatorias)
  ) {
    return { ok: false, error: "La configuración está incompleta." };
  }
  const rolesValidos = configuracion.roles.every(
    (r) =>
      esObjeto(r) &&
      typeof r.id === "number" &&
      typeof r.nombre === "string" &&
      ["DOCENCIA", "INVESTIGACION", "EXTENSION"].includes(r.tipo as string)
  );
  if (!rolesValidos) return { ok: false, error: "Hay roles incompletos o de tipo desconocido." };

  if (!Array.isArray(novedades)) return { ok: false, error: "Faltan las novedades." };
  const novedadesValidas = novedades.every(
    (n) =>
      esObjeto(n) &&
      typeof n.id === "string" &&
      Array.isArray(n.cambios) &&
      Array.isArray(n.afectadas) &&
      Array.isArray(n.decisiones)
  );
  if (!novedadesValidas) return { ok: false, error: "Hay novedades incompletas." };

  return { ok: true, respaldo: crudo as unknown as Respaldo };
}

/** Nombre del archivo: ordena bien por fecha en cualquier carpeta. */
export const nombreDeArchivo = (r: Respaldo) =>
  `asignacion-academica-${r.exportado.slice(0, 10)}.json`;

/** Lo que trae, para confirmar antes de reemplazar. */
export const resumenRespaldo = (r: Respaldo) => ({
  asignaciones: r.datos.asignaciones.length,
  docentes: r.datos.asignaciones.reduce((s, a) => s + a.docentes.length, 0),
  roles: r.datos.configuracion.roles.length,
  convocatorias: Object.keys(r.datos.configuracion.convocatorias).length,
  novedades: r.datos.novedades.length,
});
