"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Boton } from "@/components/ui";
import { FiAlertTriangle, FiRefreshCw } from "@/components/iconos";

/**
 * Un error inesperado al pintar una página. Sin esto, Next muestra su
 * pantalla en inglés. Lo que se estaba editando sigue en la base hasta el
 * último guardado: reintentar vuelve a pintar sin recargar todo.
 */
export default function ErrorDePagina({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-10 sm:p-8">
      <section className="tarjeta tarjeta-sombra w-full max-w-lg overflow-hidden text-center">
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-amber-600 shadow-sm">
            <FiAlertTriangle className="h-7 w-7" aria-hidden />
          </span>
        </div>
        <div className="px-6 py-6">
          <h1 className="text-lg font-bold text-[var(--color-texto)]">Algo salió mal</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--color-texto-suave)]">
            No se pudo mostrar esta página. Lo último que guardó sigue a salvo. Intente de nuevo; si
            el problema continúa, avise al administrador
            {error.digest ? ` con este código: ${error.digest}` : ""}.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Boton onClick={reset}>
              <FiRefreshCw aria-hidden /> Intentar de nuevo
            </Boton>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-cecar-200 bg-white px-4 py-2 text-sm font-semibold text-cecar-700 transition hover:bg-cecar-50"
            >
              Ir al inicio
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
