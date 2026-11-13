"use client";

import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import { useConfigStore } from "@/lib/stores/config-store";
import { useNovedadesStore } from "@/lib/stores/novedades-store";
import { useSesionStore } from "@/lib/stores/sesion-store";
import { nombreDeArchivo } from "@/lib/datos/respaldo";
import { respaldoActual } from "@/lib/datos/respaldo-stores";
import Encabezado from "@/components/Encabezado";
import { Boton } from "@/components/ui";
import { sileo } from "@/lib/toast";
import Link from "next/link";
import { FiDownload, FiUpload } from "@/components/iconos";

/**
 * Respaldo de datos: exportar todo el estado de la base en un JSON.
 *
 * Importar no se hace desde aquí: reemplazar todo desde el navegador se
 * saltaría el ciclo de vida que el servidor hace cumplir, y el servidor lo
 * rechazaría a medias. Un respaldo se carga en la base con
 * `db/respaldo-a-sql.ts`, que lo revisa antes.
 */
export default function RespaldoDatos() {
  const asignaciones = useAsignacionStore((s) => s.asignaciones);
  const hidratadoA = useAsignacionStore((s) => s.hidratado);
  const hidratadoC = useConfigStore((s) => s.hidratado);
  const novedades = useNovedadesStore((s) => s.novedades);
  const hidratadoN = useNovedadesStore((s) => s.hidratado);
  const usuario = useSesionStore((s) => s.sesion?.usuario ?? null);

  if (!hidratadoA || !hidratadoC || !hidratadoN) {
    return (
      <main className="px-4 py-6 sm:p-8">
        <Encabezado titulo="Respaldo de datos" descripcion="Cargando…" />
      </main>
    );
  }

  const exportar = () => {
    const r = respaldoActual(usuario?.nombres ?? "—");
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(r, null, 2)], { type: "application/json" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreDeArchivo(r);
    a.click();
    // Liberar en el mismo tick puede cortar la descarga en algunos navegadores.
    setTimeout(() => URL.revokeObjectURL(url), 0);
    sileo.success({ title: "Respaldo descargado", description: a.download });
  };

  const docentes = asignaciones.reduce((s, a) => s + a.docentes.length, 0);

  return (
    <main className="px-4 py-6 sm:p-8">
      <Encabezado
        titulo="Respaldo de datos"
        descripcion="Exportar e importar asignaciones, parámetros y novedades"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="tarjeta tarjeta-sombra p-5">
          <h3 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">Exportar</h3>
          <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
            Descarga todo lo registrado en la base de datos: {asignaciones.length} asignaciones,{" "}
            {docentes} docentes y {novedades.length} novedades, con sus bitácoras y la
            parametrización vigente.
          </p>
          <Boton className="mt-4" onClick={exportar}>
            <FiDownload aria-hidden /> Descargar respaldo
          </Boton>
        </section>

        <section className="tarjeta tarjeta-sombra p-5 lg:col-span-2">
          <h3 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">
            Importar periodos anteriores
          </h3>
          <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
            Cargue el Excel de asignación de periodos que no se hicieron en el sistema —en el formato
            que tuvieran entonces— para completar el comparativo estadístico. Cada hoja se revisa
            antes de guardarse y queda aprobada, con la constancia del archivo del que salió.
          </p>
          <Link
            href="/admin/datos/importar"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-cecar-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cecar-700"
          >
            <FiUpload aria-hidden /> Importar desde Excel
          </Link>
        </section>

        <section className="tarjeta tarjeta-sombra p-5 lg:col-span-2">
          <h3 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">
            Directorio de docentes
          </h3>
          <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
            Cargue el listado institucional de docentes (código, cédula y nombre). Con él, al
            registrar un docente basta su cédula o su código para traer sus datos. Se puede volver a
            cargar cada semestre: no duplica ni borra a nadie.
          </p>
          <Link
            href="/admin/datos/docentes"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-cecar-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cecar-700"
          >
            <FiUpload aria-hidden /> Cargar listado de docentes
          </Link>
        </section>

        <section className="tarjeta tarjeta-sombra p-5">
          <h3 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">Importar un respaldo</h3>
          <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
            Los datos viven en la base de datos. Para cargar un respaldo, el encargado de la base lo
            convierte con db/respaldo-a-sql.ts, que lo revisa antes de tocar nada.
          </p>
        </section>
      </div>

    </main>
  );
}
