/**
 * Una asignación en el FORMATO ÚNICO DE ASIGNACIÓN ACADÉMICA - PREGRADO
 * (ASIGNACION_IS_2026_2PV3.xlsx): el mismo archivo que el coordinador
 * llenaba a mano, ahora generado desde lo registrado (reporte R1).
 *
 * Cada docente ocupa un bloque de filas, como en el formato:
 *
 *   A–P    datos del docente, combinados a lo alto del bloque
 *   Q–U    descargas directas: 3 filas por rol; la última fila, el total
 *   V–AB   actividades administrativas y apoyo académico, igual
 *   AC–AJ  gran total y dedicación semanal, combinados
 *   AK–AW  una fila por curso
 *
 * Las sumas simples van como fórmula (con su resultado) para que el archivo
 * siga vivo si alguien lo edita. Docencia, investigación y extensión van como
 * valor: el formato las calcula con fórmulas matriciales por posición del rol
 * que perdían horas (ver calculo.ts), y aquí manda el motor corregido.
 */

import type { Worksheet } from "exceljs";
import { calcularTotales, CONFIG_OFICIAL, type Configuracion } from "./calculo";
import { cuadroResumen } from "./reportes";
import type { Asignacion, Docente } from "./tipos";
import { BORDE, cargarExcelJS, escribirCuadro, letra, relleno, titulo } from "./exportar-cuadro";

// Los azules del formato oficial (encabezados y bloque de descargas). Aquí no
// se usa la paleta CECAR de la app: el archivo debe verse como el formato.
const AZUL_ENCABEZADO = "FFDEEAF6";
const AZUL_DESCARGAS = "FFD9E2F3";

/** Filas mínimas por docente: las 10 del formato (diez cursos). */
const ALTO_MINIMO = 10;
/** Filas que ocupa cada rol de descarga o actividad administrativa. */
const FILAS_POR_ROL = 3;
/** El formato trae tres roles de cada tipo aunque vengan vacíos. */
const ROLES_MINIMOS = 3;

const FILA_GRUPOS = 7;
const FILA_COLUMNAS = 8;
const PRIMERA_FILA = 9;

/** Columna 1-based a partir de su letra, para leer el mapa como el Excel. */
const col = (l: string) => [...l].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);

const GRUPOS: [string, string, string][] = [
  ["B", "C", "INFORMACIÓN PERSONAL DEL DOCENTE"],
  ["D", "H", "INFORMACIÓN PROFESIONAL DEL DOCENTE"],
  ["I", "L", "VINCULACIÓN DOCENTE"],
  ["M", "P", "INFORMACIÓN ADICIONAL"],
  ["Q", "U", "DESCARGAS DIRECTAS"],
  ["V", "AB", "ACTIVIDADES ADMINISTRATIVAS"],
  ["AD", "AJ", "DEDICACIÓN SEMANAL DEL DOCENTE"],
  ["AK", "AW", "CURSOS"],
];

const COLUMNAS: [string, string, number][] = [
  ["A", "No.", 6],
  ["B", "NÚMERO DE DOCUMENTO", 16],
  ["C", "NOMBRES Y APELLIDOS", 30],
  ["D", "NIVEL DE FORMACIÓN", 16],
  ["E", "PERFIL PROFESIONAL (POSGRADOS, PREGRADO, CERTIFICACIONES)", 30],
  ["F", "CATEGORÍA MINCIENCIAS", 13],
  ["G", "¿SE ENCUENTRA ACTUALMENTE ACTIVO EN EL SECTOR EXTERNO?", 15],
  ["H", "SECTOR DONDE EJERCE SU PROFESIÓN", 17],
  ["I", "TIPO DE CONTRATO", 19],
  ["J", "DEDICACIÓN", 17],
  ["K", "CATEGORÍA", 15],
  ["L", "SEDE", 13],
  ["M", "RESULTADO ÚLTIMA EVALUACIÓN DOCENTE", 13],
  ["N", "NÚMERO DE ESTUDIANTES", 12],
  ["O", "NÚMERO DE CURSOS DIFERENTES", 12],
  ["P", "OBSERVACIONES", 24],
  ["Q", "No.", 5],
  ["R", "HORAS DIRECTAS", 32],
  ["S", "DEDICACIÓN HORAS", 9],
  ["T", "HORAS DE CLASE", 9],
  ["U", "HORAS DE DESCARGA", 9],
  ["V", "No.", 5],
  ["W", "HORAS ADMINISTRATIVAS", 32],
  ["X", "DEDICACIÓN HORAS", 9],
  ["Y", "PREPARACIÓN DE CLASES", 11],
  ["Z", "ATENCIÓN A ESTUDIANTES", 11],
  ["AA", "COMUNIDADES ACADÉMICAS", 11],
  ["AB", "TOTAL HORAS DE APOYO ACADÉMICO", 11],
  ["AC", "GRAN TOTAL DE HORAS", 11],
  ["AD", "HORAS SEMANALES DEDICADAS A DOCENCIA", 12],
  ["AE", "% DE DOCENCIA", 9],
  ["AF", "HORAS SEMANALES DEDICADAS A INVESTIGACIÓN", 13],
  ["AG", "% DE INVESTIGACIÓN", 9],
  ["AH", "HORAS SEMANALES DEDICADAS A EXTENSIÓN Y PROYECCIÓN SOCIAL", 13],
  ["AI", "% DE EXTENSIÓN Y PROYECCIÓN SOCIAL", 9],
  ["AJ", "TOTAL HORAS SEMANALES", 10],
  ["AK", "No.", 5],
  ["AL", "CÓDIGO DEL PROGRAMA", 11],
  ["AM", "NOMBRE DEL PROGRAMA", 34],
  ["AN", "CÓDIGO DEL PENSUM", 11],
  ["AO", "CÓDIGO DEL CURSO", 11],
  ["AP", "NOMBRE DEL CURSO", 38],
  ["AQ", "SEMESTRE", 9],
  ["AR", "GRUPO/BLOQUE", 9],
  ["AS", "JORNADA", 11],
  ["AT", "INTENSIDAD HORARIA SEMANAL", 10],
  ["AU", "NÚMERO DE CRÉDITOS", 10],
  ["AV", "NÚMERO DE ESTUDIANTES", 11],
  ["AW", "MODALIDAD", 14],
];
const ULTIMA = col("AW");

/** Combina una columna a lo alto de un rango de filas y le pone valor. */
function combinar(ws: Worksheet, l: string, desde: number, hasta: number, valor: unknown) {
  if (hasta > desde) ws.mergeCells(desde, col(l), hasta, col(l));
  const c = ws.getCell(desde, col(l));
  c.value = valor as never;
  c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
}

const formula = (f: string, result: number) => ({ formula: f, result });

/** Escribe el bloque de un docente desde `ini`. Devuelve la fila siguiente. */
function bloqueDocente(
  ws: Worksheet,
  d: Docente,
  n: number,
  ini: number,
  config: Configuracion
): number {
  const t = calcularTotales(d, config);
  const nombreRol = new Map(config.roles.map((r) => [r.id, r.nombre]));

  const roles = Math.max(ROLES_MINIMOS, d.descargas.length, d.administrativas.length);
  const alto = Math.max(ALTO_MINIMO, d.cursos.length, roles * FILAS_POR_ROL + 1);
  const fin = ini + alto - 1;
  // La última fila del bloque es la de totales de descargas y administrativas.
  const finRoles = fin - 1;
  const rango = (l: string) => `${l}${ini}:${l}${fin}`;

  // --- Datos del docente (A–P) ---------------------------------------------
  const datos: [string, unknown][] = [
    ["A", n],
    ["B", d.documento],
    ["C", d.nombres],
    ["D", d.nivelFormacion],
    ["E", d.perfilProfesional],
    ["F", d.categoriaMinciencias],
    ["G", d.activoSectorExterno],
    ["H", d.sectorEjerce],
    ["I", d.tipoContrato],
    ["J", d.dedicacion],
    ["K", d.categoria],
    ["L", d.sede],
    ["M", d.evaluacionDocente],
    ["N", formula(`SUM(${rango("AV")})`, t.totalEstudiantes)],
    ["O", t.cursosDiferentes],
    ["P", d.observaciones],
  ];
  for (const [l, v] of datos) combinar(ws, l, ini, fin, v);

  // --- Descargas (Q–S) y administrativas (V–X), tres filas por rol ---------
  for (let i = 0; i < roles; i++) {
    const desde = ini + i * FILAS_POR_ROL;
    const hasta = desde + FILAS_POR_ROL - 1;
    const desc = d.descargas[i];
    const adm = d.administrativas[i];
    combinar(ws, "Q", desde, hasta, `R ${i + 1}`);
    combinar(ws, "R", desde, hasta, desc?.rolId != null ? nombreRol.get(desc.rolId) ?? "" : "");
    combinar(ws, "S", desde, hasta, desc && desc.horas ? desc.horas : null);
    combinar(ws, "V", desde, hasta, `R ${i + 1}`);
    combinar(ws, "W", desde, hasta, adm?.rolId != null ? nombreRol.get(adm.rolId) ?? "" : "");
    combinar(ws, "X", desde, hasta, adm && adm.horas ? adm.horas : null);
  }
  // Si sobran filas entre el último rol y la fila de totales, quedan vacías.

  const cursosRango = `AT${ini}:AT${fin}`;
  combinar(ws, "T", ini, finRoles, formula(`SUM(${cursosRango})`, t.horasClase));
  combinar(ws, "U", ini, finRoles, formula(`SUM(S${ini}:S${finRoles})`, t.totalDescargas));
  combinar(ws, "Y", ini, finRoles, d.preparacion);
  combinar(ws, "Z", ini, finRoles, d.atencion);
  combinar(ws, "AA", ini, finRoles, d.comunidades);
  combinar(ws, "AB", ini, finRoles, formula(`SUM(Y${ini}:AA${ini})`, t.apoyoAcademico));

  // Fila de totales del bloque.
  ws.mergeCells(fin, col("Q"), fin, col("S"));
  ws.getCell(fin, col("Q")).value = "TOTAL DE HORAS DESCARGA DIRECTA";
  ws.mergeCells(fin, col("T"), fin, col("U"));
  const totalDirectas = t.horasClase + t.totalDescargas;
  ws.getCell(fin, col("T")).value = formula(`T${ini}+U${ini}`, totalDirectas);
  ws.mergeCells(fin, col("V"), fin, col("Z"));
  ws.getCell(fin, col("V")).value = "TOTAL DE HORAS ADMINISTRATIVAS";
  const totalAdmin = t.totalAdministrativas + t.apoyoAcademico;
  ws.getCell(fin, col("AA")).value = formula(
    `SUM(X${ini}:X${finRoles})+AB${ini}`,
    totalAdmin
  );
  for (const l of ["Q", "T", "V", "AA"]) {
    const c = ws.getCell(fin, col(l));
    c.font = { bold: true, size: 9 };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  }

  // --- Totales y dedicación (AC–AJ) ----------------------------------------
  combinar(ws, "AC", ini, fin, formula(`T${fin}+AA${fin}`, totalDirectas + totalAdmin));
  combinar(ws, "AD", ini, fin, t.docencia);
  combinar(ws, "AE", ini, fin, formula(`IFERROR(AD${ini}/AJ${ini},0)`, t.pctDocencia));
  combinar(ws, "AF", ini, fin, t.investigacion);
  combinar(ws, "AG", ini, fin, formula(`IFERROR(AF${ini}/AJ${ini},0)`, t.pctInvestigacion));
  combinar(ws, "AH", ini, fin, t.extension);
  combinar(ws, "AI", ini, fin, formula(`IFERROR(AH${ini}/AJ${ini},0)`, t.pctExtension));
  combinar(ws, "AJ", ini, fin, formula(`AD${ini}+AF${ini}+AH${ini}`, t.totalSemanal));
  for (const l of ["AE", "AG", "AI"]) ws.getCell(ini, col(l)).numFmt = "0%";
  ws.getCell(ini, col("AJ")).font = { bold: true };

  // --- Cursos (AK–AW), una fila cada uno -----------------------------------
  for (let i = 0; i < alto; i++) {
    const fila = ini + i;
    ws.getCell(fila, col("AK")).value = i + 1;
    const c = d.cursos[i];
    if (!c) continue;
    const valores: [string, unknown][] = [
      ["AL", c.codigoPrograma],
      ["AM", c.nombrePrograma],
      ["AN", c.codigoPensum],
      ["AO", c.codigoCurso],
      ["AP", c.nombreCurso],
      ["AQ", c.semestre],
      ["AR", c.grupo],
      ["AS", c.jornada],
      ["AT", c.intensidadHoraria],
      ["AU", c.creditos],
      ["AV", c.estudiantes],
      ["AW", c.modalidad],
    ];
    for (const [l, v] of valores) ws.getCell(fila, col(l)).value = (v === "" ? null : v) as never;
  }

  // Bordes de todo el bloque; un borde grueso abajo separa un docente del siguiente.
  for (let fila = ini; fila <= fin; fila++) {
    for (let c = 1; c <= ULTIMA; c++) {
      const celda = ws.getCell(fila, c);
      celda.border = fila === fin ? { ...BORDE, bottom: { style: "medium" } } : BORDE;
      if (c >= col("Q") && c <= col("AB")) celda.fill = relleno(AZUL_DESCARGAS);
      if (!celda.font?.bold) celda.font = { size: 9 };
    }
  }

  return fin + 1;
}

/** El libro: la hoja del formato y, aparte, el cuadro resumen del programa. */
export async function libroFormatoOficial(
  a: Asignacion,
  config: Configuracion = CONFIG_OFICIAL
) {
  const ExcelJS = await cargarExcelJS();
  const libro = new ExcelJS.Workbook();
  libro.creator = "Asignación Académica · CECAR";
  libro.created = new Date();
  // exceljs no guarda el resultado de una fórmula que da 0; sin recálculo,
  // Excel mostraría esas celdas vacías hasta que alguien edite algo.
  libro.calcProperties.fullCalcOnLoad = true;

  const ws = libro.addWorksheet(`Asignación Académica ${a.periodo}`, {
    views: [{ state: "frozen", xSplit: 3, ySplit: FILA_COLUMNAS }],
  });

  titulo(ws, 1, "CORPORACIÓN UNIVERSITARIA DEL CARIBE - CECAR", ULTIMA, 14);
  titulo(ws, 2, "VICERRECTORÍA ACADÉMICA", ULTIMA, 11);
  titulo(ws, 3, "COORDINACIÓN DE DESARROLLO PROFESORAL", ULTIMA, 11);
  titulo(ws, 4, `FORMATO ÚNICO DE ASIGNACIÓN ACADÉMICA - PREGRADO · ${a.periodo}`, ULTIMA, 13);
  for (const [fila, etiqueta, valor] of [
    [5, "FACULTAD:", a.facultad],
    [6, "NOMBRE DEL PROGRAMA:", a.programa],
  ] as const) {
    ws.mergeCells(fila, 1, fila, 2);
    ws.getCell(fila, 1).value = etiqueta;
    ws.getCell(fila, 1).font = { bold: true };
    ws.mergeCells(fila, 3, fila, 8);
    ws.getCell(fila, 3).value = valor;
  }

  // Encabezados: grupos en la fila 7, columnas en la 8.
  ws.mergeCells(FILA_GRUPOS, 1, FILA_COLUMNAS, 1);
  for (const [desde, hasta, texto] of GRUPOS) {
    ws.mergeCells(FILA_GRUPOS, col(desde), FILA_GRUPOS, col(hasta));
    ws.getCell(FILA_GRUPOS, col(desde)).value = texto;
  }
  ws.mergeCells(FILA_GRUPOS, col("AC"), FILA_COLUMNAS, col("AC"));
  for (const [l, texto, ancho] of COLUMNAS) {
    // "No." y "GRAN TOTAL" ocupan las dos filas de encabezado: el texto va
    // en la celda maestra, la de arriba.
    const fila = l === "A" || l === "AC" ? FILA_GRUPOS : FILA_COLUMNAS;
    ws.getCell(fila, col(l)).value = texto;
    ws.getColumn(col(l)).width = ancho;
  }
  for (const fila of [FILA_GRUPOS, FILA_COLUMNAS]) {
    for (let c = 1; c <= ULTIMA; c++) {
      const celda = ws.getCell(fila, c);
      celda.fill = relleno(AZUL_ENCABEZADO);
      celda.font = { bold: true, size: 9 };
      celda.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      celda.border = BORDE;
    }
  }
  ws.getRow(FILA_COLUMNAS).height = 60;

  let fila = PRIMERA_FILA;
  a.docentes.forEach((d, i) => {
    fila = bloqueDocente(ws, d, i + 1, fila, config);
  });

  // Totales del programa al pie de la columna de total semanal.
  if (a.docentes.length > 0) {
    const total = a.docentes.reduce((s, d) => s + calcularTotales(d, config).totalSemanal, 0);
    ws.mergeCells(fila, col("AD"), fila, col("AI"));
    ws.getCell(fila, col("AD")).value = "TOTAL HORAS SEMANALES DEL PROGRAMA";
    ws.getCell(fila, col("AJ")).value = formula(
      `SUM(${letra(col("AJ"))}${PRIMERA_FILA}:${letra(col("AJ"))}${fila - 1})`,
      total
    );
    for (const l of ["AD", "AJ"]) {
      const c = ws.getCell(fila, col(l));
      c.font = { bold: true };
      c.alignment = { horizontal: "center" };
      c.fill = relleno(AZUL_ENCABEZADO);
    }
  }

  // El consolidado lleva el cuadro de cada programa al pie de su hoja; aquí
  // va en una hoja propia para no pelear con los anchos de columna del formato.
  const wc = libro.addWorksheet("CUADRO RESUMEN");
  titulo(wc, 1, `CUADRO RESUMEN · ${a.programa} · ${a.periodo}`, 9);
  escribirCuadro(wc, cuadroResumen([a], config), 3);
  wc.getColumn(1).width = 22;
  wc.getColumn(2).width = 52;
  for (let c = 3; c <= 9; c++) wc.getColumn(c).width = 13;

  return libro.xlsx.writeBuffer();
}

/** Nombre de archivo legible: asignacion-ingenieria-de-sistemas-2026-2.xlsx */
export function nombreArchivoFormato(a: Asignacion): string {
  const programa = a.programa
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `asignacion-${programa || "programa"}-${a.periodo}.xlsx`;
}
