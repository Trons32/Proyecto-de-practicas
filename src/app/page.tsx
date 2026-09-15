"use client";

import { useMemo, useState } from "react";
import { FACULTADES, PROGRAMAS } from "@/lib/catalogos";
import { calcularTotales, validarDocente } from "@/lib/calculo";
import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import FormularioDocente from "@/components/FormularioDocente";
import ModalConfirmacion from "@/components/ModalConfirmacion";
import { Boton, Insignia, Seleccion, Campo, Entrada } from "@/components/ui";
import { sileo } from "@/lib/toast";
import { FiPlus, FiTrash2, FiSave, FiUsers, FiClock, FiAlertCircle, FiCheckCircle } from "@/components/iconos";

export default function Pagina() {
  const periodo = useAsignacionStore((s) => s.periodo);
  const facultad = useAsignacionStore((s) => s.facultad);
  const programa = useAsignacionStore((s) => s.programa);
  const docentes = useAsignacionStore((s) => s.docentes);
  const activo = useAsignacionStore((s) => s.activo);

  const setPeriodo = useAsignacionStore((s) => s.setPeriodo);
  const setFacultad = useAsignacionStore((s) => s.setFacultad);
  const setPrograma = useAsignacionStore((s) => s.setPrograma);
  const setActivo = useAsignacionStore((s) => s.setActivo);
  const actualizarDocente = useAsignacionStore((s) => s.actualizarDocente);
  const agregarAlStore = useAsignacionStore((s) => s.agregarDocente);
  const eliminarDelStore = useAsignacionStore((s) => s.eliminarDocente);

  const programas = useMemo(
    () => PROGRAMAS.filter((p) => p.facultad === facultad).map((p) => p.nombre),
    [facultad]
  );

  /** Totales y validaciones de todos los docentes, en vivo. */
  const analisis = useMemo(
    () =>
      docentes.map((d) => {
        const t = calcularTotales(d);
        return { totales: t, hallazgos: validarDocente(d, t) };
      }),
    [docentes]
  );

  const indice = Math.min(activo, docentes.length - 1);
  const docente = docentes[indice];
  const actual = analisis[indice];

  const totalErrores = analisis.reduce(
    (s, a) => s + a.hallazgos.filter((h) => h.severidad === "error").length,
    0
  );
  const horasTotales = analisis.reduce((s, a) => s + a.totales.totalSemanal, 0);
  const estudiantesTotales = analisis.reduce((s, a) => s + a.totales.totalEstudiantes, 0);

  const agregarDocente = () => {
    const i = agregarAlStore();
    sileo.info({
      title: `Docente ${i + 1} agregado`,
      description: "Complete los datos y los cursos asignados.",
    });
  };

  /** Índice pendiente de confirmar; null si el modal está cerrado. */
  const [porEliminar, setPorEliminar] = useState<number | null>(null);

  const pedirEliminar = (i: number) => {
    if (docentes.length === 1) {
      sileo.warning({
        title: "No se puede eliminar",
        description: "La asignación debe tener al menos un docente.",
      });
      return;
    }
    setPorEliminar(i);
  };

  /** Qué se pierde al eliminar, para que el modal no sea un sí/no a ciegas. */
  const resumenPorEliminar = useMemo(() => {
    if (porEliminar === null) return undefined;
    const d = docentes[porEliminar];
    const t = analisis[porEliminar]?.totales;
    if (!d || !t) return undefined;

    const nombre = d.nombres || `Docente ${porEliminar + 1}`;
    const cursos = d.cursos.filter((c) => c.nombreCurso.trim() || c.codigoCurso.trim()).length;
    const partes = [`${t.totalSemanal} h`];
    if (cursos > 0) partes.push(`${cursos} ${cursos === 1 ? "curso" : "cursos"}`);

    return `${nombre} · ${partes.join(" · ")}`;
  }, [porEliminar, docentes, analisis]);

  const confirmarEliminar = () => {
    if (porEliminar === null) return;
    const i = porEliminar;
    const eliminado = eliminarDelStore(i);
    setPorEliminar(null);
    if (!eliminado) return;
    sileo.success({
      title: "Docente eliminado",
      description: eliminado.nombres || `Docente ${i + 1}`,
    });
  };

  const guardar = () => {
    if (!facultad || !programa) {
      sileo.error({
        title: "Faltan datos de la asignación",
        description: "Seleccione la facultad y el programa antes de guardar.",
      });
      return;
    }

    if (totalErrores > 0) {
      sileo.error({
        title: "La asignación tiene datos pendientes",
        description: `Corrija ${totalErrores} ${totalErrores === 1 ? "dato" : "datos"} antes de guardar.`,
      });
      return;
    }

    const avisos = analisis.reduce(
      (s, a) => s + a.hallazgos.filter((h) => h.severidad === "aviso").length,
      0
    );

    // Aquí irá el POST al API route que persiste en SQL Server.
    console.log("Asignación a guardar:", { periodo, facultad, programa, docentes });

    sileo.success({
      title: "Asignación guardada",
      description:
        `${docentes.length} ${docentes.length === 1 ? "docente" : "docentes"} · ` +
        `${horasTotales} horas semanales` +
        (avisos > 0 ? ` · ${avisos} ${avisos === 1 ? "advertencia" : "advertencias"}` : ""),
    });
  };

  return (
    <div className="min-h-screen">
      {/* ---------------- Barra superior ---------------- */}
      <header className="sticky top-0 z-30 border-b border-cecar-800/40 bg-cecar-700 text-white shadow-md">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/15 text-lg font-bold ring-1 ring-white/25">
              C
            </div>
            <div>
              <h1 className="text-sm leading-tight font-bold tracking-wide sm:text-base">
                Asignación Académica
              </h1>
              <p className="text-[11px] text-cecar-100">
                Corporación Universitaria del Caribe · Vicerrectoría Académica
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-cecar-100 sm:inline">
              Periodo <strong className="text-white">{periodo}</strong>
            </span>
            <Boton variante="sobreVerde" onClick={guardar}>
              <FiSave aria-hidden /> Guardar asignación
            </Boton>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        {/* ---------------- Datos de la asignación ---------------- */}
        <section className="tarjeta mb-6 p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Campo etiqueta="Periodo académico" requerido>
              <Entrada
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                placeholder="2026-2"
              />
            </Campo>

            <Campo etiqueta="Facultad" requerido className="lg:col-span-2">
              <Seleccion
                opciones={FACULTADES}
                value={facultad}
                onChange={(e) =>
                  setFacultad(e.target.value)
                }
              />
            </Campo>

            <Campo etiqueta="Programa" requerido>
              <Seleccion
                opciones={programas}
                value={programa}
                disabled={!facultad}
                placeholder={facultad ? "Seleccione…" : "Elija la facultad"}
                onChange={(e) => setPrograma(e.target.value)}
              />
            </Campo>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-borde)] pt-4">
            <Insignia tono="verde">
              <FiUsers aria-hidden /> {docentes.length} docentes
            </Insignia>
            <Insignia tono="azul">
              <FiClock aria-hidden /> {horasTotales} horas semanales
            </Insignia>
            <Insignia>{estudiantesTotales} estudiantes</Insignia>
            {totalErrores > 0 ? (
              <Insignia tono="rojo">
                <FiAlertCircle aria-hidden />{" "}
                {totalErrores} {totalErrores === 1 ? "dato pendiente" : "datos pendientes"}
              </Insignia>
            ) : (
              <Insignia tono="verde">
                <FiCheckCircle aria-hidden /> Sin errores
              </Insignia>
            )}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[16.5rem_1fr]">
          {/* ---------------- Lista de docentes ---------------- */}
          <aside className="no-imprimir lg:sticky lg:top-24 lg:self-start">
            <div className="tarjeta overflow-hidden">
              <header className="flex items-center justify-between border-b border-[var(--color-borde)] bg-cecar-50/60 px-4 py-3">
                <h2 className="text-xs font-bold tracking-wide text-cecar-800 uppercase">Docentes</h2>
                <span className="text-xs text-[var(--color-texto-suave)]">
                  {docentes.length}
                </span>
              </header>

              <ul className="max-h-[55vh] divide-y divide-[var(--color-borde)] overflow-y-auto">
                {docentes.map((d, i) => {
                  const a = analisis[i];
                  const errs = a.hallazgos.filter((h) => h.severidad === "error").length;
                  const sel = i === activo;
                  return (
                    <li
                      key={d.id}
                      className={`flex items-center transition ${
                        sel ? "bg-cecar-50" : "hover:bg-black/[0.03]"
                      }`}
                    >
                      {/* Seleccionar y eliminar son botones hermanos: anidarlos
                          produciría HTML inválido. */}
                      <button
                        type="button"
                        onClick={() => setActivo(i)}
                        className="flex min-w-0 flex-1 items-center gap-2.5 py-3 pl-4 text-left"
                      >
                        <span
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                            sel
                              ? "bg-cecar-600 text-white"
                              : "bg-black/[0.06] text-[var(--color-texto-suave)]"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate text-sm font-medium ${
                              sel ? "text-cecar-800" : "text-[var(--color-texto)]"
                            }`}
                          >
                            {d.nombres || "Sin nombre"}
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] text-[var(--color-texto-suave)]">
                              {a.totales.totalSemanal} h
                              {a.totales.maxHoras ? ` / ${a.totales.maxHoras}` : ""}
                            </span>
                            {errs > 0 && (
                              <span
                                className="rounded-full bg-rose-50 px-1.5 py-px text-[10px] font-semibold
                                           text-rose-700 ring-1 ring-rose-200 ring-inset"
                                title={`${errs} ${errs === 1 ? "dato pendiente" : "datos pendientes"}`}
                              >
                                Incompleto
                              </span>
                            )}
                          </span>
                        </span>
                      </button>

                      {docentes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => pedirEliminar(i)}
                          aria-label={`Eliminar ${d.nombres || `docente ${i + 1}`}`}
                          title="Eliminar docente"
                          className="mr-2 ml-1 shrink-0 rounded-lg p-2 text-[var(--color-texto-suave)]
                                     transition hover:bg-rose-50 hover:text-rose-600
                                     focus:ring-2 focus:ring-rose-500/30 focus:outline-none"
                        >
                          <FiTrash2 className="h-4 w-4" aria-hidden />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="border-t border-[var(--color-borde)] p-3">
                <Boton className="w-full" onClick={agregarDocente}>
                  <FiPlus aria-hidden /> Agregar docente
                </Boton>
              </div>
            </div>
          </aside>

          {/* ---------------- Formulario ---------------- */}
          <div className="min-w-0">
            <FormularioDocente
              key={docente.id}
              docente={docente}
              totales={actual.totales}
              hallazgos={actual.hallazgos}
              programaPorDefecto={programa}
              onCambio={actualizarDocente}
            />
          </div>
        </div>
      </main>

      <ModalConfirmacion
        abierto={porEliminar !== null}
        onCerrar={() => setPorEliminar(null)}
        onConfirmar={confirmarEliminar}
        titulo="Eliminar docente"
        mensaje="¿Estás seguro? Esto no se puede deshacer."
        detalle={resumenPorEliminar}
        etiquetaConfirmar="Eliminar"
        peligro
      />
    </div>
  );
}
