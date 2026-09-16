"use client";

import { usePathname } from "next/navigation";
import BarraLateral from "./BarraLateral";

/**
 * Envoltorio de la aplicación: el login ocupa la pantalla completa, el
 * resto de vistas van junto a la barra lateral.
 */
export default function Chrome({ children }: { children: React.ReactNode }) {
  const ruta = usePathname();

  if (ruta === "/login") return <>{children}</>;

  return (
    <>
      <BarraLateral />
      <div className="min-h-screen lg:ml-64">{children}</div>
    </>
  );
}
