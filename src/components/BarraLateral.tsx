"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  FiGrid,
  FiFileText,
  FiUsers,
  FiBarChart2,
  FiLogOut,
  FiMenu,
  FiSliders,
  FiBell,
  FiDatabase,
} from "./iconos";
import type { IconType } from "react-icons";
import { useSesionStore } from "@/lib/stores/sesion-store";
import { ETIQUETA_ROL, type Rol } from "@/lib/auth/sesion";

/**
 * Menú del sistema. Mientras los demás módulos no existan, solo
 * "Asignación" queda habilitado; el resto se muestra atenuado para
 * conservar la estructura del dashboard institucional.
 */
type Enlace = {
  icono: IconType;
  texto: string;
  href?: string;
  /**
   * Otras rutas que pertenecen al mismo módulo. El administrador revisa una
   * asignación en /asignacion/[id], fuera de /admin, y sin esto el menú no
   * sabría a qué módulo pertenece esa pantalla.
   */
  tambien?: string[];
};

/** El menú depende del rol: cada uno ve solo sus módulos. */
const MENU: Record<Rol, Enlace[]> = {
  COORDINADOR: [
    { icono: FiGrid, texto: "Inicio", href: "/" },
    { icono: FiFileText, texto: "Asignaciones", href: "/asignacion" },
    { icono: FiUsers, texto: "Docentes" },
    { icono: FiBarChart2, texto: "Reportes" },
  ],
  ADMIN: [
    { icono: FiGrid, texto: "Panel", href: "/admin" },
    { icono: FiSliders, texto: "Parámetros", href: "/admin/parametros" },
    {
      icono: FiFileText,
      texto: "Asignaciones",
      href: "/admin/asignaciones",
      tambien: ["/asignacion"],
    },
    { icono: FiBell, texto: "Novedades", href: "/admin/novedades" },
    { icono: FiDatabase, texto: "Respaldo", href: "/admin/datos" },
    { icono: FiBarChart2, texto: "Reportes", href: "/admin/reportes" },
    { icono: FiUsers, texto: "Usuarios" },
  ],
};

export default function BarraLateral() {
  const [abierta, setAbierta] = useState(false);
  const ruta = usePathname();
  const router = useRouter();
  const sesion = useSesionStore((s) => s.sesion);
  const cerrar = useSesionStore((s) => s.cerrar);

  const rol = sesion?.usuario.rol ?? "COORDINADOR";
  const ENLACES = MENU[rol];

  /**
   * Solo un enlace queda activo: el de la coincidencia más específica. En
   * /admin/parametros, "Panel" (/admin) y "Parámetros" son ambos prefijos
   * de la ruta, y marcar los dos dejaba dos ítems resaltados a la vez.
   */
  const hrefActivo = useMemo(() => {
    const casa = (h: string) =>
      h === "/" ? ruta === "/" : ruta === h || ruta.startsWith(h + "/");
    return MENU[rol]
      .flatMap((e) =>
        e.href ? [e.href, ...(e.tambien ?? [])].filter(casa).map((r) => ({ href: e.href, r })) : []
      )
      .sort((a, b) => b.r.length - a.r.length)[0]?.href;
  }, [rol, ruta]);

  const cerrarSesion = () => {
    cerrar();
    router.replace("/login");
  };

  return (
    <>
      {/* Botón hamburguesa — solo móvil, igual que el dashboard institucional */}
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-label="Abrir menú"
        aria-expanded={abierta}
        className="fixed top-4 left-4 z-40 rounded-lg bg-white p-2 shadow-md lg:hidden"
      >
        <FiMenu className="h-5 w-5 text-[var(--color-texto)]" aria-hidden />
      </button>

      {/* Overlay móvil */}
      {abierta && (
        <div
          onClick={() => setAbierta(false)}
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-30 flex h-screen w-64 flex-col bg-white shadow-lg
                    transition-transform duration-300 ease-in-out
                    ${abierta ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex flex-col items-center border-b border-[var(--color-borde)] p-6">
          <Image
            src="/logocecar.png"
            alt="CECAR"
            width={160}
            height={48}
            priority
            className="mb-4 h-12 w-auto"
          />
          <h1 className="text-center text-base leading-tight font-bold text-[var(--color-texto)]">
            Asignación Académica
          </h1>
        </div>

        {/* Menú */}
        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          {ENLACES.map(({ icono: Icono, texto, href }) => {
            // Sin el `Boolean(href)`, en una ruta que no casa con ningún enlace
            // hrefActivo es undefined y todos los módulos inertes (sin href)
            // se marcaban activos a la vez.
            const activo = Boolean(href) && href === hrefActivo;
            const clases = `block rounded-lg px-4 py-3 text-sm font-medium transition ${
              activo
                ? "bg-cecar-600 text-white"
                : href
                  ? "text-[var(--color-texto)] hover:translate-x-1 hover:bg-cecar-600/10"
                  : "text-[var(--color-texto-suave)]/50"
            }`;
            const contenido = (
              <span className="flex items-center gap-3">
                <Icono className="h-[18px] w-[18px]" aria-hidden />
                {texto}
              </span>
            );

            // Los módulos aún no construidos se muestran, pero inertes.
            return href ? (
              <Link
                key={texto}
                href={href}
                aria-current={activo ? "page" : undefined}
                onClick={() => setAbierta(false)}
                className={clases}
              >
                {contenido}
              </Link>
            ) : (
              <span
                key={texto}
                aria-disabled="true"
                title="Módulo en construcción"
                className={clases}
              >
                {contenido}
              </span>
            );
          })}
        </nav>

        {/* Usuario y cierre de sesión */}
        <div className="space-y-3 border-t border-[var(--color-borde)] p-4">
          {sesion && (
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cecar-600 text-sm font-bold text-white">
                {sesion.usuario.nombres.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[var(--color-texto)]">
                  {sesion.usuario.nombres}
                </span>
                <span className="block truncate text-[11px] text-[var(--color-texto-suave)]">
                  {ETIQUETA_ROL[sesion.usuario.rol]}
                </span>
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={cerrarSesion}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cecar-600 py-3
                       text-sm font-semibold text-white transition hover:bg-cecar-700"
          >
            <FiLogOut className="h-[18px] w-[18px]" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
