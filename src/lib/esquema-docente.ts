import type { RegisterOptions } from "react-hook-form";
import type { Docente } from "./tipos";

/**
 * Reglas de react-hook-form para los campos del docente.
 *
 * Se mantienen aquí, separadas del componente, porque son las mismas
 * validaciones del formato oficial (obligatoriedad, mayúsculas,
 * evaluación 0–5) y conviene poder reusarlas al validar la importación
 * de un .xlsx o la respuesta del API.
 */
export type CamposDocente = Pick<
  Docente,
  | "documento"
  | "nombres"
  | "nivelFormacion"
  | "tipoContrato"
  | "dedicacion"
  | "categoria"
  | "sede"
  | "evaluacionDocente"
>;

const obligatorio = (etiqueta: string) => `${etiqueta} es obligatorio.`;

/** Las reglas se parametrizan por campo para conservar el tipo de cada valor. */
type ReglasDocente = {
  [K in keyof CamposDocente]: RegisterOptions<CamposDocente, K>;
};

export const REGLAS: ReglasDocente = {
  documento: {
    required: obligatorio("El número de documento"),
    pattern: {
      value: /^\d{6,15}$/,
      message: "El documento debe tener entre 6 y 15 dígitos.",
    },
  },
  nombres: {
    required: obligatorio("El nombre del docente"),
    minLength: { value: 5, message: "El nombre parece incompleto." },
    validate: (v) =>
      typeof v !== "string" || v === v.toUpperCase() || "El nombre debe ir en mayúsculas.",
  },
  nivelFormacion: { required: obligatorio("El nivel de formación") },
  tipoContrato: { required: obligatorio("El tipo de contrato") },
  dedicacion: { required: obligatorio("La dedicación") },
  categoria: { required: obligatorio("La categoría") },
  sede: { required: obligatorio("La sede") },
  evaluacionDocente: {
    validate: (v) =>
      v === null ||
      v === undefined ||
      (typeof v === "number" && v >= 0 && v <= 5) ||
      "La evaluación docente va de 0 a 5.",
  },
};
