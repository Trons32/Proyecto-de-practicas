/**
 * Prueba de descargas, actividades y apoyo según la dedicación (SPEC-030).
 *
 *   npx tsx src/lib/verificar-dedicacion.ts
 */
import { ROLES, REGLAS_DEDICACION } from "./catalogos";
import { calcularTotales, filaVacia, validarDocente, type Hallazgo } from "./calculo";
import { nuevaAdministrativa, nuevaDescarga, nuevoDocente, type Docente } from "./tipos";

let fallos = 0;
const comprobar = (nombre: string, ok: boolean, detalle?: unknown) => {
  if (ok) console.log(`✓ ${nombre}`);
  else {
    fallos++;
    console.error(`✗ ${nombre}`, detalle ?? "");
  }
};

const ROL = ROLES[0].id;

/** Un docente con un solo curso de `horas` y el apoyo de su regla. */
const docente = (dedicacion: string, horas: number, extra: Partial<Docente> = {}): Docente => {
  const base = nuevoDocente("PROGRAMA");
  const regla = REGLAS_DEDICACION[dedicacion];
  return {
    ...base,
    dedicacion,
    preparacion: regla.preparacion,
    atencion: regla.atencion,
    comunidades: regla.comunidades,
    cursos: [{ ...base.cursos[0], nombreCurso: "CURSO", codigoCurso: "1", intensidadHoraria: horas, creditos: 3, jornada: "DIURNA", modalidad: "PRESENCIAL" }],
    ...extra,
  };
};
const hallazgos = (d: Docente): Hallazgo[] => validarDocente(d, calcularTotales(d));
const error = (d: Docente, campo: string) => hallazgos(d).some((h) => h.severidad === "error" && h.campo === campo);

// Cátedra y tutores: todo opcional, y las 12 h son un máximo.
for (const ded of ["HORA_CÁTEDRA", "HORA_LABOR", "TUTOR_VIRTUAL", "TUTOR_EAD"]) {
  const corto = docente(ded, 8);
  comprobar(`${ded}: sin descargas no es error`, !error(corto, "descarga-requerida"));
  comprobar(`${ded}: sin apoyo no es error`, !error(corto, "apoyo"));
  comprobar(`${ded}: 8 h de 12 no es error`, !hallazgos(corto).some((h) => h.campo === "totalSemanal"));
  comprobar(`${ded}: 14 h de 12 sí es error`, error(docente(ded, 14), "totalSemanal"));
}

// Tiempo completo y medio tiempo: descarga y apoyo obligatorios, y cuadrar.
for (const ded of ["TIEMPO_COMPLETO", "MEDIO_TIEMPO"]) {
  const regla = REGLAS_DEDICACION[ded];
  const apoyo = regla.preparacion + regla.atencion + regla.comunidades;
  const conDescarga = (horasCurso: number, horasDescarga: number, extra: Partial<Docente> = {}) =>
    docente(ded, horasCurso, { descargas: [{ ...nuevaDescarga(), rolId: ROL, horas: horasDescarga }], ...extra });

  const completo = conDescarga(regla.maxHoras - apoyo - 2, 2);
  // Los datos de identidad no son de esta prueba: solo horas, descargas y apoyo.
  const deCarga = hallazgos(completo).filter((h) => h.severidad === "error" && /^(totalSemanal|apoyo|descarga-|admin-|curso)/.test(h.campo));
  comprobar(`${ded}: completo no tiene errores de carga`, deCarga.length === 0, deCarga);
  comprobar(`${ded}: sin descargas es error`, error(docente(ded, regla.maxHoras - apoyo), "descarga-requerida"));
  comprobar(
    `${ded}: solo una fila vacía cuenta como sin descargas`,
    error(docente(ded, regla.maxHoras - apoyo, { descargas: [nuevaDescarga()] }), "descarga-requerida")
  );
  comprobar(
    `${ded}: apoyo en 0 es error`,
    error(conDescarga(regla.maxHoras - 2, 2, { preparacion: 0, atencion: 0, comunidades: 0 }), "apoyo")
  );
  comprobar(`${ded}: quedarse corto sigue siendo error`, error(conDescarga(1, 1), "totalSemanal"));
}

// Filas vacías y a medias.
comprobar("fila sin rol y sin horas es vacía", filaVacia(nuevaDescarga()));
comprobar("fila con rol no es vacía", !filaVacia({ ...nuevaDescarga(), rolId: ROL }));
comprobar("fila con horas no es vacía", !filaVacia({ ...nuevaAdministrativa(), horas: 2 }));
comprobar(
  "rol sin horas sigue siendo error",
  error(docente("HORA_CÁTEDRA", 8, { descargas: [{ ...nuevaDescarga(), rolId: ROL }] }), "descarga-0")
);
comprobar(
  "horas sin rol sigue siendo error",
  error(docente("HORA_CÁTEDRA", 8, { administrativas: [{ ...nuevaAdministrativa(), horas: 2 }] }), "admin-0")
);

// Curso repetido: el mismo código y grupo en otro programa no lo es (pilotaje).
{
  const base = docente("HORA_CÁTEDRA", 2);
  const c = { ...base.cursos[0], codigoCurso: "1467", grupo: "1", nombrePrograma: "PSICOLOGÍA", codigoPrograma: "20" };
  const otroPrograma = { ...c, id: "otro", nombrePrograma: "DERECHO", codigoPrograma: "30" };
  comprobar("mismo curso y grupo en otro programa no es repetido", !error({ ...base, cursos: [c, otroPrograma] }, "cursos"));
  comprobar("mismo curso, grupo y programa sí es repetido", error({ ...base, cursos: [c, { ...c, id: "copia" }] }, "cursos"));
}

if (fallos > 0) {
  console.error(`\n${fallos} comprobaciones fallaron.`);
  process.exit(1);
}
console.log("\nTodo en orden.");
