/**
 * Verificación del cuadro resumen (SPEC-005, parte C).
 *
 *   npx tsx src/lib/verificar-reportes.ts
 *
 * El cuadro no puede contradecir al motor de cálculo: con los 45 docentes
 * reales del formato, cada fila de subtotal debe sumar exactamente lo que
 * calcularTotales() da docente a docente, y las partes de investigación y
 * extensión deben cuadrar con su total. Los conteos se prueban con casos
 * construidos, porque el fixture no trae nivel, contrato ni categoría.
 */
import fixture from "./__fixture.json";
import { calcularTotales } from "./calculo";
import { asignacionesDelReporte, comparativo, cuadroResumen, COLUMNAS_CUADRO } from "./reportes";
import { cargarExcelJS, libroCuadroResumen } from "./exportar-cuadro";
import { libroFormatoOficial } from "./exportar-formato";
import {
  nuevaAsignacion,
  nuevoCurso,
  nuevoDocente,
  periodoAnterior,
  type Asignacion,
  type Docente,
} from "./tipos";

const rolIds = fixture.rolIds as Record<string, number>;
let fallos = 0;

function comprobar(nombre: string, obtenido: unknown, esperado: unknown) {
  if (JSON.stringify(obtenido) !== JSON.stringify(esperado)) {
    fallos++;
    console.error(`✗ ${nombre}: obtenido ${JSON.stringify(obtenido)}, esperado ${JSON.stringify(esperado)}`);
  }
}

const docentesFixture: Docente[] = fixture.casos.map((c) => ({
  ...nuevoDocente(),
  dedicacion: c.dedicacion,
  preparacion: c.preparacion,
  atencion: c.atencion,
  comunidades: c.comunidades,
  cursos: c.cursos.map((x) => ({
    ...nuevoCurso(),
    codigoCurso: x.codigoCurso,
    intensidadHoraria: x.intensidadHoraria,
    estudiantes: x.estudiantes,
  })),
  descargas: c.descargas.map((x, i) => ({ id: `d${i}`, rolId: rolIds[x.rol] ?? null, horas: x.horas })),
  administrativas: c.administrativas.map((x, i) => ({
    id: `a${i}`,
    rolId: rolIds[x.rol] ?? null,
    horas: x.horas,
  })),
}));

const asignacion = (docentes: Docente[], extra: Partial<Asignacion> = {}): Asignacion => ({
  ...nuevaAsignacion({ periodo: "2026-2", facultad: "F", programa: "INGENIERÍA DE SISTEMAS" }),
  estado: "aprobada",
  docentes,
  ...extra,
});

// --- Horas: el cuadro reproduce al motor, docente a docente ----------------
{
  const cuadro = cuadroResumen([asignacion(docentesFixture)]);
  const fila = (etiqueta: string) => {
    const f = cuadro.bloques[0].filas.find((x) => x.etiqueta.startsWith(etiqueta));
    if (!f) throw new Error("No existe la fila " + etiqueta);
    return f;
  };
  const totales = docentesFixture.map((d) => calcularTotales(d));
  const suma = (fn: (t: (typeof totales)[number]) => number) => totales.reduce((s, t) => s + fn(t), 0);

  comprobar("docentes contados", cuadro.docentes + cuadro.sinDedicacion, docentesFixture.length);
  comprobar("fila total docentes", fila("Total docentes").total, cuadro.docentes);
  comprobar("docencia directa", fila("Horas semanales dedicadas a docencia").total, suma((t) => t.horasClase));
  comprobar("total docencia", fila("Dedicación total").total, suma((t) => t.docencia));
  comprobar("total investigación", fila("Total horas de investigación").total, suma((t) => t.investigacion));
  comprobar("total extensión", fila("Total horas de extensión").total, suma((t) => t.extension));

  comprobar(
    "investigación = descargas + complementarias",
    fila("Descargas de investigación").total + fila("Horas complementarias para investigación").total,
    fila("Total horas de investigación").total
  );
  comprobar(
    "extensión = directas + administrativas",
    fila("Horas directas semanales").total + fila("Horas administrativas dedicadas").total,
    fila("Total horas de extensión").total
  );

  // Docencia = clase + apoyo + roles de docencia: la suma de las filas de
  // apoyo nunca puede pasar del total.
  const apoyo =
    fila("Preparación").total + fila("Atención").total + fila("Comunidades").total;
  comprobar("apoyo coincide con el motor", apoyo, suma((t) => t.apoyoAcademico));

  for (const f of cuadro.bloques.flatMap((b) => b.filas)) {
    comprobar(`total de fila "${f.etiqueta}"`, f.total, f.valores.reduce((s, v) => s + v, 0));
  }
}

// --- Conteos cruzados con la dedicación ------------------------------------
{
  const col = (ded: string) => COLUMNAS_CUADRO.findIndex((c) => c.dedicacion === ded);
  const d = (p: Partial<Docente>): Docente => ({ ...nuevoDocente(), ...p });

  const cuadro = cuadroResumen([
    asignacion([
      d({ dedicacion: "TIEMPO_COMPLETO", nivelFormacion: "MAGISTER", tipoContrato: "TÉRMINO_INDEFINIDO", categoria: "ASISTENTE" }),
      d({ dedicacion: "TIEMPO_COMPLETO", nivelFormacion: "DOCTOR", tipoContrato: "TÉRMINO_FIJO", categoria: "ASOCIADO" }),
      d({ dedicacion: "HORA_CÁTEDRA", nivelFormacion: "MAGISTER", tipoContrato: "CÁTEDRAS", categoria: "CATEGORÍA II" }),
      d({ dedicacion: "HORA_LABOR", nivelFormacion: "ESPECIALIZACIÓN", tipoContrato: "LABOR_CONTRATADA", categoria: "CATEGORÍA I" }),
      d({ dedicacion: "TUTOR_EAD", nivelFormacion: "POSDOCTOR", tipoContrato: "TUTOR_EAD", categoria: "CATEGORÍA ÚNICA" }),
      d({ dedicacion: "" }),
    ]),
  ]);
  const fila = (bloque: number, etiqueta: string) =>
    cuadro.bloques[bloque].filas.find((x) => x.etiqueta === etiqueta)!;

  comprobar("sin dedicación se cuenta aparte", [cuadro.docentes, cuadro.sinDedicacion], [5, 1]);
  comprobar("magíster por dedicación", fila(1, "Magíster").valores[col("TIEMPO_COMPLETO")], 1);
  comprobar("magíster en cátedra", fila(1, "Magíster").valores[col("HORA_CÁTEDRA")], 1);
  comprobar("posdoctor", fila(1, "Posdoctor").total, 1);
  // HORA_LABOR no existe en el Excel; aquí no puede perderse.
  comprobar("hora labor tiene columna", fila(0, "Total docentes").valores[col("HORA_LABOR")], 1);
  comprobar("labor contratada agrupa cátedra, labor y tutor", fila(2, "Labor contratada (tutores y cátedra)").total, 3);
  comprobar("término fijo", fila(2, "Término fijo").valores[col("TIEMPO_COMPLETO")], 1);
  comprobar("categoría única", fila(3, "Categoría única").valores[col("TUTOR_EAD")], 1);

  for (const b of cuadro.bloques.slice(1)) {
    comprobar(`"${b.titulo}" suma los docentes`, b.filas.reduce((s, f) => s + f.total, 0), cuadro.docentes);
  }
}

// --- Qué asignaciones entran ------------------------------------------------
{
  const lista = [
    asignacion([], { id: "a", estado: "aprobada" }),
    asignacion([], { id: "b", estado: "en_revision" }),
    asignacion([], { id: "c", estado: "borrador" }),
    asignacion([], { id: "d", estado: "aprobada", periodo: "2026-1" }),
    asignacion([], { id: "e", estado: "aprobada", programa: "DERECHO" }),
  ];
  const ids = (xs: Asignacion[]) => xs.map((x) => x.id).sort();
  const base = { periodo: "2026-2" };

  comprobar("solo aprobadas", ids(asignacionesDelReporte(lista, { ...base, alcance: "aprobadas" })), ["a", "e"]);
  comprobar("entregadas", ids(asignacionesDelReporte(lista, { ...base, alcance: "entregadas" })), ["a", "b", "e"]);
  comprobar("todas", ids(asignacionesDelReporte(lista, { ...base, alcance: "todas" })), ["a", "b", "c", "e"]);
  comprobar(
    "por programa",
    ids(asignacionesDelReporte(lista, { ...base, alcance: "aprobadas", programa: "DERECHO" })),
    ["e"]
  );
}

// --- Comparativo entre periodos --------------------------------------------
{
  const uno = (periodo: string, estado: Asignacion["estado"] = "aprobada") =>
    asignacion([{ ...nuevoDocente(), dedicacion: "TIEMPO_COMPLETO" }], { periodo, estado });
  const lista = [uno("2026-2"), uno("2026-2"), uno("2026-1"), uno("2025-1"), uno("2025-2", "borrador")];
  const comp = comparativo(lista, { periodo: "2026-2", alcance: "aprobadas" });

  comprobar("periodos del comparativo", comp.map((c) => c.periodo), ["2025-1", "2025-2", "2026-1", "2026-2"]);
  comprobar("docentes por periodo", comp.map((c) => c.cuadro.docentes), [1, 0, 1, 2]);
  // 2025-2 tiene un borrador: con "solo aprobadas" no hay asignaciones, que
  // no es lo mismo que una asignación aprobada sin docentes.
  comprobar("periodo sin asignaciones", comp[1].cuadro.asignaciones, 0);
  comprobar("cambio de año hacia atrás", periodoAnterior("2026-1"), "2025-2");
}

// --- El libro .xlsx ----------------------------------------------------------
async function verificarLibro() {
  const cuadro = cuadroResumen([asignacion(docentesFixture)]);
  const buffer = await libroCuadroResumen({
    periodo: "2026-2",
    ambito: "INGENIERÍA DE SISTEMAS",
    alcance: "Solo aprobadas",
    cuadro,
    comparativo: [
      { periodo: "2026-1", cuadro: cuadroResumen([]) },
      { periodo: "2026-2", cuadro },
    ],
  });

  const ExcelJS = await cargarExcelJS();
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(buffer);

  const [hoja, comp] = libro.worksheets;
  comprobar("hojas del libro", libro.worksheets.map((w) => w.name), ["CUADRO RESUMEN 2026-2", "COMPARATIVO"]);

  // Fila 6 = "Total docentes"; columnas C… = dedicaciones, luego TOTAL.
  const totalCol = 3 + COLUMNAS_CUADRO.length;
  const fila6 = cuadro.bloques[0].filas[0];
  comprobar("ítem de la primera fila", hoja.getCell(6, 2).value, "TOTAL DOCENTES");
  comprobar("valores de la primera fila", fila6.valores.map((_, i) => hoja.getCell(6, 3 + i).value), fila6.valores);
  const total = hoja.getCell(6, totalCol).value as { formula: string; result: number };
  comprobar("el total es fórmula", total.formula.startsWith("SUM("), true);
  comprobar("resultado del total", total.result, fila6.total);

  comprobar("periodo sin datos se rotula", comp.getCell(4, 2).value, "2026-1 (sin asignaciones)");
  comprobar("periodo con datos", comp.getCell(4, 2 + COLUMNAS_CUADRO.length + 1).value, "2026-2");
}

// --- R1: formato oficial (CA-004.1) ---------------------------------------
// Cada bloque de docente, releído del .xlsx, debe dar el GRAN TOTAL del
// formato real, incluidos los seis docentes que el Excel descuadraba.
async function verificarFormato() {
  const a = asignacion(docentesFixture);
  const buffer = await libroFormatoOficial(a);
  const ExcelJS = await cargarExcelJS();
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(buffer);
  const ws = libro.worksheets[0];

  comprobar("hojas del formato", libro.worksheets.map((w) => w.name), [
    "Asignación Académica 2026-2",
    "CUADRO RESUMEN",
  ]);

  const A = 1;
  const AJ = 36;
  let bloques = 0;
  for (let fila = 9; fila <= ws.rowCount; fila++) {
    const n = ws.getCell(fila, A).value;
    if (typeof n !== "number" || ws.getCell(fila, A).master.address !== `A${fila}`) continue;
    bloques++;
    const esperado = fixture.casos[n - 1].esperado.granTotalExcel ?? 0;
    // exceljs omite el resultado cuando es 0 (Excel lo recalcula al abrir).
    const celda = ws.getCell(fila, AJ).value as { result?: number };
    comprobar(`formato · docente ${n} total semanal`, celda.result ?? 0, esperado);
  }
  comprobar("un bloque por docente", bloques, docentesFixture.length);
  // El bloque del primer docente ocupa las 10 filas del formato.
  comprobar("bloque de 10 filas", ws.getCell(18, A).master.address, "A9");
}

Promise.all([verificarLibro(), verificarFormato()])
  .catch((e) => {
    fallos++;
    console.error("✗ libro .xlsx:", e);
  })
  .finally(() => {
    console.log(fallos === 0 ? "✓ El cuadro resumen cuadra con el motor de cálculo." : `✗ ${fallos} discrepancias.`);
    if (fallos > 0) process.exit(1);
  });
