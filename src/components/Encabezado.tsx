import type { ReactNode } from "react";

/**
 * Encabezado de página del dashboard institucional: título, bajada y las
 * acciones a la derecha. El padding izquierdo en móvil deja sitio al
 * botón hamburguesa, que va fijo en esa esquina.
 */
export default function Encabezado({
  titulo,
  descripcion,
  volver,
  children,
}: {
  titulo: string;
  descripcion?: ReactNode;
  volver?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 pl-12 lg:pl-0">
      {volver && <div className="mb-3">{volver}</div>}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-3xl font-bold text-[var(--color-texto)]">{titulo}</h2>
          {descripcion && (
            <p className="mt-0.5 text-sm text-[var(--color-texto-suave)]">{descripcion}</p>
          )}
        </div>
        {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
      </div>
    </header>
  );
}
