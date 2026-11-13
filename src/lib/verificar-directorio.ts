/**
 * Prueba del directorio de docentes (SPEC-021), sin base.
 *
 *   npx tsx src/lib/verificar-directorio.ts
 *   npx tsx src/lib/verificar-directorio.ts "<LISTADO DOCENTES CODIFICADO.xlsx>"   # además, contra el listado real
 *
 * Con el listado real solo imprime conteos: nunca cédulas ni nombres.
 */
import {
  completarDocente, cedulaValida, contarMotivos, depurarListado, enmascararCedula,
  filasDelListado, interpretarConsulta, type FichaDirectorio, type FilaListado,
} from "./directorio";
import type { Hoja, Valor } from "./importar/hoja";
import { nuevoDocente } from "./tipos";

let fallos = 0;
const comprobar = (nombre: string, ok: boolean, detalle?: unknown) => {
  if (ok) console.log(`✓ ${nombre}`);
  else {
    fallos++;
    console.error(`✗ ${nombre}`, detalle ?? "");
  }
};

const hoja = (m: Valor[][]): Hoja => ({
  nombre: "Exportar Hoja de Trabajo",
  filas: m.length,
  columnas: Math.max(...m.map((r) => r.length)),
  valor: (f, c) => m[f - 1]?.[c - 1] ?? null,
  maestra: () => null,
});

// ── Leer: por encabezado, no por posición ─────────────────────────────
const leidas = filasDelListado(hoja([
  [null, "CODIGO", "NOMBRE_CODIFICADO", "NUM_IDENTIFICACION_ANT", "NOM_LARGO_ANT"],
  [null, "DOC0001649", "DOCENTE 1649", 1103101447, "ABAD  LOPEZ FERNANDO"],
  [null, null, null, null, null],
  [null, "DOC0000099", "DOCENTE 99", null, null],
]));
comprobar("encuentra las columnas por su encabezado", leidas?.length === 2, leidas);
comprobar("la cédula numérica de Excel llega como texto", leidas?.[0].cedula === "1103101447");
comprobar("NOMBRE_CODIFICADO no se toma por el nombre", leidas?.[0].nombre === "ABAD  LOPEZ FERNANDO");
comprobar("sin encabezado reconocible no lee nada", filasDelListado(hoja([["A", "B"], [1, 2]])) === null);

// ── Depurar ───────────────────────────────────────────────────────────
const f = (fila: number, codigo: string, cedula: string, nombre: string): FilaListado => ({ fila, codigo, cedula, nombre });
const { personas, descartes } = depurarListado([
  f(2, "DOC0000001", "1103101447", "abad  lopez fernando "),
  f(3, "DOC0000002", "", ""),
  f(4, "DOC0000003", "12", "CORTA CEDULA"),
  f(5, "DOC0000004", "FV123456", "PASAPORTE"),
  f(6, "DOC0000005", "22222222", "DOS CODIGOS A"),
  f(7, "DOC0000006", "22222222", "DOS CODIGOS A"),
  f(8, "DOC0000007", "33333333", "CODIGO COMPARTIDO A"),
  f(9, "DOC0000007", "44444444", "CODIGO COMPARTIDO B"),
  f(10, "DOC0000001", "1103101447", "ABAD LOPEZ FERNANDO"),
  f(11, "DOC0000008", "1.234.567", "CON PUNTOS"),
  f(12, "DOC0000009", "55555555", ""),
]);
const motivo = (fila: number) => descartes.find((d) => d.fila === fila)?.motivo;
comprobar("normaliza el nombre: espacios y mayúsculas", personas[0]?.nombres === "ABAD LOPEZ FERNANDO", personas[0]);
comprobar("solo código: se descarta", motivo(3) === "sin_datos");
comprobar("cédula de 2 dígitos: se descarta", motivo(4) === "cedula_invalida");
comprobar("cédula con letras: se descarta", motivo(5) === "cedula_invalida");
comprobar("cédula con dos códigos: fuera las dos filas", motivo(6) === "cedula_con_varios_codigos" && motivo(7) === "cedula_con_varios_codigos");
comprobar("código en dos cédulas: fuera las dos filas", motivo(8) === "codigo_repetido" && motivo(9) === "codigo_repetido");
comprobar("la misma persona repetida entra una vez", personas.filter((p) => p.documento === "1103101447").length === 1);
comprobar("cédula con puntos se limpia", personas.some((p) => p.documento === "1234567"));
comprobar("sin nombre: se descarta", motivo(12) === "sin_nombre");
comprobar("cedulaValida exige 6 a 15 dígitos", cedulaValida("12345") === null && cedulaValida("123456") === "123456" && cedulaValida("1".repeat(16)) === null);
comprobar("conteo por motivo", contarMotivos(descartes).find(([m]) => m === "cedula_invalida")?.[1] === 2);

// ── Interpretar la búsqueda ───────────────────────────────────────────
comprobar("6+ dígitos: cédula", interpretarConsulta("1103101447")?.por === "documento");
comprobar("DOC…: código", JSON.stringify(interpretarConsulta("doc0001649")) === JSON.stringify({ por: "codigo", valor: "DOC0001649" }));
comprobar("número corto: código con ceros", JSON.stringify(interpretarConsulta("1649")) === JSON.stringify({ por: "codigo", valor: "DOC0001649" }));
comprobar("4+ letras: nombre", interpretarConsulta("abad lopez")?.por === "nombre");
comprobar("muy corto no busca", interpretarConsulta("ab") === null && interpretarConsulta("") === null);
comprobar("enmascara la cédula", enmascararCedula("1103101447") === "•••1447");

// ── Completar la ficha ────────────────────────────────────────────────
const ficha: FichaDirectorio = {
  documento: "1103101447", codigo: "DOC0001649", nombres: "ABAD LOPEZ FERNANDO",
  ultima: {
    periodo: "2026-1", programa: "INGENIERÍA DE SISTEMAS", nivelFormacion: "MAGÍSTER", perfilProfesional: "INGENIERO",
    categoriaMinciencias: "", activoSectorExterno: "NO", sectorEjerce: "", tipoContrato: "HORA_CÁTEDRA",
    dedicacion: "HORA_CÁTEDRA", categoria: "", sede: "SINCELEJO",
  },
};
const vacio = nuevoDocente();
const todo = completarDocente(vacio, ficha);
comprobar("llena documento y nombre en una ficha vacía", todo.documento === "1103101447" && todo.nombres === "ABAD LOPEZ FERNANDO");
comprobar("trae los datos de la última asignación", todo.nivelFormacion === "MAGÍSTER" && todo.sede === "SINCELEJO");
const escrito = completarDocente({ ...vacio, nombres: "FERNANDO ABAD LOPEZ", sede: "OTRA" }, ficha);
comprobar("no pisa lo escrito a mano", !("nombres" in escrito) && !("sede" in escrito), escrito);
const contratoViejo = completarDocente(vacio, { ...ficha, ultima: { ...ficha.ultima!, tipoContrato: "NO_EXISTE", dedicacion: "X", categoria: "Y" } });
comprobar("un contrato que ya no está en el catálogo no se copia", !("tipoContrato" in contratoViejo));
const conContrato = completarDocente({ ...vacio, tipoContrato: "TÉRMINO_FIJO" }, ficha);
comprobar("contrato, dedicación y categoría van juntos o no van", !("dedicacion" in conContrato));
comprobar("sin asignaciones previas trae solo identidad", Object.keys(completarDocente(vacio, { ...ficha, ultima: null })).sort().join() === "documento,nombres");

// ── Contra el listado real, si se pasa ────────────────────────────────
(async () => {
  const ruta = process.argv[2];
  if (ruta) {
    const ExcelJS = (await import("exceljs")).default;
    const { hojaDesdeExcelJS } = await import("./importar/hoja");
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.readFile(ruta);
    const filas = filasDelListado(hojaDesdeExcelJS(libro.worksheets[0]));
    comprobar("el listado real se lee", !!filas && filas.length > 1000, filas?.length);
    const r = depurarListado(filas ?? []);
    console.log(`  filas: ${filas?.length} · cargables: ${r.personas.length} · descartadas: ${r.descartes.length}`);
    for (const [m, n] of contarMotivos(r.descartes)) console.log(`    ${m}: ${n}`);
    // Entre las cédulas válidas, cada conflicto saca todas sus filas: ninguna
    // cédula en conflicto queda cargada por una de sus filas.
    const enConflicto = new Set(
      (filas ?? []).filter((x) => r.descartes.some((d) => d.fila === x.fila && d.motivo === "cedula_con_varios_codigos")).map((x) => cedulaValida(x.cedula))
    );
    comprobar("las cédulas con varios códigos quedan fuera por completo", enConflicto.size > 0 && !r.personas.some((p) => enConflicto.has(p.documento)));
    comprobar("ninguna persona cargable repite cédula ni código", new Set(r.personas.map((p) => p.documento)).size === r.personas.length && new Set(r.personas.flatMap((p) => (p.codigo ? [p.codigo] : []))).size === r.personas.filter((p) => p.codigo).length);
  }
  console.log(fallos === 0 ? "\n✓ Directorio verificado." : `\n✗ ${fallos} fallos.`);
  process.exit(fallos === 0 ? 0 : 1);
})();
