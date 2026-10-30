"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Las gráficas de los reportes (SPEC-009), en SVG propio: son barras
 * simples y una librería de gráficas pesaría más que todo el reporte.
 *
 * Reglas que siguen todas (y por qué):
 * · Barras de 24 px como máximo, extremo redondeado de 4 px y base recta:
 *   la barra crece desde el cero, no flota.
 * · 2 px de separación entre barras vecinas en vez de un borde: el borde
 *   es tinta que no es dato.
 * · El texto nunca lleva el color de la serie (verde claro o naranja sobre
 *   blanco no se leen); la identidad la da la muestra de color al lado.
 * · Varias series: siempre leyenda. La paleta pasó el validador, pero
 *   verde↔naranja queda en la banda límite para daltonismo protán, y la
 *   leyenda más la separación son la codificación secundaria que exige.
 * · `null` es "sin dato": no se dibuja barra, para no confundirlo con cero.
 */

export const COLOR_SERIE = ["#00733b", "#2a78d6", "#eb6834"] as const;
const COLOR_UNA_SERIE = COLOR_SERIE[0];
const GRUESO_MAX = 24;
const SEPARACION = 2;

export interface Dato {
  etiqueta: string;
  valor: number | null;
}

export interface Serie {
  nombre: string;
  valores: (number | null)[];
}

const formato = new Intl.NumberFormat("es-CO");
const compacto = (n: number) =>
  n >= 1000 ? `${formato.format(Math.round(n / 100) / 10)} mil` : formato.format(n);

/** Un máximo de escala "redondo" y sus marcas: 0, 100, 200… en lugar de 0, 87, 174. */
function escala(maximo: number, marcas = 4): number[] {
  if (maximo <= 0) return [0, 1];
  const paso0 = maximo / marcas;
  const potencia = 10 ** Math.floor(Math.log10(paso0));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= paso0)!;
  const tope = Math.ceil(maximo / paso) * paso;
  return Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso);
}

/** Ancho real del contenedor: el SVG se dibuja en píxeles para que el texto no escale. */
function useAncho<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.floor(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, ancho] as const;
}

/** Columna con el extremo de dato redondeado y la base recta. */
function columna(x: number, y: number, ancho: number, alto: number) {
  const r = Math.min(4, ancho / 2, alto);
  return `M${x},${y + alto} V${y + r} Q${x},${y} ${x + r},${y} H${x + ancho - r} Q${x + ancho},${y} ${x + ancho},${y + r} V${y + alto} Z`;
}

/** Barra horizontal: base a la izquierda, extremo de dato redondeado a la derecha. */
function barra(x: number, y: number, largo: number, grueso: number) {
  const r = Math.min(4, grueso / 2, largo);
  return `M${x},${y} H${x + largo - r} Q${x + largo},${y} ${x + largo},${y + r} V${y + grueso - r} Q${x + largo},${y + grueso} ${x + largo - r},${y + grueso} H${x} Z`;
}

interface Tip {
  x: number;
  y: number;
  titulo: string;
  lineas: { color?: string; texto: string }[];
}

function Tooltip({ tip }: { tip: Tip | null }) {
  if (!tip) return null;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 -translate-y-full rounded-lg border border-[var(--color-borde)] bg-white px-3 py-2 text-xs shadow-lg"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      <p className="mb-1 font-semibold text-[var(--color-texto)]">{tip.titulo}</p>
      {tip.lineas.map((l) => (
        <p key={l.texto} className="flex items-center gap-1.5 text-[var(--color-texto-suave)]">
          {l.color && <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: l.color }} aria-hidden />}
          {l.texto}
        </p>
      ))}
    </div>
  );
}

function Marco({
  titulo,
  subtitulo,
  leyenda,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  leyenda?: string[];
  children: React.ReactNode;
}) {
  return (
    <figure className="tarjeta tarjeta-sombra p-5">
      <figcaption className="mb-3">
        <p className="text-sm font-bold text-[var(--color-texto)]">{titulo}</p>
        {subtitulo && <p className="text-xs text-[var(--color-texto-suave)]">{subtitulo}</p>}
        {leyenda && (
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-texto-suave)]">
            {leyenda.map((n, i) => (
              <li key={n} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_SERIE[i] }} aria-hidden />
                {n}
              </li>
            ))}
          </ul>
        )}
      </figcaption>
      {children}
    </figure>
  );
}

/** Todo en cero o sin dato: unos ejes vacíos parecen un error de la gráfica. */
const sinValores = (datos: Dato[]) => datos.every((d) => !d.valor);

function SinDatos() {
  return <p className="py-6 text-center text-sm text-[var(--color-texto-suave)]">Sin datos para graficar.</p>;
}

const describir = (titulo: string, datos: Dato[]) =>
  `${titulo}. ${datos.map((d) => `${d.etiqueta}: ${d.valor === null ? "sin dato" : formato.format(d.valor)}`).join("; ")}.`;

/* ------------------------------------------------------------------ */

/**
 * Columnas de una serie. Para pocas categorías de nombre corto (periodos,
 * dedicaciones); con etiquetas largas, `GraficaBarras`.
 */
export function GraficaColumnas({
  titulo,
  subtitulo,
  datos,
  alto = 240,
}: {
  titulo: string;
  subtitulo?: string;
  datos: Dato[];
  alto?: number;
}) {
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const [tip, setTip] = useState<Tip | null>(null);
  const marcas = escala(Math.max(0, ...datos.map((d) => d.valor ?? 0)));
  const tope = marcas[marcas.length - 1];

  const izq = 44;
  const arriba = 18;
  const abajo = 36;
  const zona = Math.max(0, ancho - izq - 8);
  const banda = datos.length ? zona / datos.length : 0;
  const grueso = Math.min(GRUESO_MAX, Math.max(4, banda - 2 * SEPARACION));
  const altoUtil = alto - arriba - abajo;
  const yDe = (v: number) => arriba + altoUtil - (v / tope) * altoUtil;
  // Con muchas columnas no caben los valores ni todas las etiquetas.
  const rotular = banda >= 34;
  const cadaCuanto = Math.max(1, Math.ceil(40 / Math.max(banda, 1)));

  return (
    <Marco titulo={titulo} subtitulo={subtitulo}>
      <div ref={ref} className="relative" onMouseLeave={() => setTip(null)}>
        {sinValores(datos) ? (
          <SinDatos />
        ) : ancho > 0 && (
          <svg width={ancho} height={alto} role="img" aria-label={describir(titulo, datos)}>
            {marcas.map((m) => (
              <g key={m}>
                <line x1={izq} x2={ancho - 8} y1={yDe(m)} y2={yDe(m)} stroke="var(--color-borde)" strokeWidth={1} />
                <text x={izq - 6} y={yDe(m)} dy="0.32em" textAnchor="end" className="fill-[var(--color-texto-suave)] text-[10px] tabular-nums">
                  {compacto(m)}
                </text>
              </g>
            ))}
            {datos.map((d, i) => {
              const x = izq + i * banda + (banda - grueso) / 2;
              const v = d.valor;
              return (
                <g
                  key={d.etiqueta}
                  onMouseEnter={() =>
                    setTip({
                      x: izq + i * banda + banda / 2,
                      y: v === null ? arriba + altoUtil : yDe(v),
                      titulo: d.etiqueta,
                      lineas: [{ texto: v === null ? "Sin dato" : formato.format(v) }],
                    })
                  }
                >
                  {/* Zona de puntero de toda la banda: la barra sola es un blanco pequeño. */}
                  <rect x={izq + i * banda} y={arriba} width={banda} height={altoUtil} fill="transparent" />
                  {v !== null && v > 0 && <path d={columna(x, yDe(v), grueso, arriba + altoUtil - yDe(v))} fill={COLOR_UNA_SERIE} />}
                  {rotular && (
                    <text x={x + grueso / 2} y={v === null ? arriba + altoUtil - 4 : yDe(v) - 5} textAnchor="middle" className="fill-[var(--color-texto)] text-[10px] font-semibold tabular-nums">
                      {/* Exacta: el compacto es para los ejes; sobre la barra, 8.019 no es "8 mil". */}
                      {v === null ? "s/d" : formato.format(v)}
                    </text>
                  )}
                  {i % cadaCuanto === 0 && (
                    <text x={izq + i * banda + banda / 2} y={alto - abajo + 16} textAnchor="middle" className="fill-[var(--color-texto-suave)] text-[10px]">
                      {d.etiqueta}
                    </text>
                  )}
                </g>
              );
            })}
            <line x1={izq} x2={ancho - 8} y1={arriba + altoUtil} y2={arriba + altoUtil} stroke="var(--color-texto-suave)" strokeOpacity={0.4} />
          </svg>
        )}
        <Tooltip tip={tip} />
      </div>
    </Marco>
  );
}

/** Barras horizontales de una serie: para categorías de nombre largo (categorías, contratos). */
export function GraficaBarras({ titulo, subtitulo, datos }: { titulo: string; subtitulo?: string; datos: Dato[] }) {
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const [tip, setTip] = useState<Tip | null>(null);
  const tope = Math.max(1, ...datos.map((d) => d.valor ?? 0));
  const fila = 30;
  const etiquetas = Math.min(170, Math.max(90, ancho * 0.38));
  const valor = 44;
  const largoUtil = Math.max(0, ancho - etiquetas - valor);
  const grueso = 16;
  const alto = datos.length * fila + 4;

  return (
    <Marco titulo={titulo} subtitulo={subtitulo}>
      <div ref={ref} className="relative" onMouseLeave={() => setTip(null)}>
        {sinValores(datos) ? (
          <SinDatos />
        ) : ancho > 0 && (
          <svg width={ancho} height={alto} role="img" aria-label={describir(titulo, datos)}>
            {datos.map((d, i) => {
              const y = i * fila + (fila - grueso) / 2;
              const largo = d.valor ? (d.valor / tope) * largoUtil : 0;
              return (
                <g
                  key={d.etiqueta}
                  onMouseEnter={() =>
                    setTip({
                      x: etiquetas + Math.max(largo, 20) / 2,
                      y,
                      titulo: d.etiqueta,
                      lineas: [{ texto: d.valor === null ? "Sin dato" : formato.format(d.valor) }],
                    })
                  }
                >
                  <rect x={0} y={i * fila} width={ancho} height={fila} fill="transparent" />
                  <text x={etiquetas - 8} y={y + grueso / 2} dy="0.32em" textAnchor="end" className="fill-[var(--color-texto-suave)] text-[11px]">
                    {d.etiqueta.length > 26 ? `${d.etiqueta.slice(0, 25)}…` : d.etiqueta}
                  </text>
                  {largo > 0 && <path d={barra(etiquetas, y, largo, grueso)} fill={COLOR_UNA_SERIE} />}
                  <text x={etiquetas + largo + 6} y={y + grueso / 2} dy="0.32em" className="fill-[var(--color-texto)] text-[11px] font-semibold tabular-nums">
                    {d.valor === null ? "s/d" : formato.format(d.valor)}
                  </text>
                </g>
              );
            })}
            <line x1={etiquetas} x2={etiquetas} y1={0} y2={alto} stroke="var(--color-texto-suave)" strokeOpacity={0.4} />
          </svg>
        )}
        <Tooltip tip={tip} />
      </div>
    </Marco>
  );
}

/**
 * Columnas agrupadas de hasta tres series (la paleta valida tres; más no
 * se distinguen). Para comparar las mismas series entre periodos.
 */
export function GraficaAgrupada({
  titulo,
  subtitulo,
  categorias,
  series,
  alto = 260,
}: {
  titulo: string;
  subtitulo?: string;
  categorias: string[];
  series: Serie[];
  alto?: number;
}) {
  if (series.length > COLOR_SERIE.length) throw new Error("GraficaAgrupada admite hasta tres series.");
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const [tip, setTip] = useState<Tip | null>(null);
  const marcas = escala(Math.max(0, ...series.flatMap((s) => s.valores.map((v) => v ?? 0))));
  const tope = marcas[marcas.length - 1];

  const izq = 44;
  const arriba = 12;
  const abajo = 36;
  const zona = Math.max(0, ancho - izq - 8);
  const banda = categorias.length ? zona / categorias.length : 0;
  const grueso = Math.min(GRUESO_MAX, Math.max(3, (banda * 0.8 - SEPARACION * (series.length - 1)) / series.length));
  const grupo = grueso * series.length + SEPARACION * (series.length - 1);
  const altoUtil = alto - arriba - abajo;
  const yDe = (v: number) => arriba + altoUtil - (v / tope) * altoUtil;
  const cadaCuanto = Math.max(1, Math.ceil(44 / Math.max(banda, 1)));

  const descripcion = `${titulo}. ${categorias
    .map((c, i) => `${c}: ${series.map((s) => `${s.nombre} ${s.valores[i] ?? "sin dato"}`).join(", ")}`)
    .join("; ")}.`;

  return (
    <Marco titulo={titulo} subtitulo={subtitulo} leyenda={series.map((s) => s.nombre)}>
      <div ref={ref} className="relative" onMouseLeave={() => setTip(null)}>
        {ancho > 0 && (
          <svg width={ancho} height={alto} role="img" aria-label={descripcion}>
            {marcas.map((m) => (
              <g key={m}>
                <line x1={izq} x2={ancho - 8} y1={yDe(m)} y2={yDe(m)} stroke="var(--color-borde)" strokeWidth={1} />
                <text x={izq - 6} y={yDe(m)} dy="0.32em" textAnchor="end" className="fill-[var(--color-texto-suave)] text-[10px] tabular-nums">
                  {compacto(m)}
                </text>
              </g>
            ))}
            {categorias.map((c, i) => {
              const x0 = izq + i * banda + (banda - grupo) / 2;
              return (
                <g
                  key={c}
                  onMouseEnter={() =>
                    setTip({
                      x: izq + i * banda + banda / 2,
                      y: yDe(Math.max(0, ...series.map((s) => s.valores[i] ?? 0))),
                      titulo: c,
                      lineas: series.map((s, j) => ({
                        color: COLOR_SERIE[j],
                        texto: `${s.nombre}: ${s.valores[i] === null ? "sin dato" : formato.format(s.valores[i]!)}`,
                      })),
                    })
                  }
                >
                  <rect x={izq + i * banda} y={arriba} width={banda} height={altoUtil} fill="transparent" />
                  {series.map((s, j) => {
                    const v = s.valores[i];
                    if (v === null || v <= 0) return null;
                    return (
                      <path
                        key={s.nombre}
                        d={columna(x0 + j * (grueso + SEPARACION), yDe(v), grueso, arriba + altoUtil - yDe(v))}
                        fill={COLOR_SERIE[j]}
                      />
                    );
                  })}
                  {i % cadaCuanto === 0 && (
                    <text x={izq + i * banda + banda / 2} y={alto - abajo + 16} textAnchor="middle" className="fill-[var(--color-texto-suave)] text-[10px]">
                      {c}
                    </text>
                  )}
                </g>
              );
            })}
            <line x1={izq} x2={ancho - 8} y1={arriba + altoUtil} y2={arriba + altoUtil} stroke="var(--color-texto-suave)" strokeOpacity={0.4} />
          </svg>
        )}
        <Tooltip tip={tip} />
      </div>
    </Marco>
  );
}

/**
 * Una barra al 100 % con las partes de un todo. Sustituye la torta del
 * Excel ("Dedicación de los docentes"): con tres partes, la longitud se
 * compara mejor que el ángulo, y cada parte lleva su cifra y su porcentaje.
 */
export function GraficaProporcion({ titulo, subtitulo, datos }: { titulo: string; subtitulo?: string; datos: Dato[] }) {
  const total = datos.reduce((s, d) => s + (d.valor ?? 0), 0);
  return (
    <Marco titulo={titulo} subtitulo={subtitulo}>
      {total === 0 ? (
        <p className="text-sm text-[var(--color-texto-suave)]">Sin datos.</p>
      ) : (
        <>
          <div className="flex h-6 w-full gap-[2px] overflow-hidden rounded" role="img" aria-label={describir(titulo, datos)}>
            {datos.map((d, i) =>
              d.valor ? (
                <div
                  key={d.etiqueta}
                  title={`${d.etiqueta}: ${formato.format(d.valor)} (${Math.round((d.valor / total) * 100)} %)`}
                  style={{ width: `${(d.valor / total) * 100}%`, background: COLOR_SERIE[i] }}
                />
              ) : null
            )}
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {datos.map((d, i) => (
              <li key={d.etiqueta} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: COLOR_SERIE[i] }} aria-hidden />
                <span className="text-[var(--color-texto-suave)]">{d.etiqueta}</span>
                <span className="ml-auto font-semibold tabular-nums text-[var(--color-texto)]">
                  {formato.format(d.valor ?? 0)}
                </span>
                <span className="w-12 text-right text-xs tabular-nums text-[var(--color-texto-suave)]">
                  {Math.round(((d.valor ?? 0) / total) * 100)} %
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Marco>
  );
}
