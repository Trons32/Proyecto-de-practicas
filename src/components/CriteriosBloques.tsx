"use client";

import type { Bloque } from "@/lib/criterios";

/**
 * Cómo se pinta el contenido de los criterios (SPEC-015). Compartido entre
 * la consulta y la vista previa del editor (SPEC-025): lo que el
 * administrador ve al editar es lo que se publica y se imprime.
 */
function Tabla({ b }: { b: Extract<Bloque, { tipo: "tabla" }> }) {
  return (
    <figure className="my-4 break-inside-avoid">
      <figcaption className="mb-2 text-xs font-semibold text-cecar-800">{b.titulo}</figcaption>
      <div className="overflow-x-auto rounded-lg border border-[var(--color-borde)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cecar-50 text-[11px] font-semibold tracking-wide text-cecar-800 uppercase">
              {b.columnas.map((c, i) => (
                <th
                  key={i}
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

export function Bloques({ bloques }: { bloques: Bloque[] }) {
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
                {b.items.map((it, j) => (
                  <li key={j}>{it}</li>
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

