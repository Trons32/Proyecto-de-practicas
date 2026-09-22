"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import { resumirAsignacion, separarEnProgreso, desde, legible } from "@/lib/resumen";
import { useConfiguracion } from "@/lib/usar-configuracion";
import Encabezado from "@/components/Encabezado";
import { Boton, TarjetaStat, Insignia, InsigniaEstado } from "@/components/ui";
import {
  FiPlus,
  FiUsers,
  FiClock,
  FiAlertCircle,
  FiCheckCircle,
  FiFileText,
  FiLayers,
} from "@/components/iconos";

export default function Inicio() {
  const asignaciones = useAsignacionStore((s) => s.asignaciones);
  const hidratado = useAsignacionStore((s) => s.hidratado);

  const config = useConfiguracion();

  const { enProgreso, historico, global } = useMemo(() => {
    const conResumen = asignaciones.map((a) => ({ a, r: resumirAsignacion(a, config) }));
    // La regla de qué es "la actual" vive en lib/resumen: el listado de
    // asignaciones usa esa misma, para que no puedan contradecirse.
    const partes = separarEnProgreso(asignaciones);
    const porId = new Map(conResumen.map((f) => [f.a.id, f]));

    return {
      enProgreso: partes.enProgreso ? porId.get(partes.enProgreso.id)! : null,
      historico: partes.historico.map((a) => porId.get(a.id)!),
      global: {
        asignaciones: conResumen.length,
        docentes: conResumen.reduce((s, { r }) => s + r.totalDocentes, 0),
        horas: conResumen.reduce((s, { r }) => s + r.horasTotales, 0),
      },
    };
  }, [asignaciones, config]);

  // Hasta que localStorage se rehidrate, el estado real es desconocido:
  // pintar "no hay asignaciones" sería mentir por un instante.
  if (!hidratado) {
    return (
      <main className="px-4 py-6 sm:p-8">
        <Encabezado titulo="Asignación Académica" descripcion="Cargando…" />
      </main>
    );
  }

  return (
    <main className="px-4 py-6 sm:p-8">
      <Encabezado
        titulo="Asignación Académica"
        descripcion="Corporación Universitaria del Caribe · Vicerrectoría Académica"
      >
        <Link href="/asignacion/nueva">
          <Boton>
            <FiPlus aria-hidden /> Crear asignación
          </Boton>
        </Link>
      </Encabezado>

      {/* ---------------- Totales globales ---------------- */}
      <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <TarjetaStat
          etiqueta="Asignaciones"
          valor={global.asignaciones}
          tono="verde"
          icono={<FiLayers className="h-6 w-6" aria-hidden />}
        />
        <TarjetaStat
          etiqueta="Docentes asignados"
          valor={global.docentes}
          tono="lima"
          icono={<FiUsers className="h-6 w-6" aria-hidden />}
        />
        <TarjetaStat
          etiqueta="Horas semanales"
          valor={global.horas}
          tono="verde"
          icono={<FiClock className="h-6 w-6" aria-hidden />}
        />
      </section>

      {/* ---------------- Asignación en progreso ---------------- */}
      {enProgreso ? (
        <section className="tarjeta tarjeta-sombra mb-8 overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-borde)] bg-cecar-50/60 px-5 py-4">
            <div>
              <h3 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">
                Asignación en progreso
              </h3>
              <p className="mt-0.5 text-xs text-[var(--color-texto-suave)]">
                Última edición {desde(enProgreso.a.actualizada)}
              </p>
            </div>
            <Link href={`/asignacion/${enProgreso.a.id}`}>
              <Boton>Continuar asignación</Boton>
            </Link>
          </header>

          <div className="grid gap-6 p-5 lg:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <p className="text-lg font-bold text-[var(--color-texto)]">
                {legible(enProgreso.a.programa) || "Programa sin definir"}
              </p>
              <p className="mt-0.5 text-sm text-[var(--color-texto-suave)]">
                {legible(enProgreso.a.facultad) || "Facultad sin definir"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Insignia tono="verde">Periodo {enProgreso.a.periodo}</Insignia>
                <InsigniaEstado estado={enProgreso.a.estado} />
                {enProgreso.r.totalErrores > 0 ? (
                  <Insignia tono="rojo">
                    <FiAlertCircle aria-hidden /> {enProgreso.r.totalErrores}{" "}
                    {enProgreso.r.totalErrores === 1 ? "dato pendiente" : "datos pendientes"}
                  </Insignia>
                ) : (
                  <Insignia tono="verde">
                    <FiCheckCircle aria-hidden /> Sin datos pendientes
                  </Insignia>
                )}
              </div>
            </div>

            {/* Resumen rápido: lo que el coordinador quiere ver de un vistazo. */}
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[26rem]">
              <Dato etiqueta="Docentes" valor={enProgreso.r.totalDocentes} />
              <Dato etiqueta="Horas" valor={enProgreso.r.horasTotales} />
              <Dato etiqueta="Cursos" valor={enProgreso.r.cursosTotales} />
              <Dato etiqueta="Estudiantes" valor={enProgreso.r.estudiantesTotales} />
            </dl>
          </div>

          {/* Horas por docente: el detalle que pediste ver desde el inicio. */}
          {enProgreso.r.docentes.length > 0 && (
            <ul className="divide-y divide-[var(--color-borde)] border-t border-[var(--color-borde)]">
              {enProgreso.r.docentes.slice(0, 5).map(({ docente, totales, errores }) => (
                <li key={docente.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="min-w-0 truncate text-sm font-medium text-[var(--color-texto)]">
                    {docente.nombres || "Sin nombre"}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {errores > 0 && <Insignia tono="rojo">Incompleto</Insignia>}
                    <span className="text-sm tabular-nums text-[var(--color-texto-suave)]">
                      <strong className="text-[var(--color-texto)]">{totales.totalSemanal}</strong> h
                      {totales.maxHoras ? ` / ${totales.maxHoras}` : ""}
                    </span>
                  </span>
                </li>
              ))}
              {enProgreso.r.docentes.length > 5 && (
                <li className="px-5 py-2.5 text-center text-xs text-[var(--color-texto-suave)]">
                  y {enProgreso.r.docentes.length - 5} docentes más
                </li>
              )}
            </ul>
          )}
        </section>
      ) : (
        <section className="tarjeta tarjeta-sombra mb-8 p-10 text-center">
          <FiFileText
            className="mx-auto h-10 w-10 text-[var(--color-texto-suave)]/40"
            aria-hidden
          />
          <h3 className="mt-3 text-lg font-bold text-[var(--color-texto)]">
            No hay asignaciones en progreso
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-texto-suave)]">
            Cree una asignación para elegir el periodo académico, la facultad y el programa,
            y empezar a agregar docentes.
          </p>
          <Link href="/asignacion/nueva" className="mt-5 inline-block">
            <Boton>
              <FiPlus aria-hidden /> Crear asignación
            </Boton>
          </Link>
        </section>
      )}

      {/* ---------------- Histórico ---------------- */}
      {historico.length > 0 && (
        <section className="tarjeta tarjeta-sombra overflow-hidden">
          <header className="border-b border-[var(--color-borde)] bg-cecar-50/60 px-5 py-4">
            <h3 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">
              Histórico de asignaciones
            </h3>
            <p className="mt-0.5 text-xs text-[var(--color-texto-suave)]">
              {historico.length} {historico.length === 1 ? "asignación" : "asignaciones"}
            </p>
          </header>

          <ul className="divide-y divide-[var(--color-borde)]">
            {historico.map(({ a, r }) => (
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
                    <InsigniaEstado estado={a.estado} />
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

function Dato({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="rounded-lg bg-black/[0.03] px-3 py-2">
      <dt className="text-[10px] font-semibold tracking-wide text-[var(--color-texto-suave)] uppercase">
        {etiqueta}
      </dt>
      <dd className="mt-0.5 text-xl font-bold tabular-nums text-[var(--color-texto)]">{valor}</dd>
    </div>
  );
}
