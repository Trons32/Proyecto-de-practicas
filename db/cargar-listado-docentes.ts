/**
 * Carga el listado institucional de docentes en public.docente (SPEC-021)
 * desde la consola. Es lo mismo que /admin/datos/docentes —misma
 * depuración, mismo plan, misma transacción—, para la primera carga o para
 * cuando no haya un administrador a mano.
 *
 *   npx tsx --env-file=.env db/cargar-listado-docentes.ts "<LISTADO DOCENTES CODIFICADO.xlsx>"            # vista previa
 *   npx tsx --env-file=.env db/cargar-listado-docentes.ts "<LISTADO DOCENTES CODIFICADO.xlsx>" --aplicar  # escribe
 *
 * Solo imprime conteos y números de fila: nunca cédulas ni nombres.
 */
import ExcelJS from "exceljs";
import { contarMotivos, depurarListado, ETIQUETA_MOTIVO, filasDelListado } from "../src/lib/directorio";
import { hojaDesdeExcelJS } from "../src/lib/importar/hoja";
import { aplicarCarga, planearCarga } from "../src/lib/servidor/directorio";

const [ruta, ...banderas] = process.argv.slice(2);
if (!ruta) {
  console.error('Uso: npx tsx --env-file=.env db/cargar-listado-docentes.ts "<listado.xlsx>" [--aplicar]');
  process.exit(2);
}
const aplicar = banderas.includes("--aplicar");

(async () => {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(ruta);
  const filas = filasDelListado(hojaDesdeExcelJS(libro.worksheets[0]));
  if (!filas) throw new Error("No se encontraron las columnas de código, identificación y nombre.");

  const { personas, descartes } = depurarListado(filas);
  const plan = await planearCarga(personas);
  const todos = [...descartes, ...plan.descartes];

  console.log(`Filas leídas:          ${filas.length}`);
  console.log(`Docentes nuevos:       ${plan.nuevos.length}`);
  console.log(`Ya existían, cambian:  ${plan.actualizar.length}`);
  console.log(`Ya existían, iguales:  ${plan.sinCambios}`);
  console.log(`Descartados:           ${todos.length}`);
  for (const [m, n] of contarMotivos(todos)) console.log(`  · ${ETIQUETA_MOTIVO[m]}: ${n}`);
  const conflictos = todos.filter((d) => d.motivo !== "sin_datos" && d.motivo !== "cedula_invalida");
  if (conflictos.length) {
    console.log("  Conflictos para Talento Humano (fila del Excel · código):");
    for (const d of conflictos) console.log(`    fila ${d.fila} · ${d.codigo || "sin código"} · ${ETIQUETA_MOTIVO[d.motivo]}`);
  }

  if (!aplicar) {
    console.log("\nVista previa: no se escribió nada. Repita con --aplicar para cargar.");
    process.exit(0);
  }
  await aplicarCarga(plan);
  console.log("\n✓ Listado cargado.");
  process.exit(0);
})().catch((e) => {
  console.error("✗ No se cargó nada:", (e as Error).message);
  process.exit(1);
});
