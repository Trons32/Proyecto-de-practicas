"use client";

import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import { Insignia } from "@/components/ui";
import { FiArrowRight, FiBarChart2, FiFileText, FiAlertTriangle, FiClock, FiUsers } from "@/components/iconos";

/**
 * Los reportes del consolidado (SPEC-004 y SPEC-005). Se listan también los
 * que faltan para que el administrador sepa qué viene, igual que el panel.
 */
const REPORTES = [
  {
    icono: FiBarChart2,
    titulo: "Cuadro resumen",
    texto:
      "Docentes y horas por dedicación: función sustantiva, nivel de formación, contrato y escalafón. El cuadro del consolidado institucional.",
    href: "/admin/reportes/cuadro-resumen",
  },
  {
    icono: FiFileText,
    titulo: "Asignación en formato oficial",
    texto:
      "El formato único de asignación académica en Excel. Se descarga desde cada asignación, con el botón «Formato oficial».",
    href: "/admin/asignaciones",
  },
  {
    icono: FiClock,
    titulo: "Estado de la convocatoria",
    texto: "Asignaciones por estado y programa, las que faltan y los plazos por vencer.",
  },
  {
    icono: FiAlertTriangle,
    titulo: "Cumplimiento de carga",
    texto: "Docentes que no cuadran con su dedicación y por qué.",
  },
  {
    icono: FiUsers,
    titulo: "Histórico por docente",
    texto: "La carga de un docente a lo largo de varios periodos.",
  },
];

export default function Reportes() {
  return (
    <main className="px-4 py-6 sm:p-8">
      <Encabezado titulo="Reportes" descripcion="Consolidados de la asignación académica" />

      <section className="grid gap-6 md:grid-cols-2">
        {REPORTES.map(({ icono: Icono, titulo, texto, href }) => {
          const contenido = (
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-cecar-600/10 text-cecar-700">
                <Icono className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 font-bold text-[var(--color-texto)]">
                  {titulo}
                  {!href && <Insignia tono="ambar">Próximamente</Insignia>}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-texto-suave)]">{texto}</p>
              </div>
              {href && (
                <FiArrowRight className="ml-auto h-4 w-4 shrink-0 text-[var(--color-texto-suave)]" aria-hidden />
              )}
            </div>
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
