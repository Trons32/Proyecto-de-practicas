"use client";

import { ReactNode, SelectHTMLAttributes, InputHTMLAttributes } from "react";

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
  return (
    <select {...props} className={`campo ${error ? "campo-error" : ""} ${className}`}>
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
    <section className="tarjeta overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-borde)] bg-cecar-50/60 px-5 py-3.5">
        <div>
          <h3 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">{titulo}</h3>
          {descripcion && (
            <p className="mt-0.5 text-xs text-[var(--color-texto-suave)]">{descripcion}</p>
          )}
        </div>
        {accion}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Boton({
  variante = "primario",
  className = "",
  children,
  ...props
}: InputHTMLAttributes<HTMLButtonElement> & {
  variante?: "primario" | "secundario" | "fantasma" | "peligro";
  children: ReactNode;
}) {
  const estilos = {
    primario:
      "bg-cecar-600 text-white hover:bg-cecar-700 active:bg-cecar-800 shadow-sm disabled:bg-cecar-300",
    secundario:
      "bg-white text-cecar-700 border border-cecar-200 hover:bg-cecar-50 hover:border-cecar-300",
    fantasma: "text-[var(--color-texto-suave)] hover:bg-black/5 hover:text-[var(--color-texto)]",
    peligro: "text-rose-600 hover:bg-rose-50",
  }[variante];

  return (
    <button
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold
                  transition disabled:cursor-not-allowed disabled:opacity-60 ${estilos} ${className}`}
    >
      {children}
    </button>
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
