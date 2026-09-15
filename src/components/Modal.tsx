"use client";

import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FiX } from "./iconos";
import { useBodyScrollLock } from "@/lib/scroll-lock";

const TAMANOS = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-2xl",
} as const;

export default function Modal({
  abierto,
  onCerrar,
  titulo,
  children,
  tamano = "md",
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo?: string;
  children: ReactNode;
  tamano?: keyof typeof TAMANOS;
}) {
  const dialogoRef = useRef<HTMLDivElement | null>(null);
  const focoPrevioRef = useRef<HTMLElement | null>(null);
  const tituloId = useId();

  // createPortal necesita el DOM: en SSR no hay `document`. useSyncExternalStore
  // devuelve false en el servidor y true en el cliente, sin efectos de por medio.
  const montado = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // `onCerrar` suele llegar como función en línea, distinta en cada render del
  // padre. Guardarla en una ref deja que el efecto dependa solo de `abierto`.
  const onCerrarRef = useRef(onCerrar);
  useEffect(() => {
    onCerrarRef.current = onCerrar;
  }, [onCerrar]);

  useBodyScrollLock(abierto);

  useEffect(() => {
    if (!abierto) return;

    focoPrevioRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dialogo = dialogoRef.current;
    const frame = window.requestAnimationFrame(() => {
      const inicial = dialogo?.querySelector<HTMLElement>(
        '[data-foco-inicial], button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (inicial ?? dialogo)?.focus();
    });

    function alPulsarTecla(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCerrarRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialogo) return;

      // El foco no debe escaparse del diálogo mientras está abierto.
      const enfocables = Array.from(
        dialogo.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.getClientRects().length > 0);

      if (enfocables.length === 0) {
        e.preventDefault();
        dialogo.focus();
        return;
      }

      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];

      if (e.shiftKey && (document.activeElement === primero || !dialogo.contains(document.activeElement))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", alPulsarTecla);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", alPulsarTecla);
      focoPrevioRef.current?.focus();
    };
  }, [abierto]);

  if (!montado || !abierto) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 lg:backdrop-blur-sm"
        onClick={onCerrar}
        aria-hidden="true"
      />

      <div
        ref={dialogoRef}
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl
                    bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl ${TAMANOS[tamano]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titulo ? tituloId : undefined}
        aria-label={titulo ? undefined : "Ventana de diálogo"}
        tabIndex={-1}
      >
        {/* Asa visual del bottom-sheet en móvil */}
        <div className="flex shrink-0 justify-center pt-2 pb-1 sm:hidden" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-black/15" />
        </div>

        {titulo && (
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-borde)] p-5">
            <h2 id={tituloId} className="text-lg font-bold text-[var(--color-texto)]">
              {titulo}
            </h2>
            <button
              type="button"
              onClick={onCerrar}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl transition
                         hover:bg-black/5 focus:ring-2 focus:ring-cecar-500/30 focus:outline-none"
              aria-label="Cerrar"
            >
              <FiX className="h-5 w-5 text-[var(--color-texto-suave)]" />
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
