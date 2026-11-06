/**
 * Verificación de la lógica de novedades (SPEC-003).
 *
 *   npx tsx src/lib/verificar-novedades.ts
 *
 * Comprueba que las diferencias de parámetros se describen campo por campo
 * y que la foto de impacto atribuye al cambio solo lo que él introdujo.
 */
import { CONFIG_OFICIAL } from "./calculo";
import { MAX_ADMINISTRATIVAS, MAX_CURSOS, MAX_DESCARGAS, REGLAS_DEDICACION, ROLES } from "./catalogos";
import { diferenciasParametros, fotoDeImpacto, claseDe, motivoPorDefecto, numeroEnSuClase, periodoDeReferencia, tituloDe, type Novedad, type Parametros } from "./novedades";
import { nuevaAsignacion, nuevoCurso, nuevoDocente, type Asignacion } from "./tipos";

let fallos = 0;
const comprobar = (nombre: string, ok: boolean, detalle?: unknown) => {
  if (!ok) {
    fallos++;
    console.error(`✗ ${nombre}`, detalle ?? "");
  } else {
    console.log(`✓ ${nombre}`);
  }
};

const oficial = (): Parametros => ({
  reglas: Object.fromEntries(Object.entries(REGLAS_DEDICACION).map(([k, v]) => [k, { ...v }])),
  roles: ROLES.map((r) => ({ ...r })),
  limites: { maxCursos: MAX_CURSOS, maxDescargas: MAX_DESCARGAS, maxAdministrativas: MAX_ADMINISTRATIVAS },
});

// ── Diferencias ───────────────────────────────────────────────
{
  const antes = oficial();
  const despues = oficial();
  despues.reglas.TIEMPO_COMPLETO.maxHoras = 38;
  despues.limites.maxCursos = 8;
  despues.roles = despues.roles.filter((r) => r.id !== 1);
  despues.roles[0] = { ...despues.roles[0], tipo: "INVESTIGACION" };
  despues.roles.push({ id: 999, nombre: "ROL NUEVO", tipo: "DOCENCIA" });

  const cambios = diferenciasParametros(antes, despues);
  const tope = cambios.find((c) => c.parametro === "TIEMPO COMPLETO · máximo de horas");

  comprobar("sin cambios, sin diferencias", diferenciasParametros(antes, oficial()).length === 0);
  comprobar("tope 40 → 38", tope?.antes === "40 h" && tope?.despues === "38 h", tope);
  comprobar("límite de cursos", cambios.some((c) => c.ambito === "limite" && c.despues === "8"));
  comprobar("rol eliminado", cambios.some((c) => c.parametro === "Rol 1" && c.despues === null));
  comprobar("rol reclasificado", cambios.some((c) => c.parametro.endsWith("· tipo")));
  comprobar("rol agregado", cambios.some((c) => c.parametro === "Rol 999" && c.antes === null));
  comprobar("un cambio por campo", cambios.length === 5, cambios);
}

// ── Foto de impacto ───────────────────────────────────────────
{
  // Un docente de tiempo completo con 39 h: cumple con 40, no con 38.
  const docente = {
    ...nuevoDocente(),
    documento: "12345678",
    nombres: "DOCENTE DE PRUEBA",
    nivelFormacion: "MAGISTER",
    tipoContrato: "TÉRMINO_INDEFINIDO",
    dedicacion: "TIEMPO_COMPLETO",
    categoria: "ASOCIADO",
    sede: "SINCELEJO",
    preparacion: 5,
    atencion: 5,
    comunidades: 3,
    cursos: [
      {
        ...nuevoCurso(),
        nombreCurso: "CURSO",
        intensidadHoraria: 26,
        creditos: 3,
        jornada: "DIURNA",
        modalidad: "PRESENCIAL",
      },
    ],
  };
  const aprobada: Asignacion = {
    ...nuevaAsignacion({ periodo: "2026-2", facultad: "F", programa: "P" }),
    estado: "aprobada",
    docentes: [docente],
  };
  const borrador: Asignacion = { ...aprobada, id: "b", estado: "borrador" };

  const nueva = {
    ...CONFIG_OFICIAL,
    reglas: { ...CONFIG_OFICIAL.reglas, TIEMPO_COMPLETO: { ...CONFIG_OFICIAL.reglas.TIEMPO_COMPLETO, maxHoras: 38 } },
  };

  const foto = fotoDeImpacto([aprobada, borrador], nueva, CONFIG_OFICIAL);
  comprobar("bajar el tope afecta a la aprobada", foto.length === 1 && foto[0].asignacionId === aprobada.id, foto);
  comprobar("el borrador no cuenta como afectado", !foto.some((f) => f.asignacionId === "b"));
  comprobar(
    "la foto guarda docentes y motivos",
    foto[0]?.docentes[0]?.motivos.some((m) => m.includes("38")),
    foto[0]?.docentes
  );
  comprobar("subir el tope no afecta a nadie", fotoDeImpacto([aprobada], CONFIG_OFICIAL, nueva).length === 0);
}

// ── Periodo de referencia ─────────────────────────────────────
{
  const ahora = new Date("2026-09-30T12:00:00").getTime();
  const conv = {
    "2026-1": { periodo: "2026-1", apertura: "2026-01-10T00:00:00Z", limite: "2026-02-01T00:00:00Z", cerradaManualmente: false },
    "2026-2": { periodo: "2026-2", apertura: "2026-07-10T00:00:00Z", limite: "2026-08-15T00:00:00Z", cerradaManualmente: false },
  };
  const r = periodoDeReferencia(conv, ahora);
  comprobar("toma la convocatoria más reciente, ya cerrada", r.periodo === "2026-2" && r.cerrada, r);
  comprobar("sin convocatorias no hay periodo", periodoDeReferencia({}, ahora).periodo === null);
}

// ── Un cambio por modal (SPEC-012) ────────────────────────────
{
  const antes = oficial();
  const nuevo = { ...antes, roles: [...antes.roles, { id: 57, nombre: "PEPE", tipo: "INVESTIGACION" as const }] };
  const c = diferenciasParametros(antes, nuevo);
  comprobar("crear un rol es un solo cambio", c.length === 1 && c[0].antes === null, c);
  comprobar("motivo por defecto al crear", motivoPorDefecto(c) === "Creación del rol PEPE (Investigación)", motivoPorDefecto(c));

  const inactivo = { ...antes, roles: antes.roles.map((r) => (r.id === 1 ? { ...r, inactivo: true as const } : r)) };
  const d = diferenciasParametros(antes, inactivo);
  comprobar("desactivar es un cambio de estado, no una baja", d.length === 1 && d[0].antes === "Activo" && d[0].despues === "Inactivo", d);
  comprobar("motivo por defecto al desactivar", motivoPorDefecto(d) === "Desactivación del rol DECANO", motivoPorDefecto(d));

  const regla = { ...antes, reglas: { ...antes.reglas, TIEMPO_COMPLETO: { ...antes.reglas.TIEMPO_COMPLETO, maxHoras: 38 } } };
  const m = motivoPorDefecto(diferenciasParametros(antes, regla));
  comprobar("motivo por defecto en una dedicación", m.startsWith("Cambio en la dedicación"), m);
  const lim = { ...antes, limites: { ...antes.limites, maxCursos: 11 } };
  comprobar("motivo por defecto en límites", motivoPorDefecto(diferenciasParametros(antes, lim)) === "Cambio en los límites del formato");
}

// ── Novedad u observación (SPEC-013) ──────────────────────────
{
  const reg = (numero: number, cerrada: boolean) =>
    ({ id: String(numero), numero, conConvocatoriaCerrada: cerrada }) as Novedad;
  const todas = [reg(1, false), reg(2, true), reg(3, false), reg(4, true)];
  comprobar("con la convocatoria abierta es observación", claseDe(todas[0]) === "observacion");
  comprobar("con la convocatoria cerrada es novedad", claseDe(todas[1]) === "novedad");
  comprobar("cada clase numera por su lado", numeroEnSuClase(todas, todas[2]) === 2 && numeroEnSuClase(todas, todas[3]) === 2);
  comprobar("título por clase", tituloDe(todas, todas[3]) === "Novedad N.º 2" && tituloDe(todas, todas[0]) === "Observación N.º 1", tituloDe(todas, todas[3]));
}

console.log(fallos === 0 ? "\n✓ Novedades verificadas." : `\n✗ ${fallos} fallos.`);
if (fallos > 0) process.exit(1);
