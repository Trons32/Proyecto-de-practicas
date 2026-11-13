"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
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
import type { Modalidad } from "@/lib/historicos";
import {
  coberturaImportada,
  comparativoCompleto,
  comparativoPorModalidad,
  comparativoPorPrograma,
  docentesPorDedicacion,
  docentesVsEstudiantes,
  ETIQUETA_ALCANCE,
  ETIQUETA_MODALIDAD,
  MODALIDADES,
  periodosDeVariacion,
  totalDe,
  totalProgramas,
  type Alcance,
  type ConteoDocentes,
  type CuadroComparable,
  type FilaDocentesEstudiantes,
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

type Pestana = "resumen" | Modalidad | "modalidades" | "estudiantes";

/**
 * Las pestañas siguen el orden de la hoja COMPARATIVO ESTADÍSTICO del Excel:
 * el cuadro, una tabla por modalidad con su variación al lado, la tabla por
 * modalidad y la de docentes contra estudiantes.
 */
const PESTANAS: { clave: Pestana; texto: string }[] = [
  { clave: "resumen", texto: "Resumen por periodo" },
  { clave: "PRESENCIAL", texto: "Presencial" },
  { clave: "DISTANCIA", texto: "A distancia" },
  { clave: "VIRTUAL", texto: "Virtual" },
  { clave: "modalidades", texto: "Por modalidad" },
  { clave: "estudiantes", texto: "Docentes vs. estudiantes" },
];

const COLUMNAS: { clave: keyof ConteoDocentes; texto: string }[] = [
  { clave: "tc", texto: "TC" },
  { clave: "mt", texto: "MT" },
  { clave: "cat", texto: "CAT" },
  { clave: "tutor", texto: "Tutor" },
  { clave: "total", texto: "Total" },
];

/** Las cuatro dedicaciones, en el orden de la paleta validada. */
const DEDICACIONES = COLUMNAS.filter((c) => c.clave !== "total");

/** El Excel no tiene columna de tutor en presencial: ahí no hay tutores. */
const columnasDe = (m: Modalidad) => (m === "PRESENCIAL" ? COLUMNAS.filter((c) => c.clave !== "tutor") : COLUMNAS);

const CABECERA =
  "border-b border-[var(--color-borde)] bg-cecar-50/60 text-[11px] font-semibold tracking-wide text-cecar-800 uppercase";
const CELDA = "px-3 py-2.5 text-right tabular-nums text-[var(--color-texto)]";

const volver = (
  <Link
    href="/admin/reportes"
    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-texto-suave)] transition hover:text-cecar-700"
  >
    <FiArrowLeft aria-hidden /> Volver a reportes
  </Link>
);

/**
 * El COMPARATIVO ESTADÍSTICO del consolidado (SPEC-009, completado en
 * SPEC-016): sus 10 tablas y 6 gráficas. Los periodos anteriores al sistema
 * salen del histórico cargado del Excel; cada columna dice de dónde viene.
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
  const [pestana, setPestana] = useState<Pestana>("resumen");
  const [descargando, setDescargando] = useState(false);

  const cuadros = useMemo(
    () => comparativoCompleto(asignaciones, { periodo: hasta, alcance }, HISTORICO_CUADRO, config, HISTORICO_PROGRAMAS),
    [asignaciones, hasta, alcance, config]
  );
  const periodos = useMemo(() => cuadros.map((c) => c.periodo), [cuadros]);
  const programas = useMemo(
    () => comparativoPorPrograma(asignaciones, periodos, alcance, HISTORICO_PROGRAMAS, PROGRAMAS),
    [asignaciones, periodos, alcance]
  );
  // Periodos con asignaciones importadas (SPEC-017) y cuánto falta en cada uno.
  const coberturas = useMemo(
    () =>
      periodos
        .map((periodo) => ({ periodo, ...coberturaImportada(asignaciones, periodo, HISTORICO_PROGRAMAS) }))
        .filter((c) => c.importados.length > 0),
    [asignaciones, periodos]
  );
  const modalidades = useMemo(
    () =>
      comparativoPorModalidad(programas, periodos, HISTORICO_MODALIDAD, new Set(coberturas.filter((c) => c.completo).map((c) => c.periodo))),
    [programas, periodos, coberturas]
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
  // Del sistema no sale: la suma de estudiantes de los cursos cuenta a cada
  // persona varias veces (ver la spec 009, "pendiente con el cliente").
  const estudiantes = conDatos.map((c) => ({
    periodo: c.periodo,
    estudiantes: HISTORICO_ESTUDIANTES.find((e) => e.periodo === c.periodo)?.estudiantes ?? null,
  }));
  const conteoPeriodo = conDatos.map((c) => docentesPorDedicacion(c));

  const descargar = async () => {
    setDescargando(true);
    try {
      const buffer = await libroComparativo({
        bajada: `${conDatos[0]?.periodo ?? hasta} a ${hasta} · asignaciones del sistema: ${ETIQUETA_ALCANCE[alcance]}`,
        cuadros,
        programas,
        periodos,
        modalidades,
        estudiantes,
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
          las del sistema (<Insignia tono="verde">Sistema</Insignia>) o las importadas de un Excel de
          ese periodo (<Insignia tono="azul">Importado</Insignia>).
        </p>
      </section>

      {coberturas.some((c) => !c.completo) && (
        <section className="tarjeta mb-6 border-s-4 border-amber-500 p-5 text-sm">
          <h3 className="font-bold text-[var(--color-texto)]">Periodos importados a medias</h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-texto-suave)]">
            Mientras falte algún programa, el total del periodo sigue siendo el del consolidado; cada
            programa importado ya se ve con sus cifras en las tablas por programa.
          </p>
          <ul className="mt-3 space-y-1.5 text-xs">
            {coberturas
              .filter((c) => !c.completo)
              .map((c) => (
                <li key={c.periodo}>
                  <strong className="tabular-nums">{c.periodo}</strong>: {c.importados.length} de{" "}
                  {c.esperados.length || "?"} programas.
                  {c.faltan.length > 0 && (
                    <span className="text-[var(--color-texto-suave)]"> Faltan: {c.faltan.join(", ")}.</span>
                  )}
                </li>
              ))}
          </ul>
        </section>
      )}

      <div role="tablist" aria-label="Secciones del comparativo" className="mb-6 flex flex-wrap gap-2">
        {PESTANAS.map((p) => (
          <button
            key={p.clave}
            type="button"
            role="tab"
            aria-selected={pestana === p.clave}
            onClick={() => setPestana(p.clave)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              pestana === p.clave
                ? "border-cecar-600 bg-cecar-600 text-white"
                : "border-[var(--color-borde)] bg-white text-[var(--color-texto-suave)] hover:border-cecar-400 hover:text-cecar-700"
            }`}
          >
            {p.texto}
          </button>
        ))}
      </div>

      {pestana === "resumen" && (
        <>
          <section className="mb-6 grid gap-6 lg:grid-cols-2" aria-label="Gráficas del resumen">
            <GraficaColumnas titulo="Total docentes por periodo académico" subtitulo="TC, MT, cátedra y tutores" datos={serie(0, 0)} />
            <GraficaColumnas titulo="Horas de docencia directa por periodo" subtitulo="Horas semanales de clase" datos={serie(0, 1)} />
            <GraficaColumnas titulo="Descargas de investigación por periodo" subtitulo="Horas semanales" datos={serie(0, 6)} />
            <GraficaAgrupada
              titulo="Docentes TC, MT, CAT y tutor por periodo"
              subtitulo="Hora labor se cuenta con cátedra"
              categorias={conDatos.map((c) => c.periodo)}
              series={DEDICACIONES.map((d) => ({ nombre: d.texto, valores: conteoPeriodo.map((x) => x[d.clave]) }))}
            />
          </section>
          <TablaCuadros cuadros={cuadros} />
          <TablaPorPeriodo cuadros={conDatos} />
        </>
      )}

      {MODALIDADES.map((m) => {
        if (pestana !== m) return null;
        const deLa = programas.filter((f) => f.modalidad === m);
        return (
          <Fragment key={m}>
            <TablaProgramasModalidad modalidad={m} filas={deLa} periodos={periodos} />
            <TablaVariacion modalidad={m} filas={deLa} periodos={periodos} />
          </Fragment>
        );
      })}

      {pestana === "modalidades" && (
        <>
          <section className="mb-6" aria-label="Gráfica por modalidad">
            <GraficaAgrupada
              titulo="Docentes por modalidad y periodo"
              subtitulo="Total de docentes"
              categorias={periodosModalidad}
              series={MODALIDADES.map((m) => ({
                nombre: ETIQUETA_MODALIDAD[m],
                valores: periodosModalidad.map((p) => modalidades[m][p]?.total ?? null),
              }))}
            />
          </section>
          <TablaModalidad datos={modalidades} periodos={periodos} />
        </>
      )}

      {pestana === "estudiantes" && (
        <>
          {/* Docentes y estudiantes van en gráficas separadas: con un solo eje,
              6.000 estudiantes aplastan a 400 docentes; con dos ejes, el cruce
              de las curvas lo decide la escala elegida, no los datos. */}
          <section className="mb-6 grid gap-6 lg:grid-cols-2" aria-label="Docentes vs. estudiantes">
            <GraficaColumnas titulo="Docentes por periodo" subtitulo="Comparativo histórico docentes vs. estudiantes" datos={serie(0, 0)} />
            <GraficaColumnas
              titulo="Estudiantes por periodo"
              subtitulo="Del consolidado en Excel; para periodos nuevos aún no hay fuente (ver spec 009)"
              datos={estudiantes.map((e) => ({ etiqueta: e.periodo, valor: e.estudiantes }))}
            />
          </section>
          <TablaEstudiantes filas={docentesVsEstudiantes(cuadros, estudiantes)} />
        </>
      )}
    </main>
  );
}

function Fuente({ c }: { c: CuadroComparable }) {
  if (c.fuente === "sistema") return <Insignia tono="verde">Sistema</Insignia>;
  if (c.fuente === "importado") return <Insignia tono="azul">Importado</Insignia>;
  if (c.fuente === "historico") return <Insignia tono="neutro">Excel</Insignia>;
  return <span className="text-[10px] text-[var(--color-texto-suave)]">sin datos</span>;
}

function Tarjeta({ titulo, nota, children }: { titulo: string; nota?: ReactNode; children?: ReactNode }) {
  return (
    <section className="tarjeta tarjeta-sombra mb-6 overflow-hidden">
      <h2 className="border-b border-[var(--color-borde)] px-5 py-3 text-sm font-bold text-[var(--color-texto)]">{titulo}</h2>
      {children && <div className="overflow-x-auto">{children}</div>}
      {nota && (
        <p className="border-t border-[var(--color-borde)] px-5 py-3 text-xs leading-relaxed text-[var(--color-texto-suave)]">
          {nota}
        </p>
      )}
    </section>
  );
}

const nombreDe = (f: FilaPrograma) => (f.programa ? legible(f.programa) : f.nombre);

/** Un periodo sin datos del programa se muestra como ausente, no como ceros. */
const valorDe = (f: FilaPrograma, p: string): ConteoDocentes | undefined =>
  f.periodos[p]?.fuente === "vacio" ? undefined : f.periodos[p];

/** Agrupa por facultad conservando el orden de llegada, como el Excel. */
function porFacultad(filas: FilaPrograma[]): [string, FilaPrograma[]][] {
  const grupos = new Map<string, FilaPrograma[]>();
  for (const f of filas) {
    const clave = f.facultad.trim() || "Sin facultad";
    grupos.set(clave, [...(grupos.get(clave) ?? []), f]);
  }
  return [...grupos];
}

function TablaCuadros({ cuadros }: { cuadros: CuadroComparable[] }) {
  // La variación es entre los dos últimos periodos con datos: el periodo en
  // curso suele estar vacío hasta que se aprueba algo, y contra un vacío
  // todo saldría "—".
  const [ultimo = cuadros[cuadros.length - 1], previo] = cuadros.filter((c) => c.fuente !== "vacio").reverse();
  return (
    <Tarjeta
      titulo="Cuadro resumen asignación académica por periodo"
      nota={
        <>
          La variación compara {ultimo.periodo} con {previo?.periodo ?? "el periodo anterior con datos"}. «—» es sin
          dato: el Excel no traía esa fila en ese periodo. Las cifras del Excel se muestran tal cual, incluidas las que
          la spec 009 señala como dudosas.
        </>
      }
    >
      <table className="w-full min-w-[60rem] text-sm">
        <thead>
          <tr className={CABECERA}>
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
                      <td key={c.periodo} className={CELDA}>
                        {cifra(totalDe(c, i, j))}
                      </td>
                    ))}
                    <td className={`${CELDA} px-5 font-semibold`}>{signo(ahora === null || antes === null ? null : ahora - antes)}</td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </Tarjeta>
  );
}

/** COMPARATIVO DOCENTE POR PERIODO ACADÉMICO: el total y su desglose por dedicación. */
function TablaPorPeriodo({ cuadros }: { cuadros: CuadroComparable[] }) {
  return (
    <Tarjeta titulo="Total docentes por periodo académico (presencial, a distancia y virtual)" nota="Hora labor se cuenta con cátedra; tutores a distancia y virtuales, juntos.">
      <table className="w-full min-w-[40rem] text-sm">
        <thead>
          <tr className={CABECERA}>
            <th scope="col" className="px-5 py-3 text-left">
              Periodo
            </th>
            {COLUMNAS.map((c) => (
              <th key={c.clave} scope="col" className="px-3 py-3 text-right">
                {c.texto}
              </th>
            ))}
            <th scope="col" className="px-5 py-3 text-right">
              Fuente
            </th>
          </tr>
        </thead>
        <tbody>
          {cuadros.map((c) => {
            const v = docentesPorDedicacion(c);
            return (
              <tr key={c.periodo} className="border-t border-[var(--color-borde)]">
                <th scope="row" className="px-5 py-2.5 text-left font-medium text-[var(--color-texto)]">
                  {c.periodo}
                </th>
                {COLUMNAS.map((k) => (
                  <td key={k.clave} className={`${CELDA} ${k.clave === "total" ? "font-semibold" : ""}`}>
                    {cifra(v[k.clave])}
                  </td>
                ))}
                <td className="px-5 py-2.5 text-right">
                  <Fuente c={c} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Tarjeta>
  );
}

/**
 * Las tablas por modalidad del Excel: facultad, programa y, por periodo, los
 * docentes por dedicación. Ocho periodos por cinco columnas no caben en
 * pantalla, así que arranca con el total y el detalle se pide.
 */
function TablaProgramasModalidad({ modalidad, filas, periodos }: { modalidad: Modalidad; filas: FilaPrograma[]; periodos: string[] }) {
  const [detalle, setDetalle] = useState(false);
  const titulo = `Comparativo estadístico · ${ETIQUETA_MODALIDAD[modalidad].toLowerCase()}: docentes por programa`;
  if (filas.length === 0) return <Tarjeta titulo={titulo} nota="No hay programas de esta modalidad con datos." />;

  const columnas = detalle ? columnasDe(modalidad) : COLUMNAS.filter((c) => c.clave === "total");
  const totales = totalProgramas(filas, periodos);
  const borde = (k: number) => (k === 0 ? "border-l border-[var(--color-borde)]" : "");
  return (
    <Tarjeta
      titulo={titulo}
      nota={
        <>
          «Total general» suma los programas que se muestran; en los periodos del Excel puede diferir de la tabla por
          modalidad, que copia la cifra del propio Excel. Hora labor se cuenta con cátedra.{" "}
          <button type="button" onClick={() => setDetalle(!detalle)} className="font-semibold text-cecar-700 underline">
            {detalle ? "Ver solo totales" : "Ver por dedicación"}
          </button>
        </>
      }
    >
      <table className="w-full min-w-[60rem] text-sm">
        <thead>
          <tr className={CABECERA}>
            <th scope="col" rowSpan={detalle ? 2 : 1} className="px-5 py-3 text-left">
              Facultad
            </th>
            <th scope="col" rowSpan={detalle ? 2 : 1} className="px-3 py-3 text-left">
              Programa
            </th>
            {periodos.map((p) => (
              <th key={p} scope="colgroup" colSpan={columnas.length} className={`px-3 py-3 text-center ${borde(0)}`}>
                {p}
              </th>
            ))}
          </tr>
          {detalle && (
            <tr className={CABECERA}>
              {periodos.map((p) =>
                columnas.map((c, k) => (
                  <th key={`${p}-${c.clave}`} scope="col" className={`px-2 py-2 text-right ${borde(k)}`}>
                    {c.texto}
                  </th>
                ))
              )}
            </tr>
          )}
        </thead>
        <tbody>
          {porFacultad(filas).map(([facultad, deLa]) =>
            deLa.map((f, i) => (
              <tr key={f.nombre} className="border-t border-[var(--color-borde)]">
                {i === 0 && (
                  <th scope="rowgroup" rowSpan={deLa.length} className="px-5 py-2.5 text-left align-top text-xs font-semibold text-[var(--color-texto-suave)]">
                    {facultad}
                  </th>
                )}
                <th scope="row" className="px-3 py-2.5 text-left font-medium text-[var(--color-texto)]">
                  {nombreDe(f)}
                  {!f.programa && (
                    <span className="ml-2">
                      <Insignia tono="neutro">solo en Excel</Insignia>
                    </span>
                  )}
                </th>
                {periodos.map((p) =>
                  columnas.map((c, k) => (
                    <td key={`${p}-${c.clave}`} className={`${CELDA} ${borde(k)} ${c.clave === "total" ? "font-semibold" : ""}`}>
                      {cifra(valorDe(f, p)?.[c.clave] ?? null)}
                    </td>
                  ))
                )}
              </tr>
            ))
          )}
          <tr className="border-t-2 border-[var(--color-borde)] bg-cecar-50/40 font-semibold">
            <th scope="row" colSpan={2} className="px-5 py-2.5 text-left text-[var(--color-texto)]">
              Total general docentes
            </th>
            {periodos.map((p) =>
              columnas.map((c, k) => (
                <td key={`${p}-${c.clave}`} className={`${CELDA} ${borde(k)}`}>
                  {cifra(totales[p]?.[c.clave] ?? null)}
                </td>
              ))
            )}
          </tr>
        </tbody>
      </table>
    </Tarjeta>
  );
}

/** La tabla de variación que el Excel pone al lado de cada modalidad. */
function TablaVariacion({ modalidad, filas, periodos }: { modalidad: Modalidad; filas: FilaPrograma[]; periodos: string[] }) {
  const par = periodosDeVariacion(filas, periodos);
  if (!par) return null;
  const [previo, ultimo] = par;
  const columnas = columnasDe(modalidad);
  const totales = totalProgramas(filas, [previo, ultimo]);
  const delta = (a: ConteoDocentes | undefined, b: ConteoDocentes | undefined, c: keyof ConteoDocentes) => {
    const x = a?.[c] ?? null;
    const y = b?.[c] ?? null;
    return signo(x === null || y === null ? null : x - y);
  };
  return (
    <Tarjeta
      titulo={`Variación ${previo} → ${ultimo} · ${ETIQUETA_MODALIDAD[modalidad].toLowerCase()}`}
      nota="Positivo: el programa ganó docentes de esa dedicación; negativo: los perdió. «—»: falta el dato en alguno de los dos periodos."
    >
      <table className="w-full min-w-[40rem] text-sm">
        <thead>
          <tr className={CABECERA}>
            <th scope="col" className="px-5 py-3 text-left">
              Programa
            </th>
            <th scope="col" className="px-3 py-3 text-right">
              Total {previo}
            </th>
            <th scope="col" className="px-3 py-3 text-right">
              Total {ultimo}
            </th>
            {columnas.map((c) => (
              <th key={c.clave} scope="col" className="bg-cecar-100/50 px-3 py-3 text-right">
                Δ {c.texto}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.nombre} className="border-t border-[var(--color-borde)]">
              <th scope="row" className="px-5 py-2.5 text-left font-medium text-[var(--color-texto)]">
                {nombreDe(f)}
              </th>
              <td className={CELDA}>{cifra(valorDe(f, previo)?.total ?? null)}</td>
              <td className={CELDA}>{cifra(valorDe(f, ultimo)?.total ?? null)}</td>
              {columnas.map((c) => (
                <td key={c.clave} className={`${CELDA} bg-cecar-50/30 font-semibold`}>
                  {delta(valorDe(f, ultimo), valorDe(f, previo), c.clave)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t-2 border-[var(--color-borde)] bg-cecar-50/40 font-semibold">
            <th scope="row" className="px-5 py-2.5 text-left text-[var(--color-texto)]">
              Total
            </th>
            <td className={CELDA}>{cifra(totales[previo].total)}</td>
            <td className={CELDA}>{cifra(totales[ultimo].total)}</td>
            {columnas.map((c) => (
              <td key={c.clave} className={CELDA}>
                {delta(totales[ultimo], totales[previo], c.clave)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </Tarjeta>
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
    <Tarjeta titulo="Cuadro comparativo total docentes por modalidad y dedicación">
      <table className="w-full min-w-[50rem] text-sm">
        <thead>
          <tr className={CABECERA}>
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
    </Tarjeta>
  );
}

/** COMPARATIVO HISTÓRICO DOCENTES VS. ESTUDIANTES, con la relación que el Excel deja implícita. */
function TablaEstudiantes({ filas }: { filas: FilaDocentesEstudiantes[] }) {
  return (
    <Tarjeta
      titulo="Comparativo histórico docentes vs. estudiantes"
      nota="Estudiantes: cifra del consolidado en Excel. Para periodos del sistema aún no hay fuente de matrícula (spec 009), y la relación queda «—»."
    >
      <table className="w-full min-w-[32rem] text-sm">
        <thead>
          <tr className={CABECERA}>
            <th scope="col" className="px-5 py-3 text-left">
              Periodo académico
            </th>
            <th scope="col" className="px-3 py-3 text-right">
              No. de docentes
            </th>
            <th scope="col" className="px-3 py-3 text-right">
              No. de estudiantes
            </th>
            <th scope="col" className="px-5 py-3 text-right">
              Estudiantes por docente
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.periodo} className="border-t border-[var(--color-borde)]">
              <th scope="row" className="px-5 py-2.5 text-left font-medium text-[var(--color-texto)]">
                {f.periodo}
              </th>
              <td className={CELDA}>{cifra(f.docentes)}</td>
              <td className={CELDA}>{cifra(f.estudiantes)}</td>
              <td className={`${CELDA} px-5`}>{f.relacion === null ? "—" : f.relacion.toLocaleString("es-CO")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Tarjeta>
  );
}
