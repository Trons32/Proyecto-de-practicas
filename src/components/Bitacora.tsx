"use client";

import type { Evento, TipoEvento } from "@/lib/tipos";
import { fechaLegible } from "@/lib/convocatoria";
import { Insignia } from "@/components/ui";

/** Cómo se cuenta cada tipo de evento y con qué color se marca. */
const EVENTOS: Record<TipoEvento, { texto: string; punto: string }> = {
  creada: { texto: "creó la asignación", punto: "bg-[var(--color-borde)]" },
  enviada: { texto: "envió la asignación", punto: "bg-sky-500" },
  reenviada: { texto: "reenvió la asignación corregida", punto: "bg-sky-500" },
  revision_abierta: { texto: "abrió la revisión", punto: "bg-sky-500" },
  aprobada: { texto: "aprobó la asignación", punto: "bg-cecar-600" },
  devuelta: { texto: "devolvió la asignación para corrección", punto: "bg-amber-500" },
  reabierta_por_parametros: {
    texto: "reabrió la asignación por un cambio de parámetros",
    punto: "bg-amber-500",
  },
};

const momento = (iso: string) => {
  const d = new Date(iso);
  const hora = d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  return `${fechaLegible(iso)}, ${hora}`;
};

/**
 * La trazabilidad de la asignación, del primer evento al último.
 *
 * Se lee de arriba abajo como se leería un expediente: en orden de
 * ocurrencia, no al revés. Cuando hay una devolución, el motivo que
 * escribió el administrador se muestra íntegro —es la instrucción que el
 * coordinador tiene que cumplir, y esconderlo tras un "ver más" obligaría a
 * buscarla justo cuando más se necesita.
 */
export default function Bitacora({ eventos }: { eventos: Evento[] }) {
  if (eventos.length === 0) return null;

  return (
    <ol className="space-y-0">
      {eventos.map((e, i) => {
        const { texto, punto } = EVENTOS[e.tipo];
        const ultimo = i === eventos.length - 1;

        return (
          <li key={e.id} className="flex gap-3">
            {/* Punto y línea: la línea se corta en el último para que la
                secuencia no parezca continuar más allá de lo ocurrido. */}
            <div className="flex flex-col items-center">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${punto}`} />
              {!ultimo && <span className="w-px flex-1 bg-[var(--color-borde)]" />}
            </div>

            <div className={`min-w-0 flex-1 ${ultimo ? "pb-0" : "pb-5"}`}>
              <p className="text-sm text-[var(--color-texto)]">
                <strong>{e.autor}</strong> {texto}
                {e.version !== undefined && e.version > 0 && (
                  <>
                    {" "}
                    <Insignia>v{e.version}</Insignia>
                  </>
                )}
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-texto-suave)]">{momento(e.fecha)}</p>

              {e.nota && (
                <p className="mt-2 rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm text-[var(--color-texto)]">
                  {e.nota}
                </p>
              )}

              {e.plazo && (
                <p className="mt-1.5 text-xs font-semibold text-amber-700">
                  Plazo para corregir: {fechaLegible(e.plazo)}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
