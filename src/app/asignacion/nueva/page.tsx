"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FACULTADES, PROGRAMAS } from "@/lib/catalogos";
import { periodosAcademicos } from "@/lib/tipos";
import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import Encabezado from "@/components/Encabezado";
import { Boton, Campo, Seleccion } from "@/components/ui";
import { sileo } from "@/lib/toast";
import { FiArrowLeft, FiArrowRight } from "@/components/iconos";

const PERIODOS = periodosAcademicos();

export default function NuevaAsignacion() {
  const router = useRouter();
  const crearAsignacion = useAsignacionStore((s) => s.crearAsignacion);
  const asignaciones = useAsignacionStore((s) => s.asignaciones);

  const [periodo, setPeriodo] = useState(PERIODOS[0] ?? "");
  const [facultad, setFacultad] = useState("");
  const [programa, setPrograma] = useState("");

  const programas = useMemo(
    () => PROGRAMAS.filter((p) => p.facultad === facultad).map((p) => p.nombre),
    [facultad]
  );

  const completo = Boolean(periodo && facultad && programa);

  const continuar = () => {
    if (!completo) {
      sileo.error({
        title: "Faltan datos",
        description: "Seleccione el periodo académico, la facultad y el programa.",
      });
      return;
    }

    // Reabrir la existente evita duplicados para el mismo programa y periodo.
    const existente = asignaciones.find(
      (a) => a.periodo === periodo && a.facultad === facultad && a.programa === programa
    );
    if (existente) {
      sileo.info({
        title: "Esta asignación ya existe",
        description: `${programa} · ${periodo}. Se abrirá la asignación existente.`,
      });
      router.push(`/asignacion/${existente.id}`);
      return;
    }

    const id = crearAsignacion({ periodo, facultad, programa });
    sileo.success({
      title: "Asignación creada",
      description: `${programa} · ${periodo}`,
    });
    router.push(`/asignacion/${id}`);
  };

  return (
    <main className="px-4 py-6 sm:p-8">
      <Encabezado
        titulo="Nueva asignación"
        descripcion="Defina el periodo, la facultad y el programa para comenzar"
        volver={
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-texto-suave)] transition hover:text-cecar-700"
          >
            <FiArrowLeft aria-hidden /> Volver al inicio
          </Link>
        }
      />

      <section className="tarjeta tarjeta-sombra mx-auto max-w-5xl p-6">
        <div className="grid gap-5 lg:grid-cols-[14rem_1fr_1fr]">
          <Campo etiqueta="Periodo académico" requerido>
            <Seleccion
              opciones={PERIODOS}
              value={periodo}
              placeholder="Seleccione…"
              onChange={(e) => setPeriodo(e.target.value)}
            />
          </Campo>

          <Campo etiqueta="Facultad" requerido>
            <Seleccion
              opciones={FACULTADES}
              value={facultad}
              onChange={(e) => {
                setFacultad(e.target.value);
                setPrograma("");
              }}
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

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-borde)] pt-5">
          <p className="text-xs text-[var(--color-texto-suave)]">
            {completo
              ? "Podrá agregar los docentes en el siguiente paso."
              : "Complete los tres campos para continuar."}
          </p>
          <Boton onClick={continuar} disabled={!completo}>
            Continuar <FiArrowRight aria-hidden />
          </Boton>
        </div>
      </section>
    </main>
  );
}
