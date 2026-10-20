/**
 * El cuadro resumen en .xlsx, con la presentación del consolidado
 * institucional: el bloque a la izquierda en una celda combinada, los
 * subtotales resaltados y el TOTAL de cada fila como fórmula, para que quien
 * lo edite después en Excel no rompa la suma.
 *
 * exceljs pesa cerca de 1 MB: se importa aquí dentro, al pedir la descarga,
 * por la misma razón que sileo. No lo importes desde una vista.
 */

import type { Worksheet, Fill, Borders } from "exceljs";
import { COLUMNAS_CUADRO, type CuadroDePeriodo, type CuadroResumen } from "./reportes";

/**
 * exceljs es CommonJS: según quien lo cargue (el bundler en el navegador, tsx
 * en las verificaciones) las clases llegan sueltas o dentro de `default`.
 */
export async function cargarExcelJS() {
  const mod = await import("exceljs");
  return mod.default ?? mod;
}

// Excel no entiende variables CSS: son los tokens cecar-600, cecar-50 y
// cecar-100 de globals.css, en ARGB. Si cambia la paleta, cambian aquí.
const VERDE = "FF00733B";
const VERDE_CLARO = "FFEAF6EF";
const VERDE_SUBTOTAL = "FFCDEBD9";

export const relleno = (argb: string): Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
export const BORDE: Partial<Borders> = {
  top: { style: "thin", color: { argb: "FFDFE5E2" } },
  bottom: { style: "thin", color: { argb: "FFDFE5E2" } },
  left: { style: "thin", color: { argb: "FFDFE5E2" } },
  right: { style: "thin", color: { argb: "FFDFE5E2" } },
};

const ENCABEZADOS = [...COLUMNAS_CUADRO.map((c) => c.texto.toUpperCase()), "TOTAL"];

/** Letra de columna de Excel para un índice 1-based (1 → A, 27 → AA). */
export const letra = (n: number): string =>
  n <= 0 ? "" : letra(Math.floor((n - 1) / 26)) + String.fromCharCode(65 + ((n - 1) % 26));

export function titulo(ws: Worksheet, fila: number, texto: string, ancho: number, tamaño = 12) {
  ws.mergeCells(fila, 1, fila, ancho);
  const c = ws.getCell(fila, 1);
  c.value = texto;
  c.font = { bold: true, size: tamaño, color: { argb: VERDE } };
  c.alignment = { horizontal: "center" };
}

export function encabezado(ws: Worksheet, fila: number, desde: number, hasta: number) {
  for (let col = desde; col <= hasta; col++) {
    const c = ws.getCell(fila, col);
    c.fill = relleno(VERDE);
    c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = BORDE;
  }
}

/**
 * Escribe los valores de un cuadro a partir de `colInicial`, una fila por
 * ítem, con el TOTAL como fórmula. Devuelve la fila siguiente a la última.
 */
function valores(ws: Worksheet, c: CuadroResumen, filaInicial: number, colInicial: number) {
  let fila = filaInicial;
  const n = COLUMNAS_CUADRO.length;

  for (const b of c.bloques) {
    for (const f of b.filas) {
      f.valores.forEach((v, i) => (ws.getCell(fila, colInicial + i).value = v));
      const rango = `${letra(colInicial)}${fila}:${letra(colInicial + n - 1)}${fila}`;
      ws.getCell(fila, colInicial + n).value = { formula: `SUM(${rango})`, result: f.total };
      for (let col = colInicial; col <= colInicial + n; col++) {
        const celda = ws.getCell(fila, col);
        celda.border = BORDE;
        celda.alignment = { horizontal: "center" };
        celda.numFmt = "0";
        if (f.subtotal) {
          celda.fill = relleno(VERDE_SUBTOTAL);
          celda.font = { bold: true };
        }
      }
      ws.getCell(fila, colInicial + n).font = { bold: true };
      fila++;
    }
  }
  return fila;
}

/** Columnas A (distribución) y B (ítem), con el bloque en celda combinada. */
function etiquetas(ws: Worksheet, c: CuadroResumen, filaInicial: number) {
  let fila = filaInicial;
  for (const b of c.bloques) {
    const inicio = fila;
    for (const f of b.filas) {
      const celda = ws.getCell(fila, 2);
      celda.value = f.etiqueta.toUpperCase();
      celda.border = BORDE;
      celda.alignment = { vertical: "middle", wrapText: true };
      if (f.subtotal) {
        celda.fill = relleno(VERDE_SUBTOTAL);
        celda.font = { bold: true };
      }
      fila++;
    }
    ws.mergeCells(inicio, 1, fila - 1, 1);
    const bloque = ws.getCell(inicio, 1);
    bloque.value = b.titulo.toUpperCase();
    bloque.fill = relleno(VERDE_CLARO);
    bloque.font = { bold: true, color: { argb: VERDE }, size: 10 };
    bloque.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    bloque.border = BORDE;
  }
}

/**
 * Un cuadro completo desde `fila`: encabezado, columnas A (distribución) y B
 * (ítem), y los valores desde C. Lo usa también la hoja del formato oficial,
 * que lleva al pie el cuadro de su programa como en el consolidado.
 * Devuelve la fila siguiente a la última escrita.
 */
export function escribirCuadro(ws: Worksheet, c: CuadroResumen, fila: number) {
  ["DISTRIBUCIÓN", "ÍTEM", ...ENCABEZADOS].forEach((t, i) => (ws.getCell(fila, i + 1).value = t));
  encabezado(ws, fila, 1, 2 + ENCABEZADOS.length);
  ws.getRow(fila).height = 30;
  etiquetas(ws, c, fila + 1);
  return valores(ws, c, fila + 1, 3);
}

export interface DatosLibro {
  periodo: string;
  /** "Todos los programas", la facultad o el programa elegido. */
  ambito: string;
  /** El alcance en palabras: "Solo aprobadas"… */
  alcance: string;
  cuadro: CuadroResumen;
  comparativo: CuadroDePeriodo[];
}

/** El libro completo: hoja del periodo y hoja del comparativo. */
export async function libroCuadroResumen(d: DatosLibro) {
  const ExcelJS = await cargarExcelJS();
  const libro = new ExcelJS.Workbook();
  libro.creator = "Asignación Académica · CECAR";
  libro.created = new Date();
  // exceljs no guarda el resultado de una fórmula que da 0; sin recálculo,
  // Excel mostraría esas celdas vacías hasta que alguien edite algo.
  libro.calcProperties.fullCalcOnLoad = true;

  // --- Hoja 1: el cuadro del periodo --------------------------------------
  const ancho = 2 + ENCABEZADOS.length;
  const ws = libro.addWorksheet(`CUADRO RESUMEN ${d.periodo}`, {
    views: [{ state: "frozen", xSplit: 2, ySplit: 5 }],
  });
  titulo(ws, 1, "CORPORACIÓN UNIVERSITARIA DEL CARIBE - CECAR", ancho, 13);
  titulo(ws, 2, `CUADRO RESUMEN ASIGNACIÓN ACADÉMICA ${d.periodo}`, ancho);
  titulo(ws, 3, `${d.ambito} · ${d.alcance}`, ancho, 10);
  ws.getCell(3, 1).font = { italic: true, size: 10, color: { argb: "FF5C6B63" } };

  escribirCuadro(ws, d.cuadro, 5);

  ws.getColumn(1).width = 22;
  ws.getColumn(2).width = 52;
  for (let col = 3; col <= ancho; col++) ws.getColumn(col).width = 13;

  // --- Hoja 2: comparativo entre periodos --------------------------------
  const porPeriodo = ENCABEZADOS.length;
  const anchoC = 1 + porPeriodo * d.comparativo.length;
  const wc = libro.addWorksheet("COMPARATIVO", {
    views: [{ state: "frozen", xSplit: 1, ySplit: 5 }],
  });
  titulo(wc, 1, "CORPORACIÓN UNIVERSITARIA DEL CARIBE - CECAR", anchoC, 13);
  titulo(wc, 2, "COMPARATIVO ESTADÍSTICO: CUADRO RESUMEN ASIGNACIÓN ACADÉMICA", anchoC);
  titulo(wc, 3, `${d.ambito} · ${d.alcance}`, anchoC, 10);
  wc.getCell(3, 1).font = { italic: true, size: 10, color: { argb: "FF5C6B63" } };

  wc.mergeCells(4, 1, 5, 1);
  wc.getCell(4, 1).value = "ÍTEM";
  encabezado(wc, 4, 1, anchoC);
  encabezado(wc, 5, 1, anchoC);

  d.comparativo.forEach(({ periodo, cuadro }, i) => {
    const col = 2 + i * porPeriodo;
    wc.mergeCells(4, col, 4, col + porPeriodo - 1);
    // Un periodo sin asignaciones se dice: un cuadro en blanco se leería
    // como "no hubo docentes", que es otra cosa.
    wc.getCell(4, col).value = cuadro.asignaciones > 0 ? periodo : `${periodo} (sin asignaciones)`;
    ENCABEZADOS.forEach((t, j) => (wc.getCell(5, col + j).value = t));
    if (cuadro.asignaciones > 0) valores(wc, cuadro, 6, col);
  });

  let fila = 6;
  for (const b of d.cuadro.bloques) {
    for (const f of b.filas) {
      const celda = wc.getCell(fila, 1);
      celda.value = f.etiqueta.toUpperCase();
      celda.border = BORDE;
      celda.alignment = { wrapText: true, vertical: "middle" };
      if (f.subtotal) {
        celda.fill = relleno(VERDE_SUBTOTAL);
        celda.font = { bold: true };
      }
      fila++;
    }
  }
  wc.getColumn(1).width = 52;
  for (let col = 2; col <= anchoC; col++) wc.getColumn(col).width = 11;
  wc.getRow(5).height = 30;

  return libro.xlsx.writeBuffer();
}
