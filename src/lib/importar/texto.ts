/**
 * Comparar textos escritos a mano en Excel de años distintos (SPEC-017).
 *
 * Un mismo rol llega como «COORDINADORES ACADÉMICOS», «Coordinador
 * academico » o «COORD. ACADÉMICO»: sin tildes, mayúsculas ni signos, y
 * comparando palabras y no letras, todos se parecen lo bastante.
 */

/** Sin tildes, en mayúsculas, solo letras, dígitos y espacios simples. */
export function normalizar(v: unknown): string {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9Ñ]+/g, " ")
    .trim();
}

/** Palabras que no distinguen un nombre de otro. */
const VACIAS = new Set(["DE", "DEL", "LA", "LAS", "EL", "LOS", "Y", "EN", "A", "PARA", "AL", "CON", "POR", "E"]);

/**
 * Las palabras significativas, con el plural y la abreviatura reducidos a
 * una raíz común: «COORDINADORES» y «COORD» son la misma palabra.
 */
function raices(v: string): string[] {
  return normalizar(v)
    .split(" ")
    .filter((p) => p && !VACIAS.has(p))
    .map((p) => (p.length > 5 ? p.slice(0, 5) : p));
}

/**
 * Parecido entre dos textos, de 0 a 1: coeficiente de Dice sobre las
 * raíces. Idénticos tras normalizar es 1, siempre.
 */
export function parecido(a: string, b: string): number {
  if (normalizar(a) === normalizar(b)) return 1;
  const x = raices(a);
  const y = raices(b);
  if (!x.length || !y.length) return 0;
  const resto = [...y];
  let comunes = 0;
  for (const p of x) {
    const i = resto.findIndex((q) => q === p || (p.length >= 4 && q.length >= 4 && (q.startsWith(p) || p.startsWith(q))));
    if (i >= 0) {
      comunes++;
      resto.splice(i, 1);
    }
  }
  return (2 * comunes) / (x.length + y.length);
}

export interface Coincidencia<T> {
  opcion: T;
  puntaje: number;
  /** El segundo mejor no le queda cerca: la elección no es un empate. */
  clara: boolean;
}

/** La opción más parecida, o null si ninguna se parece en algo. */
export function masParecida<T>(texto: string, opciones: T[], nombre: (o: T) => string): Coincidencia<T> | null {
  let mejor: Coincidencia<T> | null = null;
  let segundo = 0;
  for (const o of opciones) {
    const p = parecido(texto, nombre(o));
    if (!mejor || p > mejor.puntaje) {
      segundo = mejor?.puntaje ?? 0;
      mejor = { opcion: o, puntaje: p, clara: true };
    } else if (p > segundo) segundo = p;
  }
  if (!mejor || mejor.puntaje === 0) return null;
  mejor.clara = mejor.puntaje === 1 || mejor.puntaje - segundo >= 0.15;
  return mejor;
}

/** Un número de una celda: acepta «4,5», « 12 » y «12 h»; lo demás es null. */
export function numero(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const m = v.replace(/\s/g, "").replace(",", ".").match(/^-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/** Texto de una celda, con los espacios internos colapsados. */
export const texto = (v: unknown): string => (v === null || v === undefined ? "" : String(v).replace(/\s+/g, " ").trim());

const ROMANOS: Record<string, string> = { I: "1", II: "2" };

/**
 * El periodo académico dentro de un texto: «2026-2», «2026 - II»,
 * «II-2026», «2026-2PV3», «PERIODO 2026 2». Devuelve «AAAA-S» o null.
 */
export function periodoEn(v: unknown): string | null {
  const s = normalizar(v).replace(/ /g, "-");
  const directo = s.match(/(?:^|[^0-9])((?:19|20)\d{2})-?(I{1,2}|[12])(?![0-9]|I)/);
  if (directo) return `${directo[1]}-${ROMANOS[directo[2]] ?? directo[2]}`;
  const inverso = s.match(/(?:^|[^A-Z0-9])(I{1,2}|[12])-((?:19|20)\d{2})(?![0-9])/);
  if (inverso) return `${inverso[2]}-${ROMANOS[inverso[1]] ?? inverso[1]}`;
  return null;
}

/**
 * Huella de un archivo para reconocerlo si se sube otra vez. No es
 * criptográfica a propósito: `crypto.subtle` no existe sin HTTPS, y en la
 * red de la universidad la aplicación corre en http. Para distinguir dos
 * Excel basta (cyrb53, 53 bits).
 */
export function huella(bytes: Uint8Array): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < bytes.length; i++) {
    h1 = Math.imul(h1 ^ bytes[i], 2654435761);
    h2 = Math.imul(h2 ^ bytes[i], 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}
