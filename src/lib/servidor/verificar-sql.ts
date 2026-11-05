/**
 * Verificación de la conexión a PostgreSQL (SPEC-006, SPEC-011), contra una base real.
 *
 *   DATABASE_URL=postgresql://…/asignacion_academica_prueba npx prisma migrate deploy
 *   DATABASE_URL=postgresql://…/asignacion_academica_prueba npx prisma db seed
 *   DATABASE_URL=postgresql://…/asignacion_academica_prueba npx tsx src/lib/servidor/verificar-sql.ts
 *
 * Escribe y borra datos: se niega a correr sobre una base que no termine en
 * `_prueba`.
 */
import { CONTRATOS, MAX_ADMINISTRATIVAS, MAX_CURSOS, MAX_DESCARGAS, REGLAS_DEDICACION, ROLES } from "../catalogos";
import type { Novedad } from "../novedades";
import { cursosBase, nuevaAsignacion, nuevoCurso, nuevoDocente, nuevoEvento, type Asignacion, type Docente } from "../tipos";
import fixture from "../__fixture.json";
import { bd as cliente, cerrar } from "./bd";
import { CambioRechazado, esRechazoDeLaBase, guardarAsignaciones, guardarConfiguracion, guardarNovedades } from "./escribir";
import { aUuid } from "./ids";
import { leerAsignaciones, leerConfiguracion, leerNovedades } from "./leer";

const base = new URL(process.env.DATABASE_URL ?? "postgresql://x/").pathname.slice(1);
if (!base.endsWith("_prueba")) {
  console.error("✗ Use una base desechable: el nombre de la base en DATABASE_URL debe terminar en _prueba.");
  process.exit(1);
}

let fallos = 0;
const comprobar = (nombre: string, ok: boolean, detalle?: unknown) => {
  if (ok) console.log(`✓ ${nombre}`);
  else {
    fallos++;
    console.error(`✗ ${nombre}`, detalle ?? "");
  }
};

/** JSON con las claves ordenadas: el orden de las propiedades no es un dato. */
const canonico = (v: unknown): string =>
  JSON.stringify(v, (_k, x) =>
    x && typeof x === "object" && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x).sort(([p], [q]) => p.localeCompare(q)))
      : x
  );

/** La primera diferencia entre dos valores, para no volcar 45 docentes al fallar. */
function diferencia(a: unknown, b: unknown, ruta = "$"): string | null {
  if (canonico(a) === canonico(b)) return null;
  if (a && b && typeof a === "object" && typeof b === "object") {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const d = diferencia((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${ruta}.${k}`);
      if (d) return d;
    }
  }
  return `${ruta}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`;
}

const rolPorNombre = new Map(ROLES.map((r) => [r.nombre, r.id]));
const contratoPara = (ded: string) => Object.keys(CONTRATOS).find((c) => CONTRATOS[c][ded]) ?? "";

/** Los 45 docentes del formato, con todos los campos llenos para que la ida y vuelta los pase todos. */
const docentes: Docente[] = fixture.casos.map((c, i) => {
  const contrato = contratoPara(c.dedicacion);
  return {
    ...nuevoDocente("INGENIERÍA DE SISTEMAS"),
    documento: String(10_000_000 + i),
    nombres: `DOCENTE ${c.n} ÑÚÉ`,
    nivelFormacion: "MAESTRÍA",
    perfilProfesional: "Ingeniero de sistemas",
    categoriaMinciencias: i % 2 ? "ASOCIADO" : "",
    activoSectorExterno: i % 2 ? "SI" : "NO",
    sectorEjerce: "",
    tipoContrato: contrato,
    dedicacion: c.dedicacion,
    // Algunos del formato no traen dedicación: un borrador a medio llenar es válido.
    categoria: contrato ? CONTRATOS[contrato][c.dedicacion][0] : "",
    sede: "SINCELEJO",
    evaluacionDocente: i % 3 ? 4.25 : null,
    observaciones: i === 0 ? "Con 'comillas' y tildes" : "",
    preparacion: c.preparacion,
    atencion: c.atencion,
    comunidades: c.comunidades,
    cursos: c.cursos.map((k) => ({
      ...nuevoCurso(),
      codigoCurso: k.codigoCurso,
      intensidadHoraria: k.intensidadHoraria,
      estudiantes: k.estudiantes,
      semestre: 3,
      jornada: "DIURNA",
    })),
    descargas: c.descargas.map((x) => ({ id: crypto.randomUUID(), rolId: rolPorNombre.get(x.rol) ?? null, horas: x.horas })),
    administrativas: c.administrativas.map((x) => ({ id: crypto.randomUUID(), rolId: rolPorNombre.get(x.rol) ?? null, horas: x.horas })),
  };
});

const configuracion = {
  reglas: structuredClone(REGLAS_DEDICACION),
  roles: ROLES.map((r) => ({ ...r })),
  limites: { maxCursos: MAX_CURSOS, maxDescargas: MAX_DESCARGAS, maxAdministrativas: MAX_ADMINISTRATIVAS },
  convocatorias: {
    "2026-2": { periodo: "2026-2", apertura: "2026-07-10T05:00:00.000Z", limite: "2026-08-16T04:59:59.999Z", cerradaManualmente: true },
  },
};

async function principal() {
  const bd = cliente();
  // Desde cero en cada corrida. La bitácora se va en cascada; las novedades
  // no se dejan borrar (trigger), así que se apagan solo para limpiar.
  const novedades = ["novedad_decision", "novedad_afectacion_docente", "novedad_afectacion", "novedad_cambio", "novedad"];
  await bd.$transaction([
    bd.$executeRawUnsafe(`DELETE FROM aa.asignacion`),
    ...novedades.map((t) => bd.$executeRawUnsafe(`ALTER TABLE aa.${t} DISABLE TRIGGER USER`)),
    ...novedades.map((t) => bd.$executeRawUnsafe(`DELETE FROM aa.${t}`)),
    ...novedades.map((t) => bd.$executeRawUnsafe(`ALTER TABLE aa.${t} ENABLE TRIGGER USER`)),
    bd.$executeRawUnsafe(`DELETE FROM aa.docente`),
    bd.$executeRawUnsafe(`DELETE FROM aa.convocatoria`),
  ]);

  // ── Configuración ───────────────────────────────────────────
  await guardarConfiguracion(configuracion);
  comprobar("configuración: ida y vuelta", !diferencia(await leerConfiguracion(), configuracion), diferencia(await leerConfiguracion(), configuracion));

  // ── Asignación con los 45 docentes ──────────────────────────
  // Nace como borrador —el servidor no admite otra cosa— y luego recorre el ciclo.
  const borrador: Asignacion = {
    ...nuevaAsignacion({ periodo: "2026-2", facultad: "CIENCIAS_BÁSICAS_INGENIERÍAS_Y_ARQUITECTURA", programa: "INGENIERÍA DE SISTEMAS" }, "COORDINADOR"),
    creada: "2026-07-15T14:00:00.000Z",
    actualizada: "2026-07-20T14:00:00.000Z",
    docentes,
  };
  borrador.bitacora = [{ ...borrador.bitacora[0], fecha: borrador.creada }];
  await guardarAsignaciones([borrador], []);
  let leidas = (await leerAsignaciones()).asignaciones;
  comprobar("borrador de 45 docentes: ida y vuelta (CA-006.3)", !diferencia(leidas, [borrador]), diferencia(leidas, [borrador]));

  const a: Asignacion = {
    ...borrador,
    estado: "aprobada",
    version: 1,
    lineaBase: { fecha: "2026-08-20T14:00:00.000Z", version: 1, cursos: cursosBase(borrador.docentes) },
    bitacora: [
      ...borrador.bitacora,
      nuevoEvento({ tipo: "enviada", autor: "COORDINADOR", rolAutor: "COORDINADOR", version: 1, fecha: "2026-07-20T14:00:00.000Z" }),
      nuevoEvento({ tipo: "aprobada", autor: "ADMIN", rolAutor: "ADMIN", nota: "Bien", version: 1, fecha: "2026-08-20T14:00:00.000Z" }),
    ],
  };
  await guardarAsignaciones([a], []);
  leidas = (await leerAsignaciones()).asignaciones;
  comprobar("enviar y aprobar: ida y vuelta, con la línea base (CA-009.3)", !diferencia(leidas, [a]), diferencia(leidas, [a]));

  await guardarAsignaciones(leidas, []);
  const otraVez = (await leerAsignaciones()).asignaciones;
  comprobar("reescribir lo leído no cambia nada", !diferencia(otraVez, leidas), diferencia(otraVez, leidas));

  // ── El servidor hace cumplir el ciclo (SPEC-007) ────────────
  const rechazo = async (nombre: string, fn: () => Promise<unknown>) => {
    let error: unknown = null;
    try {
      await fn();
    } catch (e) {
      error = e;
    }
    comprobar(`rechaza: ${nombre}`, error instanceof CambioRechazado, error);
  };
  await rechazo("tocar los docentes de una aprobada", () =>
    guardarAsignaciones([{ ...a, docentes: a.docentes.slice(1) }], []));
  await rechazo("crear una asignación ya aprobada", () =>
    guardarAsignaciones([{ ...a, id: crypto.randomUUID() }], []));
  await rechazo("borrar una aprobada", () => guardarAsignaciones([], [a.id]));
  const intacta = (await leerAsignaciones()).asignaciones;
  comprobar("tras los rechazos la base sigue igual", !diferencia(intacta, [a]), diferencia(intacta, [a]));

  // ── Novedad que reabre la asignación ────────────────────────
  const novedad: Novedad = {
    id: crypto.randomUUID(),
    numero: 1,
    fecha: "2026-09-01T15:00:00.000Z",
    autor: "ADMIN",
    rolAutor: "ADMIN",
    periodo: "2026-2",
    conConvocatoriaCerrada: true,
    motivo: "Ajuste de topes",
    cambios: [{ ambito: "regla", parametro: "TIEMPO COMPLETO · máximo de horas", antes: "40", despues: "38" }],
    afectadas: [{
      asignacionId: a.id, programa: a.programa, facultad: a.facultad, periodo: a.periodo, erroresAntes: 0, erroresAhora: 2,
      docentes: [{ nombres: "DOCENTE 1", motivos: ["Excede el máximo"] }],
    }],
    decisiones: [],
  };
  await guardarNovedades([novedad]);
  const plazo = "2026-09-10T04:59:59.999Z";
  const reabierta: Asignacion = {
    ...a,
    estado: "en_correccion",
    plazoCorreccion: plazo,
    bitacora: [...a.bitacora, nuevoEvento({ tipo: "reabierta_por_parametros", autor: "ADMIN", rolAutor: "ADMIN", nota: "Corrija", plazo, version: 1, novedadId: novedad.id, fecha: "2026-09-01T16:00:00.000Z" })],
  };
  novedad.decisiones.push({ asignacionId: a.id, accion: "reabierta", fecha: "2026-09-01T16:00:00.000Z", autor: "ADMIN", nota: "Corrija", plazo });
  // El orden del adaptador: primero la asignación, luego la decisión.
  await guardarAsignaciones([reabierta], []);
  await guardarNovedades([novedad]);
  comprobar("novedad con decisión: ida y vuelta", !diferencia((await leerNovedades()).novedades, [novedad]), diferencia((await leerNovedades()).novedades, [novedad]));
  leidas = (await leerAsignaciones()).asignaciones;
  comprobar("reapertura enlazada a su novedad", leidas[0].bitacora.at(-1)?.novedadId === novedad.id && leidas[0].estado === "en_correccion");

  await guardarNovedades([novedad]);
  const decisiones = await bd.novedad_decision.count();
  comprobar("reenviar una novedad no duplica decisiones", decisiones === 1, decisiones);

  const lineaGuardada = await bd.linea_base_curso.count({ where: { asignacion_id: a.id } });
  comprobar("la línea base guarda todos los cursos aprobados", lineaGuardada === a.lineaBase!.cursos.length, lineaGuardada);

  // ── Dos clientes (CA-006.4) ─────────────────────────────────
  const b = { ...nuevaAsignacion({ periodo: "2026-2", facultad: "DERECHO_Y_CIENCIAS_POLÍTICAS", programa: "DERECHO" }, "OTRO"), creada: "2026-07-16T14:00:00.000Z" };
  await guardarAsignaciones([b], []); // el otro cliente solo envía la suya
  leidas = (await leerAsignaciones()).asignaciones;
  comprobar("un cliente no borra la asignación de otro", leidas.length === 2 && leidas.some((x) => x.id === a.id), leidas.map((x) => x.programa));

  // ── Editar: quitar un docente ───────────────────────────────
  const editada = { ...reabierta, docentes: reabierta.docentes.slice(1) };
  await guardarAsignaciones([editada], []);
  const conteo = await bd.docente_asignado.count({ where: { asignacion_id: a.id } });
  comprobar("quitar un docente lo quita de la base", conteo === 44, conteo);
  const eventos = await bd.evento_asignacion.count({ where: { asignacion_id: a.id } });
  comprobar("reescribir no duplica la bitácora", eventos === 4, eventos);

  // ── Rechazo atómico ─────────────────────────────────────────
  const mala = { ...editada, docentes: [{ ...editada.docentes[0], categoria: "NO EXISTE" }, ...editada.docentes.slice(1)] };
  let rechazada = false;
  try {
    await guardarAsignaciones([mala], []);
  } catch (e) {
    // La API responde 422 solo si reconoce el rechazo como de la base.
    rechazada = esRechazoDeLaBase(e);
    if (!rechazada) console.error(e);
  }
  const tras = await bd.docente_asignado.count({ where: { asignacion_id: a.id } });
  comprobar("una cascada inválida se rechaza (422) sin dejar nada a medias", rechazada && tras === 44, { rechazada, tras });

  // Un CHECK (no una FK) también debe reconocerse como dato inválido.
  let rechazoCheck = false;
  try {
    await guardarAsignaciones([{ ...editada, docentes: [{ ...editada.docentes[0], evaluacionDocente: 7 }, ...editada.docentes.slice(1)] }], []);
  } catch (e) {
    rechazoCheck = esRechazoDeLaBase(e);
    if (!rechazoCheck) console.error(e);
  }
  comprobar("un CHECK violado se reconoce como dato rechazado", rechazoCheck);

  // ── Solo se añade: los triggers siguen mandando bajo Prisma ─
  let bitacoraIntacta = false;
  try {
    await bd.evento_asignacion.updateMany({ where: { asignacion_id: a.id }, data: { autor: "OTRO" } });
  } catch {
    bitacoraIntacta = true;
  }
  comprobar("la bitácora no se edita", bitacoraIntacta);

  // ── Documento repetido en un borrador ───────────────────────
  const repetido = { ...b, docentes: [{ ...nuevoDocente(), documento: "12345678" }, { ...nuevoDocente(), documento: "12345678" }] };
  let guardoRepetido = true;
  try {
    await guardarAsignaciones([repetido], []);
  } catch (e) {
    guardoRepetido = false;
    console.error(e);
  }
  comprobar("un documento repetido no bloquea el borrador", guardoRepetido);

  // ── Borrar ──────────────────────────────────────────────────
  await guardarAsignaciones([], [b.id]);
  leidas = (await leerAsignaciones()).asignaciones;
  comprobar("borrar elimina solo la indicada", leidas.length === 1 && leidas[0].id === a.id);

  // ── Dos administradores a la vez ────────────────────────────
  const c0 = { ...nuevaAsignacion({ periodo: "2026-2", facultad: "DERECHO_Y_CIENCIAS_POLÍTICAS", programa: "DERECHO" }, "C") };
  await guardarAsignaciones([c0], []);
  const c1: Asignacion = { ...c0, estado: "enviada", version: 1, bitacora: [...c0.bitacora, nuevoEvento({ tipo: "enviada", autor: "C", rolAutor: "COORDINADOR", version: 1 })] };
  await guardarAsignaciones([c1], []);
  const aprueba: Asignacion = { ...c1, estado: "aprobada", lineaBase: { fecha: "2026-10-24T15:00:00.000Z", version: 1, cursos: [] }, bitacora: [...c1.bitacora, nuevoEvento({ tipo: "aprobada", autor: "A1", rolAutor: "ADMIN", version: 1 })] };
  const devuelve: Asignacion = {
    ...c1, estado: "en_correccion", plazoCorreccion: "2026-12-01T04:59:59.999Z",
    bitacora: [...c1.bitacora, nuevoEvento({ tipo: "devuelta", autor: "A2", rolAutor: "ADMIN", version: 1, plazo: "2026-12-01T04:59:59.999Z" })],
  };
  const carrera = await Promise.allSettled([guardarAsignaciones([aprueba], []), guardarAsignaciones([devuelve], [])]);
  const ganadas = carrera.filter((r) => r.status === "fulfilled").length;
  const perdida = carrera.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
  comprobar("aprobar y devolver a la vez: gana uno, el otro se rechaza", ganadas === 1 && perdida?.reason instanceof CambioRechazado, carrera);
  const final = (await leerAsignaciones({ ids: [c0.id] })).asignaciones[0];
  comprobar("la bitácora registra solo la que ganó", final.bitacora.length === 3, final.bitacora.map((e) => e.tipo));

  // ── Ids cortos de antes de SPEC-006 ─────────────────────────
  comprobar("un id corto da siempre el mismo UUID", aUuid("k3j2h1") === aUuid("k3j2h1") && /^[0-9a-f-]{36}$/.test(aUuid("k3j2h1")));

  await cerrar();
  console.log(fallos === 0 ? "\n✓ Conexión a PostgreSQL verificada." : `\n✗ ${fallos} fallos.`);
  process.exit(fallos === 0 ? 0 : 1);
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
