"use client";

import type { Bloque } from "@/lib/criterios";
import { quitarFila } from "@/lib/criterios-versiones";
import { Boton, Entrada } from "./ui";
import { FiPlus, FiTrash2 } from "./iconos";

type Tabla = Extract<Bloque, { tipo: "tabla" }>;

export const NOMBRE_BLOQUE: Record<Bloque["tipo"], string> = {
  parrafo: "Párrafo",
  subtitulo: "Subtítulo",
  lista: "Lista",
  nota: "Nota",
  tabla: "Tabla",
};

export const bloqueVacio = (tipo: Bloque["tipo"]): Bloque =>
  tipo === "lista"
    ? { tipo, items: [""] }
    : tipo === "tabla"
      ? { tipo, titulo: "", columnas: ["", ""], filas: [["", ""]] }
      : { tipo, texto: "" };

const botonQuitar = "shrink-0 rounded-lg p-2 text-[var(--color-texto-suave)] hover:bg-rose-50 hover:text-rose-600";

/** Edita un bloque de los criterios (SPEC-025). Lo que cambia se devuelve entero. */
export default function EditorBloque({ b, onChange }: { b: Bloque; onChange: (b: Bloque) => void }) {
  switch (b.tipo) {
    case "parrafo":
    case "nota":
      return (
        <textarea
          className="campo min-h-24 resize-y"
          value={b.texto}
          onChange={(e) => onChange({ ...b, texto: e.target.value })}
        />
      );
    case "subtitulo":
      return <Entrada value={b.texto} onChange={(e) => onChange({ ...b, texto: e.target.value })} />;
    case "lista":
      return (
        <div className="space-y-2">
          {b.items.map((it, i) => (
            <div key={i} className="flex items-start gap-2">
              <textarea
                className="campo min-h-12 resize-y"
                value={it}
                onChange={(e) => onChange({ ...b, items: b.items.map((x, j) => (j === i ? e.target.value : x)) })}
              />
              <button
                type="button"
                className={botonQuitar}
                aria-label="Quitar punto"
                onClick={() => onChange({ ...b, items: b.items.filter((_, j) => j !== i) })}
              >
                <FiTrash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
          <Boton variante="fantasma" onClick={() => onChange({ ...b, items: [...b.items, ""] })}>
            <FiPlus aria-hidden /> Agregar punto
          </Boton>
        </div>
      );
    case "tabla":
      return <EditorTabla b={b} onChange={onChange} />;
  }
}

function EditorTabla({ b, onChange }: { b: Tabla; onChange: (b: Tabla) => void }) {
  const celda = (i: number, j: number, v: string) =>
    onChange({ ...b, filas: b.filas.map((f, x) => (x === i ? f.map((c, y) => (y === j ? v : c)) : f)) });
  const grupo = (i: number, v: string) => {
    const grupos = { ...(b.grupos ?? {}) };
    if (v) grupos[i] = v;
    else delete grupos[i];
    onChange({ ...b, grupos: Object.keys(grupos).length ? grupos : undefined });
  };
  const columnas = b.columnas.length;

  return (
    <div className="space-y-3">
      <Entrada placeholder="Título de la tabla" value={b.titulo} onChange={(e) => onChange({ ...b, titulo: e.target.value })} />
      <div className="overflow-x-auto rounded-lg border border-[var(--color-borde)]">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-cecar-50">
              {b.columnas.map((c, j) => (
                <th key={j} className="min-w-32 p-1.5">
                  <div className="flex items-center gap-1">
                    <Entrada
                      aria-label={`Columna ${j + 1}`}
                      value={c}
                      onChange={(e) => onChange({ ...b, columnas: b.columnas.map((x, y) => (y === j ? e.target.value : x)) })}
                    />
                    {columnas > 1 && (
                      <button
                        type="button"
                        className={botonQuitar}
                        aria-label={`Quitar columna ${j + 1}`}
                        onClick={() =>
                          onChange({
                            ...b,
                            columnas: b.columnas.filter((_, y) => y !== j),
                            filas: b.filas.map((f) => f.filter((_, y) => y !== j)),
                          })
                        }
                      >
                        <FiTrash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {b.filas.map((f, i) => (
              <FilaEditable
                key={i}
                fila={f}
                grupo={b.grupos?.[i] ?? ""}
                columnas={columnas}
                onCelda={(j, v) => celda(i, j, v)}
                onGrupo={(v) => grupo(i, v)}
                onQuitar={() => onChange(quitarFila(b, i))}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Boton variante="fantasma" onClick={() => onChange({ ...b, filas: [...b.filas, Array(columnas).fill("")] })}>
          <FiPlus aria-hidden /> Agregar fila
        </Boton>
        <Boton
          variante="fantasma"
          onClick={() => onChange({ ...b, columnas: [...b.columnas, ""], filas: b.filas.map((f) => [...f, ""]) })}
        >
          <FiPlus aria-hidden /> Agregar columna
        </Boton>
      </div>
      <Entrada placeholder="Pie de tabla (opcional)" value={b.pie ?? ""} onChange={(e) => onChange({ ...b, pie: e.target.value || undefined })} />
    </div>
  );
}

function FilaEditable({
  fila,
  grupo,
  columnas,
  onCelda,
  onGrupo,
  onQuitar,
}: {
  fila: string[];
  grupo: string;
  columnas: number;
  onCelda: (j: number, v: string) => void;
  onGrupo: (v: string) => void;
  onQuitar: () => void;
}) {
  return (
    <>
      <tr>
        <td colSpan={columnas + 1} className="px-1.5 pt-2">
          <Entrada
            className="text-[11px]"
            placeholder="Separador de grupo antes de esta fila (opcional)"
            value={grupo}
            onChange={(e) => onGrupo(e.target.value)}
          />
        </td>
      </tr>
      <tr className="align-top">
        {fila.map((c, j) => (
          <td key={j} className="p-1.5">
            <textarea className="campo min-h-10 resize-y text-xs" value={c} onChange={(e) => onCelda(j, e.target.value)} />
          </td>
        ))}
        <td className="p-1.5">
          <button type="button" className={botonQuitar} aria-label="Quitar fila" onClick={onQuitar}>
            <FiTrash2 className="h-4 w-4" aria-hidden />
          </button>
        </td>
      </tr>
    </>
  );
}
