/**
 * Genera src/lib/historicos.ts desde el consolidado en Excel (SPEC-009).
 *
 *   npx tsx db/generar-historicos.ts "<CONSOLIDADO ASIGNACIÓN ACADÉMICA 2025….xlsx>"
 *
 * Los periodos anteriores al sistema solo existen como cifras pegadas en la
 * hoja COMPARATIVO ESTADÍSTICO: no hay docentes detrás. Se importan tal
 * cual —incluidas las cifras dudosas que lista la spec— para que el
 * comparativo muestre lo mismo que el Excel. No se corrigen aquí.
 */
import { writeFileSync } from "node:fs";
import ExcelJS from "exceljs";
import { PROGRAMAS } from "../src/lib/catalogos";
import { cuadroResumen, COLUMNAS_CUADRO } from "../src/lib/reportes";

const [entrada, salida = "src/lib/historicos.ts"] = process.argv.slice(2);
if (!entrada) {
  console.error('Uso: npx tsx db/generar-historicos.ts "<consolidado.xlsx>" [salida.ts]');
  process.exit(1);
}

type Valor = number | null;

// El script corre como CommonJS, sin await en el nivel superior.
async function principal() {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(entrada);
  const hoja = libro.worksheets.find((w) => w.name.trim().toUpperCase().startsWith("COMPARATIVO"));
  if (!hoja) throw new Error("No está la hoja COMPARATIVO ESTADÍSTICO.");

  /** El valor calculado de la celda: el resultado si es fórmula, null si está vacía o con error. */
  function celda(fila: number, col: number): unknown {
    const v = hoja!.getCell(fila, col).value as unknown;
    if (v && typeof v === "object" && "result" in v) return (v as { result: unknown }).result;
    if (v && typeof v === "object" && "richText" in v)
      return (v as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
    return v;
  }
  const numero = (f: number, c: number): Valor => {
    const v = celda(f, c);
    return typeof v === "number" ? v : null;
  };
  const texto = (f: number, c: number) => String(celda(f, c) ?? "").trim();
  const periodoDe = (s: string) => s.match(/\d{4}-[12]/)?.[0] ?? null;
  const col = (letras: string) => [...letras].reduce((n, l) => n * 26 + l.charCodeAt(0) - 64, 0);

  // ── Cuadro por periodo (filas 7–37) ─────────────────────────────
  /*
  Cada periodo ocupa 6 columnas: TC, MT, CAT, TUTOR A DISTANCIA, TUTOR
  VIRTUAL, TOTAL. El sistema tiene además HORA_LABOR, que el Excel no
  conocía: queda null ("no existía"), no 0.
*/
  const FILAS_EXCEL: number[][] = [
    [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], // función sustantiva
    [19, 20, 21, 22, 23], // nivel de formación
    [24, 25, 27], // contrato: el término fijo suma "a un año" (25) e "inferior" (26), ver abajo
    [28, 29, 30, 31, 32, 33, 34, 35, 36, 37], // categoría
  ];
  const ORDEN_EXCEL = ["TIEMPO_COMPLETO", "MEDIO_TIEMPO", "HORA_CÁTEDRA", "TUTOR_EAD", "TUTOR_VIRTUAL"];

  const molde = cuadroResumen([]);
  const cuadros = [];
  for (let c = col("C"); c <= col("AS"); c += 6) {
    const encabezado = texto(5, c);
    const periodo = periodoDe(encabezado);
    if (!periodo) continue;

    const leer = (f: number) => {
      const valores = COLUMNAS_CUADRO.map((k) => {
        const i = ORDEN_EXCEL.indexOf(k.dedicacion);
        return i < 0 ? null : numero(f, c + i);
      });
      return { valores, total: numero(f, c + 5) };
    };
    // Término fijo: el formato de asignación no distingue la duración.
    const sumar = (a: ReturnType<typeof leer>, b: ReturnType<typeof leer>) => ({
      valores: a.valores.map((v, i) => (v === null && b.valores[i] === null ? null : (v ?? 0) + (b.valores[i] ?? 0))),
      total: a.total === null && b.total === null ? null : (a.total ?? 0) + (b.total ?? 0),
    });

    cuadros.push({
      periodo,
      etiqueta: encabezado.replace(/\s+/g, " "),
      bloques: molde.bloques.map((b, i) => ({
        titulo: b.titulo,
        filas: b.filas.map((f, j) => {
          const fila = i === 2 && j === 1 ? sumar(leer(25), leer(26)) : leer(FILAS_EXCEL[i][j]);
          return { etiqueta: f.etiqueta, ...fila, ...(f.subtotal ? { subtotal: true } : {}) };
        }),
      })),
    });
  }

  // ── Por programa ────────────────────────────────────────────────
  /*
  Los nombres del Excel no son los del catálogo. Solo se enlazan los que
  son el mismo programa sin duda; los demás quedan con `programa: null` y
  se muestran con su nombre del Excel (ver la spec).
*/
  const ENLACE: Record<string, string | null> = {
    DERECHO: "DERECHO",
    ECONOMIA: "ECONOMÍA",
    "ADMINISTRACIÓN DE EMPRESAS": "AMDINISTRACIÓN DE EMPRESAS PRESENCIAL",
    "CONTADURIA SINCELEJO": "CONTADURÍA PÚBLICA PRESENCIAL",
    PSICOLOGÍA: "PSICOLOGÍA",
    "TRABAJO SOCIAL": "TRABAJO SOCIAL",
    "CIENCIAS DEL DEPORTE": "CIENCIAS DEL DEPORTE Y LA ACTIVIAD FÍSICA",
    "DEP. DE HUMANIDADES": "DEPARTAMENTO DE HUMANIDADES",
    "INGLÉS INSTITUCIONAL": "INGLÉS INSTITUCIONAL",
    "ING. DE SISTEMAS": "INGENIERÍA DE SISTEMAS",
    "ING. INDUSTRIAL": "INGENIERÍA INDUSTRIAL",
    ARQUITECTURA: "ARQUITECTURA",
    "CIENCIAS BASICAS": "DEPARTAMENTO DE CIENCIAS BÁSICAS",
    "DISEÑO INDUSTRIAL": "DISEÑO INDUSTRIAL",
    "DISTANCIA|ADMINISTRACIÓN DE EMPRESAS EAD": "ADMINISTRACIÓN DE EMPRESAS EAD",
    "DISTANCIA|ADMINISTRACIÓN PÚBLICA": "ADMINISTRACIÓN PÚBLICA EAD",
    "DISTANCIA|LIC. CIENCIAS NATURALES Y EDUCACIÓN AMBIENTAL": "LIC. CIENCIAS NATURALES Y EDUC. AMBIENTAL",
    "VIRTUAL|CONTADURÍA PÚBLICA VIRTUAL": "CONTADURÍA PÚBLICA VIRTUAL",
    "VIRTUAL|ADMINISTRACIÓN DE EMPRESAS VIRTUAL": "ADMINISTRACIÓN DE EMPRESAS VIRTUAL",
    "VIRTUAL|ADMINISTRACIÓN PÚBLICA": "ADMINISTRACIÓN PÚBLICA VIRTUAL",
    "VIRTUAL|LICENCIATURA EN EDUCACIÓN INFANTIL": "LIC. EDUCACIÓN INTANTIL VIRTUAL",
  };
  const catalogo = new Set(PROGRAMAS.map((p) => p.nombre));
  for (const v of Object.values(ENLACE)) if (v && !catalogo.has(v)) throw new Error(`«${v}» no está en el catálogo.`);

  type Modalidad = "PRESENCIAL" | "DISTANCIA" | "VIRTUAL";
  interface Conteo {
    tc: Valor;
    mt: Valor;
    cat: Valor;
    tutor: Valor;
    total: Valor;
  }

  function programas(
    modalidad: Modalidad,
    filaEncabezado: number,
    primera: number,
    ultima: number,
    anchoBloque: number,
  ) {
    // Columnas de cada periodo según la fila de encabezado; si un periodo se
    // repite (2022-2 inicial y con novedad), gana el último: el que tuvo novedad.
    const bloques = new Map<string, number>();
    for (let c = col("D"); c <= col("AM"); c += anchoBloque) {
      const p = periodoDe(texto(filaEncabezado, c));
      if (p) bloques.set(p, c);
    }
    const filas = [];
    let facultad = "";
    for (let f = primera; f <= ultima; f++) {
      facultad = texto(f, col("B")) || facultad;
      const nombre = texto(f, col("C"));
      if (!nombre) continue;
      const clave = modalidad === "PRESENCIAL" ? nombre : `${modalidad}|${nombre}`;
      const periodos: Record<string, Conteo> = {};
      for (const [p, c] of bloques) {
        periodos[p] =
          anchoBloque === 4
            ? { tc: numero(f, c), mt: numero(f, c + 1), cat: numero(f, c + 2), tutor: null, total: numero(f, c + 3) }
            : {
                tc: numero(f, c),
                mt: numero(f, c + 1),
                cat: numero(f, c + 2),
                tutor: numero(f, c + 3),
                total: numero(f, c + 4),
              };
      }
      filas.push({ modalidad, facultad, nombre, programa: ENLACE[clave] ?? null, periodos });
    }
    return filas;
  }

  const porPrograma = [
    ...programas("PRESENCIAL", 42, 44, 60, 4),
    ...programas("DISTANCIA", 65, 67, 69, 5),
    ...programas("VIRTUAL", 74, 76, 83, 5),
  ];

  // ── Por modalidad (filas 90–94) ─────────────────────────────────
  const GRUPOS: [string, keyof Conteo][] = [
    ["C", "tc"],
    ["I", "mt"],
    ["O", "cat"],
    ["U", "tutor"],
  ];
  const MODALIDADES: [number, Modalidad][] = [
    [92, "PRESENCIAL"],
    [93, "DISTANCIA"],
    [94, "VIRTUAL"],
  ];
  const porModalidad: Record<string, Record<string, Partial<Record<keyof Conteo, Valor>>>> = {};
  for (const [fila, modalidad] of MODALIDADES) {
    porModalidad[modalidad] = {};
    for (const [inicio, campo] of GRUPOS) {
      // Seis periodos por grupo. Se lee el periodo de cada columna, no se
      // supone el orden: en CAT el Excel tiene 2025-2 antes que 2025-1.
      for (let c = col(inicio); c < col(inicio) + 6; c++) {
        const p = periodoDe(texto(91, c));
        if (!p) continue;
        (porModalidad[modalidad][p] ??= {})[campo] = numero(fila, c);
      }
    }
  }

  // ── Docentes y estudiantes (BB49:BD56) ──────────────────────────
  const estudiantes = [];
  for (let f = 49; f <= 56; f++) {
    const periodo = periodoDe(texto(f, col("BB")));
    if (periodo) estudiantes.push({ periodo, docentes: numero(f, col("BC")), estudiantes: numero(f, col("BD")) });
  }

  // ── Salida ──────────────────────────────────────────────────────
  const json = (v: unknown) => JSON.stringify(v, null, 2);
  writeFileSync(
    salida,
    `/**
 * Cifras de periodos anteriores al sistema (SPEC-009).
 * GENERADO por db/generar-historicos.ts desde el consolidado en Excel. No editar a mano.
 *
 * Solo totales: no hay docentes detrás. \`null\` es "sin dato en el Excel",
 * distinto de 0. Las cifras dudosas se conservan tal cual (ver la spec).
 */

export type ValorHistorico = number | null;
export type Modalidad = "PRESENCIAL" | "DISTANCIA" | "VIRTUAL";

export interface FilaHistorica {
  etiqueta: string;
  /** En el orden de COLUMNAS_CUADRO; HORA_LABOR siempre null: el Excel no la tenía. */
  valores: ValorHistorico[];
  total: ValorHistorico;
  subtotal?: boolean;
}

export interface CuadroHistorico {
  periodo: string;
  /** El encabezado del Excel, que dice si es asignación inicial, con novedades o proyección. */
  etiqueta: string;
  bloques: { titulo: string; filas: FilaHistorica[] }[];
}

export interface ConteoHistorico {
  tc: ValorHistorico;
  mt: ValorHistorico;
  cat: ValorHistorico;
  tutor: ValorHistorico;
  total: ValorHistorico;
}

export interface ProgramaHistorico {
  modalidad: Modalidad;
  facultad: string;
  /** El nombre en el Excel. */
  nombre: string;
  /** El programa del catálogo, si es el mismo sin duda; si no, null. */
  programa: string | null;
  periodos: Record<string, ConteoHistorico>;
}

export const HISTORICO_CUADRO: CuadroHistorico[] = ${json(cuadros)};

export const HISTORICO_PROGRAMAS: ProgramaHistorico[] = ${json(porPrograma)};

export const HISTORICO_MODALIDAD: Record<Modalidad, Record<string, Partial<ConteoHistorico>>> = ${json(porModalidad)};

export const HISTORICO_ESTUDIANTES: { periodo: string; docentes: ValorHistorico; estudiantes: ValorHistorico }[] = ${json(estudiantes)};
`,
    "utf8",
  );
  console.log(
    `✓ ${salida}: ${cuadros.length} periodos (${cuadros.map((c) => c.periodo).join(", ")}), ` +
      `${porPrograma.length} programas (${porPrograma.filter((p) => p.programa).length} enlazados al catálogo), ` +
      `${estudiantes.length} periodos con estudiantes.`,
  );
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
