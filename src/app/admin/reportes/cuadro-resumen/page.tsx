"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import { useConfigStore } from "@/lib/stores/config-store";
import { useConfiguracion } from "@/lib/usar-configuracion";
import { FACULTADES, PROGRAMAS } from "@/lib/catalogos";
import { periodoActual } from "@/lib/tipos";
import { legible } from "@/lib/resumen";
import {
  asignacionesDelReporte,
  comparativo,
  cuadroResumen,
  COLUMNAS_CUADRO,
  ETIQUETA_ALCANCE,
  type Alcance,
  type CuadroDePeriodo,
  type CuadroResumen,
} from "@/lib/reportes";
import { libroCuadroResumen } from "@/lib/exportar-cuadro";
import { sileo } from "@/lib/toast";
import Encabezado from "@/components/Encabezado";
import { Boton, Campo, Seleccion, TarjetaStat } from "@/components/ui";
import {
  FiArrowLeft,
  FiAlertTriangle,
  FiClock,
  FiDownload,
  FiLayers,
  FiUsers,
} from "@/components/iconos";

const ALCANCES = (Object.keys(ETIQUETA_ALCANCE) as Alcance[]).map((a) => ({
  valor: a,
  texto: ETIQUETA_ALCANCE[a],
}));

type Vista = "periodo" | "comparativo";

const volver = (
  <Link
    href="/admin/reportes"
    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-texto-suave)] transition hover:text-cecar-700"
  >
    <FiArrowLeft aria-hidden /> Volver a reportes
  </Link>
);

/**
 * El CUADRO RESUMEN del consolidado institucional: las mismas filas y
 * columnas del Excel, calculadas desde las asignaciones en lugar de sumar
 * a mano la celda de cada hoja de programa.
 */
export default function CuadroResumenPagina() {
  const asignaciones = useAsignacionStore((s) => s.asignaciones);
  const hidratadoA = useAsignacionStore((s) => s.hidratado);
  const hidratadoC = useConfigStore((s) => s.hidratado);
  const config = useConfiguracion();

  const [periodo, setPeriodo] = useState(periodoActual());
  const [alcance, setAlcance] = useState<Alcance>("aprobadas");
  const [facultad, setFacultad] = useState("");
  const [programa, setPrograma] = useState("");
  const [vista, setVista] = useState<Vista>("periodo");
  const [descargando, setDescargando] = useState(false);

  // El periodo en curso siempre se ofrece, aunque aún no tenga nada: es el
  // que se consulta casi siempre y un desplegable sin él desconcierta.
  const periodos = useMemo(
    () => [...new Set([periodoActual(), ...asignaciones.map((a) => a.periodo)])].sort().reverse(),
    [asignaciones]
  );

  const programas = useMemo(
    () => PROGRAMAS.filter((p) => !facultad || p.facultad === facultad).map((p) => p.nombre),
    [facultad]
  );

  const filtro = useMemo(
    () => ({ periodo, alcance, facultad, programa }),
    [periodo, alcance, facultad, programa]
  );
  const cuadro = useMemo(
    () => cuadroResumen(asignacionesDelReporte(asignaciones, filtro), config),
    [asignaciones, filtro, config]
  );
  const historico = useMemo(
    () => comparativo(asignaciones, filtro, config),
    [asignaciones, filtro, config]
  );

  if (!hidratadoA || !hidratadoC) {
    return (
      <main className="px-4 py-6 sm:p-8">
        <Encabezado titulo="Cuadro resumen" descripcion="Cargando…" volver={volver} />
      </main>
    );
  }

  const ambito = programa || (facultad ? legible(facultad) : "Todos los programas");

  const descargar = async () => {
    setDescargando(true);
    try {
      const buffer = await libroCuadroResumen({
        periodo,
        ambito,
        alcance: ETIQUETA_ALCANCE[alcance],
        cuadro,
        comparativo: historico,
      });
      const url = URL.createObjectURL(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `cuadro-resumen-${periodo}.xlsx`;
      a.click();
      // Liberar en el mismo tick puede cortar la descarga en algunos navegadores.
      setTimeout(() => URL.revokeObjectURL(url), 0);
      sileo.success({ title: "Cuadro descargado", description: a.download });
    } catch (error) {
      console.error(error);
      sileo.error({ title: "No se pudo generar el Excel", description: "Inténtalo de nuevo." });
    } finally {
      setDescargando(false);
    }
  };

  const horasTotales = cuadro.bloques[0].filas
    .filter((f) => f.subtotal)
    .reduce((s, f) => s + f.total, 0);

  return (
    <main className="px-4 py-6 sm:p-8">
      <Encabezado
        titulo="Cuadro resumen"
        descripcion={`Periodo ${periodo} · ${ambito}`}
        volver={volver}
      >
        <Boton
          variante="secundario"
          onClick={descargar}
          disabled={cuadro.docentes === 0 || descargando}
        >
          <FiDownload aria-hidden /> {descargando ? "Generando…" : "Descargar Excel"}
        </Boton>
      </Encabezado>

      <section className="tarjeta tarjeta-sombra mb-6 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Campo etiqueta="Periodo">
          <Seleccion
            opciones={periodos}
            placeholder="Seleccione…"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value || periodoActual())}
          />
        </Campo>
        <Campo etiqueta="Asignaciones">
          <Seleccion
            opciones={ALCANCES}
            placeholder="Seleccione…"
            value={alcance}
            onChange={(e) => setAlcance((e.target.value || "aprobadas") as Alcance)}
          />
        </Campo>
        <Campo etiqueta="Facultad">
          <Seleccion
            opciones={FACULTADES}
            placeholder="Todas"
            value={facultad}
            onChange={(e) => {
              setFacultad(e.target.value);
              // Un programa de otra facultad dejaría el cuadro vacío sin
              // que el filtro visible lo explique.
              setPrograma("");
            }}
          />
        </Campo>
        <Campo etiqueta="Programa">
          <Seleccion
            opciones={programas}
            placeholder="Todos"
            value={programa}
            onChange={(e) => setPrograma(e.target.value)}
          />
        </Campo>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <TarjetaStat
          etiqueta="Asignaciones incluidas"
          valor={cuadro.asignaciones}
          tono="verde"
          icono={<FiLayers className="h-6 w-6" aria-hidden />}
        />
        <TarjetaStat
          etiqueta="Docentes"
          valor={cuadro.docentes}
          tono="lima"
          icono={<FiUsers className="h-6 w-6" aria-hidden />}
        />
        <TarjetaStat
          etiqueta="Horas semanales"
          valor={horasTotales}
          tono="verde"
          icono={<FiClock className="h-6 w-6" aria-hidden />}
        />
      </section>

      {alcance !== "aprobadas" && cuadro.asignaciones > 0 && (
        <Aviso>
          Incluye asignaciones que aún no están aprobadas: las cifras pueden cambiar hasta que
          se cierre la revisión.
        </Aviso>
      )}
      {cuadro.sinDedicacion > 0 && (
        <Aviso>
          {cuadro.sinDedicacion === 1
            ? "1 docente no tiene dedicación y no entra en ninguna columna."
            : `${cuadro.sinDedicacion} docentes no tienen dedicación y no entran en ninguna columna.`}
        </Aviso>
      )}

      <div role="tablist" aria-label="Vista del cuadro" className="mb-4 flex gap-2">
        {(
          [
            ["periodo", `Periodo ${periodo}`],
            ["comparativo", "Comparativo con periodos anteriores"],
          ] as const
        ).map(([valor, texto]) => (
          <Boton
            key={valor}
            role="tab"
            aria-selected={vista === valor}
            variante={vista === valor ? "primario" : "secundario"}
            onClick={() => setVista(valor)}
          >
            {texto}
          </Boton>
        ))}
      </div>

      {vista === "periodo" ? (
        cuadro.asignaciones === 0 ? (
          <section className="tarjeta p-8 text-center text-sm text-[var(--color-texto-suave)]">
            No hay asignaciones {alcance === "aprobadas" ? "aprobadas " : ""}en {periodo} con
            estos filtros.
          </section>
        ) : (
          <TablaPeriodo cuadro={cuadro} />
        )
      ) : (
        <TablaComparativo periodos={historico} />
      )}
    </main>
  );
}

function TablaPeriodo({ cuadro }: { cuadro: CuadroResumen }) {
  return (
    <section className="tarjeta tarjeta-sombra overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] text-sm">
          <thead>
            <tr className="border-b border-[var(--color-borde)] bg-cecar-50/60 text-[11px] font-semibold tracking-wide text-cecar-800 uppercase">
              <th scope="col" className="sticky left-0 bg-cecar-50 px-5 py-3 text-left">
                Ítem
              </th>
              {COLUMNAS_CUADRO.map((c) => (
                <th key={c.dedicacion} scope="col" className="px-3 py-3 text-right">
                  {c.texto}
                </th>
              ))}
              <th scope="col" className="px-5 py-3 text-right">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {cuadro.bloques.map((b) => (
              <Fragment key={b.titulo}>
                <FilaBloque titulo={b.titulo} columnas={COLUMNAS_CUADRO.length + 2} />
                {b.filas.map((f) => (
                  <tr
                    key={f.etiqueta}
                    className={`border-t border-[var(--color-borde)] ${f.subtotal ? "bg-cecar-50/40 font-semibold" : ""}`}
                  >
                    <CeldaItem etiqueta={f.etiqueta} subtotal={f.subtotal} />
                    {f.valores.map((v, i) => (
                      <td
                        key={COLUMNAS_CUADRO[i].dedicacion}
                        className={`px-3 py-2.5 text-right tabular-nums ${v === 0 ? "text-[var(--color-texto-suave)]/50" : "text-[var(--color-texto)]"}`}
                      >
                        {v}
                      </td>
                    ))}
                    <td className="px-5 py-2.5 text-right font-bold tabular-nums text-[var(--color-texto)]">
                      {f.total}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-[var(--color-borde)] px-5 py-3 text-xs leading-relaxed text-[var(--color-texto-suave)]">
        Las horas de investigación y extensión se clasifican por el tipo del rol, igual que en la
        ficha del docente. «Hora labor» no existe en el consolidado en Excel: se muestra aparte
        para que esos docentes no se pierdan.
      </p>
    </section>
  );
}

/**
 * En pantalla el comparativo muestra solo el TOTAL de cada periodo: con las
 * seis dedicaciones por periodo serían 28 columnas, ilegibles fuera de una
 * hoja de cálculo. El detalle completo va en la hoja COMPARATIVO del Excel.
 */
function TablaComparativo({ periodos }: { periodos: CuadroDePeriodo[] }) {
  const ultimo = periodos[periodos.length - 1];
  // La variación se mide contra el último periodo con asignaciones: contra
  // uno vacío, todo parecería crecer desde cero.
  const previo = [...periodos.slice(0, -1)].reverse().find((p) => p.cuadro.asignaciones > 0);
  const conDatos = (p: CuadroDePeriodo) => p.cuadro.asignaciones > 0;

  return (
    <section className="tarjeta tarjeta-sombra overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="border-b border-[var(--color-borde)] bg-cecar-50/60 text-[11px] font-semibold tracking-wide text-cecar-800 uppercase">
              <th scope="col" className="sticky left-0 bg-cecar-50 px-5 py-3 text-left">
                Ítem
              </th>
              {periodos.map((p) => (
                <th key={p.periodo} scope="col" className="px-3 py-3 text-right">
                  {p.periodo}
                </th>
              ))}
              <th scope="col" className="px-5 py-3 text-right">
                Variación
              </th>
            </tr>
          </thead>
          <tbody>
            {ultimo.cuadro.bloques.map((b, i) => (
              <Fragment key={b.titulo}>
                <FilaBloque titulo={b.titulo} columnas={periodos.length + 2} />
                {b.filas.map((f, j) => {
                  const antes = previo?.cuadro.bloques[i].filas[j].total;
                  const cambio =
                    antes === undefined || !conDatos(ultimo) ? null : f.total - antes;
                  return (
                    <tr
                      key={f.etiqueta}
                      className={`border-t border-[var(--color-borde)] ${f.subtotal ? "bg-cecar-50/40 font-semibold" : ""}`}
                    >
                      <CeldaItem etiqueta={f.etiqueta} subtotal={f.subtotal} />
                      {periodos.map((p) => (
                        <td
                          key={p.periodo}
                          className="px-3 py-2.5 text-right tabular-nums text-[var(--color-texto)]"
                        >
                          {conDatos(p) ? (
                            p.cuadro.bloques[i].filas[j].total
                          ) : (
                            <span className="text-[var(--color-texto-suave)]/50">—</span>
                          )}
                        </td>
                      ))}
                      <td className="px-5 py-2.5 text-right font-semibold tabular-nums text-[var(--color-texto)]">
                        {cambio === null ? (
                          <span className="font-normal text-[var(--color-texto-suave)]/50">—</span>
                        ) : cambio > 0 ? (
                          `+${cambio}`
                        ) : (
                          cambio
                        )}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-[var(--color-borde)] px-5 py-3 text-xs leading-relaxed text-[var(--color-texto-suave)]">
        «—» indica un periodo sin asignaciones con estos filtros. La variación compara{" "}
        {ultimo.periodo} con {previo ? previo.periodo : "el periodo anterior con datos"}. Los
        periodos anteriores al sistema no están cargados: sus cifras siguen en el consolidado en
        Excel.
      </p>
    </section>
  );
}

function FilaBloque({ titulo, columnas }: { titulo: string; columnas: number }) {
  return (
    <tr className="border-t-2 border-[var(--color-borde)]">
      <th
        scope="colgroup"
        colSpan={columnas}
        className="bg-[var(--color-superficie)] px-5 py-2 text-left text-[11px] font-bold tracking-wide text-[var(--color-texto-suave)] uppercase"
      >
        {titulo}
      </th>
    </tr>
  );
}

function CeldaItem({ etiqueta, subtotal }: { etiqueta: string; subtotal?: boolean }) {
  return (
    <th
      scope="row"
      className={`sticky left-0 px-5 py-2.5 text-left font-medium text-[var(--color-texto)] ${subtotal ? "bg-cecar-50" : "bg-white"}`}
    >
      {etiqueta}
    </th>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200 ring-inset">
      <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
