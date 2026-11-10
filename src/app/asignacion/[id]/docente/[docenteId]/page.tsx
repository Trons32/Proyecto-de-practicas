"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import { useSesionStore } from "@/lib/stores/sesion-store";
import { calcularTotales, validarDocente } from "@/lib/calculo";
import { legible } from "@/lib/resumen";
import { useConfiguracion } from "@/lib/usar-configuracion";
import type { Asignacion, Docente } from "@/lib/tipos";
import FormularioDocente from "@/components/FormularioDocente";
import ResumenHoras from "@/components/ResumenHoras";
import Encabezado from "@/components/Encabezado";
import Modal from "@/components/Modal";
import NoEncontrada from "../../../NoEncontrada";
import { Boton } from "@/components/ui";
import { FiArrowLeft, FiCheckCircle, FiAlertCircle, FiAlertTriangle, FiClock } from "@/components/iconos";

export default function VistaDocente({
  params,
}: {
  params: Promise<{ id: string; docenteId: string }>;
}) {
  const { id, docenteId } = use(params);
  const router = useRouter();

  const asignacion = useAsignacionStore((s) => s.asignaciones.find((a) => a.id === id));
  const hidratado = useAsignacionStore((s) => s.hidratado);
  const actualizarDocente = useAsignacionStore((s) => s.actualizarDocente);
  const esAdministrador = useSesionStore((s) => s.sesion?.usuario.rol === "ADMIN");

  const docente = asignacion?.docentes.find((d) => d.id === docenteId);

  const config = useConfiguracion();

  if (!hidratado) {
    return (
      <main className="px-4 py-6 sm:p-8">
        <Encabezado titulo="Docente" descripcion="Cargando…" />
      </main>
    );
  }

  if (!asignacion) return <NoEncontrada />;
  if (!docente) {
    return (
      <NoEncontrada
        titulo="Docente no encontrado"
        mensaje="El docente que busca no existe o fue eliminado de esta asignación."
      />
    );
  }

  const posicion = asignacion.docentes.findIndex((d) => d.id === docenteId) + 1;

  return <FichaDocente key={docente.id} asignacion={asignacion} docente={docente} posicion={posicion} config={config} actualizarDocente={actualizarDocente} router={router} soloLectura={esAdministrador} />;
}

function FichaDocente({ asignacion, docente, posicion, config, actualizarDocente, router, soloLectura }: {
  asignacion: Asignacion;
  docente: Docente;
  posicion: number;
  config: ReturnType<typeof useConfiguracion>;
  actualizarDocente: (asignacionId: string, docente: Docente) => void;
  router: ReturnType<typeof useRouter>;
  soloLectura: boolean;
}) {
  // El borrador vive solo en esta pantalla: escribir no persiste nada hasta
  // que el coordinador pulse Guardar sección. Así evita escrituras parciales
  // y la revisión sigue mostrando los cambios que todavía no se han guardado.
  const [borrador, setBorrador] = useState(docente);
  const [pasoActivo, setPasoActivo] = useState(0);
  const [revisionAbierta, setRevisionAbierta] = useState(false);
  const analisis = useMemo(() => {
    const totales = calcularTotales(borrador, config);
    return { totales, hallazgos: validarDocente(borrador, totales) };
  }, [borrador, config]);
  const errores = analisis.hallazgos.filter((h) => h.severidad === "error").length;
  const guardarCambios = (d: Docente) => {
    if (!soloLectura) actualizarDocente(asignacion.id, d);
  };
  const tieneError = (patron: RegExp | string[]) =>
    analisis.hallazgos.some((h) =>
      Array.isArray(patron) ? patron.includes(h.campo) : patron.test(h.campo)
    );
  const hayCurso = borrador.cursos.some((c) => c.nombreCurso.trim() || c.codigoCurso.trim() || c.intensidadHoraria);
  const hayDescarga = borrador.descargas.some((d) => d.rolId !== null || d.horas > 0);
  const hayAdministrativa = borrador.administrativas.some((a) => a.rolId !== null || a.horas > 0);
  const pasos = [
    { etiqueta: "Docente", completo: !tieneError(["documento", "nombres", "nivelFormacion", "tipoContrato", "dedicacion", "categoria", "sede", "evaluacionDocente"]) },
    { etiqueta: "Cursos", completo: hayCurso && !tieneError(/^(cursos|curso-)/) },
    { etiqueta: "Descargas", completo: hayDescarga && !tieneError(/^descarga-/) },
    { etiqueta: "Actividades", completo: hayAdministrativa && !tieneError(/^admin-/) },
    { etiqueta: "Apoyo", completo: borrador.preparacion + borrador.atencion + borrador.comunidades > 0 },
  ];
  const pasosPendientes = pasos.filter((paso) => !paso.completo).length;
  const seccionDeHallazgo = (campo: string) => {
    if (["documento", "nombres", "nivelFormacion", "tipoContrato", "dedicacion", "categoria", "sede", "evaluacionDocente"].includes(campo)) return "Docente";
    if (campo === "cursos" || campo.startsWith("curso-")) return "Cursos";
    if (campo.startsWith("descarga-")) return "Descargas";
    if (campo.startsWith("admin-")) return "Actividades";
    if (campo === "totalSemanal") return "Dedicación semanal";
    return "Apoyo académico";
  };
  const revisionPorSeccion = analisis.hallazgos.reduce<Record<string, typeof analisis.hallazgos>>((grupos, hallazgo) => {
    const seccion = seccionDeHallazgo(hallazgo.campo);
    (grupos[seccion] ??= []).push(hallazgo);
    return grupos;
  }, {});

  return (
    <main className="px-4 py-6 sm:p-8">
      <Encabezado
        titulo={borrador.nombres || `Docente ${posicion}`}
        descripcion={
          <>
            {legible(asignacion.programa)} · Periodo{" "}
            <strong className="text-[var(--color-texto)]">{asignacion.periodo}</strong>
          </>
        }
        volver={
          <Link
            href={`/asignacion/${asignacion.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-texto-suave)] transition hover:text-cecar-700"
          >
            <FiArrowLeft aria-hidden /> Volver a la asignación
          </Link>
        }
      >
        <Boton
          variante="secundario"
          className={pasosPendientes > 0 ? "border-amber-200 text-amber-700 hover:border-amber-300 hover:bg-amber-50" : "border-cecar-200 text-cecar-700 hover:bg-cecar-50"}
          onClick={() => setRevisionAbierta(true)}
        >
          {pasosPendientes > 0 ? <FiClock aria-hidden /> : <FiCheckCircle aria-hidden />}
          {pasosPendientes > 0 ? `${pasosPendientes} ${pasosPendientes === 1 ? "paso pendiente" : "pasos pendientes"}` : "Datos completos"}
        </Boton>
        {!soloLectura && (
          <Boton onClick={() => router.push(`/asignacion/${asignacion.id}`)}>
            Listo
          </Boton>
        )}
      </Encabezado>

      {/* Formulario y dedicación semanal, lado a lado. */}
      <div className="grid gap-6 xl:grid-cols-[1fr_20rem] 2xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          <nav aria-label="Pasos de la ficha del docente" className="mb-4 overflow-hidden">
            <ol className="flex gap-2 transition-transform duration-300 ease-out">
              {pasos.map((paso, indice) => {
                const activo = indice === pasoActivo;
                return <li key={paso.etiqueta} className="min-w-0 flex-1">
                  <button
                    type="button"
                    aria-current={activo ? "step" : undefined}
                    onClick={() => setPasoActivo(indice)}
                    className={`flex w-full min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-bold transition ${activo ? "border-cecar-500 bg-white text-cecar-700 shadow-sm" : paso.completo ? "border-cecar-200 bg-cecar-50 text-cecar-700 hover:bg-cecar-100" : "border-[var(--color-borde)] bg-black/[0.02] text-[var(--color-texto-suave)] hover:bg-black/[0.05]"}`}
                  >
                    {paso.completo ? <FiCheckCircle className="h-4 w-4 shrink-0" aria-hidden /> : <FiClock className="h-4 w-4 shrink-0" aria-hidden />}
                    <span className="truncate">{paso.etiqueta}</span>
                  </button>
                </li>;
              })}
            </ol>
          </nav>
          <FormularioDocente
            docente={borrador}
            totales={analisis.totales}
            hallazgos={analisis.hallazgos}
            programaPorDefecto={asignacion.programa}
            onCambio={setBorrador}
            onGuardar={guardarCambios}
            pasoActivo={pasoActivo}
            soloLectura={soloLectura}
          />
        </div>

        <aside className="no-imprimir xl:self-start">
          <ResumenHoras t={analisis.totales} />
        </aside>
      </div>
      <Modal abierto={revisionAbierta} onCerrar={() => setRevisionAbierta(false)} titulo={errores > 0 ? "Información pendiente" : "Revisión de la ficha"}>
        {analisis.hallazgos.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl bg-cecar-50 p-4 text-sm text-cecar-800"><FiCheckCircle className="h-5 w-5 shrink-0" aria-hidden /> La información del docente está completa.</div>
        ) : <div className="space-y-5">
          <p className="text-sm text-[var(--color-texto-suave)]">Complete o revise los siguientes datos antes de entregar la asignación.</p>
          {Object.entries(revisionPorSeccion).map(([seccion, hallazgos]) => <section key={seccion}>
            <h3 className="mb-2 text-sm font-bold text-[var(--color-texto)]">{seccion}</h3>
            <ul className="space-y-2">{hallazgos.map((h, i) => <li key={i} className="flex items-start gap-2.5 text-sm">
              {h.severidad === "error" ? <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" aria-hidden /> : <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />}
              <span className={h.severidad === "error" ? "text-rose-700" : "text-[var(--color-texto-suave)]"}>{h.mensaje}</span>
            </li>)}</ul>
          </section>)}
        </div>}
      </Modal>
    </main>
  );
}
