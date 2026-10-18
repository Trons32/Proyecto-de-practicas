"use client";

import { useRef, useState } from "react";
import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import { useConfigStore } from "@/lib/stores/config-store";
import { useNovedadesStore } from "@/lib/stores/novedades-store";
import { useSesionStore } from "@/lib/stores/sesion-store";
import {
  leerRespaldo,
  nombreDeArchivo,
  resumenRespaldo,
  type Respaldo,
} from "@/lib/datos/respaldo";
import { respaldoActual, restaurarRespaldo } from "@/lib/datos/respaldo-stores";
import { fechaHoraLegible } from "@/lib/convocatoria";
import Encabezado from "@/components/Encabezado";
import ModalConfirmacion from "@/components/ModalConfirmacion";
import { Boton } from "@/components/ui";
import { sileo } from "@/lib/toast";
import { FiDownload, FiUpload } from "@/components/iconos";

/**
 * Respaldo de datos: exportar e importar todo el estado en un JSON.
 *
 * Mientras no haya base de datos, lo registrado vive en un solo navegador.
 * Esta página es la salida de emergencia —y el puente para migrar a SQL—:
 * el archivo tiene la forma que recibirá la API.
 */
export default function RespaldoDatos() {
  const asignaciones = useAsignacionStore((s) => s.asignaciones);
  const hidratadoA = useAsignacionStore((s) => s.hidratado);
  const hidratadoC = useConfigStore((s) => s.hidratado);
  const novedades = useNovedadesStore((s) => s.novedades);
  const hidratadoN = useNovedadesStore((s) => s.hidratado);
  const usuario = useSesionStore((s) => s.sesion?.usuario ?? null);

  const archivo = useRef<HTMLInputElement>(null);
  const [porImportar, setPorImportar] = useState<Respaldo | null>(null);

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

  const elegir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    // Se vacía para que elegir el mismo archivo otra vez vuelva a dispararlo.
    e.target.value = "";
    if (!f) return;
    const lectura = leerRespaldo(await f.text());
    if (!lectura.ok) {
      sileo.error({ title: "No se puede importar", description: lectura.error });
      return;
    }
    setPorImportar(lectura.respaldo);
  };

  const importar = () => {
    if (!porImportar) return;
    restaurarRespaldo(porImportar);
    setPorImportar(null);
    sileo.success({ title: "Respaldo importado", description: "Los datos se reemplazaron." });
  };

  const docentes = asignaciones.reduce((s, a) => s + a.docentes.length, 0);
  const r = porImportar ? resumenRespaldo(porImportar) : null;

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
            Descarga todo lo registrado en este navegador: {asignaciones.length} asignaciones,{" "}
            {docentes} docentes y {novedades.length} novedades, con sus bitácoras y la
            parametrización vigente.
          </p>
          <Boton className="mt-4" onClick={exportar}>
            <FiDownload aria-hidden /> Descargar respaldo
          </Boton>
        </section>

        <section className="tarjeta tarjeta-sombra p-5">
          <h3 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">Importar</h3>
          <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
            Reemplaza todos los datos actuales por los del archivo. Descargue antes un respaldo
            si quiere conservar lo que hay.
          </p>
          <input
            ref={archivo}
            type="file"
            accept=".json,application/json"
            onChange={elegir}
            className="hidden"
            aria-hidden
            tabIndex={-1}
          />
          <Boton variante="secundario" className="mt-4" onClick={() => archivo.current?.click()}>
            <FiUpload aria-hidden /> Elegir archivo
          </Boton>
        </section>
      </div>

      <ModalConfirmacion
        abierto={porImportar !== null}
        onCerrar={() => setPorImportar(null)}
        onConfirmar={importar}
        titulo="Reemplazar los datos"
        mensaje="Todo lo registrado en este navegador se sustituirá por el contenido del respaldo. No se puede deshacer."
        detalle={
          porImportar && r
            ? `Exportado por ${porImportar.exportadoPor} el ${fechaHoraLegible(porImportar.exportado)}: ` +
              `${r.asignaciones} asignaciones, ${r.docentes} docentes, ${r.roles} roles, ` +
              `${r.convocatorias} convocatorias y ${r.novedades} novedades.`
            : undefined
        }
        etiquetaConfirmar="Reemplazar"
        peligro
      />
    </main>
  );
}
