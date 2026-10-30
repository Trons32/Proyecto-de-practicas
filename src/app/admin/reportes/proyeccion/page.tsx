"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import { FACULTADES, PROGRAMAS } from "@/lib/catalogos";
import { periodoActual, type CursoBase } from "@/lib/tipos";
import { legible } from "@/lib/resumen";
import { fechaHoraLegible } from "@/lib/convocatoria";
import { proyeccion, type FilaProyeccion, type ResumenCursos } from "@/lib/reportes";
import { guardarLibro } from "@/lib/exportar-cuadro";
import { libroProyeccion } from "@/lib/exportar-comparativo";
import { sileo } from "@/lib/toast";
import Encabezado from "@/components/Encabezado";
import { GraficaBarras } from "@/components/Graficas";
import { Boton, Campo, InsigniaEstado, Seleccion, TarjetaStat } from "@/components/ui";
import { FiAlertTriangle, FiArrowLeft, FiBookOpen, FiClock, FiDownload, FiTrendingUp } from "@/components/iconos";

const formato = new Intl.NumberFormat("es-CO");
const signo = (v: number) => (v > 0 ? `+${formato.format(v)}` : formato.format(v));

const volver = (
  <Link
    href="/admin/reportes"
    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-texto-suave)] transition hover:text-cecar-700"
  >
    <FiArrowLeft aria-hidden /> Volver a reportes
  </Link>
);

const MEDIDAS: { clave: keyof ResumenCursos; texto: string }[] = [
  { clave: "cursos", texto: "Cursos" },
  { clave: "horas", texto: "Horas" },
  { clave: "estudiantes", texto: "Estudiantes" },
  { clave: "gruposPrimerSemestre", texto: "Grupos sem. I" },
  { clave: "estudiantesPrimerSemestre", texto: "Est. sem. I" },
];

/**
 * La hoja PROYECCIÓN del consolidado (SPEC-009): por programa, lo aprobado
 * la primera vez (proyectado) contra lo vigente (ajustado), con los cursos
 * que se cerraron y las horas que se redujeron.
 */
export default function ProyeccionPagina() {
  const asignaciones = useAsignacionStore((s) => s.asignaciones);
  const hidratado = useAsignacionStore((s) => s.hidratado);

  const [periodo, setPeriodo] = useState(periodoActual());
  const [facultad, setFacultad] = useState("");
  const [programa, setPrograma] = useState("");
  const [descargando, setDescargando] = useState(false);

  const periodos = useMemo(
    () => [...new Set([periodoActual(), ...asignaciones.map((a) => a.periodo)])].sort().reverse(),
    [asignaciones]
  );
  const programas = useMemo(
    () => PROGRAMAS.filter((p) => !facultad || p.facultad === facultad).map((p) => p.nombre),
    [facultad]
  );
  const p = useMemo(
    () => proyeccion(asignaciones, { periodo, facultad, programa }),
    [asignaciones, periodo, facultad, programa]
  );

  if (!hidratado) {
    return (
      <main className="px-4 py-6 sm:p-8">
        <Encabezado titulo="Proyección" descripcion="Cargando…" volver={volver} />
      </main>
    );
  }

  const { proyectado, ajustado } = p.total;

  const descargar = async () => {
    setDescargando(true);
    try {
      const buffer = await libroProyeccion({
        periodo,
        ambito: programa ? legible(programa) : facultad ? legible(facultad) : "Todos los programas",
        proyeccion: p,
        nombre: legible,
      });
      const nombre = `proyeccion-${periodo}.xlsx`;
      guardarLibro(buffer, nombre);
      sileo.success({ title: "Proyección descargada", description: nombre });
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
        titulo="Proyección"
        descripcion={`Periodo ${periodo} · lo aprobado inicialmente frente a lo vigente`}
        volver={volver}
      >
        <Boton variante="secundario" onClick={descargar} disabled={p.filas.length === 0 || descargando}>
          <FiDownload aria-hidden /> {descargando ? "Generando…" : "Descargar Excel"}
        </Boton>
      </Encabezado>

      <section className="tarjeta tarjeta-sombra mb-6 grid gap-4 p-5 sm:grid-cols-3">
        <Campo etiqueta="Periodo">
          <Seleccion opciones={periodos} placeholder="Seleccione…" value={periodo} onChange={(e) => setPeriodo(e.target.value || periodoActual())} />
        </Campo>
        <Campo etiqueta="Facultad">
          <Seleccion
            opciones={FACULTADES}
            placeholder="Todas"
            value={facultad}
            onChange={(e) => {
              setFacultad(e.target.value);
              setPrograma("");
            }}
          />
        </Campo>
        <Campo etiqueta="Programa">
          <Seleccion opciones={programas} placeholder="Todos" value={programa} onChange={(e) => setPrograma(e.target.value)} />
        </Campo>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <TarjetaStat
          etiqueta={`Cursos: ${formato.format(proyectado.cursos)} proyectados`}
          valor={formato.format(ajustado.cursos)}
          tono="verde"
          icono={<FiBookOpen className="h-6 w-6" aria-hidden />}
        />
        <TarjetaStat
          etiqueta="Cursos cerrados"
          valor={formato.format(p.total.cerrados)}
          tono="lima"
          icono={<FiTrendingUp className="h-6 w-6" aria-hidden />}
        />
        <TarjetaStat
          etiqueta="Horas reducidas"
          valor={formato.format(proyectado.horas - ajustado.horas)}
          tono="verde"
          icono={<FiClock className="h-6 w-6" aria-hidden />}
        />
      </section>

      {p.sinLineaBase.length > 0 && (
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200 ring-inset">
          <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {p.sinLineaBase.length === 1 ? "1 asignación" : `${p.sinLineaBase.length} asignaciones`} se
            aprobaron antes de que el sistema guardara la línea base y no entran en la proyección:{" "}
            {p.sinLineaBase.map((a) => legible(a.programa)).join(", ")}.
          </span>
        </p>
      )}

      {p.filas.length === 0 ? (
        <section className="tarjeta p-8 text-center text-sm text-[var(--color-texto-suave)]">
          No hay asignaciones aprobadas en {periodo} con estos filtros. La proyección se forma al aprobar
          cada asignación por primera vez.
        </section>
      ) : (
        <>
          <TablaProyeccion filas={p.filas} total={p.total} />
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <GraficaBarras
              titulo="Horas reducidas por programa"
              subtitulo="Horas proyectadas menos horas vigentes"
              datos={p.filas.map((f) => ({ etiqueta: legible(f.programa), valor: f.proyectado.horas - f.ajustado.horas }))}
            />
            <GraficaBarras
              titulo="Cursos cerrados por programa"
              subtitulo="Aprobados inicialmente y ya no vigentes"
              datos={p.filas.map((f) => ({ etiqueta: legible(f.programa), valor: f.cerrados.length }))}
            />
          </section>
          <Detalle filas={p.filas} />
        </>
      )}
    </main>
  );
}

function TablaProyeccion({ filas, total }: { filas: FilaProyeccion[]; total: ReturnType<typeof proyeccion>["total"] }) {
  const celdas = (r: ResumenCursos, tono: string) =>
    MEDIDAS.map((m) => (
      <td key={m.clave} className={`px-3 py-2.5 text-right tabular-nums text-[var(--color-texto)] ${tono}`}>
        {formato.format(r[m.clave])}
      </td>
    ));
  const encabezados = (prefijo: string, tono: string) =>
    MEDIDAS.map((m) => (
      <th key={`${prefijo}-${m.clave}`} scope="col" className={`px-3 py-3 text-right ${tono}`}>
        {m.texto}
      </th>
    ));

  return (
    <section className="tarjeta tarjeta-sombra overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[78rem] text-sm">
          <thead>
            <tr className="text-[11px] font-semibold tracking-wide text-cecar-800 uppercase">
              <th rowSpan={2} scope="col" className="sticky left-0 border-b border-[var(--color-borde)] bg-cecar-50 px-5 py-3 text-left align-bottom">
                Programa
              </th>
              <th colSpan={MEDIDAS.length} scope="colgroup" className="border-b border-[var(--color-borde)] bg-cecar-50/60 px-3 py-2 text-center">
                Proyectado (primera aprobación)
              </th>
              <th colSpan={MEDIDAS.length} scope="colgroup" className="border-b border-[var(--color-borde)] bg-cecar-100/60 px-3 py-2 text-center">
                Ajustado (vigente)
              </th>
              <th colSpan={3} scope="colgroup" className="border-b border-[var(--color-borde)] bg-cecar-50/60 px-3 py-2 text-center">
                Diferencia
              </th>
            </tr>
            <tr className="border-b border-[var(--color-borde)] text-[11px] font-semibold tracking-wide text-cecar-800 uppercase">
              {encabezados("p", "bg-cecar-50/60")}
              {encabezados("a", "bg-cecar-100/60")}
              <th scope="col" className="bg-cecar-50/60 px-3 py-3 text-right">Cerrados</th>
              <th scope="col" className="bg-cecar-50/60 px-3 py-3 text-right">Nuevos</th>
              <th scope="col" className="bg-cecar-50/60 px-3 py-3 text-right">Horas</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.asignacionId} className="border-t border-[var(--color-borde)]">
                <th scope="row" className="sticky left-0 bg-white px-5 py-2.5 text-left font-medium text-[var(--color-texto)]">
                  <Link href={`/asignacion/${f.asignacionId}`} className="hover:text-cecar-700 hover:underline">
                    {legible(f.programa)}
                  </Link>
                  <span className="mt-1 flex items-center gap-2 text-xs font-normal text-[var(--color-texto-suave)]">
                    <InsigniaEstado estado={f.estado} /> base del {fechaHoraLegible(f.fechaBase)}
                  </span>
                </th>
                {celdas(f.proyectado, "")}
                {celdas(f.ajustado, "bg-cecar-50/30")}
                <td className="px-3 py-2.5 text-right tabular-nums text-[var(--color-texto)]">{f.cerrados.length}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-[var(--color-texto)]">{f.nuevos.length}</td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-[var(--color-texto)]">
                  {signo(f.ajustado.horas - f.proyectado.horas)}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-[var(--color-borde)] bg-cecar-50/40 font-semibold">
              <th scope="row" className="sticky left-0 bg-cecar-50 px-5 py-2.5 text-left text-[var(--color-texto)]">
                Total
              </th>
              {celdas(total.proyectado, "")}
              {celdas(total.ajustado, "")}
              <td className="px-3 py-2.5 text-right tabular-nums">{total.cerrados}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{total.nuevos}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{signo(total.ajustado.horas - total.proyectado.horas)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="border-t border-[var(--color-borde)] px-5 py-3 text-xs leading-relaxed text-[var(--color-texto-suave)]">
        Estudiantes es la suma de los estudiantes de cada curso: cupos, no personas. Grupos sem. I son los
        grupos distintos de cursos de primer semestre.
      </p>
    </section>
  );
}

function ListaCursos({ titulo, cursos }: { titulo: string; cursos: CursoBase[] }) {
  if (cursos.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold tracking-wide text-[var(--color-texto-suave)] uppercase">{titulo}</p>
      <ul className="space-y-1 text-sm">
        {cursos.map((k) => (
          <li key={k.id} className="flex flex-wrap gap-x-3 text-[var(--color-texto)]">
            <span className="font-medium">{k.nombreCurso || k.codigoCurso || "Curso sin nombre"}</span>
            <span className="text-[var(--color-texto-suave)]">
              {[k.semestre && `Sem. ${k.semestre}`, k.grupo && `Grupo ${k.grupo}`, k.docente, `${k.intensidadHoraria ?? 0} h`, `${k.estudiantes ?? 0} est.`]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Detalle({ filas }: { filas: FilaProyeccion[] }) {
  const conCambios = filas.filter((f) => f.cerrados.length + f.nuevos.length > 0);
  if (conCambios.length === 0) return null;
  return (
    <section className="tarjeta tarjeta-sombra mt-6 divide-y divide-[var(--color-borde)]">
      <h2 className="px-5 py-3 text-sm font-bold text-[var(--color-texto)]">Cursos que cambiaron</h2>
      {conCambios.map((f) => (
        <details key={f.asignacionId} className="group px-5 py-3">
          <summary className="cursor-pointer text-sm font-medium text-[var(--color-texto)]">
            {legible(f.programa)} — {f.cerrados.length} cerrados, {f.nuevos.length} nuevos
          </summary>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <ListaCursos titulo="Cerrados" cursos={f.cerrados} />
            <ListaCursos titulo="Nuevos" cursos={f.nuevos} />
          </div>
        </details>
      ))}
    </section>
  );
}
