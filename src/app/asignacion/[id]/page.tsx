"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import { resumirAsignacion, legible } from "@/lib/resumen";
import { useConfiguracion } from "@/lib/usar-configuracion";
import Encabezado from "@/components/Encabezado";
import ModalConfirmacion from "@/components/ModalConfirmacion";
import NoEncontrada from "../NoEncontrada";
import { Boton, TarjetaStat, Insignia } from "@/components/ui";
import { sileo } from "@/lib/toast";
import {
  FiPlus,
  FiTrash2,
  FiSave,
  FiUsers,
  FiClock,
  FiAlertCircle,
  FiCheckCircle,
  FiArrowLeft,
  FiArrowRight,
  FiBookOpen,
} from "@/components/iconos";

export default function VistaAsignacion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const asignacion = useAsignacionStore((s) => s.asignaciones.find((a) => a.id === id));
  const hidratado = useAsignacionStore((s) => s.hidratado);
  const agregarDocente = useAsignacionStore((s) => s.agregarDocente);
  const eliminarDocente = useAsignacionStore((s) => s.eliminarDocente);
  const actualizarAsignacion = useAsignacionStore((s) => s.actualizarAsignacion);

  const config = useConfiguracion();

  const resumen = useMemo(
    () => (asignacion ? resumirAsignacion(asignacion, config) : null),
    [asignacion, config]
  );

  /** Id del docente pendiente de confirmar su borrado; null si no hay modal. */
  const [porEliminar, setPorEliminar] = useState<string | null>(null);

  const detalleEliminar = useMemo(() => {
    if (!porEliminar || !resumen) return undefined;
    const x = resumen.docentes.find((d) => d.docente.id === porEliminar);
    if (!x) return undefined;
    const cursos = x.docente.cursos.filter(
      (c) => c.nombreCurso.trim() || c.codigoCurso.trim()
    ).length;
    const partes = [`${x.totales.totalSemanal} h`];
    if (cursos > 0) partes.push(`${cursos} ${cursos === 1 ? "curso" : "cursos"}`);
    return `${x.docente.nombres || "Docente sin nombre"} · ${partes.join(" · ")}`;
  }, [porEliminar, resumen]);

  if (!hidratado) {
    return (
      <main className="px-4 py-6 sm:p-8">
        <Encabezado titulo="Asignación" descripcion="Cargando…" />
      </main>
    );
  }

  if (!asignacion || !resumen) return <NoEncontrada />;

  const nuevoDocente = () => {
    const docenteId = agregarDocente(asignacion.id);
    if (docenteId) router.push(`/asignacion/${asignacion.id}/docente/${docenteId}`);
  };

  const confirmarEliminar = () => {
    if (!porEliminar) return;
    const eliminado = eliminarDocente(asignacion.id, porEliminar);
    setPorEliminar(null);
    if (!eliminado) return;
    sileo.success({
      title: "Docente eliminado",
      description: eliminado.nombres || "Docente sin nombre",
    });
  };

  const guardar = () => {
    if (resumen.totalDocentes === 0) {
      sileo.error({
        title: "La asignación está vacía",
        description: "Agregue al menos un docente antes de completarla.",
      });
      return;
    }
    if (resumen.totalErrores > 0) {
      sileo.error({
        title: "La asignación tiene datos pendientes",
        description: `Corrija ${resumen.totalErrores} ${
          resumen.totalErrores === 1 ? "dato" : "datos"
        } antes de completarla.`,
      });
      return;
    }

    // Aquí irá el POST al API route que persiste en SQL Server.
    actualizarAsignacion(asignacion.id, { estado: "completada" });
    sileo.success({
      title: "Asignación completada",
      description:
        `${resumen.totalDocentes} ${resumen.totalDocentes === 1 ? "docente" : "docentes"} · ` +
        `${resumen.horasTotales} horas semanales`,
    });
  };

  return (
    <main className="px-4 py-6 sm:p-8">
      <Encabezado
        titulo={legible(asignacion.programa) || "Programa sin definir"}
        descripcion={
          <>
            {legible(asignacion.facultad)} · Periodo{" "}
            <strong className="text-[var(--color-texto)]">{asignacion.periodo}</strong>
          </>
        }
        volver={
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-texto-suave)] transition hover:text-cecar-700"
          >
            <FiArrowLeft aria-hidden /> Volver al inicio
          </Link>
        }
      >
        <Insignia tono={asignacion.estado === "completada" ? "verde" : "ambar"}>
          {asignacion.estado === "completada" ? "Completada" : "Borrador"}
        </Insignia>
        <Boton variante="secundario" onClick={nuevoDocente}>
          <FiPlus aria-hidden /> Agregar docente
        </Boton>
        <Boton onClick={guardar}>
          <FiSave aria-hidden /> Completar asignación
        </Boton>
      </Encabezado>

      {/* ---------------- Resumen de la asignación ---------------- */}
      <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <TarjetaStat
          etiqueta="Docentes"
          valor={resumen.totalDocentes}
          tono="verde"
          icono={<FiUsers className="h-6 w-6" aria-hidden />}
        />
        <TarjetaStat
          etiqueta="Horas semanales"
          valor={resumen.horasTotales}
          tono="lima"
          icono={<FiClock className="h-6 w-6" aria-hidden />}
        />
        <TarjetaStat
          etiqueta="Estudiantes"
          valor={resumen.estudiantesTotales}
          tono="verde"
          icono={<FiUsers className="h-6 w-6" aria-hidden />}
        />
        <TarjetaStat
          etiqueta={resumen.totalErrores === 1 ? "Dato pendiente" : "Datos pendientes"}
          valor={resumen.totalErrores}
          tono={resumen.totalErrores > 0 ? "rojo" : "lima"}
          icono={
            resumen.totalErrores > 0 ? (
              <FiAlertCircle className="h-6 w-6" aria-hidden />
            ) : (
              <FiCheckCircle className="h-6 w-6" aria-hidden />
            )
          }
        />
      </section>

      {/* ---------------- Docentes ---------------- */}
      <section className="tarjeta tarjeta-sombra overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-borde)] bg-cecar-50/60 px-5 py-4">
          <div>
            <h3 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">Docentes</h3>
            <p className="mt-0.5 text-xs text-[var(--color-texto-suave)]">
              {resumen.totalDocentes === 0
                ? "Aún no hay docentes en esta asignación"
                : `${resumen.completos} de ${resumen.totalDocentes} con los datos completos`}
            </p>
          </div>
          <Boton variante="secundario" onClick={nuevoDocente}>
            <FiPlus aria-hidden /> Agregar docente
          </Boton>
        </header>

        {resumen.totalDocentes === 0 ? (
          <div className="p-10 text-center">
            <FiUsers className="mx-auto h-10 w-10 text-[var(--color-texto-suave)]/40" aria-hidden />
            <h4 className="mt-3 font-bold text-[var(--color-texto)]">Sin docentes asignados</h4>
            <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-texto-suave)]">
              Agregue el primer docente para registrar sus cursos, descargas y horas de dedicación.
            </p>
            <Boton className="mt-5" onClick={nuevoDocente}>
              <FiPlus aria-hidden /> Agregar docente
            </Boton>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-borde)]">
            {resumen.docentes.map(({ docente, totales, errores }, i) => (
              <li key={docente.id} className="flex items-center transition hover:bg-black/[0.03]">
                <Link
                  href={`/asignacion/${asignacion.id}/docente/${docente.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 px-5 py-4"
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${
                      errores > 0
                        ? "bg-rose-50 text-rose-600"
                        : "bg-cecar-600 text-white"
                    }`}
                  >
                    {i + 1}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--color-texto)]">
                      {docente.nombres || "Docente sin nombre"}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-[var(--color-texto-suave)]">
                      {docente.dedicacion ? legible(docente.dedicacion) : "Sin dedicación"}
                      {totales.cursosDiferentes > 0 &&
                        ` · ${totales.cursosDiferentes} ${
                          totales.cursosDiferentes === 1 ? "curso" : "cursos"
                        }`}
                      {totales.totalEstudiantes > 0 &&
                        ` · ${totales.totalEstudiantes} estudiantes`}
                    </span>
                  </span>

                  <span className="hidden shrink-0 items-center gap-2 sm:flex">
                    {errores > 0 ? (
                      <Insignia tono="rojo">
                        {errores} {errores === 1 ? "pendiente" : "pendientes"}
                      </Insignia>
                    ) : (
                      <Insignia tono="verde">
                        <FiCheckCircle aria-hidden /> Completo
                      </Insignia>
                    )}
                  </span>

                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-bold tabular-nums text-[var(--color-texto)]">
                      {totales.totalSemanal} h
                    </span>
                    <span className="block text-[11px] text-[var(--color-texto-suave)]">
                      de {totales.maxHoras ?? "—"}
                    </span>
                  </span>

                  <FiArrowRight
                    className="ml-1 h-4 w-4 shrink-0 text-[var(--color-texto-suave)]"
                    aria-hidden
                  />
                </Link>

                <button
                  type="button"
                  onClick={() => setPorEliminar(docente.id)}
                  aria-label={`Eliminar ${docente.nombres || "docente sin nombre"}`}
                  title="Eliminar docente"
                  className="mr-3 shrink-0 rounded-lg p-2 text-[var(--color-texto-suave)] transition
                             hover:bg-rose-50 hover:text-rose-600
                             focus:ring-2 focus:ring-rose-500/30 focus:outline-none"
                >
                  <FiTrash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        {resumen.totalDocentes > 0 && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-borde)] bg-[var(--color-superficie)]/50 px-5 py-3">
            <span className="flex items-center gap-1.5 text-xs text-[var(--color-texto-suave)]">
              <FiBookOpen aria-hidden /> {resumen.cursosTotales} cursos en total
            </span>
            <span className="text-sm font-bold tabular-nums text-[var(--color-texto)]">
              {resumen.horasTotales} horas semanales
            </span>
          </footer>
        )}
      </section>

      <ModalConfirmacion
        abierto={porEliminar !== null}
        onCerrar={() => setPorEliminar(null)}
        onConfirmar={confirmarEliminar}
        titulo="Eliminar docente"
        mensaje="¿Estás seguro? Esto no se puede deshacer."
        detalle={detalleEliminar}
        etiquetaConfirmar="Eliminar"
        peligro
      />
    </main>
  );
}
