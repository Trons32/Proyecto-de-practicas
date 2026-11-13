/**
 * Qué asignaciones quedan mal por un cambio de parámetros.
 *
 * Cuando el administrador baja un tope de horas o reclasifica un rol, las
 * asignaciones ya aprobadas no se recalculan solas: siguen guardadas tal
 * como se entregaron. La pregunta que hay que poder responder es cuáles
 * *dejarían* de cumplir con las reglas nuevas.
 *
 * Aquí no se adivina. Se vuelve a validar cada asignación aprobada con la
 * configuración vigente y se compara contra los valores oficiales, de modo
 * que el administrador decida sobre hechos y no sobre una corazonada.
 */

import { resumirAsignacion } from "./resumen";
import { reabrible } from "./plazos";
import type { Convocatoria } from "./convocatoria";
import { CONFIG_OFICIAL, type Configuracion } from "./calculo";
import type { Asignacion } from "./tipos";

export interface DocenteAfectado {
  id: string;
  nombres: string;
  /** Lo que ahora falla: el mensaje de la validación. */
  motivos: string[];
}

export interface AsignacionAfectada {
  asignacion: Asignacion;
  docentes: DocenteAfectado[];
  /** Errores con las reglas nuevas, frente a los que ya tenía. */
  erroresAhora: number;
  erroresAntes: number;
}

/**
 * Las asignaciones que el coordinador ya no puede corregir por su cuenta y
 * que incumplen la configuración vigente: las aprobadas, las enviadas, las
 * que están en revisión y, con `convocatorias`, el borrador que el cierre
 * bloqueó (SPEC-022). Un borrador abierto se corrige solo al seguir
 * editándolo.
 *
 * `referencia` es la configuración con la que comparar —por defecto la
 * oficial—; sirve para distinguir los errores que el cambio introduce de
 * los que la asignación ya arrastraba.
 */
export function asignacionesAfectadas(
  asignaciones: Asignacion[],
  config: Configuracion,
  referencia: Configuracion = CONFIG_OFICIAL,
  convocatorias: Record<string, Convocatoria> = {}
): AsignacionAfectada[] {
  const afectadas: AsignacionAfectada[] = [];

  for (const a of asignaciones) {
    // Una importada es el expediente de un periodo cerrado (SPEC-017): se
    // calculó con las reglas de entonces y no hay a quién pedirle corrección.
    // Desde SPEC-022 también lo entregado sin aprobar y el borrador que el
    // cierre bloqueó: con la convocatoria cerrada, nadie más lo va a corregir.
    if (!reabrible(a, convocatorias)) continue;

    const ahora = resumirAsignacion(a, config);
    if (ahora.totalErrores === 0) continue;

    const antes = resumirAsignacion(a, referencia);

    const docentes: DocenteAfectado[] = ahora.docentes
      .filter((d) => d.errores > 0)
      .map((d) => ({
        id: d.docente.id,
        nombres: d.docente.nombres || "Docente sin nombre",
        motivos: d.hallazgos
          .filter((h) => h.severidad === "error")
          .map((h) => h.mensaje),
      }));

    afectadas.push({
      asignacion: a,
      docentes,
      erroresAhora: ahora.totalErrores,
      erroresAntes: antes.totalErrores,
    });
  }

  // Primero las que más se rompieron: son las que hay que atender antes.
  return afectadas.sort((x, y) => y.erroresAhora - x.erroresAhora);
}
