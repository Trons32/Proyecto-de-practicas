/**
 * Una hoja de cálculo reducida a lo que el lector necesita (SPEC-017):
 * el valor de cada celda y a qué celda combinada pertenece.
 *
 * El lector no habla con exceljs: así se prueba con matrices escritas a
 * mano y exceljs sigue cargándose solo al pedir la importación.
 */
import type { Worksheet } from "exceljs";

export type Valor = string | number | null;

export interface Hoja {
  nombre: string;
  filas: number;
  columnas: number;
  /** 1-based. Una celda combinada devuelve el valor de su celda maestra. */
  valor(fila: number, col: number): Valor;
  /**
   * La celda maestra de la combinación a la que pertenece («f:c»), o null
   * si no está combinada. Es lo que separa un docente del siguiente cuando
   * sus bloques no llevan número.
   */
  maestra(fila: number, col: number): string | null;
}

/**
 * Las columnas de más allá no son la tabla: el formato oficial guarda sus
 * listas desplegables en DU:EE y no hay formato con 200 columnas de datos.
 */
const MAX_COLUMNAS = 200;
const MAX_FILAS = 5000;

/** El valor que se ve en la celda: el resultado de la fórmula, el texto enriquecido unido. */
function valorDe(v: unknown): Valor {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "SI" : "NO";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("result" in o) return valorDe(o.result);
    if ("richText" in o && Array.isArray(o.richText)) return (o.richText as { text: string }[]).map((r) => r.text).join("");
    if ("text" in o) return valorDe(o.text);
    // { error: "#REF!" } y fórmulas sin resultado guardado: no hay dato.
    return null;
  }
  return null;
}

export function hojaDesdeExcelJS(ws: Worksheet): Hoja {
  const filas = Math.min(ws.rowCount, MAX_FILAS);
  const columnas = Math.min(ws.columnCount, MAX_COLUMNAS);
  const valores: Valor[][] = [];
  const maestras: (string | null)[][] = [];
  for (let f = 1; f <= filas; f++) {
    const fila = ws.getRow(f);
    const v: Valor[] = [];
    const m: (string | null)[] = [];
    for (let c = 1; c <= columnas; c++) {
      const celda = fila.getCell(c);
      if (celda.isMerged) {
        const ma = celda.master;
        v.push(valorDe(ma.value));
        m.push(`${ma.row}:${ma.col}`);
      } else {
        v.push(valorDe(celda.value));
        m.push(null);
      }
    }
    valores.push(v);
    maestras.push(m);
  }
  return {
    nombre: ws.name,
    filas,
    columnas,
    valor: (f, c) => valores[f - 1]?.[c - 1] ?? null,
    maestra: (f, c) => maestras[f - 1]?.[c - 1] ?? null,
  };
}

/**
 * Una hoja desde una matriz, para las pruebas. `combinadas` usa la
 * notación de Excel («A9:A17»).
 */
export function hojaDesdeMatriz(nombre: string, matriz: Valor[][], combinadas: string[] = []): Hoja {
  const col = (l: string) => [...l].reduce((n, x) => n * 26 + x.charCodeAt(0) - 64, 0);
  const ref = (r: string) => {
    const m = r.match(/^([A-Z]+)(\d+)$/)!;
    return { f: Number(m[2]), c: col(m[1]) };
  };
  const maestras = new Map<string, string>();
  for (const rango of combinadas) {
    const [a, b] = rango.split(":").map(ref);
    for (let f = a.f; f <= b.f; f++) for (let c = a.c; c <= b.c; c++) maestras.set(`${f}:${c}`, `${a.f}:${a.c}`);
  }
  const crudo = (f: number, c: number) => matriz[f - 1]?.[c - 1] ?? null;
  return {
    nombre,
    filas: matriz.length,
    columnas: Math.max(0, ...matriz.map((r) => r.length)),
    valor: (f, c) => {
      const m = maestras.get(`${f}:${c}`);
      if (!m) return crudo(f, c);
      const [mf, mc] = m.split(":").map(Number);
      return crudo(mf, mc);
    },
    maestra: (f, c) => maestras.get(`${f}:${c}`) ?? null,
  };
}
