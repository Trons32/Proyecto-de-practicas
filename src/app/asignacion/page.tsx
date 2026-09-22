"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import {
  resumirAsignacion,
  separarEnProgreso,
  desde,
  legible,
  type ResumenAsignacion,
} from "@/lib/resumen";
import { useConfiguracion } from "@/lib/usar-configuracion";
import type { Asignacion } from "@/lib/tipos";
import Encabezado from "@/components/Encabezado";
import { Boton, Insignia, InsigniaEstado, Paginacion } from "@/components/ui";
import { FiPlus, FiFileText, FiEdit3, FiArrowRight } from "@/components/iconos";

/** Asignaciones del histórico por página. */
const POR_PAGINA = 10;

interface Fila {
  a: Asignacion;
  r: ResumenAsignacion;
}

export default function ListaAsignaciones() {
  const asignaciones = useAsignacionStore((s) => s.asignaciones);
  const hidratado = useAsignacionStore((s) => s.hidratado);
  const config = useConfiguracion();

  const [pagina, setPagina] = useState(1);

  const { enProgreso, historico } = useMemo(() => {
    // El mismo criterio que usa el inicio: una sola definición de "actual".
    const partes = separarEnProgreso(asignaciones);
    const conResumen = (a: Asignacion): Fila => ({ a, r: resumirAsignacion(a, config) });

    return {
      enProgreso: partes.enProgreso ? conResumen(partes.enProgreso) : null,
      historico: partes.historico.map(conResumen),
    };
  }, [asignaciones, config]);

  const paginas = Math.max(1, Math.ceil(historico.length / POR_PAGINA));

  // Al borrar o cerrar asignaciones la última página puede desaparecer bajo
  // los pies. Se acota al pintar, no con un efecto: corregir el estado
  // después del render dejaría un fotograma con el listado en blanco.
  const paginaActual = Math.min(pagina, paginas);

  const visibles = historico.slice(
    (paginaActual - 1) * POR_PAGINA,
    paginaActual * POR_PAGINA
  );

  return (
    <main className="px-4 py-6 sm:p-8">
      <Encabezado
        titulo="Asignaciones"
        descripcion="La asignación en curso y el histórico de las ya registradas"
      >
        <Link href="/asignacion/nueva">
          <Boton>
            <FiPlus aria-hidden /> Crear asignación
          </Boton>
        </Link>
      </Encabezado>

      {!hidratado ? (
        <p className="text-sm text-[var(--color-texto-suave)]">Cargando…</p>
      ) : asignaciones.length === 0 ? (
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
        <div className="space-y-8">
          {enProgreso && <EnCurso fila={enProgreso} />}

          <section>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">
                Historial
              </h2>
              <span className="text-xs text-[var(--color-texto-suave)]">
                {historico.length === 0
                  ? "Sin asignaciones anteriores"
                  : `${historico.length} ${
                      historico.length === 1 ? "asignación" : "asignaciones"
                    }`}
              </span>
            </div>

            {historico.length === 0 ? (
              <p className="tarjeta px-5 py-6 text-center text-sm text-[var(--color-texto-suave)]">
                Las asignaciones que cierre o deje atrás aparecerán aquí.
              </p>
            ) : (
              <section className="tarjeta tarjeta-sombra overflow-hidden">
                <ul className="divide-y divide-[var(--color-borde)]">
                  {visibles.map((fila) => (
                    <FilaHistorico key={fila.a.id} fila={fila} />
                  ))}
                </ul>

                <Paginacion
                  pagina={paginaActual}
                  paginas={paginas}
                  total={historico.length}
                  porPagina={POR_PAGINA}
                  onCambiar={setPagina}
                  etiqueta="asignaciones"
                />
              </section>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

/**
 * La asignación en curso, destacada sobre el histórico: es la única en la
 * que el coordinador todavía puede trabajar, así que se presenta como una
 * tarjeta con su propia llamada a la acción en vez de como una fila más.
 */
function EnCurso({ fila: { a, r } }: { fila: Fila }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-bold tracking-wide text-cecar-800 uppercase">
        Asignación en curso
      </h2>

      <Link
        href={`/asignacion/${a.id}`}
        className="tarjeta tarjeta-sombra block border-l-4 border-l-cecar-600 p-5 transition hover:bg-cecar-50/40"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-[var(--color-texto)]">
              {legible(a.programa) || "Programa sin definir"}
            </h3>
            <p className="mt-0.5 truncate text-xs text-[var(--color-texto-suave)]">
              {legible(a.facultad) || "Facultad sin definir"} · editada {desde(a.actualizada)}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Insignia tono="verde">Periodo {a.periodo}</Insignia>
            <InsigniaEstado estado={a.estado} />
            {r.totalErrores > 0 && <Insignia tono="rojo">{r.totalErrores} pendientes</Insignia>}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--color-texto-suave)]">
            <strong className="text-[var(--color-texto)] tabular-nums">{r.totalDocentes}</strong>{" "}
            {r.totalDocentes === 1 ? "docente" : "docentes"} ·{" "}
            <strong className="text-[var(--color-texto)] tabular-nums">{r.horasTotales}</strong> h
            asignadas
          </p>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-cecar-700">
            <FiEdit3 aria-hidden /> Continuar <FiArrowRight aria-hidden />
          </span>
        </div>
      </Link>
    </section>
  );
}

function FilaHistorico({ fila: { a, r } }: { fila: Fila }) {
  return (
    <li>
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
          <InsigniaEstado estado={a.estado} />
          {r.totalErrores > 0 && <Insignia tono="rojo">{r.totalErrores} pendientes</Insignia>}
          <span className="text-xs tabular-nums text-[var(--color-texto-suave)]">
            {r.totalDocentes} doc · {r.horasTotales} h
          </span>
        </span>
      </Link>
    </li>
  );
}
