/**
 * El comparativo estadístico y la proyección en .xlsx (SPEC-009), con la
 * misma presentación que el cuadro resumen. A diferencia de ese libro, aquí
 * no hay fórmulas: las cifras del histórico vienen del Excel tal cual, y una
 * suma recalculada las "corregiría" sin decirlo.
 *
 * exceljs se carga bajo demanda desde exportar-cuadro.ts: no lo importes
 * desde una vista.
 */

import type { Worksheet } from "exceljs";
import { BORDE, cargarExcelJS, encabezado, relleno, titulo } from "./exportar-cuadro";
import {
  ETIQUETA_MODALIDAD,
  MODALIDADES,
  totalDe,
  type ConteoDocentes,
  type CuadroComparable,
  type FilaPrograma,
  type Proyeccion,
  type ResumenCursos,
} from "./reportes";

const VERDE_SUBTOTAL = "FFCDEBD9";
const GRIS = "FF5C6B63";

const nuevoLibro = async () => {
  const ExcelJS = await cargarExcelJS();
  const libro = new ExcelJS.Workbook();
  libro.creator = "Asignación Académica · CECAR";
  libro.created = new Date();
  return libro;
};

function cabecera(ws: Worksheet, texto: string, bajada: string, ancho: number) {
  titulo(ws, 1, "CORPORACIÓN UNIVERSITARIA DEL CARIBE - CECAR", ancho, 13);
  titulo(ws, 2, texto, ancho);
  titulo(ws, 3, bajada, ancho, 10);
  ws.getCell(3, 1).font = { italic: true, size: 10, color: { argb: GRIS } };
}

/** Una celda de datos; null queda vacía con «—», que es "sin dato", no cero. */
function cifra(ws: Worksheet, fila: number, col: number, v: number | null, resaltar = false) {
  const c = ws.getCell(fila, col);
  c.value = v ?? "—";
  c.border = BORDE;
  c.alignment = { horizontal: "right" };
  if (resaltar) {
    c.fill = relleno(VERDE_SUBTOTAL);
    c.font = { bold: true };
  }
}

function rotulo(ws: Worksheet, fila: number, col: number, texto: string, resaltar = false) {
  const c = ws.getCell(fila, col);
  c.value = texto;
  c.border = BORDE;
  c.alignment = { wrapText: true, vertical: "middle" };
  if (resaltar) {
    c.fill = relleno(VERDE_SUBTOTAL);
    c.font = { bold: true };
  }
}

const diferencia = (a: number | null, b: number | null) => (a === null || b === null ? null : a - b);

const FUENTE: Record<CuadroComparable["fuente"], string> = {
  sistema: "Sistema",
  historico: "Excel",
  vacio: "Sin datos",
};

const COLUMNAS: { clave: keyof ConteoDocentes; texto: string }[] = [
  { clave: "tc", texto: "TC" },
  { clave: "mt", texto: "MT" },
  { clave: "cat", texto: "CAT" },
  { clave: "tutor", texto: "TUTOR" },
  { clave: "total", texto: "TOTAL" },
];

export interface DatosComparativo {
  /** "2022-1 a 2026-2 · Solo aprobadas". */
  bajada: string;
  cuadros: CuadroComparable[];
  programas: FilaPrograma[];
  periodos: string[];
  modalidades: Record<string, Record<string, ConteoDocentes>>;
  estudiantes: { periodo: string; estudiantes: number | null }[];
}

/** El COMPARATIVO ESTADÍSTICO: cuadro por periodo, por programa y por modalidad. */
export async function libroComparativo(d: DatosComparativo) {
  const libro = await nuevoLibro();

  // --- Hoja 1: el cuadro de cada periodo, con su fuente y la variación ----
  // La variación, como en pantalla, va entre los dos últimos periodos con datos.
  const [ultimo, previo] = d.cuadros.filter((c) => c.fuente !== "vacio").reverse();
  const anchoC = 2 + d.cuadros.length;
  const wc = libro.addWorksheet("CUADRO POR PERIODO", { views: [{ state: "frozen", xSplit: 1, ySplit: 6 }] });
  cabecera(wc, "COMPARATIVO ESTADÍSTICO: CUADRO RESUMEN POR PERIODO", d.bajada, anchoC);
  ["ÍTEM", ...d.cuadros.map((c) => c.periodo), "VARIACIÓN"].forEach((t, i) => (wc.getCell(5, i + 1).value = t));
  ["", ...d.cuadros.map((c) => FUENTE[c.fuente]), previo ? `${previo.periodo} → ${ultimo.periodo}` : ""].forEach(
    (t, i) => (wc.getCell(6, i + 1).value = t)
  );
  encabezado(wc, 5, 1, anchoC);
  encabezado(wc, 6, 1, anchoC);

  let fila = 7;
  (ultimo ?? d.cuadros[d.cuadros.length - 1])?.bloques.forEach((b, i) => {
    wc.mergeCells(fila, 1, fila, anchoC);
    rotulo(wc, fila, 1, b.titulo.toUpperCase(), true);
    fila++;
    b.filas.forEach((f, j) => {
      rotulo(wc, fila, 1, f.etiqueta.toUpperCase(), f.subtotal);
      d.cuadros.forEach((c, k) => cifra(wc, fila, 2 + k, totalDe(c, i, j), f.subtotal));
      cifra(wc, fila, anchoC, ultimo && previo ? diferencia(totalDe(ultimo, i, j), totalDe(previo, i, j)) : null, true);
      fila++;
    });
  });
  wc.getColumn(1).width = 52;
  for (let col = 2; col <= anchoC; col++) wc.getColumn(col).width = 12;

  // --- Hoja 2: docentes por programa ---------------------------------------
  const [pUltimo, pPrevio] = d.periodos
    .filter((p) => d.programas.some((f) => f.periodos[p]?.fuente !== "vacio"))
    .reverse();
  const anchoP = 2 + d.periodos.length + (pPrevio ? COLUMNAS.length : 0);
  const wp = libro.addWorksheet("POR PROGRAMA", { views: [{ state: "frozen", xSplit: 2, ySplit: 5 }] });
  cabecera(wp, "COMPARATIVO ESTADÍSTICO: DOCENTES POR PROGRAMA", d.bajada, anchoP);
  [
    "MODALIDAD",
    "PROGRAMA",
    ...d.periodos,
    ...(pPrevio ? COLUMNAS.map((c) => `Δ ${c.texto} ${pPrevio} → ${pUltimo}`) : []),
  ].forEach((t, i) => (wp.getCell(5, i + 1).value = t));
  encabezado(wp, 5, 1, anchoP);
  wp.getRow(5).height = 30;

  fila = 6;
  for (const m of MODALIDADES) {
    for (const f of d.programas.filter((x) => x.modalidad === m)) {
      rotulo(wp, fila, 1, ETIQUETA_MODALIDAD[m].toUpperCase());
      // Los programas sin equivalente en el catálogo llevan su nombre del Excel y lo dicen.
      rotulo(wp, fila, 2, f.programa ?? `${f.nombre} (solo en Excel)`);
      d.periodos.forEach((p, k) => cifra(wp, fila, 3 + k, f.periodos[p]?.total ?? null));
      if (pPrevio) {
        COLUMNAS.forEach((c, k) =>
          cifra(
            wp,
            fila,
            3 + d.periodos.length + k,
            diferencia(f.periodos[pUltimo]?.[c.clave] ?? null, f.periodos[pPrevio]?.[c.clave] ?? null),
            true
          )
        );
      }
      fila++;
    }
  }
  wp.getColumn(1).width = 14;
  wp.getColumn(2).width = 52;
  for (let col = 3; col <= anchoP; col++) wp.getColumn(col).width = 11;

  // --- Hoja 3: por modalidad y dedicación, y estudiantes ------------------
  const anchoM = 2 + d.periodos.length;
  const wm = libro.addWorksheet("POR MODALIDAD", { views: [{ state: "frozen", xSplit: 2, ySplit: 5 }] });
  cabecera(wm, "COMPARATIVO ESTADÍSTICO: DOCENTES POR MODALIDAD", d.bajada, anchoM);
  ["MODALIDAD", "DEDICACIÓN", ...d.periodos].forEach((t, i) => (wm.getCell(5, i + 1).value = t));
  encabezado(wm, 5, 1, anchoM);

  fila = 6;
  for (const m of MODALIDADES) {
    wm.mergeCells(fila, 1, fila + COLUMNAS.length - 1, 1);
    rotulo(wm, fila, 1, ETIQUETA_MODALIDAD[m].toUpperCase());
    for (const c of COLUMNAS) {
      const total = c.clave === "total";
      rotulo(wm, fila, 2, c.texto, total);
      d.periodos.forEach((p, k) => cifra(wm, fila, 3 + k, d.modalidades[m]?.[p]?.[c.clave] ?? null, total));
      fila++;
    }
  }

  fila++;
  wm.mergeCells(fila, 1, fila, 2);
  rotulo(wm, fila, 1, "ESTUDIANTES (CONSOLIDADO EN EXCEL)", true);
  d.periodos.forEach((p, k) =>
    cifra(wm, fila, 3 + k, d.estudiantes.find((e) => e.periodo === p)?.estudiantes ?? null, true)
  );
  wm.getColumn(1).width = 16;
  wm.getColumn(2).width = 36;
  for (let col = 3; col <= anchoM; col++) wm.getColumn(col).width = 11;

  return libro.xlsx.writeBuffer();
}

const MEDIDAS: { clave: keyof ResumenCursos; texto: string }[] = [
  { clave: "cursos", texto: "CURSOS" },
  { clave: "horas", texto: "HORAS" },
  { clave: "estudiantes", texto: "ESTUDIANTES" },
  { clave: "gruposPrimerSemestre", texto: "GRUPOS SEM. I" },
  { clave: "estudiantesPrimerSemestre", texto: "EST. SEM. I" },
];

export interface DatosProyeccion {
  periodo: string;
  /** "Todos los programas", la facultad o el programa elegido. */
  ambito: string;
  proyeccion: Proyeccion;
  /** El nombre legible de un programa del catálogo. */
  nombre: (programa: string) => string;
}

/** La hoja PROYECCIÓN: proyectado contra ajustado, y el detalle de los cursos que cambiaron. */
export async function libroProyeccion(d: DatosProyeccion) {
  const libro = await nuevoLibro();
  const { filas, total, sinLineaBase } = d.proyeccion;
  const n = MEDIDAS.length;
  const ancho = 2 + 2 * n + 3;

  const ws = libro.addWorksheet(`PROYECCIÓN ${d.periodo}`, { views: [{ state: "frozen", xSplit: 2, ySplit: 6 }] });
  cabecera(ws, `PROYECCIÓN ASIGNACIÓN ACADÉMICA ${d.periodo}`, `${d.ambito} · lo aprobado inicialmente frente a lo vigente`, ancho);

  ws.mergeCells(5, 1, 6, 1);
  ws.mergeCells(5, 2, 6, 2);
  ws.getCell(5, 1).value = "PROGRAMA";
  ws.getCell(5, 2).value = "ESTADO";
  ws.mergeCells(5, 3, 5, 2 + n);
  ws.getCell(5, 3).value = "PROYECTADO (PRIMERA APROBACIÓN)";
  ws.mergeCells(5, 3 + n, 5, 2 + 2 * n);
  ws.getCell(5, 3 + n).value = "AJUSTADO (VIGENTE)";
  ws.mergeCells(5, 3 + 2 * n, 5, ancho);
  ws.getCell(5, 3 + 2 * n).value = "DIFERENCIA";
  MEDIDAS.forEach((m, i) => {
    ws.getCell(6, 3 + i).value = m.texto;
    ws.getCell(6, 3 + n + i).value = m.texto;
  });
  ["CERRADOS", "NUEVOS", "HORAS"].forEach((t, i) => (ws.getCell(6, 3 + 2 * n + i).value = t));
  encabezado(ws, 5, 1, ancho);
  encabezado(ws, 6, 1, ancho);
  ws.getRow(6).height = 30;

  const escribir = (
    fila: number,
    programa: string,
    estado: string,
    p: ResumenCursos,
    a: ResumenCursos,
    cerrados: number,
    nuevos: number,
    resaltar = false
  ) => {
    rotulo(ws, fila, 1, programa, resaltar);
    rotulo(ws, fila, 2, estado, resaltar);
    MEDIDAS.forEach((m, i) => {
      cifra(ws, fila, 3 + i, p[m.clave], resaltar);
      cifra(ws, fila, 3 + n + i, a[m.clave], resaltar);
    });
    cifra(ws, fila, 3 + 2 * n, cerrados, resaltar);
    cifra(ws, fila, 4 + 2 * n, nuevos, resaltar);
    cifra(ws, fila, 5 + 2 * n, a.horas - p.horas, true);
  };

  let fila = 7;
  for (const f of filas) {
    escribir(fila++, d.nombre(f.programa), f.estado.replace("_", " ").toUpperCase(), f.proyectado, f.ajustado, f.cerrados.length, f.nuevos.length);
  }
  escribir(fila++, "TOTAL", "", total.proyectado, total.ajustado, total.cerrados, total.nuevos, true);

  fila++;
  const nota = (texto: string) => {
    ws.mergeCells(fila, 1, fila, ancho);
    ws.getCell(fila, 1).value = texto;
    ws.getCell(fila, 1).font = { italic: true, size: 9, color: { argb: GRIS } };
    ws.getCell(fila, 1).alignment = { wrapText: true };
    fila++;
  };
  nota("Estudiantes es la suma de los estudiantes de cada curso: cupos, no personas. Grupos sem. I son los grupos distintos de cursos de primer semestre.");
  // Sin línea base no hay con qué comparar; omitirlas en silencio haría creer que no cambiaron.
  if (sinLineaBase.length > 0) {
    nota(`Aprobadas antes de que el sistema guardara la línea base (no entran): ${sinLineaBase.map((a) => d.nombre(a.programa)).join(", ")}.`);
  }

  ws.getColumn(1).width = 46;
  ws.getColumn(2).width = 16;
  for (let col = 3; col <= ancho; col++) ws.getColumn(col).width = 12;

  // --- Hoja 2: los cursos cerrados y nuevos, uno por fila ------------------
  const wd = libro.addWorksheet("CURSOS QUE CAMBIARON", { views: [{ state: "frozen", ySplit: 5 }] });
  const columnas = ["PROGRAMA", "CAMBIO", "CÓDIGO", "CURSO", "SEMESTRE", "GRUPO", "DOCENTE", "HORAS", "ESTUDIANTES"];
  cabecera(wd, `CURSOS QUE CAMBIARON ${d.periodo}`, d.ambito, columnas.length);
  columnas.forEach((t, i) => (wd.getCell(5, i + 1).value = t));
  encabezado(wd, 5, 1, columnas.length);

  fila = 6;
  for (const f of filas) {
    for (const [cambio, cursos] of [["CERRADO", f.cerrados], ["NUEVO", f.nuevos]] as const) {
      for (const k of cursos) {
        [d.nombre(f.programa), cambio, k.codigoCurso, k.nombreCurso, k.semestre ?? "", k.grupo, k.docente, k.intensidadHoraria ?? 0, k.estudiantes ?? 0].forEach(
          (v, i) => {
            const c = wd.getCell(fila, i + 1);
            c.value = v;
            c.border = BORDE;
          }
        );
        fila++;
      }
    }
  }
  if (fila === 6) wd.getCell(6, 1).value = "Ningún curso cambió desde la primera aprobación.";
  [40, 10, 12, 40, 10, 8, 32, 8, 12].forEach((w, i) => (wd.getColumn(i + 1).width = w));

  return libro.xlsx.writeBuffer();
}
