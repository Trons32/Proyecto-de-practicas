/**
 * Verificación del ciclo de vida en el servidor (SPEC-007).
 *
 *   npx tsx src/lib/verificar-transiciones.ts
 *
 * Los casos legales salen de las acciones reales del store: si una acción
 * produce algo que el servidor rechazaría, la aplicación dejaría de poder
 * guardar. Los ilegales son lo que un cliente manipulado podría mandar.
 */
import { useAsignacionStore, type Autor } from "./stores/asignacion-store";
import { revisarBorrado, revisarGuardado } from "./transiciones";
import { cursosBase, nuevoDocente, nuevoEvento, type Asignacion } from "./tipos";
import { cuentaRegresiva, estadoConvocatoria, faltaLegible, finDelDia, instanteLocal, partesFechaHora, urgenciaDe, type Convocatoria } from "./convocatoria";
import { calcularTotales, validarDocente } from "./calculo";
import { asignacionAnterior, filasVariacion, variacionesPendientes } from "./variaciones";
import { bloqueoPorPlazo, edicionAdminAbierta, reabrible } from "./plazos";

let fallos = 0;
const comprobar = (nombre: string, ok: boolean, detalle?: unknown) => {
  if (ok) console.log(`✓ ${nombre}`);
  else {
    fallos++;
    console.error(`✗ ${nombre}`, detalle ?? "");
  }
};
const admite = (nombre: string, anterior: Asignacion | undefined, nueva: Asignacion) => {
  const r = revisarGuardado(anterior, nueva);
  comprobar(`admite: ${nombre}`, r === null, r);
};
const rechaza = (nombre: string, anterior: Asignacion | undefined, nueva: Asignacion) =>
  comprobar(`rechaza: ${nombre}`, revisarGuardado(anterior, nueva) !== null);

const coord: Autor = { nombres: "COORDINADOR", rol: "COORDINADOR" };
const admin: Autor = { nombres: "ADMIN", rol: "ADMIN" };
// Lejano a propósito: la regla del reloj (SPEC-022) bloquea una corrección
// vencida, y con una fecha cercana la prueba empezaría a fallar sola.
const plazo = "2099-11-30T04:59:59.999Z";

const store = useAsignacionStore.getState;
/** Copia profunda: lo "guardado en la base" no puede moverse con el store. */
const foto = (id: string) => structuredClone(store().asignaciones.find((a) => a.id === id)!);

// ── El recorrido completo con las acciones del store ──────────
const id = store().crearAsignacion({ periodo: "2026-2", facultad: "DERECHO_Y_CIENCIAS_POLÍTICAS", programa: "DERECHO" }, coord);
let base = foto(id);
admite("crear", undefined, base);

store().agregarDocente(id);
admite("editar el borrador", base, foto(id));
base = foto(id);

store().enviar(id, coord);
admite("enviar", base, foto(id));
const enviada = foto(id);

store().abrirRevision(id, admin);
admite("abrir revisión", enviada, foto(id));
const enRevision = foto(id);

store().devolver(id, admin, "Falta un curso", plazo);
admite("devolver", enRevision, foto(id));
const devuelta = foto(id);

const d = store().asignaciones.find((a) => a.id === id)!.docentes[0];
store().actualizarDocente(id, { ...d, nombres: "CORREGIDO" });
admite("corregir lo devuelto", devuelta, foto(id));
const corregida = foto(id);

store().enviar(id, coord);
admite("reenviar", corregida, foto(id));
const reenviada = foto(id);
comprobar("el reenvío es la versión 2", reenviada.version === 2 && reenviada.plazoCorreccion === undefined);

store().aprobar(id, admin, "Bien");
admite("aprobar sin abrir revisión", reenviada, foto(id));
const aprobada = foto(id);

store().reabrirVarias([id], admin, "Cambió el tope", plazo, crypto.randomUUID());
admite("reabrir por parámetros", aprobada, foto(id));

// Un guardado que falló y se reintenta lleva dos pasos juntos.
const base1 = () => ({ fecha: "2026-10-24T15:00:00.000Z", version: 1, cursos: cursosBase(enviada.docentes) });
admite("dos pasos en un guardado (reintento)", enviada, {
  ...enviada,
  estado: "aprobada",
  lineaBase: base1(),
  bitacora: [
    ...enviada.bitacora,
    nuevoEvento({ tipo: "revision_abierta", autor: "ADMIN", rolAutor: "ADMIN", version: 1 }),
    nuevoEvento({ tipo: "aprobada", autor: "ADMIN", rolAutor: "ADMIN", version: 1 }),
  ],
});

// ── Lo que un cliente manipulado podría mandar ────────────────
rechaza("nacer aprobada", undefined, { ...base, id: crypto.randomUUID(), estado: "aprobada", version: 1 });
rechaza("nacer con historia", undefined, { ...base, id: crypto.randomUUID(), bitacora: aprobada.bitacora });
rechaza("cambiar docentes de una enviada", enviada, { ...enviada, docentes: [...enviada.docentes, nuevoDocente()] });
rechaza("cambiar docentes de una aprobada", aprobada, { ...aprobada, docentes: [] });
rechaza("cambiar el programa de una aprobada", aprobada, { ...aprobada, programa: "MEDICINA" });
rechaza("aprobar sin evento", enviada, { ...enviada, estado: "aprobada" });
rechaza("borrar la bitácora", aprobada, { ...aprobada, bitacora: aprobada.bitacora.slice(0, 2) });
rechaza("reordenar la bitácora", aprobada, { ...aprobada, bitacora: [...aprobada.bitacora].reverse() });
rechaza("aprobar un borrador", base, {
  ...base, estado: "aprobada",
  bitacora: [...base.bitacora, nuevoEvento({ tipo: "aprobada", autor: "X", rolAutor: "ADMIN", version: 0 })],
});
rechaza("el coordinador se aprueba", enviada, {
  ...enviada, estado: "aprobada",
  bitacora: [...enviada.bitacora, nuevoEvento({ tipo: "aprobada", autor: "X", rolAutor: "COORDINADOR", version: 1 })],
});
rechaza("devolver sin plazo", enviada, {
  ...enviada, estado: "en_correccion",
  bitacora: [...enviada.bitacora, nuevoEvento({ tipo: "devuelta", autor: "X", rolAutor: "ADMIN", version: 1 })],
});
rechaza("alargarse el plazo", devuelta, { ...devuelta, plazoCorreccion: "2027-01-31T04:59:59.999Z" });
rechaza("enviar sin subir la versión", base, {
  ...base, estado: "enviada",
  bitacora: [...base.bitacora, nuevoEvento({ tipo: "enviada", autor: "X", rolAutor: "COORDINADOR", version: 1 })],
});
rechaza("un segundo evento de creación", base, {
  ...base, bitacora: [...base.bitacora, nuevoEvento({ tipo: "creada", autor: "X", rolAutor: "COORDINADOR" })],
});

// ── Con sesión en el servidor (SPEC-008) ──────────────────────
const sesionCoord = { nombres: coord.nombres, rol: coord.rol };
const sesionAdmin = { nombres: admin.nombres, rol: admin.rol };
const aprobadaPorAdmin: Asignacion = {
  ...enviada,
  estado: "aprobada",
  lineaBase: base1(),
  bitacora: [...enviada.bitacora, nuevoEvento({ tipo: "aprobada", autor: "ADMIN", rolAutor: "ADMIN", version: 1 })],
};
comprobar("con sesión: el administrador aprueba", revisarGuardado(enviada, aprobadaPorAdmin, sesionAdmin) === null);
comprobar("con sesión: el coordinador no puede aprobar aunque el evento diga ADMIN", revisarGuardado(enviada, aprobadaPorAdmin, sesionCoord) !== null);
comprobar("con sesión: un evento a nombre de otro se rechaza", revisarGuardado(enviada, aprobadaPorAdmin, { nombres: "OTRO", rol: "ADMIN" }) !== null);
comprobar("con sesión: el administrador no puede editar docentes", revisarGuardado(base, { ...base, docentes: [nuevoDocente()] }, sesionAdmin) !== null);
comprobar("con sesión: el coordinador envía", revisarGuardado(base, (() => {
  const x = structuredClone(base);
  x.estado = "enviada"; x.version = 1;
  x.bitacora.push(nuevoEvento({ tipo: "enviada", autor: "COORDINADOR", rolAutor: "COORDINADOR", version: 1 }));
  return x;
})(), sesionCoord) === null);
comprobar("con sesión: crear a nombre de otro se rechaza", revisarGuardado(undefined, base, { nombres: "OTRO", rol: "COORDINADOR" }) !== null);

// ── Línea base de la proyección (SPEC-009) ────────────────────
comprobar("aprobar fija la línea base con los cursos aprobados", aprobada.lineaBase?.cursos.length === cursosBase(reenviada.docentes).length && aprobada.lineaBase?.version === 2);
const id2 = store().crearAsignacion({ periodo: "2026-2", facultad: "DERECHO_Y_CIENCIAS_POLÍTICAS", programa: "DERECHO" }, coord);
store().agregarDocente(id2);
store().enviar(id2, coord);
store().aprobar(id2, admin);
const primera = foto(id2).lineaBase;
store().reabrirVarias([id2], admin, "Ajuste", plazo);
const d2 = store().asignaciones.find((a) => a.id === id2)!.docentes[0];
store().actualizarDocente(id2, { ...d2, cursos: [] });
store().enviar(id2, coord);
store().aprobar(id2, admin);
comprobar("reabrir, corregir y reaprobar no cambia la línea base", JSON.stringify(foto(id2).lineaBase) === JSON.stringify(primera) && foto(id2).docentes[0].cursos.length === 0);
rechaza("alterar la línea base de una aprobada", aprobada, {
  ...aprobada,
  lineaBase: { ...aprobada.lineaBase!, cursos: [] },
});
rechaza("poner línea base sin aprobar", enviada, { ...enviada, lineaBase: base1() });
rechaza("aprobar sin línea base", enviada, {
  ...enviada,
  estado: "aprobada",
  bitacora: [...enviada.bitacora, nuevoEvento({ tipo: "aprobada", autor: "ADMIN", rolAutor: "ADMIN", version: 1 })],
});
rechaza("una línea base que no es lo aprobado", enviada, {
  ...aprobadaPorAdmin,
  lineaBase: { ...base1(), cursos: [] },
});
rechaza("nacer con línea base", undefined, { ...base, id: crypto.randomUUID(), lineaBase: base1() });
comprobar("lo aprobado antes de SPEC-009 sigue sin línea base", revisarGuardado({ ...aprobada, lineaBase: undefined }, { ...aprobada, lineaBase: undefined }) === null);

// ── Lo que no cambia el contenido ─────────────────────────────
const redondeo = structuredClone(enviada);
redondeo.docentes[0].evaluacionDocente = 4.26;
const original = structuredClone(enviada);
original.docentes[0].evaluacionDocente = 4.257;
admite("el redondeo de la base no es una edición", original, redondeo);

// ── El reloj (SPEC-022) ───────────────────────────────────────
const abierta: Convocatoria = { periodo: "2026-2", apertura: "2026-07-01T05:00:00.000Z", limite: "2099-12-31T04:59:59.999Z", cerradaManualmente: false };
const cerrada: Convocatoria = { ...abierta, cerradaManualmente: true };
const porCerrada = { convocatoria: cerrada };
const borradorConDocente = { ...base, docentes: [...base.docentes, nuevoDocente()] };
comprobar("convocatoria abierta: el borrador se edita", revisarGuardado(base, borradorConDocente, undefined, { convocatoria: abierta }) === null);
comprobar("convocatoria cerrada: el borrador ya no se edita", revisarGuardado(base, borradorConDocente, undefined, porCerrada) !== null);
comprobar("convocatoria cerrada: tampoco se envía", revisarGuardado(base, enviada, undefined, porCerrada) !== null);
comprobar("convocatoria abierta: se envía", revisarGuardado(base, enviada, undefined, { convocatoria: abierta }) === null);
comprobar("convocatoria cerrada: el administrador sigue revisando", revisarGuardado(enviada, enRevision, undefined, porCerrada) === null);
const despuesDelPlazo = Date.parse(plazo) + 60_000;
comprobar("plazo de corrección vigente: se corrige", revisarGuardado(devuelta, corregida, undefined, { ahora: Date.parse(plazo) - 60_000 }) === null);
comprobar("plazo de corrección vencido: ya no se corrige", revisarGuardado(devuelta, corregida, undefined, { ahora: despuesDelPlazo }) !== null);
comprobar("plazo de corrección vencido: ni se reenvía", revisarGuardado(corregida, reenviada, undefined, { ahora: despuesDelPlazo }) !== null);
comprobar("el bloqueo lo explica", (bloqueoPorPlazo(base, cerrada) ?? "").includes("solo lectura"));

// Reabrir por parámetros con la convocatoria cerrada: también lo entregado
// sin aprobar y lo que quedó sin entregar.
const id3 = store().crearAsignacion({ periodo: "2026-2", facultad: "DERECHO_Y_CIENCIAS_POLÍTICAS", programa: "DERECHO" }, coord);
store().agregarDocente(id3);
store().enviar(id3, coord);
const enviada3 = foto(id3);
store().reabrirVarias([id3], admin, "Cambió el tope", plazo, crypto.randomUUID());
admite("reabrir por parámetros una enviada", enviada3, foto(id3));
comprobar("la enviada reabierta queda en corrección con plazo", foto(id3).estado === "en_correccion" && foto(id3).plazoCorreccion === plazo);
const id4 = store().crearAsignacion({ periodo: "2026-2", facultad: "DERECHO_Y_CIENCIAS_POLÍTICAS", programa: "DERECHO" }, coord);
const borrador4 = foto(id4);
store().reabrirVarias([id4], admin, "Cambió el tope", plazo, crypto.randomUUID());
admite("reabrir por parámetros un borrador bloqueado", borrador4, foto(id4));
comprobar("un borrador abierto no se ofrece para reabrir", !reabrible(borrador4, { "2026-2": abierta }));
comprobar("un borrador bloqueado por el cierre sí", reabrible(borrador4, { "2026-2": cerrada }));
comprobar("una aprobada sí, aunque la convocatoria siga abierta", reabrible(aprobada, { "2026-2": abierta }));

// ── El administrador corrige lo entregado (SPEC-023) ─────────
const idE = store().crearAsignacion({ periodo: "2026-2", facultad: "DERECHO_Y_CIENCIAS_POLÍTICAS", programa: "DERECHO" }, coord);
store().agregarDocente(idE);
store().enviar(idE, coord);
const entregadaE = foto(idE);
store().abrirEdicionAdmin(idE, admin, "   ");
comprobar("sin motivo, el store no abre la edición", foto(idE).bitacora.length === entregadaE.bitacora.length);
store().abrirEdicionAdmin(idE, admin, "Grupo mal digitado");
const abiertaE = foto(idE);
admite("abrir la edición del administrador", entregadaE, abiertaE);
comprobar("abrir la edición no cambia estado ni versión", abiertaE.estado === "enviada" && abiertaE.version === entregadaE.version);
comprobar("con la edición abierta lo dice la bitácora", edicionAdminAbierta(abiertaE));
const corregidaE: Asignacion = { ...abiertaE, docentes: [...abiertaE.docentes, nuevoDocente()] };
comprobar("con sesión: el administrador edita con la edición abierta", revisarGuardado(abiertaE, corregidaE, sesionAdmin) === null);
comprobar("con sesión: abre y edita en el mismo guardado", revisarGuardado(entregadaE, corregidaE, sesionAdmin) === null);
comprobar("con sesión: sin abrirla, el administrador no edita", revisarGuardado(entregadaE, { ...entregadaE, docentes: [] }, sesionAdmin) !== null);
comprobar("con sesión: el coordinador no edita aunque esté abierta", revisarGuardado(abiertaE, corregidaE, sesionCoord) !== null);
comprobar("con sesión: el coordinador no puede abrirla", revisarGuardado(entregadaE, {
  ...entregadaE,
  bitacora: [...entregadaE.bitacora, nuevoEvento({ tipo: "editada_por_admin", autor: "COORDINADOR", rolAutor: "COORDINADOR", nota: "x", version: entregadaE.version })],
}, sesionCoord) !== null);
rechaza("abrir la edición sin motivo", entregadaE, {
  ...entregadaE,
  bitacora: [...entregadaE.bitacora, nuevoEvento({ tipo: "editada_por_admin", autor: "ADMIN", rolAutor: "ADMIN", version: entregadaE.version })],
});
rechaza("abrir la edición sobre una aprobada", aprobada, {
  ...aprobada,
  bitacora: [...aprobada.bitacora, nuevoEvento({ tipo: "editada_por_admin", autor: "ADMIN", rolAutor: "ADMIN", nota: "x", version: aprobada.version })],
});
store().actualizarAsignacion(idE, { docentes: corregidaE.docentes });
const antesDeAprobarE = foto(idE);
store().aprobar(idE, admin);
const aprobadaE = foto(idE);
admite("aprobar tras la edición del administrador", antesDeAprobarE, aprobadaE);
comprobar("la línea base es lo corregido", aprobadaE.lineaBase?.cursos.length === cursosBase(corregidaE.docentes).length);
comprobar("aprobar cierra la edición", !edicionAdminAbierta(aprobadaE));
comprobar("con sesión: aprobada, el administrador ya no edita", revisarGuardado(aprobadaE, { ...aprobadaE, docentes: [] }, sesionAdmin) !== null);

// ── Excepción de horas (SPEC-024) ─────────────────────────────
const excepcion = { motivo: "Comisión de estudios", autor: "ADMIN", fecha: "2026-11-19T12:00:00.000Z", horas: 30 };
const conExcepcion = (a: Asignacion, autor = "ADMIN"): Asignacion => ({
  ...a,
  docentes: a.docentes.map((d, i) => (i === 0 ? { ...d, excepcionHoras: { ...excepcion, autor } } : d)),
});
comprobar("con sesión: el administrador autoriza una excepción con la edición abierta", revisarGuardado(abiertaE, conExcepcion(abiertaE), sesionAdmin) === null);
comprobar("con sesión: sin la edición abierta, no", revisarGuardado(entregadaE, conExcepcion(entregadaE), sesionAdmin) !== null);
comprobar("con sesión: el coordinador no se autoriza una excepción en su borrador", revisarGuardado(base, conExcepcion({ ...base, docentes: [nuevoDocente()] }, "COORDINADOR"), sesionCoord) !== null);
comprobar("con sesión: la excepción va a nombre de quien la autoriza", revisarGuardado(abiertaE, conExcepcion(abiertaE, "OTRO"), sesionAdmin) !== null);
comprobar("con sesión: el coordinador conserva una excepción ya autorizada", (() => {
  const b = conExcepcion({ ...base, docentes: [nuevoDocente()] });
  return revisarGuardado(b, { ...b, docentes: b.docentes.map((d) => ({ ...d, observaciones: "x" })) }, sesionCoord) === null;
})());

const horasDe = (d: Asignacion["docentes"][number], totalSemanal: number) =>
  validarDocente(d, { ...calcularTotales(d), totalSemanal, maxHoras: 40 }).find((h) => h.campo === "totalSemanal");
const docenteHoras = { ...nuevoDocente(), dedicacion: "TIEMPO_COMPLETO" };
comprobar("quedarse corto es error", horasDe(docenteHoras, 30)?.severidad === "error");
comprobar("pasarse es error", horasDe(docenteHoras, 44)?.severidad === "error");
comprobar("cuadrar no deja hallazgo", horasDe(docenteHoras, 40) === undefined);
comprobar("con excepción vigente queda como aviso", horasDe({ ...docenteHoras, excepcionHoras: excepcion }, 30)?.severidad === "aviso");
comprobar("si las horas cambian, la excepción ya no aplica", horasDe({ ...docenteHoras, excepcionHoras: excepcion }, 32)?.severidad === "error");

// ── Salen y llegan (SPEC-027) ─────────────────────────────────
const dA = { ...nuevoDocente(), documento: "111111", nombres: "ANA" };
const dB = { ...nuevoDocente(), documento: "222222", nombres: "BETO" };
const dC = { ...nuevoDocente(), documento: "333333", nombres: "CARLA" };
const previa: Asignacion = { ...base, id: "previa", periodo: "2026-1", docentes: [dA, dB] };
const vigente: Asignacion = { ...base, periodo: "2026-2", docentes: [dA, dC] };
comprobar("encuentra la asignación anterior del programa", asignacionAnterior(vigente, [previa, vigente])?.id === "previa");
const filasV = filasVariacion(vigente, previa);
comprobar("sale quien ya no está y llega quien no estaba", filasV.map((v) => `${v.tipo}:${v.nombres}`).join() === "saliente:BETO,nuevo:CARLA");
comprobar("un saliente sin motivo queda pendiente", variacionesPendientes(filasV).length === 1);
const conMotivo = { ...vigente, variaciones: filasV.map((v) => (v.tipo === "saliente" ? { ...v, motivo: "RENUNCIA" } : v)) };
comprobar("el motivo guardado se conserva", variacionesPendientes(filasVariacion(conMotivo, previa)).length === 0);
comprobar("«otro» sin observación sigue pendiente", variacionesPendientes([{ ...filasV[0], motivo: "OTRO", nota: "" }]).length === 1);
comprobar("texto libre de antes cuenta como «otro»", variacionesPendientes([{ ...filasV[0], nota: "Renuncia" }]).length === 0);
const dAtc = { ...dA, dedicacion: "TIEMPO_COMPLETO", descargas: [{ id: "x", rolId: 1, horas: 4 }] };
const cambioV = filasVariacion({ ...vigente, docentes: [dAtc, dC] }, { ...previa, docentes: [{ ...dA, dedicacion: "HORA_CÁTEDRA" }, dB] });
const cambioA = cambioV.find((v) => v.tipo === "cambio");
comprobar("detecta el cambio de dedicación y el rol que asume", Boolean(cambioA?.detalle?.includes("→") && cambioA.detalle.includes("Asume")), cambioA);
comprobar("propone el motivo del cambio", cambioA?.motivo === "CAMBIO_DEDICACION");
comprobar("entregada, los salientes no se editan", revisarGuardado(entregadaE, { ...entregadaE, variaciones: filasV }, sesionCoord) !== null);

// ── Apertura y cierre con hora (SPEC-029) ─────────────────────
const cierre = instanteLocal("2026-11-25", "23:59");
comprobar("11:59 p. m. vence igual que el fin del día de antes", cierre === finDelDia("2026-11-25"));
comprobar("la fecha y la hora se leen de vuelta", JSON.stringify(partesFechaHora(instanteLocal("2026-11-25", "14:30"))) === JSON.stringify({ fecha: "2026-11-25", hora: "14:30" }));
const conv: Convocatoria = { periodo: "2027-1", apertura: instanteLocal("2026-11-20", "08:00"), limite: instanteLocal("2026-11-25", "17:00"), cerradaManualmente: false };
comprobar("antes de la hora de apertura no está abierta", estadoConvocatoria(conv, Date.parse(instanteLocal("2026-11-20", "07:00"))) === "sin_abrir");
comprobar("después de la hora de cierre está cerrada", estadoConvocatoria(conv, Date.parse(conv.limite) + 1) === "cerrada");
const hace = (horas: number) => Date.parse(conv.limite) - horas * 3_600_000;
comprobar("cuenta regresiva en días, horas y minutos", JSON.stringify(cuentaRegresiva(conv.limite, hace(26.5))) === JSON.stringify({ dias: 1, horas: 2, minutos: 30 }));
comprobar("días de calendario: faltan 3 días", faltaLegible(conv.limite, Date.parse(instanteLocal("2026-11-22", "18:00"))) === "Faltan 3 días");
comprobar("el día antes: falta 1 día", faltaLegible(conv.limite, Date.parse(instanteLocal("2026-11-24", "20:00"))) === "Falta 1 día");
comprobar("el mismo día dice la hora", faltaLegible(conv.limite, Date.parse(instanteLocal("2026-11-25", "09:00"))).startsWith("Se cierra hoy a las"));
comprobar("urgencia: más de tres días es tranquilo", urgenciaDe(conv.limite, hace(100)) === "tranquilo");
comprobar("urgencia: a menos de un día es el último día", urgenciaDe(conv.limite, hace(20)) === "ultimo_dia");
comprobar("urgencia: a menos de tres horas, últimas horas", urgenciaDe(conv.limite, hace(2)) === "ultimas_horas");
comprobar("urgencia: pasado el cierre, vencido", urgenciaDe(conv.limite, hace(-1)) === "vencido");

// ── Borrar ────────────────────────────────────────────────────
comprobar("se borra un borrador sin entregar", revisarBorrado(base) === null);
comprobar("no se borra una entregada", revisarBorrado(aprobada) !== null);
comprobar("no se borra una devuelta (ya tiene versión)", revisarBorrado(devuelta) !== null);

console.log(fallos === 0 ? "\n✓ Ciclo de vida verificado." : `\n✗ ${fallos} fallos.`);
process.exit(fallos === 0 ? 0 : 1);
