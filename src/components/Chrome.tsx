"use client";

import { usePathname } from "next/navigation";
import BarraLateral from "./BarraLateral";

/**
 * Envoltorio de la aplicación: el login ocupa la pantalla completa, el
 * resto de vistas van junto a la barra lateral.
 */
export default function Chrome({ children }: { children: React.ReactNode }) {
  const ruta = usePathname();

  if (ruta === "/login" || ruta === "/cambiar-clave") return <>{children}</>;

  return (
    <>
      {/* Al imprimir (los criterios en PDF, SPEC-025) solo va el contenido. */}
      <div className="print:hidden">
        <BarraLateral />
      </div>
      <div className="min-h-screen lg:ml-64 print:ml-0">{children}</div>
    </>
  );
}
