/**
 * Verificación del motor de cálculo contra los 45 docentes reales del
 * formato ASIGNACION_IS_2026_2PV3.xlsx.
 *
 *   npx tsx src/lib/verificar.ts
 *
 * Comprueba que calcularTotales() reproduce los agregados del Excel
 * (horas de clase, descargas, apoyo, estudiantes) y que el total semanal
 * cuadra con el GRAN TOTAL — incluidos los 6 docentes que en el Excel
 * descuadraban por los roles fuera de rango.
 */
import fixture from "./__fixture.json";
import { calcularTotales } from "./calculo";
import { nuevoDocente, nuevoCurso, type Docente } from "./tipos";

type Caso = (typeof fixture.casos)[number];
const rolIds = fixture.rolIds as Record<string, number>;

function construir(c: Caso): Docente {
  return {
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
    descargas: c.descargas.map((x, i) => ({
      id: `d${i}`,
      rolId: rolIds[x.rol] ?? null,
      horas: x.horas,
    })),
    administrativas: c.administrativas.map((x, i) => ({
      id: `a${i}`,
      rolId: rolIds[x.rol] ?? null,
      horas: x.horas,
    })),
  };
}

let fallos = 0;
let corregidos = 0;

for (const c of fixture.casos) {
  const t = calcularTotales(construir(c));
  const e = c.esperado;

  // Una celda vacía en Excel llega como null y equivale a 0.
  const n = (v: number | null) => v ?? 0;

  const checks: [string, number, number][] = [
    ["horasClase", t.horasClase, n(e.horasClase)],
    ["descargas", t.totalDescargas, n(e.descargas)],
    ["apoyo", t.apoyoAcademico, n(e.apoyo)],
    ["estudiantes", t.totalEstudiantes, n(e.estudiantes)],
    ["totalSemanal", t.totalSemanal, n(e.granTotalExcel)],
  ];

  for (const [campo, obtenido, esperado] of checks) {
    if (obtenido !== esperado) {
      fallos++;
      console.error(
        `✗ docente ${c.n} (fila ${c.fila}) · ${campo}: obtenido ${obtenido}, esperado ${esperado}`
      );
    }
  }

  if ([6, 7, 8, 13, 17, 21].includes(c.n as number)) corregidos++;
}

console.log(`\nDocentes verificados: ${fixture.casos.length}`);
console.log(`Descuadres del Excel ahora corregidos: ${corregidos}`);
console.log(fallos === 0 ? "✓ El motor reproduce el formato oficial." : `✗ ${fallos} discrepancias.`);

if (fallos > 0) process.exit(1);
