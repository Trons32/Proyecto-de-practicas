"use client";

import { useNovedadesStore } from "@/lib/stores/novedades-store";
import { fechaLegible } from "@/lib/convocatoria";
import { ETIQUETA_AMBITO, tituloDe } from "@/lib/novedades";
import type { Asignacion } from "@/lib/tipos";
import { FiArrowRight, FiSliders } from "@/components/iconos";

/**
 * Por qué se reabrió la asignación y qué parámetros cambiaron (SPEC-022).
 *
 * Antes la bitácora solo decía «origen: novedad N.º 4», y el coordinador
 * tenía que adivinar qué tocar. Aquí ve el motivo del administrador, el
 * plazo y cada cambio, antes → después. Solo se muestra mientras la
 * corrección pedida por parámetros está abierta.
 */
export default function CambiosParametros({ asignacion }: { asignacion: Asignacion }) {
  const novedades = useNovedadesStore((s) => s.novedades);
  if (asignacion.estado !== "en_correccion") return null;
  const ultimo = asignacion.bitacora.at(-1);
  if (ultimo?.tipo !== "reabierta_por_parametros") return null;
  const novedad = ultimo.novedadId ? novedades.find((n) => n.id === ultimo.novedadId) : undefined;

  return (
    <section className="tarjeta mb-6 overflow-hidden border-amber-200" aria-labelledby="cambios-parametros">
      <header className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-5 py-4">
        <FiSliders className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
        <div className="min-w-0">
          <h2 id="cambios-parametros" className="text-sm font-bold tracking-wide text-amber-900 uppercase">
            Se reabrió por cambios en los parámetros
          </h2>
          <p className="mt-0.5 text-sm text-amber-900">
            {ultimo.plazo
              ? `Revise su asignación con las reglas nuevas y reenvíela antes del ${fechaLegible(ultimo.plazo)}.`
              : "Revise su asignación con las reglas nuevas y reenvíela."}
          </p>
        </div>
      </header>

      <div className="space-y-4 px-5 py-4">
        {ultimo.nota && (
          <div>
            <p className="etiqueta">Indicaciones del administrador</p>
            <p className="text-sm whitespace-pre-line text-[var(--color-texto)]">{ultimo.nota}</p>
          </div>
        )}

        {novedad && novedad.cambios.length > 0 ? (
          <div>
            <p className="etiqueta">Qué cambió · {tituloDe(novedades, novedad)}</p>
            <ul className="divide-y divide-[var(--color-borde)] rounded-lg border border-[var(--color-borde)]">
              {novedad.cambios.map((c, i) => (
                <li key={i} className="flex flex-col gap-1 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[var(--color-texto)]">
                    <span className="me-2 text-[11px] font-semibold text-[var(--color-texto-suave)] uppercase">
                      {ETIQUETA_AMBITO[c.ambito]}
                    </span>
                    {c.parametro}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 font-medium tabular-nums">
                    <span className="text-[var(--color-texto-suave)] line-through decoration-rose-400/70">{c.antes ?? "—"}</span>
                    <FiArrowRight className="h-3.5 w-3.5 text-[var(--color-texto-suave)]" aria-hidden />
                    <span className="text-cecar-800">{c.despues ?? "eliminado"}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-texto-suave)]">
            El detalle de los cambios no está disponible; guíese por las indicaciones del administrador.
          </p>
        )}
      </div>
    </section>
  );
}
