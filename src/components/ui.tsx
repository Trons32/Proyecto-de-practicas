"use client";

import { ReactNode, SelectHTMLAttributes, InputHTMLAttributes, ButtonHTMLAttributes } from "react";

export function Campo({
  etiqueta,
  requerido,
  error,
  ayuda,
  className = "",
  children,
}: {
  etiqueta: string;
  requerido?: boolean;
  error?: boolean;
  ayuda?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className="etiqueta">
        {etiqueta}
        {requerido && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
      {ayuda && (
        <p className={`mt-1 text-[11px] ${error ? "text-rose-600" : "text-[var(--color-texto-suave)]"}`}>
          {ayuda}
        </p>
      )}
    </div>
  );
}

export function Entrada({
  error,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return <input {...props} className={`campo ${error ? "campo-error" : ""} ${className}`} />;
}

export function Seleccion({
  error,
  opciones,
  placeholder = "Seleccione…",
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean;
  opciones: readonly string[] | { valor: string; texto: string }[];
  placeholder?: string;
}) {
  const items = opciones.map((o) =>
    typeof o === "string" ? { valor: o, texto: o.replace(/_/g, " ") } : o
  );
  // El hueco para la flecha se abre con pe-*, no con pr-*: `.campo` ya declara
  // px-3 y, entre dos reglas de padding-right, gana la de la hoja de estilos.
  return (
    <select
      {...props}
      className={`campo truncate pe-9 ${error ? "campo-error" : ""} ${className}`}
    >
      <option value="">{placeholder}</option>
      {items.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.texto}
        </option>
      ))}
    </select>
  );
}

export function Seccion({
  titulo,
  descripcion,
  accion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="tarjeta flex flex-col overflow-hidden">
      {/* Sin flex-wrap: con títulos largos el botón saltaba de línea y las
          tarjetas contiguas quedaban con encabezados de distinta altura. */}
      <header className="flex items-start justify-between gap-4 border-b border-[var(--color-borde)] bg-cecar-50/60 px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-sm leading-tight font-bold tracking-wide text-cecar-800 uppercase">
            {titulo}
          </h3>
          {descripcion && (
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-texto-suave)]">
              {descripcion}
            </p>
          )}
        </div>
        {accion && <div className="shrink-0">{accion}</div>}
      </header>
      <div className="flex-1 p-5">{children}</div>
    </section>
  );
}

export function Boton({
  variante = "primario",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?:
    | "primario"
    | "secundario"
    | "fantasma"
    | "peligro"
    | "peligroSolido"
    | "sobreVerde"
    | "sobreVerdeSuave";
  children: ReactNode;
}) {
  const estilos = {
    primario:
      "bg-cecar-600 text-white hover:bg-cecar-700 active:bg-cecar-800 shadow-sm " +
      "disabled:bg-cecar-200 disabled:text-cecar-500",
    secundario:
      "bg-white text-cecar-700 border border-cecar-200 hover:bg-cecar-50 hover:border-cecar-300 " +
      "disabled:bg-white disabled:text-[var(--color-texto-suave)] disabled:border-[var(--color-borde)]",
    fantasma: "text-[var(--color-texto-suave)] hover:bg-black/5 hover:text-[var(--color-texto)]",
    peligro: "text-rose-600 hover:bg-rose-50",
    peligroSolido:
      "bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800 " +
      "disabled:bg-rose-200 disabled:text-white",
    // Botón sólido sobre la barra verde: al deshabilitarse conserva
    // contraste propio en lugar de quedar blanco sobre blanco.
    sobreVerde:
      "bg-white text-cecar-700 shadow-sm hover:bg-cecar-50 active:bg-cecar-100 " +
      "disabled:bg-white/25 disabled:text-white/80 disabled:shadow-none",
    // Botón secundario sobre la barra verde.
    sobreVerdeSuave:
      "bg-white/15 text-white ring-1 ring-inset ring-white/25 hover:bg-white/25 " +
      "disabled:bg-white/10 disabled:text-white/50",
  }[variante];

  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold
                  transition disabled:cursor-not-allowed ${estilos} ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Tarjeta de estadística del dashboard institucional: borde superior de
 * color, valor grande y el icono en un círculo tenue a la derecha.
 */
export function TarjetaStat({
  etiqueta,
  valor,
  icono,
  tono = "verde",
}: {
  etiqueta: string;
  valor: ReactNode;
  icono: ReactNode;
  tono?: "verde" | "lima" | "ambar" | "rojo";
}) {
  const estilos = {
    verde: { borde: "border-t-cecar-600", fondo: "bg-cecar-600/10", texto: "text-cecar-700" },
    lima: { borde: "border-t-lima-500", fondo: "bg-lima-500/10", texto: "text-lima-700" },
    ambar: { borde: "border-t-amber-500", fondo: "bg-amber-500/10", texto: "text-amber-600" },
    rojo: { borde: "border-t-rose-500", fondo: "bg-rose-500/10", texto: "text-rose-600" },
  }[tono];

  return (
    <div
      className={`tarjeta-stat tarjeta-sombra rounded-xl border-t-4 bg-white p-5 ${estilos.borde}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-[var(--color-texto-suave)]">
            {etiqueta}
          </h3>
          <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--color-texto)]">{valor}</p>
        </div>
        <div
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${estilos.fondo} ${estilos.texto}`}
        >
          {icono}
        </div>
      </div>
    </div>
  );
}

export function Insignia({
  tono = "neutro",
  children,
}: {
  tono?: "verde" | "ambar" | "rojo" | "neutro" | "azul";
  children: ReactNode;
}) {
  const estilos = {
    verde: "bg-cecar-100 text-cecar-800 ring-cecar-200",
    ambar: "bg-amber-50 text-amber-800 ring-amber-200",
    rojo: "bg-rose-50 text-rose-700 ring-rose-200",
    azul: "bg-sky-50 text-sky-800 ring-sky-200",
    neutro: "bg-black/5 text-[var(--color-texto-suave)] ring-black/10",
  }[tono];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${estilos}`}
    >
      {children}
    </span>
  );
}
