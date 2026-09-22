"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import { useSesionStore } from "@/lib/stores/sesion-store";
import { resumirAsignacion, legible } from "@/lib/resumen";
import { useConfiguracion } from "@/lib/usar-configuracion";
import { usePlazo } from "@/lib/usar-plazo";
import { esEditable } from "@/lib/tipos";
import Encabezado from "@/components/Encabezado";
import ModalConfirmacion from "@/components/ModalConfirmacion";
import AvisoPlazo from "@/components/AvisoPlazo";
import Bitacora from "@/components/Bitacora";
import NoEncontrada from "../NoEncontrada";
import { Boton, TarjetaStat, Insignia, InsigniaEstado } from "@/components/ui";
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
  FiLock,
} from "@/components/iconos";

export default function VistaAsignacion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const asignacion = useAsignacionStore((s) => s.asignaciones.find((a) => a.id === id));
  const hidratado = useAsignacionStore((s) => s.hidratado);
  const agregarDocente = useAsignacionStore((s) => s.agregarDocente);
  const eliminarDocente = useAsignacionStore((s) => s.eliminarDocente);
  const enviar = useAsignacionStore((s) => s.enviar);
  const usuario = useSesionStore((s) => s.sesion?.usuario ?? null);

  const config = useConfiguracion();
  const plazo = usePlazo(asignacion);

  const editable = asignacion ? esEditable(asignacion.estado) : false;
  const corrigiendo = asignacion?.estado === "en_correccion";

  const [confirmandoEnvio, setConfirmandoEnvio] = useState(false);

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

  const confirmarEnvio = () => {
    setConfirmandoEnvio(false);
    if (!usuario) return;

    // Aquí irá el POST al API route que persiste en SQL Server.
    enviar(asignacion.id, { nombres: usuario.nombres, rol: usuario.rol });
    sileo.success({
      title: corrigiendo ? "Correcciones enviadas" : "Asignación enviada",
      description:
        `${resumen.totalDocentes} ${resumen.totalDocentes === 1 ? "docente" : "docentes"} · ` +
        `${resumen.horasTotales} horas semanales. Queda en manos del administrador.`,
    });
  };

  const intentarEnviar = () => {
    if (resumen.totalDocentes === 0) {
      sileo.error({
        title: "La asignación está vacía",
        description: "Agregue al menos un docente antes de enviarla.",
      });
      return;
    }
    if (resumen.totalErrores > 0) {
      sileo.error({
        title: "La asignación tiene datos pendientes",
        description: `Corrija ${resumen.totalErrores} ${
          resumen.totalErrores === 1 ? "dato" : "datos"
        } antes de enviarla.`,
      });
      return;
    }
    if (!plazo.puedeEnviar) {
      sileo.error({
        title: "No se puede enviar",
        description: plazo.motivo ?? "El plazo de entrega no está abierto.",
      });
      return;
    }
    setConfirmandoEnvio(true);
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
        <InsigniaEstado estado={asignacion.estado} />
        {asignacion.version > 0 && <Insignia>v{asignacion.version}</Insignia>}
        {editable && (
          <>
            <Boton variante="secundario" onClick={nuevoDocente}>
              <FiPlus aria-hidden /> Agregar docente
            </Boton>
            <Boton onClick={intentarEnviar} disabled={!plazo.puedeEnviar}>
              <FiSave aria-hidden />
              {corrigiendo ? "Enviar correcciones" : "Enviar asignación"}
            </Boton>
          </>
        )}
      </Encabezado>

      {/* ---------------- Plazo y bloqueo ---------------- */}
      {editable && plazo.limite && (
        <AvisoPlazo
          limite={plazo.limite}
          titulo={
            corrigiendo
              ? "Plazo para enviar las correcciones"
              : `Entrega de asignaciones · periodo ${asignacion.periodo}`
          }
          detalle={plazo.motivo ?? undefined}
        />
      )}

      {editable && !plazo.limite && plazo.motivo && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] px-4 py-3">
          <FiAlertCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-texto-suave)]"
            aria-hidden
          />
          <p className="text-sm text-[var(--color-texto)]">{plazo.motivo}</p>
        </div>
      )}

      {!editable && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
          <FiLock className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-bold text-sky-900">
              {asignacion.estado === "aprobada"
                ? "Asignación aprobada"
                : "Asignación entregada"}
            </p>
            <p className="mt-0.5 text-sm text-sky-900">
              {asignacion.estado === "aprobada"
                ? "El administrador la aprobó. Ya no admite cambios."
                : "Está en manos del administrador y no admite cambios mientras la revisa."}
            </p>
          </div>
        </div>
      )}

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
          {editable && (
            <Boton variante="secundario" onClick={nuevoDocente}>
              <FiPlus aria-hidden /> Agregar docente
            </Boton>
          )}
        </header>

        {resumen.totalDocentes === 0 ? (
          <div className="p-10 text-center">
            <FiUsers className="mx-auto h-10 w-10 text-[var(--color-texto-suave)]/40" aria-hidden />
            <h4 className="mt-3 font-bold text-[var(--color-texto)]">Sin docentes asignados</h4>
            <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-texto-suave)]">
              {editable
                ? "Agregue el primer docente para registrar sus cursos, descargas y horas de dedicación."
                : "Esta asignación se entregó sin docentes registrados."}
            </p>
            {editable && (
              <Boton className="mt-5" onClick={nuevoDocente}>
                <FiPlus aria-hidden /> Agregar docente
              </Boton>
            )}
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

                {editable && (
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
                )}
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

      {/* ---------------- Trazabilidad ---------------- */}
      <section className="tarjeta tarjeta-sombra mt-8 overflow-hidden">
        <header className="border-b border-[var(--color-borde)] bg-cecar-50/60 px-5 py-4">
          <h3 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">Historial</h3>
          <p className="mt-0.5 text-xs text-[var(--color-texto-suave)]">
            Cada envío, devolución y aprobación de esta asignación
          </p>
        </header>
        <div className="p-5">
          <Bitacora eventos={asignacion.bitacora} />
        </div>
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

      <ModalConfirmacion
        abierto={confirmandoEnvio}
        onCerrar={() => setConfirmandoEnvio(false)}
        onConfirmar={confirmarEnvio}
        titulo={corrigiendo ? "Enviar correcciones" : "Enviar asignación"}
        mensaje={
          "Una vez enviada no podrá modificarla: queda en manos del administrador, " +
          "que la aprobará o se la devolverá con observaciones."
        }
        detalle={
          `${resumen.totalDocentes} ${resumen.totalDocentes === 1 ? "docente" : "docentes"} · ` +
          `${resumen.horasTotales} horas semanales`
        }
        etiquetaConfirmar="Enviar"
      />
    </main>
  );
}
