"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import { useConfigStore } from "@/lib/stores/config-store";
import { resumirAsignacion } from "@/lib/resumen";
import { useConfiguracion } from "@/lib/usar-configuracion";
import Encabezado from "@/components/Encabezado";
import { Boton, TarjetaStat, Insignia } from "@/components/ui";
import {
  FiSliders,
  FiLayers,
  FiUsers,
  FiClock,
  FiFileText,
  FiBarChart2,
  FiArrowRight,
} from "@/components/iconos";

/** Módulos del administrador; los que aún no existen se marcan como tales. */
const MODULOS = [
  {
    icono: FiSliders,
    titulo: "Parámetros",
    texto:
      "Topes de horas por dedicación, horas de apoyo académico, roles de descarga y límites del formato.",
    href: "/admin/parametros",
  },
  {
    icono: FiFileText,
    titulo: "Asignaciones",
    texto: "Revisar a detalle las asignaciones que suben los coordinadores.",
  },
  {
    icono: FiBarChart2,
    titulo: "Reportes",
    texto: "Consolidados de horas por facultad, programa y tipo de actividad.",
  },
  {
    icono: FiUsers,
    titulo: "Usuarios",
    texto: "Alta de coordinadores y administradores, y los programas que gestiona cada uno.",
  },
];

export default function PanelAdmin() {
  const asignaciones = useAsignacionStore((s) => s.asignaciones);
  const roles = useConfigStore((s) => s.roles);
  const config = useConfiguracion();

  const totales = useMemo(() => {
    const r = asignaciones.map((a) => resumirAsignacion(a, config));
    return {
      asignaciones: r.length,
      docentes: r.reduce((s, x) => s + x.totalDocentes, 0),
      horas: r.reduce((s, x) => s + x.horasTotales, 0),
    };
  }, [asignaciones, config]);

  return (
    <main className="px-4 py-6 sm:p-8">
      <Encabezado
        titulo="Panel de administración"
        descripcion="Parametrización del sistema y seguimiento de las asignaciones"
      >
        <Link href="/admin/parametros">
          <Boton>
            <FiSliders aria-hidden /> Parámetros
          </Boton>
        </Link>
      </Encabezado>

      <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <TarjetaStat
          etiqueta="Asignaciones"
          valor={totales.asignaciones}
          tono="verde"
          icono={<FiLayers className="h-6 w-6" aria-hidden />}
        />
        <TarjetaStat
          etiqueta="Docentes asignados"
          valor={totales.docentes}
          tono="lima"
          icono={<FiUsers className="h-6 w-6" aria-hidden />}
        />
        <TarjetaStat
          etiqueta="Horas semanales"
          valor={totales.horas}
          tono="verde"
          icono={<FiClock className="h-6 w-6" aria-hidden />}
        />
        <TarjetaStat
          etiqueta="Roles configurados"
          valor={roles.length}
          tono="lima"
          icono={<FiSliders className="h-6 w-6" aria-hidden />}
        />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {MODULOS.map(({ icono: Icono, titulo, texto, href }) => {
          const contenido = (
            <>
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-cecar-600/10 text-cecar-700">
                  <Icono className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 font-bold text-[var(--color-texto)]">
                    {titulo}
                    {!href && <Insignia tono="ambar">Próximamente</Insignia>}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-texto-suave)]">
                    {texto}
                  </p>
                </div>
                {href && (
                  <FiArrowRight
                    className="ml-auto h-4 w-4 shrink-0 text-[var(--color-texto-suave)]"
                    aria-hidden
                  />
                )}
              </div>
            </>
          );

          return href ? (
            <Link
              key={titulo}
              href={href}
              className="tarjeta tarjeta-sombra p-5 transition hover:border-cecar-300 hover:bg-cecar-50/40"
            >
              {contenido}
            </Link>
          ) : (
            <div key={titulo} className="tarjeta p-5 opacity-60">
              {contenido}
            </div>
          );
        })}
      </section>
    </main>
  );
}
