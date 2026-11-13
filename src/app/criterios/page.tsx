"use client";

import { useMemo, useState } from "react";
import Encabezado from "@/components/Encabezado";
import { Entrada, Seccion } from "@/components/ui";
import { FiSearch } from "@/components/iconos";
import { CRITERIOS, PERIODO_CRITERIOS, type Bloque, type SeccionCriterios } from "@/lib/criterios";

/**
 * Criterios de asignación académica (SPEC-015). Fuera de /admin a propósito:
 * el coordinador los necesita mientras arma su asignación, y GuardiaSesion
 * cierra todo /admin a quien no es administrador.
 */

/** Sin tildes ni mayúsculas: «tutor» debe encontrar «Tutores» y «práctica» «practica». */
const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function textoDe(b: Bloque): string {
  switch (b.tipo) {
    case "lista":
      return b.items.join(" ");
    case "tabla":
      return [b.titulo, ...b.columnas, ...b.filas.flat()].join(" ");
    default:
      return b.texto;
  }
}

/**
 * Con búsqueda, una tabla conserva solo las filas que coinciden (más su
 * encabezado) y una lista solo sus puntos: mostrar la tabla 5 entera por
 * una palabra obligaría a buscar a ojo dentro de ella.
 */
function filtrar(seccion: SeccionCriterios, q: string): SeccionCriterios | null {
  if (!q) return seccion;
  if (normalizar(seccion.titulo).includes(q)) return seccion;
  const bloques = seccion.bloques.flatMap<Bloque>((b) => {
    if (b.tipo === "tabla") {
      if (normalizar(b.titulo).includes(q)) return [b];
      const filas = b.filas.filter((f) => normalizar(f.join(" ")).includes(q));
      return filas.length ? [{ ...b, filas, grupos: undefined }] : [];
    }
    if (b.tipo === "lista") {
      const items = b.items.filter((i) => normalizar(i).includes(q));
      return items.length ? [{ ...b, items }] : [];
    }
    if (b.tipo === "subtitulo") return [];
    return normalizar(textoDe(b)).includes(q) ? [b] : [];
  });
  return bloques.length ? { ...seccion, bloques } : null;
}

function Tabla({ b }: { b: Extract<Bloque, { tipo: "tabla" }> }) {
  return (
    <figure className="my-4">
      <figcaption className="mb-2 text-xs font-semibold text-cecar-800">{b.titulo}</figcaption>
      <div className="overflow-x-auto rounded-lg border border-[var(--color-borde)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cecar-50 text-[11px] font-semibold tracking-wide text-cecar-800 uppercase">
              {b.columnas.map((c, i) => (
                <th
                  key={c}
                  scope="col"
                  className={`border-b border-[var(--color-borde)] px-3 py-2.5 align-bottom ${
                    i === 0 ? "min-w-[12rem] text-left" : c === "Observación" ? "min-w-[16rem] text-left" : "text-center"
                  }`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.filas.map((fila, i) => (
              <FilaTabla key={i} fila={fila} columnas={b.columnas} grupo={b.grupos?.[i]} />
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

function FilaTabla({ fila, columnas, grupo }: { fila: string[]; columnas: string[]; grupo?: string }) {
  return (
    <>
      {grupo && (
        <tr>
          <th
            colSpan={columnas.length}
            scope="colgroup"
            className="bg-cecar-50/60 px-3 py-2 text-left text-[11px] font-bold tracking-wide text-cecar-700 uppercase"
          >
            {grupo}
          </th>
        </tr>
      )}
      <tr className="border-t border-[var(--color-borde)] align-top">
        {fila.map((celda, j) => {
          const observacion = columnas[j] === "Observación";
          return j === 0 ? (
            <th key={j} scope="row" className="px-3 py-2.5 text-left font-medium text-[var(--color-texto)]">
              {celda}
            </th>
          ) : (
            <td
              key={j}
              className={`px-3 py-2.5 ${
                observacion
                  ? "text-xs leading-relaxed text-[var(--color-texto-suave)]"
                  : "text-center tabular-nums text-[var(--color-texto)]"
              }`}
            >
              {celda || (observacion ? "" : "—")}
            </td>
          );
        })}
      </tr>
    </>
  );
}

function Bloques({ bloques }: { bloques: Bloque[] }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-[var(--color-texto)]">
      {bloques.map((b, i) => {
        switch (b.tipo) {
          case "parrafo":
            return <p key={i}>{b.texto}</p>;
          case "subtitulo":
            return (
              <h4 key={i} className="pt-2 text-xs font-bold tracking-wide text-cecar-700 uppercase">
                {b.texto}
              </h4>
            );
          case "lista":
            return (
              <ul key={i} className="list-disc space-y-1.5 ps-5 marker:text-cecar-500">
                {b.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            );
          case "nota":
            return (
              <p
                key={i}
                className="rounded-lg border-s-4 border-cecar-400 bg-cecar-50/60 px-4 py-3 text-xs text-[var(--color-texto-suave)]"
              >
                {b.texto}
              </p>
            );
          case "tabla":
            return <Tabla key={i} b={b} />;
        }
      })}
    </div>
  );
}

export default function Criterios() {
  const [busqueda, setBusqueda] = useState("");
  const q = normalizar(busqueda.trim());
  const secciones = useMemo(
    () => CRITERIOS.map((s) => filtrar(s, q)).filter((s): s is SeccionCriterios => s !== null),
    [q],
  );

  return (
    <main className="px-4 py-6 sm:p-8">
      <Encabezado
        titulo="Criterios de asignación"
        descripcion={`Lineamientos del Consejo Académico para el periodo ${PERIODO_CRITERIOS}: dedicaciones, roles, tamaños de grupo y tutores.`}
      />

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="relative mb-4">
            <FiSearch
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--color-texto-suave)]"
              aria-hidden
            />
            <Entrada
              type="search"
              placeholder="Buscar un rol, curso…"
              aria-label="Buscar en los criterios"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="ps-10"
            />
          </div>
          <nav aria-label="Secciones" className="hidden lg:block">
            <ol className="space-y-0.5 text-sm">
              {secciones.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex gap-2 rounded-md px-3 py-1.5 text-[var(--color-texto-suave)] hover:bg-cecar-50 hover:text-cecar-800"
                  >
                    <span className="w-10 shrink-0 tabular-nums text-cecar-600">{s.numero}</span>
                    <span>{s.titulo}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <div className="min-w-0 space-y-6">
          {secciones.length === 0 && (
            <p className="tarjeta p-8 text-center text-sm text-[var(--color-texto-suave)]">
              Nada en los criterios coincide con «{busqueda}».
            </p>
          )}
          {secciones.map((s) => (
            <div key={s.id} id={s.id} className="scroll-mt-6">
              <Seccion titulo={s.numero ? `${s.numero} · ${s.titulo}` : s.titulo}>
                <Bloques bloques={s.bloques} />
              </Seccion>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
