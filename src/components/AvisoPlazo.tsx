"use client";

import {
  fechaLegible,
  plazoLegible,
  plazoApremiante,
  restante,
} from "@/lib/convocatoria";
import { FiClock, FiAlertTriangle, FiCheckCircle } from "@/components/iconos";

type Tono = "info" | "aviso" | "vencido" | "ok";

const ESTILOS: Record<Tono, { caja: string; icono: string }> = {
  info: { caja: "border-sky-200 bg-sky-50 text-sky-900", icono: "text-sky-600" },
  aviso: { caja: "border-amber-200 bg-amber-50 text-amber-900", icono: "text-amber-600" },
  vencido: { caja: "border-rose-200 bg-rose-50 text-rose-900", icono: "text-rose-600" },
  ok: { caja: "border-cecar-200 bg-cecar-50 text-cecar-900", icono: "text-cecar-700" },
};

/**
 * La franja que le dice al coordinador hasta cuándo puede entregar.
 *
 * El plazo se muestra dos veces a propósito: la fecha exacta, para anotarla,
 * y el tiempo que queda, para saber si hay que correr. El color cambia
 * cuando faltan pocos días —ahí el aviso deja de ser informativo y pasa a
 * ser urgente— y otra vez cuando ya venció.
 */
export default function AvisoPlazo({
  limite,
  titulo,
  detalle,
  tono,
}: {
  limite: string;
  titulo: string;
  detalle?: string;
  /** Por defecto se deduce del tiempo que falta. */
  tono?: Tono;
}) {
  const vencido = restante(limite) <= 0;
  const elegido: Tono =
    tono ?? (vencido ? "vencido" : plazoApremiante(limite) ? "aviso" : "info");

  const estilos = ESTILOS[elegido];
  const Icono =
    elegido === "vencido" || elegido === "aviso"
      ? FiAlertTriangle
      : elegido === "ok"
        ? FiCheckCircle
        : FiClock;

  return (
    <div className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 ${estilos.caja}`}>
      <Icono className={`mt-0.5 h-5 w-5 shrink-0 ${estilos.icono}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{titulo}</p>
        <p className="mt-0.5 text-sm">
          Hasta el {fechaLegible(limite)}
          {!vencido && (
            <>
              {" · "}
              <strong>{plazoLegible(limite)}</strong>
            </>
          )}
        </p>
        {detalle && <p className="mt-1 text-xs opacity-90">{detalle}</p>}
      </div>
    </div>
  );
}
