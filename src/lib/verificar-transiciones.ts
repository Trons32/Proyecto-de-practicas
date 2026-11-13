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
import type { Convocatoria } from "./convocatoria";
import { bloqueoPorPlazo, reabrible } from "./plazos";

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

// ── Borrar ────────────────────────────────────────────────────
comprobar("se borra un borrador sin entregar", revisarBorrado(base) === null);
comprobar("no se borra una entregada", revisarBorrado(aprobada) !== null);
comprobar("no se borra una devuelta (ya tiene versión)", revisarBorrado(devuelta) !== null);

console.log(fallos === 0 ? "\n✓ Ciclo de vida verificado." : `\n✗ ${fallos} fallos.`);
process.exit(fallos === 0 ? 0 : 1);
