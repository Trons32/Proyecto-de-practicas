/**
 * Cuándo el coordinador puede tocar una asignación (SPEC-022). PURO: lo
 * usan por igual la pantalla, el store y el servidor (`transiciones.ts`).
 *
 * `esEditable(estado)` dice qué estados admiten cambios; aquí se suma el
 * reloj. Antes, cerrar la convocatoria solo bloqueaba el botón Enviar: el
 * borrador seguía editable, y lo mismo una corrección con el plazo vencido.
 *
 *   borrador       → se bloquea cuando la convocatoria del periodo cierra
 *   en_correccion  → se bloquea cuando vence su plazo de corrección
 *
 * Para dar más tiempo, el administrador amplía la convocatoria o reabre la
 * asignación con un plazo nuevo: así queda constancia.
 */
import { estadoConvocatoria, fechaLegible, restante, type Convocatoria } from "./convocatoria";
import { esEditable, esImportada, type Asignacion, type EstadoAsignacion } from "./tipos";

type ConPlazo = Pick<Asignacion, "estado" | "periodo" | "plazoCorreccion">;

/** Por qué una asignación editable por estado ya no lo es por el reloj, o null. */
export function bloqueoPorPlazo(
  a: ConPlazo,
  convocatoria: Convocatoria | null | undefined,
  ahora = Date.now()
): string | null {
  if (a.estado === "borrador" && estadoConvocatoria(convocatoria, ahora) === "cerrada") {
    return `La convocatoria del periodo ${a.periodo} cerró${
      convocatoria && !convocatoria.cerradaManualmente ? ` el ${fechaLegible(convocatoria.limite)}` : ""
    }: la asignación quedó en solo lectura. Si necesita más tiempo, pídalo al administrador.`;
  }
  // Sin plazo fijado no se bloquea: el administrador devolvió sin fecha y el
  // coordinador no tiene por qué quedar atrapado por ese olvido.
  if (a.estado === "en_correccion" && a.plazoCorreccion && restante(a.plazoCorreccion, ahora) <= 0) {
    return `El plazo para corregir venció el ${fechaLegible(a.plazoCorreccion)}: la asignación quedó en solo lectura. Si necesita más tiempo, pídalo al administrador.`;
  }
  return null;
}

/** Si el coordinador puede editarla en este momento. */
export const editableAhora = (
  a: ConPlazo,
  convocatorias: Record<string, Convocatoria>,
  ahora = Date.now()
): boolean => esEditable(a.estado) && !bloqueoPorPlazo(a, convocatorias[a.periodo], ahora);

/** Los estados desde los que un cambio de parámetros puede reabrir. */
export const REABRIBLES: EstadoAsignacion[] = ["borrador", "enviada", "en_revision", "aprobada"];

/**
 * Si el administrador puede reabrirla por un cambio de parámetros. Un
 * borrador solo si el cierre lo bloqueó: si sigue abierto, el coordinador
 * ya puede corregirlo. Una importada nunca: es el expediente de un periodo
 * que ya pasó (SPEC-017).
 */
export function reabrible(
  a: Asignacion,
  convocatorias: Record<string, Convocatoria>,
  ahora = Date.now()
): boolean {
  if (esImportada(a) || !REABRIBLES.includes(a.estado)) return false;
  return a.estado !== "borrador" || bloqueoPorPlazo(a, convocatorias[a.periodo], ahora) !== null;
}
