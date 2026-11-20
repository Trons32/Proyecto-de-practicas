/**
 * Qué asignaciones ve cada coordinador (SPEC-026) y el reporte de
 * variaciones (SPEC-028).
 *
 *   npx tsx src/lib/verificar-alcance.ts
 */
import { dentroDelAlcance, filtroAlcance } from "./servidor/alcance";
import { nuevaAsignacion, nuevoDocente, type Asignacion } from "./tipos";
import { reporteVariaciones, variacionesDe } from "./variaciones";

let fallos = 0;
const comprobar = (nombre: string, ok: boolean, detalle?: unknown) => {
  if (ok) console.log(`✓ ${nombre}`);
  else {
    fallos++;
    console.error(`✗ ${nombre}`, detalle ?? "");
  }
};

const asig = (programa: string, autor: string, periodo = "2026-2"): Asignacion =>
  nuevaAsignacion({ periodo, facultad: "F", programa }, autor);

// ── Alcance del coordinador ───────────────────────────────────
const propia = asig("DERECHO", "ANA");
const deSuPrograma = asig("DERECHO", "OTRO");
const ajena = asig("ECONOMÍA", "OTRO");
const creadaPorEl = asig("ECONOMÍA", "ANA");
const alcance = { programa: "DERECHO", nombres: "ANA" };

comprobar("ve la que creó", dentroDelAlcance(propia, alcance));
comprobar("ve las de su programa aunque las creara otro", dentroDelAlcance(deSuPrograma, alcance));
comprobar("no ve las de otro programa", !dentroDelAlcance(ajena, alcance));
comprobar("ve la de otro programa que él creó", dentroDelAlcance(creadaPorEl, alcance));
comprobar("sin programa, solo lo que creó", !dentroDelAlcance(deSuPrograma, { programa: null, nombres: "ANA" }) && dentroDelAlcance(propia, { programa: null, nombres: "ANA" }));
const filtro = filtroAlcance(alcance);
comprobar("el filtro SQL tiene las dos condiciones", Array.isArray(filtro.OR) && filtro.OR.length === 2);
comprobar("sin programa, el filtro SQL solo mira el autor", (filtroAlcance({ programa: null, nombres: "ANA" }).OR ?? []).length === 1);

// ── Reporte de variaciones ────────────────────────────────────
const dA = { ...nuevoDocente(), documento: "111111", nombres: "ANA", dedicacion: "TIEMPO_COMPLETO" };
const dB = { ...nuevoDocente(), documento: "222222", nombres: "BETO", dedicacion: "HORA_CÁTEDRA" };
const previa: Asignacion = { ...asig("DERECHO", "ANA", "2026-1"), estado: "aprobada", docentes: [dA, dB] };
const vigente: Asignacion = { ...asig("DERECHO", "ANA"), docentes: [dA] };
const importada: Asignacion = {
  ...asig("ECONOMÍA", "ADMIN"),
  estado: "aprobada",
  docentes: [dB],
  bitacora: [{ id: "i", tipo: "importada", fecha: "2026-08-01T00:00:00.000Z", autor: "ADMIN", rolAutor: "ADMIN", nota: "x.xlsx" }],
};
const filas = reporteVariaciones([previa, vigente, importada], "2026-2");
comprobar("el reporte trae al que salió", filas.length === 1 && filas[0].variacion.nombres === "BETO" && filas[0].variacion.tipo === "saliente", filas);
comprobar("las importadas no entran al reporte", filas.every((f) => f.programa !== "ECONOMÍA"));
comprobar("sin motivo, el reporte lo muestra vacío", filas[0].motivo === "");

const entregada: Asignacion = {
  ...vigente,
  estado: "enviada",
  version: 1,
  variaciones: [{ id: "x", tipo: "saliente", documento: "222222", nombres: "BETO", dedicacion: "HORA_CÁTEDRA", nota: "", motivo: "RENUNCIA" }],
};
comprobar("lo entregado usa la foto guardada", variacionesDe(entregada, [previa, entregada])[0].motivo === "RENUNCIA");
comprobar("lo entregado no se recalcula aunque cambie la anterior", variacionesDe(entregada, [{ ...previa, docentes: [dA] }, entregada]).length === 1);

console.log(fallos === 0 ? "\n✓ Alcance y variaciones verificados." : `\n✗ ${fallos} fallos.`);
process.exit(fallos === 0 ? 0 : 1);
