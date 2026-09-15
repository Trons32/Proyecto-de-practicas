"use client";

import Modal from "./Modal";
import { Boton } from "./ui";
import { FiAlertTriangle } from "./iconos";

export default function ModalConfirmacion({
  abierto,
  onCerrar,
  onConfirmar,
  titulo,
  mensaje,
  detalle,
  etiquetaConfirmar = "Confirmar",
  peligro = false,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onConfirmar: () => void;
  titulo: string;
  mensaje: string;
  /** Dato concreto sobre lo que se va a eliminar (nombre, horas, cursos…). */
  detalle?: string;
  etiquetaConfirmar?: string;
  peligro?: boolean;
}) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} tamano="sm">
      <div className="text-center">
        <div
          className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
            peligro ? "bg-rose-100" : "bg-amber-100"
          }`}
        >
          <FiAlertTriangle
            className={`h-6 w-6 ${peligro ? "text-rose-500" : "text-amber-500"}`}
            aria-hidden
          />
        </div>

        <h3 className="mb-2 text-lg font-bold text-[var(--color-texto)]">{titulo}</h3>
        <p className="text-sm text-[var(--color-texto-suave)]">{mensaje}</p>

        {detalle && (
          <p className="mt-3 rounded-lg bg-[var(--color-superficie)] px-3 py-2 text-sm font-semibold text-[var(--color-texto)]">
            {detalle}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <Boton variante="secundario" className="flex-1" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante={peligro ? "peligroSolido" : "primario"}
            className="flex-1"
            onClick={onConfirmar}
            data-foco-inicial
          >
            {etiquetaConfirmar}
          </Boton>
        </div>
      </div>
    </Modal>
  );
}
