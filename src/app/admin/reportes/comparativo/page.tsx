"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import { useConfigStore } from "@/lib/stores/config-store";
import { useConfiguracion } from "@/lib/usar-configuracion";
import { PROGRAMAS } from "@/lib/catalogos";
import { periodoActual } from "@/lib/tipos";
import { legible } from "@/lib/resumen";
import {
  HISTORICO_CUADRO,
  HISTORICO_ESTUDIANTES,
  HISTORICO_MODALIDAD,
  HISTORICO_PROGRAMAS,
} from "@/lib/historicos";
import {
  comparativoCompleto,
  comparativoPorModalidad,
  comparativoPorPrograma,
  ETIQUETA_ALCANCE,
  ETIQUETA_MODALIDAD,
  MODALIDADES,
  totalDe,
  type Alcance,
  type ConteoDocentes,
  type CuadroComparable,
  type FilaPrograma,
} from "@/lib/reportes";
import { guardarLibro } from "@/lib/exportar-cuadro";
import { libroComparativo } from "@/lib/exportar-comparativo";
import { sileo } from "@/lib/toast";
import Encabezado from "@/components/Encabezado";
import { GraficaAgrupada, GraficaColumnas } from "@/components/Graficas";
import { Boton, Campo, Insignia, Seleccion } from "@/components/ui";
import { FiArrowLeft, FiDownload } from "@/components/iconos";

const ALCANCES = (Object.keys(ETIQUETA_ALCANCE) as Alcance[]).map((a) => ({ valor: a, texto: ETIQUETA_ALCANCE[a] }));
const formato = new Intl.NumberFormat("es-CO");
const cifra = (v: number | null) => (v === null ? "—" : formato.format(v));
const signo = (v: number | null) => (v === null ? "—" : v > 0 ? `+${v}` : String(v));

const volver = (
  <Link
    href="/admin/reportes"
    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-texto-suave)] transition hover:text-cecar-700"
  >
    <FiArrowLeft aria-hidden /> Volver a reportes
  </Link>
);

/**
 * El COMPARATIVO ESTADÍSTICO del consolidado (SPEC-009): el cuadro de todos
 * los periodos, por programa y por modalidad, con las gráficas del Excel.
 * Los periodos anteriores al sistema salen del histórico cargado del Excel;
 * cada columna dice de dónde viene su cifra.
 */
export default function ComparativoPagina() {
  const asignaciones = useAsignacionStore((s) => s.asignaciones);
  const hidratadoA = useAsignacionStore((s) => s.hidratado);
  const hidratadoC = useConfigStore((s) => s.hidratado);
  const config = useConfiguracion();

  const periodosDisponibles = useMemo(
    () =>
      [...new Set([periodoActual(), ...HISTORICO_CUADRO.map((h) => h.periodo), ...asignaciones.map((a) => a.periodo)])]
        .sort()
        .reverse(),
    [asignaciones]
  );
  const [hasta, setHasta] = useState(periodoActual());
  const [alcance, setAlcance] = useState<Alcance>("aprobadas");
  const [descargando, setDescargando] = useState(false);

  const cuadros = useMemo(
    () => comparativoCompleto(asignaciones, { periodo: hasta, alcance }, HISTORICO_CUADRO, config),
    [asignaciones, hasta, alcance, config]
  );
  const periodos = useMemo(() => cuadros.map((c) => c.periodo), [cuadros]);
  const programas = useMemo(
    () => comparativoPorPrograma(asignaciones, periodos, alcance, HISTORICO_PROGRAMAS, PROGRAMAS),
    [asignaciones, periodos, alcance]
  );
  const modalidades = useMemo(
    () => comparativoPorModalidad(programas, periodos, HISTORICO_MODALIDAD),
    [programas, periodos]
  );

  if (!hidratadoA || !hidratadoC) {
    return (
      <main className="px-4 py-6 sm:p-8">
        <Encabezado titulo="Comparativo estadístico" descripcion="Cargando…" volver={volver} />
      </main>
    );
  }

  const conDatos = cuadros.filter((c) => c.fuente !== "vacio");
  const serie = (bloque: number, fila: number) =>
    conDatos.map((c) => ({ etiqueta: c.periodo, valor: totalDe(c, bloque, fila) }));
  // El Excel no trae 2022-1 por modalidad: un grupo vacío solo ocupa espacio.
  const periodosModalidad = periodos.filter((p) => MODALIDADES.some((m) => modalidades[m][p]?.total != null));
  const estudiantes = conDatos.map((c) => ({
    etiqueta: c.periodo,
    // Del sistema no sale: la suma de estudiantes de los cursos cuenta a
    // cada persona varias veces (ver la spec, "pendiente con el cliente").
    valor: HISTORICO_ESTUDIANTES.find((e) => e.periodo === c.periodo)?.estudiantes ?? null,
  }));

  const descargar = async () => {
    setDescargando(true);
    try {
      const buffer = await libroComparativo({
        bajada: `${conDatos[0]?.periodo ?? hasta} a ${hasta} · asignaciones del sistema: ${ETIQUETA_ALCANCE[alcance]}`,
        cuadros,
        programas,
        periodos,
        modalidades,
        estudiantes: estudiantes.map((e) => ({ periodo: e.etiqueta, estudiantes: e.valor })),
      });
      const nombre = `comparativo-estadistico-${hasta}.xlsx`;
      guardarLibro(buffer, nombre);
      sileo.success({ title: "Comparativo descargado", description: nombre });
    } catch (error) {
      console.error(error);
      sileo.error({ title: "No se pudo generar el Excel", description: "Inténtalo de nuevo." });
    } finally {
      setDescargando(false);
    }
  };

  return (
    <main className="px-4 py-6 sm:p-8">
      <Encabezado
        titulo="Comparativo estadístico"
        descripcion={`${conDatos[0]?.periodo ?? hasta} a ${hasta} · institucional`}
        volver={volver}
      >
        <Boton variante="secundario" onClick={descargar} disabled={conDatos.length === 0 || descargando}>
          <FiDownload aria-hidden /> {descargando ? "Generando…" : "Descargar Excel"}
        </Boton>
      </Encabezado>

      <section className="tarjeta tarjeta-sombra mb-6 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Campo etiqueta="Hasta el periodo">
          <Seleccion
            opciones={periodosDisponibles}
            placeholder="Seleccione…"
            value={hasta}
            onChange={(e) => setHasta(e.target.value || periodoActual())}
          />
        </Campo>
        <Campo etiqueta="Asignaciones del sistema">
          <Seleccion
            opciones={ALCANCES}
            placeholder="Seleccione…"
            value={alcance}
            onChange={(e) => setAlcance((e.target.value || "aprobadas") as Alcance)}
          />
        </Campo>
        <p className="text-xs leading-relaxed text-[var(--color-texto-suave)] sm:col-span-2">
          Los periodos sin asignaciones en el sistema toman las cifras del consolidado en Excel (
          <Insignia tono="neutro">Excel</Insignia>). Cuando un periodo tiene asignaciones, se usan
          las del sistema (<Insignia tono="verde">Sistema</Insignia>).
        </p>
      </section>

      <section className="mb-6 grid gap-6 lg:grid-cols-2" aria-label="Gráficas del comparativo">
        <GraficaColumnas titulo="Total docentes por periodo académico" subtitulo="TC, MT, cátedra y tutores" datos={serie(0, 0)} />
        <GraficaColumnas titulo="Horas de docencia directa por periodo" subtitulo="Horas semanales de clase" datos={serie(0, 1)} />
        <GraficaColumnas titulo="Descargas de investigación por periodo" subtitulo="Horas semanales" datos={serie(0, 6)} />
        <GraficaAgrupada
          titulo="Docentes por modalidad y periodo"
          subtitulo="Total de docentes"
          categorias={periodosModalidad}
          series={MODALIDADES.map((m) => ({
            nombre: ETIQUETA_MODALIDAD[m],
            valores: periodosModalidad.map((p) => modalidades[m][p]?.total ?? null),
          }))}
        />
        {/* Docentes y estudiantes van en gráficas separadas: con un solo eje,
            6.000 estudiantes aplastan a 400 docentes; con dos ejes, el cruce
            de las curvas lo decide la escala elegida, no los datos. */}
        <GraficaColumnas
          titulo="Estudiantes por periodo"
          subtitulo="Del consolidado en Excel; para periodos nuevos aún no hay fuente (ver spec 009)"
          datos={estudiantes}
        />
      </section>

      <TablaCuadros cuadros={cuadros} />
      <TablaProgramas filas={programas} periodos={periodos} />
      <TablaModalidad datos={modalidades} periodos={periodos} />
    </main>
  );
}

function Fuente({ c }: { c: CuadroComparable }) {
  if (c.fuente === "sistema") return <Insignia tono="verde">Sistema</Insignia>;
  if (c.fuente === "historico") return <Insignia tono="neutro">Excel</Insignia>;
  return <span className="text-[10px] text-[var(--color-texto-suave)]">sin datos</span>;
}

function TablaCuadros({ cuadros }: { cuadros: CuadroComparable[] }) {
  // La variación es entre los dos últimos periodos con datos: el periodo en
  // curso suele estar vacío hasta que se aprueba algo, y contra un vacío
  // todo saldría "—".
  const [ultimo = cuadros[cuadros.length - 1], previo] = cuadros.filter((c) => c.fuente !== "vacio").reverse();
  return (
    <section className="tarjeta tarjeta-sombra mb-6 overflow-hidden">
      <h2 className="border-b border-[var(--color-borde)] px-5 py-3 text-sm font-bold text-[var(--color-texto)]">
        Cuadro resumen por periodo
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[60rem] text-sm">
          <thead>
            <tr className="border-b border-[var(--color-borde)] bg-cecar-50/60 text-[11px] font-semibold tracking-wide text-cecar-800 uppercase">
              <th scope="col" className="sticky left-0 bg-cecar-50 px-5 py-3 text-left">
                Ítem
              </th>
              {cuadros.map((c) => (
                <th key={c.periodo} scope="col" className="px-3 py-3 text-right" title={c.etiqueta}>
                  <span className="block">{c.periodo}</span>
                  <span className="mt-1 block normal-case">
                    <Fuente c={c} />
                  </span>
                </th>
              ))}
              <th scope="col" className="px-5 py-3 text-right">
                Variación
              </th>
            </tr>
          </thead>
          <tbody>
            {ultimo.bloques.map((b, i) => (
              <Fragment key={b.titulo}>
                <tr className="border-t-2 border-[var(--color-borde)]">
                  <th
                    scope="colgroup"
                    colSpan={cuadros.length + 2}
                    className="bg-[var(--color-superficie)] px-5 py-2 text-left text-[11px] font-bold tracking-wide text-[var(--color-texto-suave)] uppercase"
                  >
                    {b.titulo}
                  </th>
                </tr>
                {b.filas.map((f, j) => {
                  const ahora = totalDe(ultimo, i, j);
                  const antes = previo ? totalDe(previo, i, j) : null;
                  return (
                    <tr key={f.etiqueta} className={`border-t border-[var(--color-borde)] ${f.subtotal ? "bg-cecar-50/40 font-semibold" : ""}`}>
                      <th scope="row" className={`sticky left-0 px-5 py-2.5 text-left font-medium text-[var(--color-texto)] ${f.subtotal ? "bg-cecar-50" : "bg-white"}`}>
                        {f.etiqueta}
                      </th>
                      {cuadros.map((c) => (
                        <td key={c.periodo} className="px-3 py-2.5 text-right tabular-nums text-[var(--color-texto)]">
                          {cifra(totalDe(c, i, j))}
                        </td>
                      ))}
                      <td className="px-5 py-2.5 text-right font-semibold tabular-nums text-[var(--color-texto)]">
                        {signo(ahora === null || antes === null ? null : ahora - antes)}
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
        La variación compara {ultimo.periodo} con {previo?.periodo ?? "el periodo anterior con datos"}. «—» es
        sin dato: el Excel no traía esa fila en ese periodo. Las cifras del Excel se muestran tal cual,
        incluidas las que la spec 009 señala como dudosas.
      </p>
    </section>
  );
}

const COLUMNAS: { clave: keyof ConteoDocentes; texto: string }[] = [
  { clave: "tc", texto: "TC" },
  { clave: "mt", texto: "MT" },
  { clave: "cat", texto: "CAT" },
  { clave: "tutor", texto: "Tutor" },
  { clave: "total", texto: "Total" },
];

/**
 * Por programa: el total de cada periodo y, para los dos últimos con datos,
 * la variación por dedicación, como la columna VARIACIÓN del Excel.
 */
function TablaProgramas({ filas, periodos }: { filas: FilaPrograma[]; periodos: string[] }) {
  // Como en el cuadro: los dos últimos periodos en que algún programa tiene datos.
  const [ultimo, penultimo] = periodos
    .filter((p) => filas.some((f) => f.periodos[p]?.fuente !== "vacio"))
    .reverse();
  return (
    <section className="tarjeta tarjeta-sombra mb-6 overflow-hidden">
      <h2 className="border-b border-[var(--color-borde)] px-5 py-3 text-sm font-bold text-[var(--color-texto)]">
        Docentes por programa
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[70rem] text-sm">
          <thead>
            <tr className="border-b border-[var(--color-borde)] bg-cecar-50/60 text-[11px] font-semibold tracking-wide text-cecar-800 uppercase">
              <th scope="col" className="sticky left-0 bg-cecar-50 px-5 py-3 text-left">
                Programa
              </th>
              {periodos.map((p) => (
                <th key={p} scope="col" className="px-3 py-3 text-right">
                  {p}
                </th>
              ))}
              {penultimo &&
                COLUMNAS.map((c) => (
                  <th key={c.clave} scope="col" className="bg-cecar-100/50 px-3 py-3 text-right" title={`Variación ${penultimo} → ${ultimo}`}>
                    Δ {c.texto}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {MODALIDADES.map((m) => {
              const deLa = filas.filter((f) => f.modalidad === m);
              if (deLa.length === 0) return null;
              return (
                <Fragment key={m}>
                  <tr className="border-t-2 border-[var(--color-borde)]">
                    <th
                      scope="colgroup"
                      colSpan={periodos.length + 1 + (penultimo ? COLUMNAS.length : 0)}
                      className="bg-[var(--color-superficie)] px-5 py-2 text-left text-[11px] font-bold tracking-wide text-[var(--color-texto-suave)] uppercase"
                    >
                      {ETIQUETA_MODALIDAD[m]}
                    </th>
                  </tr>
                  {deLa.map((f) => (
                    <tr key={`${f.modalidad}-${f.nombre}`} className="border-t border-[var(--color-borde)]">
                      <th scope="row" className="sticky left-0 bg-white px-5 py-2.5 text-left font-medium text-[var(--color-texto)]">
                        {f.programa ? legible(f.programa) : f.nombre}
                        {!f.programa && (
                          <span className="ml-2">
                            <Insignia tono="neutro">solo en Excel</Insignia>
                          </span>
                        )}
                      </th>
                      {periodos.map((p) => (
                        <td key={p} className="px-3 py-2.5 text-right tabular-nums text-[var(--color-texto)]">
                          {cifra(f.periodos[p]?.total ?? null)}
                        </td>
                      ))}
                      {penultimo &&
                        COLUMNAS.map((c) => {
                          const a = f.periodos[ultimo]?.[c.clave] ?? null;
                          const b = f.periodos[penultimo]?.[c.clave] ?? null;
                          return (
                            <td key={c.clave} className="bg-cecar-50/30 px-3 py-2.5 text-right font-semibold tabular-nums text-[var(--color-texto)]">
                              {signo(a === null || b === null ? null : a - b)}
                            </td>
                          );
                        })}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-[var(--color-borde)] px-5 py-3 text-xs leading-relaxed text-[var(--color-texto-suave)]">
        «Solo en Excel»: programas del consolidado sin equivalente seguro en el catálogo (se muestran con su
        nombre del Excel). Hora labor se cuenta con cátedra.
      </p>
    </section>
  );
}

function TablaModalidad({
  datos,
  periodos,
}: {
  datos: Record<string, Record<string, ConteoDocentes>>;
  periodos: string[];
}) {
  return (
    <section className="tarjeta tarjeta-sombra overflow-hidden">
      <h2 className="border-b border-[var(--color-borde)] px-5 py-3 text-sm font-bold text-[var(--color-texto)]">
        Docentes por modalidad y dedicación
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[50rem] text-sm">
          <thead>
            <tr className="border-b border-[var(--color-borde)] bg-cecar-50/60 text-[11px] font-semibold tracking-wide text-cecar-800 uppercase">
              <th scope="col" className="sticky left-0 bg-cecar-50 px-5 py-3 text-left">
                Modalidad
              </th>
              <th scope="col" className="px-3 py-3 text-left">
                Dedicación
              </th>
              {periodos.map((p) => (
                <th key={p} scope="col" className="px-3 py-3 text-right">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODALIDADES.map((m) =>
              COLUMNAS.map((c, i) => (
                <tr key={`${m}-${c.clave}`} className={`border-t border-[var(--color-borde)] ${c.clave === "total" ? "bg-cecar-50/40 font-semibold" : ""}`}>
                  {i === 0 && (
                    <th scope="rowgroup" rowSpan={COLUMNAS.length} className="sticky left-0 bg-white px-5 py-2.5 text-left align-top font-medium text-[var(--color-texto)]">
                      {ETIQUETA_MODALIDAD[m]}
                    </th>
                  )}
                  <td className="px-3 py-2 text-[var(--color-texto-suave)]">{c.texto}</td>
                  {periodos.map((p) => (
                    <td key={p} className="px-3 py-2 text-right tabular-nums text-[var(--color-texto)]">
                      {cifra(datos[m]?.[p]?.[c.clave] ?? null)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
