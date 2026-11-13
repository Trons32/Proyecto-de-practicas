/**
 * Prueba del importador de periodos anteriores (SPEC-017).
 *
 *   npx tsx src/lib/verificar-importacion.ts ["<ASIGNACION_….xlsx>"]
 *
 * 1. Ida y vuelta: los 45 docentes del fixture se exportan con el formato
 *    oficial y se vuelven a leer; los totales tienen que ser los mismos.
 * 2. Un formato «viejo» inventado: otras columnas, otros títulos, sin
 *    celdas combinadas, encabezado en otra fila, dos programas en dos
 *    hojas y el periodo en romano. Sin ejemplos reales, esto es lo que hay
 *    que poder leer.
 * 3. Si se pasa el Excel real, se lee y se compara con el fixture: es el
 *    mismo archivo del que salió.
 */
import fixture from "./__fixture.json";
import ExcelJS from "exceljs";
import { calcularTotales, CONFIG_OFICIAL } from "./calculo";
import { libroFormatoOficial } from "./exportar-formato";
import { armarDocentes, programaDe, type Decisiones } from "./importar/armar";
import { hojaDesdeExcelJS, hojaDesdeMatriz } from "./importar/hoja";
import { leerHoja } from "./importar/leer";
import { periodoEn } from "./importar/texto";
import { revisarBorrado, revisarGuardado } from "./transiciones";
import { coberturaImportada, comparativoCompleto, comparativoPorPrograma } from "./reportes";
import { HISTORICO_CUADRO, HISTORICO_PROGRAMAS } from "./historicos";
import { PROGRAMAS } from "./catalogos";
import { asignacionImportada } from "./importar/armar";
import { nuevaAsignacion, nuevoCurso, nuevoDocente, nuevoEvento, type Docente } from "./tipos";

let fallos = 0;
const falla = (m: string) => {
  fallos++;
  console.error("✗ " + m);
};
const igual = (que: string, a: unknown, b: unknown) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) falla(`${que}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);
};

type Caso = (typeof fixture.casos)[number];
const rolIds = fixture.rolIds as Record<string, number>;
const construir = (c: Caso): Docente => ({
  ...nuevoDocente(),
  nombres: `Docente ${c.n}`,
  tipoContrato: c.dedicacion === "HORA_CÁTEDRA" ? "CÁTEDRAS" : "TÉRMINO_FIJO",
  dedicacion: c.dedicacion,
  preparacion: c.preparacion,
  atencion: c.atencion,
  comunidades: c.comunidades,
  cursos: c.cursos.map((x) => ({ ...nuevoCurso(), codigoCurso: x.codigoCurso, nombreCurso: `Curso ${x.codigoCurso}`, intensidadHoraria: x.intensidadHoraria, estudiantes: x.estudiantes })),
  descargas: c.descargas.map((x, i) => ({ id: `d${i}`, rolId: rolIds[x.rol] ?? null, horas: x.horas })),
  administrativas: c.administrativas.map((x, i) => ({ id: `a${i}`, rolId: rolIds[x.rol] ?? null, horas: x.horas })),
});
const totales = (d: Docente) => {
  const t = calcularTotales(d);
  return [t.horasClase, t.totalDescargas, t.apoyoAcademico, t.totalEstudiantes, t.totalSemanal];
};

async function principal() {
  // ---- 1. Ida y vuelta con el formato oficial ----
  {
    const originales = fixture.casos.map(construir);
    const a = { ...nuevaAsignacion({ periodo: "2026-2", facultad: "X", programa: "INGENIERÍA DE SISTEMAS" }), docentes: originales };
    const leido = new ExcelJS.Workbook();
    await leido.xlsx.load(await libroFormatoOficial(a));
    const l = leerHoja(hojaDesdeExcelJS(leido.worksheets[0]));
    if (l.descarte) falla(`ida y vuelta: ${l.descarte}`);
    // Aquí todos llevan nombre: aun sin carga son docentes y se conservan.
    const conDatos = originales;
    igual("ida y vuelta: docentes", l.docentes.length, conDatos.length);
    const armado = armarDocentes(l, {}, CONFIG_OFICIAL, "INGENIERÍA DE SISTEMAS");
    if (armado.pendientes.length) falla(`ida y vuelta: pendientes ${armado.pendientes.map((p) => p.clave).join(", ")}`);
    armado.docentes.forEach((d, i) => igual(`ida y vuelta: docente ${i + 1}`, totales(d), totales(conDatos[i])));
    igual("ida y vuelta: nombres", armado.docentes.map((d) => d.nombres), conDatos.map((d) => d.nombres));
    const conDiferencias = armado.revision.filter((r) => r.diferencias.length);
    if (conDiferencias.length) falla(`ida y vuelta: ${conDiferencias.length} docentes no cuadran con su Excel`);
    console.log(`✓ Ida y vuelta: ${armado.docentes.length} docentes leídos del formato oficial.`);
  }

  // ---- 2. Un formato distinto, inventado ----
  {
    const encabezado = ["ITEM", "CÉDULA", "NOMBRE DEL DOCENTE", "TIPO DE VINCULACIÓN", "DEDICACIÓN", "ROL 1", "HORAS 1",
      "ASIGNATURA", "COD. ASIGNATURA", "I.H.S.", "ESTUDIANTES", "PREPARACIÓN", "ATENCIÓN", "COMUNIDADES", "GRAN TOTAL"];
    const hoja = (programa: string) =>
      hojaDesdeMatriz(programa.slice(0, 20), [
        ["ASIGNACIÓN ACADÉMICA PERIODO II-2023"],
        [`PROGRAMA: ${programa}`],
        [],
        encabezado,
        [1, "1102345678", "Ana Pérez", "Término indefinido", "TC", "Coordinadores academicos", 10, "Cálculo I", "C1", 4, 30, 5, 5, 3, 35],
        [null, null, null, null, null, null, null, "Cálculo II", "C2", 4, 25],
        [null, null, null, null, null, null, null, "Lógica", "L1", 4, 20],
        [2, "92555111", "Luis Gómez", "Cátedra", "Catedrático", null, null, "Física", "F1", 6, 35, null, null, null, 6],
        ["TOTAL", null, null, null, null, null, null, null, null, 18],
      ]);
    for (const [prog, esperado] of [["Derecho", "DERECHO"], ["Ingenieria de sistemas", "INGENIERÍA DE SISTEMAS"]] as const) {
      const l = leerHoja(hoja(prog), { archivo: "viejo.xlsx" });
      if (l.descarte) {
        falla(`formato viejo (${prog}): ${l.descarte}`);
        continue;
      }
      igual(`formato viejo: periodo`, l.periodo, "2023-2");
      igual(`formato viejo: programa`, programaDe(l.programa).programa, esperado);
      igual(`formato viejo: docentes`, l.docentes.length, 2);
      igual(`formato viejo: cursos`, l.docentes.map((d) => d.cursos.length), [3, 1]);
      const a = armarDocentes(l, {}, CONFIG_OFICIAL, esperado);
      igual("formato viejo: dedicación", a.docentes.map((d) => d.dedicacion), ["TIEMPO_COMPLETO", "HORA_CÁTEDRA"]);
      igual("formato viejo: contrato", a.docentes.map((d) => d.tipoContrato), ["TÉRMINO_INDEFINIDO", "CÁTEDRAS"]);
      igual("formato viejo: rol", a.docentes[0].descargas.map((x) => [x.rolId, x.horas]), [[2, 10]]);
      igual("formato viejo: sin pendientes", a.pendientes.length, 0);
      igual("formato viejo: cuadra con su gran total", a.revision.map((r) => r.diferencias.length), [0, 0]);
    }
    console.log("✓ Formato distinto: columnas, títulos, periodo y programa reconocidos.");
  }

  // ---- Lo dudoso se pregunta, y la respuesta se respeta ----
  {
    const h = hojaDesdeMatriz("x", [
      ["No.", "NOMBRES Y APELLIDOS", "TIPO DE CONTRATO", "DEDICACIÓN", "ROL", "HORAS", "NOMBRE DEL CURSO", "INTENSIDAD HORARIA"],
      [1, "Ana", "", "Tiempo completo", "Gestor de calidad institucional", 4, "Ética", 4],
    ]);
    const l = leerHoja(h);
    const a = armarDocentes(l, {}, CONFIG_OFICIAL, "DERECHO");
    igual("pendientes", a.pendientes.map((p) => p.tipo).sort(), ["contrato", "rol"]);
    igual("sin decidir no hay dedicación", a.docentes[0].dedicacion, "");
    const decisiones: Decisiones = Object.fromEntries(a.pendientes.map((p) => [p.clave, p.tipo === "rol" ? "1" : "TÉRMINO_FIJO"]));
    const b = armarDocentes(l, decisiones, CONFIG_OFICIAL, "DERECHO");
    igual("decidido: pendientes", b.pendientes.length, 0);
    igual("decidido: contrato", b.docentes[0].tipoContrato, "TÉRMINO_FIJO");
    igual("decidido: rol", b.docentes[0].descargas[0]?.rolId, 1);
    const ignorar = armarDocentes(l, { ...decisiones, [a.pendientes.find((p) => p.tipo === "rol")!.clave]: null }, CONFIG_OFICIAL, "DERECHO");
    igual("rol ignorado: queda la hora sin rol", ignorar.docentes[0].descargas.map((x) => x.rolId), [null]);
    console.log("✓ Lo dudoso queda pendiente hasta que el administrador decide.");
  }

  // ---- Periodos escritos de muchas formas ----
  for (const [t, p] of [["2026-2", "2026-2"], ["Asignación 2024 - I", "2024-1"], ["II-2023", "2023-2"], ["2026-2PV3", "2026-2"],
    ["periodo 2022 1", "2022-1"], ["sin fecha", null], ["2026-12-31", null]] as const) {
    igual(`periodo «${t}»`, periodoEn(t), p);
  }

  // ---- El servidor acepta la importada y nada más ----
  {
    const actor = { nombres: "Admin", rol: "ADMIN" as const };
    const imp = asignacionImportada({ periodo: "2023-2", programa: "DERECHO", docentes: [] }, { archivo: "a.xlsx", hoja: "h", huella: "abc" }, "Admin");
    igual("servidor: importada nueva", revisarGuardado(undefined, imp, actor), null);
    if (!revisarGuardado(undefined, imp, { nombres: "Coord", rol: "COORDINADOR" })) falla("servidor: un coordinador importó");
    if (!revisarGuardado(undefined, { ...imp, estado: "borrador" }, actor)) falla("servidor: importada en borrador");
    const reabierta = { ...imp, estado: "en_correccion" as const, bitacora: [...imp.bitacora, nuevoEvento({ tipo: "reabierta_por_parametros", autor: "Admin", rolAutor: "ADMIN", plazo: "2030-01-01" })] };
    if (!revisarGuardado(imp, reabierta, actor)) falla("servidor: se reabrió una importada");
    if (!revisarGuardado(imp, { ...imp, docentes: [nuevoDocente()] }, actor)) falla("servidor: se editó una importada");
    igual("servidor: guardar igual", revisarGuardado(imp, imp, actor), null);
    igual("servidor: el admin reemplaza una importada", revisarBorrado(imp, actor), null);
    if (!revisarBorrado(imp, { nombres: "C", rol: "COORDINADOR" })) falla("servidor: un coordinador borró una importada");
    console.log("✓ El servidor admite la importación solo como la define la spec.");
  }

  // ---- El comparativo: importado a medias no reemplaza al consolidado ----
  {
    const periodo = "2025-1";
    const esperados = coberturaImportada([], periodo, HISTORICO_PROGRAMAS).esperados;
    if (esperados.length < 2) falla("comparativo: el consolidado debería traer programas en 2025-1");
    const importar = (programa: string) =>
      asignacionImportada({ periodo, programa, docentes: [{ ...nuevoDocente(), tipoContrato: "CÁTEDRAS", dedicacion: "HORA_CÁTEDRA" }] }, { archivo: "x", hoja: programa, huella: "h" }, "Admin");
    const una = [importar(esperados[0])];
    const fuente = (asigs: typeof una) =>
      comparativoCompleto(asigs, { periodo, alcance: "aprobadas" }, HISTORICO_CUADRO, CONFIG_OFICIAL, HISTORICO_PROGRAMAS)
        .find((c) => c.periodo === periodo)?.fuente;
    igual("comparativo: a medias manda el consolidado", fuente(una), "historico");
    const fila = comparativoPorPrograma(una, [periodo], "aprobadas", HISTORICO_PROGRAMAS, PROGRAMAS).find((f) => f.programa === esperados[0]);
    igual("comparativo: el programa importado se ve con sus cifras", [fila?.periodos[periodo].fuente, fila?.periodos[periodo].total], ["importado", 1]);
    const todas = esperados.map(importar);
    igual("comparativo: completo manda lo importado", fuente(todas), "importado");
    igual("comparativo: cobertura completa", coberturaImportada(todas, periodo, HISTORICO_PROGRAMAS).completo, true);
    console.log(`✓ Comparativo: ${periodo} usa lo importado solo con sus ${esperados.length} programas.`);
  }

  // ---- 3. El Excel real, si se pasa ----
  const real = process.argv[2];
  if (real) {
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.readFile(real);
    const l = leerHoja(hojaDesdeExcelJS(libro.worksheets[0]), { archivo: real });
    if (l.descarte) falla(`Excel real: ${l.descarte}`);
    igual("Excel real: periodo", l.periodo, "2026-2");
    igual("Excel real: programa", programaDe(l.programa).programa, "INGENIERÍA DE SISTEMAS");
    // El fixture trae también los bloques vacíos de la plantilla; el
    // lector los descarta. Cada docente leído empieza en la fila del fixture.
    const reales = fixture.casos.filter((c) => c.cursos.length + c.descargas.length + c.administrativas.length > 0);
    igual("Excel real: docentes", l.docentes.length, reales.length);
    igual("Excel real: filas", l.docentes.map((d) => d.desde), reales.map((c) => c.fila));
    const a = armarDocentes(l, {}, CONFIG_OFICIAL, "INGENIERÍA DE SISTEMAS");
    if (a.pendientes.length) falla(`Excel real: pendientes ${a.pendientes.map((p) => p.valor).join(" | ")}`);
    reales.forEach((c, i) => {
      const d = a.docentes[i];
      if (!d) return;
      const t = calcularTotales(d);
      const e = c.esperado;
      const n = (v: number | null) => v ?? 0;
      igual(`Excel real: docente ${c.n}`, [t.horasClase, t.totalDescargas, t.apoyoAcademico, t.totalEstudiantes, t.totalSemanal],
        [n(e.horasClase), n(e.descargas), n(e.apoyo), n(e.estudiantes), n(e.granTotalExcel)]);
    });
    const dif = a.revision.filter((r) => r.diferencias.length);
    if (dif.length) falla(`Excel real: ${dif.length} docentes con diferencias: ${JSON.stringify(dif.slice(0, 3).map((r) => [r.fila, r.diferencias]))}`);
    console.log(`✓ Excel real: ${a.docentes.length} docentes, mismos totales que el fixture.`);
  } else {
    console.log("· Sin Excel real: pase la ruta del formato 2026-2 para probarlo también.");
  }

  console.log(fallos === 0 ? "\n✓ El importador lee lo que debe." : `\n✗ ${fallos} fallos.`);
  if (fallos > 0) process.exit(1);
}

principal();
