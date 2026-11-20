/**
 * Versiones de los criterios de asignación (SPEC-025). PURO: lo usan la
 * API, el editor y la consulta.
 *
 * Cada periodo tiene a lo sumo un borrador y cualquier número de versiones
 * publicadas, numeradas desde 1. Lo publicado no se edita: un cambio es
 * una versión nueva, con su motivo. Así el PDF que se envió el lunes sigue
 * existiendo tal cual aunque el martes se corrija.
 */
import { CRITERIOS, MODALIDADES, PERIODO_CRITERIOS, type Bloque, type Modalidad, type SeccionCriterios } from "./criterios";

export interface VersionCriterios {
  periodo: string;
  /** 0 para la versión inicial transcrita del documento; el borrador también va en 0. */
  numero: number;
  estado: "borrador" | "publicada";
  contenido: SeccionCriterios[];
  actualizado: string;
  actualizadoPor: string;
  publicada?: string;
  publicadaPor?: string;
  motivo?: string;
}

/** Lo que se muestra mientras no se ha publicado nada en la base. */
export const VERSION_INICIAL: VersionCriterios = {
  periodo: PERIODO_CRITERIOS,
  numero: 0,
  estado: "publicada",
  contenido: CRITERIOS,
  actualizado: "2026-11-01T00:00:00.000Z",
  actualizadoPor: "Consejo Académico",
  publicada: "2026-11-01T00:00:00.000Z",
  publicadaPor: "Consejo Académico",
  motivo: "Transcripción del documento «Criterios de asignación académica 2027-1».",
};

export const nombreModalidad = (m: Modalidad) => MODALIDADES.find((x) => x.valor === m)?.texto ?? m;

export const PERIODO_VALIDO = /^[12]\d{3}-[12]$/;

const esTexto = (x: unknown): x is string => typeof x === "string";
const textos = (x: unknown): x is string[] => Array.isArray(x) && x.every(esTexto);

function revisarBloque(b: unknown, donde: string): string | null {
  if (!b || typeof b !== "object") return `${donde}: bloque inválido.`;
  const x = b as Record<string, unknown>;
  switch (x.tipo) {
    case "parrafo":
    case "subtitulo":
    case "nota":
      return esTexto(x.texto) ? null : `${donde}: falta el texto.`;
    case "lista":
      return textos(x.items) ? null : `${donde}: la lista es inválida.`;
    case "tabla": {
      if (!esTexto(x.titulo) || !textos(x.columnas) || x.columnas.length === 0) return `${donde}: la tabla necesita título y columnas.`;
      const columnas = x.columnas.length;
      if (!Array.isArray(x.filas) || !x.filas.every((f) => textos(f) && f.length === columnas)) {
        return `${donde}: cada fila de «${x.titulo}» debe tener ${columnas} celdas.`;
      }
      if (x.pie !== undefined && !esTexto(x.pie)) return `${donde}: el pie de tabla es inválido.`;
      if (x.grupos !== undefined) {
        if (!x.grupos || typeof x.grupos !== "object") return `${donde}: los grupos de la tabla son inválidos.`;
        for (const [k, v] of Object.entries(x.grupos)) {
          const i = Number(k);
          if (!Number.isInteger(i) || i < 0 || i >= x.filas.length || !esTexto(v)) return `${donde}: grupo fuera de la tabla.`;
        }
      }
      return null;
    }
    default:
      return `${donde}: tipo de bloque desconocido.`;
  }
}

/** null si el contenido es válido; si no, el primer problema, dicho para el usuario. */
export function revisarContenido(contenido: unknown): string | null {
  if (!Array.isArray(contenido) || contenido.length === 0) return "Los criterios necesitan al menos una sección.";
  const ids = new Set<string>();
  for (const [i, s] of contenido.entries()) {
    const donde = `Sección ${i + 1}`;
    if (!s || typeof s !== "object") return `${donde}: inválida.`;
    const x = s as Record<string, unknown>;
    if (!esTexto(x.id) || !x.id.trim()) return `${donde}: falta el identificador.`;
    if (ids.has(x.id)) return `${donde}: identificador repetido.`;
    ids.add(x.id);
    if (!esTexto(x.titulo) || !x.titulo.trim()) return `${donde}: falta el título.`;
    if (!esTexto(x.numero)) return `${donde}: el número es inválido.`;
    if (!MODALIDADES.some((m) => m.valor === x.modalidad)) return `«${x.titulo}»: la modalidad es inválida.`;
    if (!Array.isArray(x.bloques)) return `«${x.titulo}»: faltan los bloques.`;
    for (const [j, b] of x.bloques.entries()) {
      const problema = revisarBloque(b, `«${x.titulo}», bloque ${j + 1}`);
      if (problema) return problema;
    }
  }
  return null;
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export interface CambioSeccion {
  titulo: string;
  tipo: "agregada" | "modificada" | "eliminada";
}

/**
 * Qué secciones cambiaron entre dos versiones. Es lo que el historial le
 * muestra a quien quiere saber qué cambió, sin tener que comparar a ojo.
 */
export function seccionesCambiadas(antes: SeccionCriterios[], despues: SeccionCriterios[]): CambioSeccion[] {
  const previas = new Map(antes.map((s) => [s.id, s]));
  const cambios: CambioSeccion[] = [];
  for (const s of despues) {
    const p = previas.get(s.id);
    if (!p) cambios.push({ titulo: s.titulo, tipo: "agregada" });
    else if (!igual(p, s)) cambios.push({ titulo: s.titulo, tipo: "modificada" });
    previas.delete(s.id);
  }
  for (const p of previas.values()) cambios.push({ titulo: p.titulo, tipo: "eliminada" });
  return cambios;
}

/** Una tabla sin la fila `i`: los separadores de grupo se corren con ella. */
export function quitarFila(b: Extract<Bloque, { tipo: "tabla" }>, i: number): Extract<Bloque, { tipo: "tabla" }> {
  const grupos: Record<number, string> = {};
  for (const [k, v] of Object.entries(b.grupos ?? {})) {
    const n = Number(k);
    // El separador de la fila que se va pasa a la siguiente, si la hay.
    if (n < i) grupos[n] = v;
    else if (n === i) {
      if (i < b.filas.length - 1 && grupos[i] === undefined) grupos[i] = v;
    } else grupos[n - 1] = v;
  }
  return { ...b, filas: b.filas.filter((_, j) => j !== i), grupos: Object.keys(grupos).length ? grupos : undefined };
}
