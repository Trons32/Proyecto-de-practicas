/**
 * Verificación del respaldo (SPEC-002).
 *
 *   npx tsx src/lib/verificar-respaldo.ts
 *
 * Un respaldo exportado y vuelto a leer debe traer exactamente lo mismo, y
 * un archivo dañado o ajeno no puede entrar: importar reemplaza todo.
 */
import { MAX_ADMINISTRATIVAS, MAX_CURSOS, MAX_DESCARGAS, REGLAS_DEDICACION, ROLES } from "./catalogos";
import { crearRespaldo, leerRespaldo, resumenRespaldo, type DatosRespaldo } from "./datos/respaldo";
import { nuevaAsignacion, nuevoDocente, type Asignacion } from "./tipos";
import fixture from "./__fixture.json";

let fallos = 0;
const comprobar = (nombre: string, ok: boolean, detalle?: unknown) => {
  if (ok) console.log(`✓ ${nombre}`);
  else {
    fallos++;
    console.error(`✗ ${nombre}`, detalle ?? "");
  }
};

// Una asignación con los 45 docentes del formato y bitácora, para que la
// ida y vuelta pase por datos del tamaño real.
const asignacion: Asignacion = {
  ...nuevaAsignacion({ periodo: "2026-2", facultad: "CIENCIAS_BÁSICAS", programa: "INGENIERÍA DE SISTEMAS" }, "COORDINADOR"),
  estado: "aprobada",
  version: 1,
  docentes: fixture.casos.map((c) => ({ ...nuevoDocente(), dedicacion: c.dedicacion, preparacion: c.preparacion })),
};

const datos: DatosRespaldo = {
  asignaciones: [asignacion],
  configuracion: {
    reglas: REGLAS_DEDICACION,
    roles: ROLES,
    limites: { maxCursos: MAX_CURSOS, maxDescargas: MAX_DESCARGAS, maxAdministrativas: MAX_ADMINISTRATIVAS },
    convocatorias: {
      "2026-2": { periodo: "2026-2", apertura: "2026-07-10T00:00:00.000Z", limite: "2026-08-15T04:59:59.999Z", cerradaManualmente: false },
    },
  },
  novedades: [],
};

// ── Ida y vuelta ──────────────────────────────────────────────
{
  const r = crearRespaldo(datos, "ADMIN", new Date("2026-09-30T15:00:00Z"));
  const lectura = leerRespaldo(JSON.stringify(r));
  comprobar("un respaldo propio se lee", lectura.ok, lectura);
  if (lectura.ok) {
    comprobar("ida y vuelta sin pérdida", JSON.stringify(lectura.respaldo) === JSON.stringify(r));
    const res = resumenRespaldo(lectura.respaldo);
    comprobar("trae los 45 docentes", res.docentes === 45, res);
  }
}

// ── Rechazos ──────────────────────────────────────────────────
const rechaza = (nombre: string, texto: string) => {
  const l = leerRespaldo(texto);
  comprobar(nombre, !l.ok, l.ok ? "se aceptó" : undefined);
};
const variar = (fn: (r: ReturnType<typeof crearRespaldo>) => unknown) => {
  const r = JSON.parse(JSON.stringify(crearRespaldo(datos, "ADMIN")));
  fn(r);
  return JSON.stringify(r);
};

rechaza("JSON roto", "{ esto no es json");
rechaza("otro formato", JSON.stringify({ formato: "otra-cosa", version: 1, datos: {} }));
rechaza("versión futura", variar((r) => ((r as { version: number }).version = 99)));
rechaza("sin asignaciones", variar((r) => delete (r as { datos: Partial<DatosRespaldo> }).datos.asignaciones));
rechaza("estado desconocido", variar((r) => ((r as { datos: DatosRespaldo }).datos.asignaciones[0].estado = "completada" as never)));
rechaza("id repetido", variar((r) => {
  const d = (r as { datos: DatosRespaldo }).datos;
  d.asignaciones.push({ ...d.asignaciones[0] });
}));
rechaza("rol de tipo desconocido", variar((r) => ((r as { datos: DatosRespaldo }).datos.configuracion.roles[0].tipo = "OTRO" as never)));
rechaza("sin novedades", variar((r) => delete (r as { datos: Partial<DatosRespaldo> }).datos.novedades));

console.log(fallos === 0 ? "\n✓ Respaldo verificado." : `\n✗ ${fallos} fallos.`);
if (fallos > 0) process.exit(1);
