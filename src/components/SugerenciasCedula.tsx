"use client";

import { useEffect, useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import { usePosicionFlotante } from "@/components/ui";
import { FiUser } from "@/components/iconos";
import type { FichaDirectorio } from "@/lib/directorio";

/**
 * Las cédulas del directorio que empiezan por lo escrito (SPEC-021), bajo
 * el campo «Número de documento». Flota sobre la página, como la lista del
 * `SelectorBuscable`, para que la tarjeta no la recorte.
 */
export default function SugerenciasCedula({
  id,
  anclaRef,
  consulta,
  sugerencias,
  resaltada,
  onResaltar,
  onElegir,
}: {
  id: string;
  anclaRef: RefObject<HTMLElement | null>;
  consulta: string;
  sugerencias: FichaDirectorio[];
  resaltada: number;
  onResaltar: (i: number) => void;
  onElegir: (f: FichaDirectorio) => void;
}) {
  const listaRef = useRef<HTMLUListElement>(null);
  const abierta = sugerencias.length > 0;
  usePosicionFlotante(abierta, anclaRef, listaRef, 360);

  useEffect(() => {
    if (abierta) document.getElementById(`${id}-${resaltada}`)?.scrollIntoView({ block: "nearest" });
  }, [abierta, id, resaltada]);

  if (!abierta) return null;
  return createPortal(
    <ul
      ref={listaRef}
      id={id}
      role="listbox"
      aria-label="Docentes del directorio"
      // mousedown y no click: el clic llega después del blur del campo,
      // que ya habría cerrado la lista.
      onMouseDown={(e) => e.preventDefault()}
      className="fixed z-[10000] overflow-auto rounded-xl border border-[var(--color-borde)] bg-white py-1 text-sm shadow-xl ring-1 ring-black/5"
    >
      <li role="presentation" className="px-3 pt-1 pb-1.5 text-[11px] font-semibold tracking-wide text-[var(--color-texto-suave)] uppercase">
        Directorio de docentes
      </li>
      {sugerencias.map((f, i) => (
        <li
          key={f.documento}
          id={`${id}-${i}`}
          role="option"
          aria-selected={i === resaltada}
          onMouseEnter={() => onResaltar(i)}
          onClick={() => onElegir(f)}
          className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${i === resaltada ? "bg-cecar-50" : ""}`}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cecar-50 text-cecar-700">
            <FiUser className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-[var(--color-texto)]">{f.nombres}</span>
            <span className="block text-xs text-[var(--color-texto-suave)] tabular-nums">
              {/* Lo escrito en negrita: se ve de un vistazo qué parte coincide. */}
              <strong className="text-cecar-800">{f.documento.slice(0, consulta.length)}</strong>
              {f.documento.slice(consulta.length)}
            </span>
          </span>
        </li>
      ))}
    </ul>,
    document.body
  );
}
