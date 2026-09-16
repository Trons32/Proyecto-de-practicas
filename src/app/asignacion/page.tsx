"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import { resumirAsignacion, desde, legible } from "@/lib/resumen";
import { useConfiguracion } from "@/lib/usar-configuracion";
import Encabezado from "@/components/Encabezado";
import { Boton, Insignia } from "@/components/ui";
import { FiPlus, FiFileText } from "@/components/iconos";

export default function ListaAsignaciones() {
  const asignaciones = useAsignacionStore((s) => s.asignaciones);
  const hidratado = useAsignacionStore((s) => s.hidratado);
  const config = useConfiguracion();

  const filas = useMemo(
    () =>
      asignaciones
        .map((a) => ({ a, r: resumirAsignacion(a, config) }))
        .sort((x, y) => y.a.actualizada.localeCompare(x.a.actualizada)),
    [asignaciones, config]
  );

  return (
    <main className="px-4 py-6 sm:p-8">
      <Encabezado
        titulo="Asignaciones"
        descripcion="Todas las asignaciones registradas, incluido el histórico"
      >
        <Link href="/asignacion/nueva">
          <Boton>
            <FiPlus aria-hidden /> Crear asignación
          </Boton>
        </Link>
      </Encabezado>

      {!hidratado ? (
        <p className="text-sm text-[var(--color-texto-suave)]">Cargando…</p>
      ) : filas.length === 0 ? (
        <section className="tarjeta tarjeta-sombra p-10 text-center">
          <FiFileText
            className="mx-auto h-10 w-10 text-[var(--color-texto-suave)]/40"
            aria-hidden
          />
          <h3 className="mt-3 text-lg font-bold text-[var(--color-texto)]">
            Aún no hay asignaciones
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-texto-suave)]">
            Cree la primera para empezar a registrar la carga académica de los docentes.
          </p>
          <Link href="/asignacion/nueva" className="mt-5 inline-block">
            <Boton>
              <FiPlus aria-hidden /> Crear asignación
            </Boton>
          </Link>
        </section>
      ) : (
        <section className="tarjeta tarjeta-sombra overflow-hidden">
          <ul className="divide-y divide-[var(--color-borde)]">
            {filas.map(({ a, r }) => (
              <li key={a.id}>
                <Link
                  href={`/asignacion/${a.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-black/[0.03]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[var(--color-texto)]">
                      {legible(a.programa) || "Programa sin definir"}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-[var(--color-texto-suave)]">
                      {legible(a.facultad) || "Facultad sin definir"} · editada {desde(a.actualizada)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-wrap items-center gap-2">
                    <Insignia>{a.periodo}</Insignia>
                    <Insignia tono={a.estado === "completada" ? "verde" : "ambar"}>
                      {a.estado === "completada" ? "Completada" : "Borrador"}
                    </Insignia>
                    {r.totalErrores > 0 && (
                      <Insignia tono="rojo">{r.totalErrores} pendientes</Insignia>
                    )}
                    <span className="text-xs tabular-nums text-[var(--color-texto-suave)]">
                      {r.totalDocentes} doc · {r.horasTotales} h
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
