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
 * Las asignaciones aprobadas que incumplen la configuración vigente.
 *
 * Solo se miran las aprobadas: un borrador se corrige solo al seguir
 * editándolo, y lo que está en revisión lo verá el administrador de todos
 * modos antes de decidir. Reabrir es un acto sobre lo que ya se dio por
 * cerrado.
 *
 * `referencia` es la configuración con la que comparar —por defecto la
 * oficial—; sirve para distinguir los errores que el cambio introduce de
 * los que la asignación ya arrastraba.
 */
export function asignacionesAfectadas(
  asignaciones: Asignacion[],
  config: Configuracion,
  referencia: Configuracion = CONFIG_OFICIAL
): AsignacionAfectada[] {
  const afectadas: AsignacionAfectada[] = [];

  for (const a of asignaciones) {
    if (a.estado !== "aprobada") continue;

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
