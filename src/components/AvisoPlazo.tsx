"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { faltaLegible, momentoLegible, urgenciaDe } from "@/lib/convocatoria";

/** Una vez por minuto: basta para que «Falta 1 día» pase a «Se cierra hoy» al cruzar la medianoche. */
function useAhora() {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return ahora;
}

/**
 * La franja del plazo (SPEC-029): una sola línea, sin cajas de colores.
 * Lo único que cambia con la urgencia es el punto y el color de la frase
 * principal; el resto se mantiene en gris para que no compita con la
 * página. Lo usan el inicio y la asignación, para que digan lo mismo.
 */
export default function AvisoPlazo({
  limite,
  titulo,
  detalle,
  enlace,
  abre = false,
}: {
  limite: string;
  /** «Entrega · 2027-1», «Corrección», el programa… */
  titulo: string;
  detalle?: string;
  enlace?: string;
  /** Cuenta hasta la apertura en vez del cierre. */
  abre?: boolean;
}) {
  const ahora = useAhora();
  const urgencia = abre ? "tranquilo" : urgenciaDe(limite, ahora);
  const urgente = urgencia === "ultimo_dia" || urgencia === "ultimas_horas";
  const punto =
    urgencia === "vencido"
      ? "bg-[var(--color-borde)]"
      : urgente
        ? "bg-rose-500"
        : urgencia === "pronto"
          ? "bg-amber-500"
          : "bg-cecar-500";
  // El borde lleva el color de la urgencia: se ve de lejos sin pintar la caja.
  const borde =
    urgencia === "vencido"
      ? "border-[var(--color-borde)]"
      : urgencia === "tranquilo"
        ? "border-cecar-200"
        : urgente
        ? "border-rose-300"
        : "border-amber-300";
  const frase = urgente ? "text-rose-700" : urgencia === "pronto" ? "text-amber-800" : "text-[var(--color-texto)]";

  return (
    <div className={`mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border ${borde} bg-white px-4 py-3`}>
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        {urgente && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${punto}`} />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${punto}`} />
      </span>
      <p className="text-xs font-medium tracking-wide text-[var(--color-texto-suave)] uppercase">{titulo}</p>
      <p className={`text-sm font-semibold ${frase}`}>{faltaLegible(limite, ahora, abre ? "abre" : "cierra")}</p>
      <p className="text-sm text-[var(--color-texto-suave)] first-letter:uppercase">
        {abre ? "abre el" : "cierra el"} {momentoLegible(limite)}
      </p>
      {detalle && <p className="w-full ps-6 text-xs text-[var(--color-texto-suave)]">{detalle}</p>}
      {enlace && (
        <Link href={enlace} className="ms-auto text-sm font-medium text-cecar-700 hover:text-cecar-800">
          Ir a la asignación →
        </Link>
      )}
    </div>
  );
}
