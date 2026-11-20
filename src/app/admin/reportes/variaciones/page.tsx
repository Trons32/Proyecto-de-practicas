"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import { Boton, Campo, Insignia, InsigniaEstado, Seleccion, TarjetaStat } from "@/components/ui";
import { FiArrowLeft, FiDownload, FiUserCheck, FiUserMinus, FiUserPlus } from "@/components/iconos";
import { FACULTADES } from "@/lib/catalogos";
import { legible } from "@/lib/resumen";
import { periodoActual } from "@/lib/tipos";
import { sileo } from "@/lib/toast";
import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import { useConfigStore } from "@/lib/stores/config-store";
import { useConfiguracion } from "@/lib/usar-configuracion";
import { guardarLibro } from "@/lib/exportar-cuadro";
import { libroVariaciones } from "@/lib/exportar-variaciones";
import { ETIQUETA_TIPO_VARIACION, MOTIVOS, reporteVariaciones, textoMotivo, type TipoVariacion } from "@/lib/variaciones";

const TIPOS: TipoVariacion[] = ["saliente", "nuevo", "cambio"];
const TONO: Record<TipoVariacion, "rojo" | "verde" | "azul"> = { saliente: "rojo", nuevo: "verde", cambio: "azul" };

/**
 * La hoja VARIACIONES del consolidado (SPEC-028), armada sola desde las
 * asignaciones: quién sale, quién llega y quién cambia, con el motivo que
 * eligió el coordinador. Contar por motivo era imposible con texto libre.
 */
export default function ReporteVariaciones() {
  const asignaciones = useAsignacionStore((s) => s.asignaciones);
  const hidratadoA = useAsignacionStore((s) => s.hidratado);
  const hidratadoC = useConfigStore((s) => s.hidratado);
  const config = useConfiguracion();

  const [periodo, setPeriodo] = useState(periodoActual());
  const [facultad, setFacultad] = useState("");
  const [tipo, setTipo] = useState<TipoVariacion | "">("");
  const [motivo, setMotivo] = useState("");
  const [descargando, setDescargando] = useState(false);

  const periodos = useMemo(
    () => [...new Set([periodoActual(), ...asignaciones.map((a) => a.periodo)])].sort().reverse(),
    [asignaciones]
  );
  const todas = useMemo(() => {
    const nombres = new Map(config.roles.map((r) => [r.id, r.nombre]));
    return reporteVariaciones(asignaciones, periodo, (id) => nombres.get(id) ?? `Rol ${id}`);
  }, [asignaciones, periodo, config]);
  const filas = useMemo(
    () =>
      todas.filter(
        (f) =>
          (!facultad || f.facultad === facultad) &&
          (!tipo || f.variacion.tipo === tipo) &&
          (!motivo || `${f.variacion.tipo}:${f.motivo}` === motivo)
      ),
    [todas, facultad, tipo, motivo]
  );

  /** Cuántas por motivo, de mayor a menor: lo que la hoja no permitía contar. */
  const porMotivo = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const f of filas) {
      const clave = `${f.variacion.tipo}:${f.motivo}`;
      cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1);
    }
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1]);
  }, [filas]);

  const volver = (
    <Link
      href="/admin/reportes"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-texto-suave)] transition hover:text-cecar-700"
    >
      <FiArrowLeft aria-hidden /> Volver a reportes
    </Link>
  );

  if (!hidratadoA || !hidratadoC) {
    return (
      <main className="px-4 py-6 sm:p-8">
        <Encabezado titulo="Variaciones" descripcion="Cargando…" volver={volver} />
      </main>
    );
  }

  const opcionesMotivo = (tipo ? [tipo] : TIPOS).flatMap((t) =>
    MOTIVOS[t].map((m) => ({ valor: `${t}:${m.codigo}`, texto: tipo ? m.texto : `${ETIQUETA_TIPO_VARIACION[t]} · ${m.texto}` }))
  );
  const cuantos = (t: TipoVariacion) => filas.filter((f) => f.variacion.tipo === t).length;

  const descargar = async () => {
    setDescargando(true);
    try {
      const nombre = `variaciones-${periodo}.xlsx`;
      guardarLibro(await libroVariaciones(periodo, filas), nombre);
      sileo.success({ title: "Variaciones descargadas", description: nombre });
    } catch (e) {
      console.error(e);
      sileo.error({ title: "No se pudo generar el Excel", description: "Inténtalo de nuevo." });
    } finally {
      setDescargando(false);
    }
  };

  return (
    <main className="px-4 py-6 sm:p-8">
      <Encabezado titulo="Variaciones" descripcion={`Docentes que salen, llegan o cambian · periodo ${periodo}`} volver={volver}>
        <Boton variante="secundario" onClick={descargar} disabled={filas.length === 0 || descargando}>
          <FiDownload aria-hidden /> {descargando ? "Generando…" : "Descargar Excel"}
        </Boton>
      </Encabezado>

      <section className="tarjeta tarjeta-sombra mb-6 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Campo etiqueta="Periodo">
          <Seleccion opciones={periodos} placeholder="" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
        </Campo>
        <Campo etiqueta="Facultad">
          <Seleccion opciones={FACULTADES} placeholder="Todas" value={facultad} onChange={(e) => setFacultad(e.target.value)} />
        </Campo>
        <Campo etiqueta="Tipo">
          <Seleccion
            opciones={TIPOS.map((t) => ({ valor: t, texto: ETIQUETA_TIPO_VARIACION[t] }))}
            placeholder="Todos"
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as TipoVariacion | "");
              setMotivo("");
            }}
          />
        </Campo>
        <Campo etiqueta="Motivo">
          <Seleccion opciones={opcionesMotivo} placeholder="Todos" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </Campo>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <TarjetaStat etiqueta="Salen" valor={cuantos("saliente")} tono="rojo" icono={<FiUserMinus className="h-6 w-6" aria-hidden />} />
        <TarjetaStat etiqueta="Llegan" valor={cuantos("nuevo")} tono="verde" icono={<FiUserPlus className="h-6 w-6" aria-hidden />} />
        <TarjetaStat etiqueta="Cambian" valor={cuantos("cambio")} tono="lima" icono={<FiUserCheck className="h-6 w-6" aria-hidden />} />
      </section>

      {filas.length === 0 ? (
        <section className="tarjeta p-8 text-center text-sm text-[var(--color-texto-suave)]">
          No hay variaciones en {periodo} con estos filtros.
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
          <section className="tarjeta p-5 xl:self-start">
            <h3 className="mb-3 text-sm font-bold tracking-wide text-cecar-800 uppercase">Por motivo</h3>
            <ul className="space-y-2.5">
              {porMotivo.map(([clave, n]) => {
                const [t, m] = clave.split(":") as [TipoVariacion, string];
                return (
                  <li key={clave}>
                    <div className="mb-1 flex justify-between gap-2 text-xs">
                      <span className="text-[var(--color-texto)]">{textoMotivo(t, m) || "Sin motivo"}</span>
                      <span className="font-bold tabular-nums">{n}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/[0.05]">
                      <div
                        className={`h-1.5 rounded-full ${t === "saliente" ? "bg-rose-500" : t === "nuevo" ? "bg-cecar-500" : "bg-sky-500"}`}
                        style={{ width: `${(n / porMotivo[0][1]) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="tarjeta tarjeta-sombra overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-[var(--color-borde)] bg-cecar-50/60 text-[11px] uppercase text-cecar-800">
                <tr>
                  <th className="p-3">Programa</th>
                  <th className="p-3">Docente</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Motivo</th>
                  <th className="p-3">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={`${f.asignacionId}:${f.variacion.id}`} className="border-b border-[var(--color-borde)] align-top last:border-0">
                    <td className="p-3">
                      <Link href={`/asignacion/${f.asignacionId}`} className="font-semibold text-[var(--color-texto)] hover:text-cecar-700">
                        {f.programa}
                      </Link>
                      <div className="mt-1">
                        <InsigniaEstado estado={f.estado} />
                      </div>
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-[var(--color-texto)]">{f.variacion.nombres}</p>
                      <p className="text-xs text-[var(--color-texto-suave)]">
                        {f.variacion.dedicacion ? legible(f.variacion.dedicacion) : "—"}
                      </p>
                    </td>
                    <td className="p-3">
                      <Insignia tono={TONO[f.variacion.tipo]}>{ETIQUETA_TIPO_VARIACION[f.variacion.tipo]}</Insignia>
                    </td>
                    <td className="p-3">
                      {f.motivo ? textoMotivo(f.variacion.tipo, f.motivo) : <span className="text-amber-700 italic">Sin motivo</span>}
                    </td>
                    <td className="p-3 text-xs text-[var(--color-texto-suave)]">
                      {[f.variacion.detalle, f.variacion.reemplazaA && `Reemplaza a ${f.variacion.reemplazaA}`, f.variacion.nota]
                        .filter(Boolean)
                        .join(". ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </main>
  );
}
