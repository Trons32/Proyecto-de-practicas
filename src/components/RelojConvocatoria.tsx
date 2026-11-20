"use client";

import { useState } from "react";
import { estadoConvocatoria, momentoLegible, sinConvocatoria, type Convocatoria } from "@/lib/convocatoria";
import { periodosAsignables, type Asignacion } from "@/lib/tipos";
import { useConfigStore } from "@/lib/stores/config-store";
import AvisoPlazo from "./AvisoPlazo";

/**
 * Cuándo cierra la entrega y cuántos días faltan (SPEC-029), en el inicio del
 * coordinador. Mira la asignación en curso: si está en corrección rige su
 * plazo propio; si no, la convocatoria de su periodo. Sin asignación en
 * curso, la convocatoria del periodo actual o del siguiente.
 *
 * La franja es `AvisoPlazo`, la misma de la página de la asignación.
 */
export default function RelojConvocatoria({ asignacion }: { asignacion: Asignacion | null }) {
  const convocatorias = useConfigStore((s) => s.convocatorias);
  const hidratado = useConfigStore((s) => s.hidratado);
  // Para elegir qué convocatoria mostrar basta el momento de abrir la página;
  // la franja lleva su propio reloj.
  const [ahora] = useState(() => Date.now());
  if (!hidratado) return null;

  // Entregada (enviada, en revisión, aprobada), el reloj ya no es suyo.
  if (asignacion && !["borrador", "en_correccion"].includes(asignacion.estado)) return null;

  if (asignacion?.estado === "en_correccion" && asignacion.plazoCorreccion) {
    return (
      <AvisoPlazo titulo={`Corrección · ${asignacion.periodo}`} limite={asignacion.plazoCorreccion} enlace={`/asignacion/${asignacion.id}`} />
    );
  }

  const periodo =
    asignacion?.periodo ??
    periodosAsignables().find((p) => convocatorias[p] && estadoConvocatoria(convocatorias[p], ahora) !== "cerrada") ??
    periodosAsignables()[0];
  const c: Convocatoria | undefined = convocatorias[periodo];

  if (!c) {
    return (
      <Aviso>
        <strong className="font-semibold text-[var(--color-texto)]">Aún no hay convocatoria para {periodo}.</strong> {sinConvocatoria(periodo, convocatorias).replace(/^El administrador.*$/, "Cuando el administrador la abra, aquí verá la fecha y la hora de cierre.")}
      </Aviso>
    );
  }

  const estado = estadoConvocatoria(c, ahora);
  if (estado === "cerrada") {
    return (
      <Aviso>
        <strong className="font-semibold text-[var(--color-texto)]">La convocatoria {periodo} cerró</strong>
        {c.cerradaManualmente ? ": el administrador la cerró" : ` el ${momentoLegible(c.limite)}`}. Si necesita más tiempo, pídalo
        al administrador.
      </Aviso>
    );
  }
  if (estado === "sin_abrir") {
    return (
      <AvisoPlazo titulo={`Convocatoria · ${periodo}`} limite={c.apertura} abre />
    );
  }
  return (
    <AvisoPlazo
      titulo={`Entrega · ${periodo}`}
      limite={c.limite}
      enlace={asignacion ? `/asignacion/${asignacion.id}` : undefined}
    />
  );
}

/** Sin plazo que contar: una línea en gris, sin color de alarma. */
function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-6 rounded-xl border border-[var(--color-borde)] bg-white px-4 py-3 text-sm text-[var(--color-texto-suave)]">
      {children}
    </p>
  );
}
