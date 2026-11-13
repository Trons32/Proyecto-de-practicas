"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui";
import { FiArrowLeft, FiCompass } from "@/components/iconos";

/**
 * Cualquier dirección que no existe. Sin esto, Next pinta su 404 en inglés
 * y sin el diseño de la aplicación. Va dentro del layout: conserva la barra
 * lateral, así que desde aquí se puede seguir navegando.
 */
export default function PaginaNoEncontrada() {
  const router = useRouter();
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-10 sm:p-8">
      <section className="tarjeta tarjeta-sombra w-full max-w-lg overflow-hidden text-center">
        <div className="border-b border-[var(--color-borde)] bg-cecar-50/60 px-6 py-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-cecar-700 shadow-sm">
            <FiCompass className="h-7 w-7" aria-hidden />
          </span>
          <p className="mt-4 text-5xl font-bold tracking-tight text-cecar-800 tabular-nums">404</p>
        </div>
        <div className="px-6 py-6">
          <h1 className="text-lg font-bold text-[var(--color-texto)]">Página no encontrada</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--color-texto-suave)]">
            La dirección no existe o lo que buscaba ya no está: puede que la asignación o el docente
            se haya eliminado. Revise el enlace o vuelva a un lugar conocido.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Boton variante="secundario" onClick={() => router.back()}>
              <FiArrowLeft aria-hidden /> Volver atrás
            </Boton>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-cecar-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-cecar-700"
            >
              Ir al inicio
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
