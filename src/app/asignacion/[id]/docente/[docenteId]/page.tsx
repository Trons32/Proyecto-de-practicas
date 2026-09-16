"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import { calcularTotales, validarDocente } from "@/lib/calculo";
import { legible } from "@/lib/resumen";
import { useConfiguracion } from "@/lib/usar-configuracion";
import type { Docente } from "@/lib/tipos";
import FormularioDocente from "@/components/FormularioDocente";
import ResumenHoras from "@/components/ResumenHoras";
import Encabezado from "@/components/Encabezado";
import NoEncontrada from "../../../NoEncontrada";
import { Boton, Insignia } from "@/components/ui";
import { FiArrowLeft, FiCheckCircle, FiAlertCircle } from "@/components/iconos";

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

  const docente = asignacion?.docentes.find((d) => d.id === docenteId);

  const config = useConfiguracion();

  const analisis = useMemo(() => {
    if (!docente) return null;
    const totales = calcularTotales(docente, config);
    return { totales, hallazgos: validarDocente(docente, totales) };
  }, [docente, config]);

  if (!hidratado) {
    return (
      <main className="px-4 py-6 sm:p-8">
        <Encabezado titulo="Docente" descripcion="Cargando…" />
      </main>
    );
  }

  if (!asignacion) return <NoEncontrada />;
  if (!docente || !analisis) {
    return (
      <NoEncontrada
        titulo="Docente no encontrado"
        mensaje="El docente que busca no existe o fue eliminado de esta asignación."
      />
    );
  }

  const errores = analisis.hallazgos.filter((h) => h.severidad === "error").length;
  const posicion = asignacion.docentes.findIndex((d) => d.id === docenteId) + 1;

  const guardarCambios = (d: Docente) => actualizarDocente(asignacion.id, d);

  return (
    <main className="px-4 py-6 sm:p-8">
      <Encabezado
        titulo={docente.nombres || `Docente ${posicion}`}
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
        {errores > 0 ? (
          <Insignia tono="rojo">
            <FiAlertCircle aria-hidden /> {errores}{" "}
            {errores === 1 ? "dato pendiente" : "datos pendientes"}
          </Insignia>
        ) : (
          <Insignia tono="verde">
            <FiCheckCircle aria-hidden /> Datos completos
          </Insignia>
        )}
        {/* Los cambios se guardan en el store al escribir; el botón solo
            devuelve al listado, donde se completa la asignación. */}
        <Boton onClick={() => router.push(`/asignacion/${asignacion.id}`)}>
          Listo
        </Boton>
      </Encabezado>

      {/* Formulario y dedicación semanal, lado a lado. */}
      <div className="grid gap-6 xl:grid-cols-[1fr_20rem] 2xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          <FormularioDocente
            docente={docente}
            totales={analisis.totales}
            hallazgos={analisis.hallazgos}
            programaPorDefecto={asignacion.programa}
            onCambio={guardarCambios}
          />
        </div>

        <aside className="no-imprimir xl:self-start">
          <ResumenHoras t={analisis.totales} />
        </aside>
      </div>
    </main>
  );
}
