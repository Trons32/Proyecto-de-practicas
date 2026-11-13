"use client";

import { Fragment, ReactNode, SelectHTMLAttributes, InputHTMLAttributes, ButtonHTMLAttributes, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiChevronDown, FiChevronLeft, FiChevronRight, FiMinus, FiPlus } from "./iconos";
import { ETIQUETA_ESTADO, type EstadoAsignacion } from "@/lib/tipos";

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

/**
 * El estado de una asignación, siempre con el mismo color y la misma
 * palabra. Vive aquí porque lo pintan cinco pantallas y, si cada una
 * eligiera su tono, el mismo estado se vería distinto según dónde se mire.
 */
export function InsigniaEstado({ estado, importada }: { estado: EstadoAsignacion; importada?: boolean }) {
  // Una importada (SPEC-017) está aprobada, pero no pasó por el ciclo: se dice.
  if (importada) return <Insignia tono="verde">Importada</Insignia>;
  const tono = {
    borrador: "neutro",
    enviada: "azul",
    en_revision: "azul",
    aprobada: "verde",
    en_correccion: "ambar",
  }[estado] as "neutro" | "azul" | "verde" | "ambar";

  return <Insignia tono={tono}>{ETIQUETA_ESTADO[estado]}</Insignia>;
}

/**
 * Paginación de listados largos.
 *
 * Con una sola página no se pinta nada: unos controles que no llevan a
 * ningún sitio solo ensucian. El rango visible se enuncia en palabras
 * ("11–20 de 34") porque en el histórico lo que el coordinador quiere
 * saber es cuánto le falta por revisar, no en qué número de página está.
 */
export function Paginacion({
  pagina,
  paginas,
  total,
  porPagina,
  onCambiar,
  etiqueta = "elementos",
}: {
  pagina: number;
  paginas: number;
  total: number;
  porPagina: number;
  onCambiar: (pagina: number) => void;
  etiqueta?: string;
}) {
  if (paginas <= 1) return null;

  const primero = (pagina - 1) * porPagina + 1;
  const ultimo = Math.min(pagina * porPagina, total);

  return (
    <nav
      aria-label={`Paginación de ${etiqueta}`}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-borde)] px-5 py-3"
    >
      <p className="text-xs text-[var(--color-texto-suave)]">
        <span className="tabular-nums">
          {primero}–{ultimo}
        </span>{" "}
        de <span className="tabular-nums">{total}</span> {etiqueta}
      </p>

      <div className="flex items-center gap-1">
        <Boton
          variante="secundario"
          className="px-2"
          disabled={pagina <= 1}
          aria-label="Página anterior"
          onClick={() => onCambiar(pagina - 1)}
        >
          <FiChevronLeft aria-hidden />
        </Boton>

        <span className="px-2 text-xs font-semibold tabular-nums text-[var(--color-texto-suave)]">
          {pagina} / {paginas}
        </span>

        <Boton
          variante="secundario"
          className="px-2"
          disabled={pagina >= paginas}
          aria-label="Página siguiente"
          onClick={() => onCambiar(pagina + 1)}
        >
          <FiChevronRight aria-hidden />
        </Boton>
      </div>
    </nav>
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

/** Casilla con su texto al lado; el texto también la marca al pulsarlo. */
export function Casilla({
  etiqueta,
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { etiqueta: ReactNode }) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--color-texto)] ${className}`}>
      <input type="checkbox" {...props} className="h-4 w-4 rounded border-[var(--color-borde)] accent-cecar-600" />
      {etiqueta}
    </label>
  );
}

/* ------------------------------------------------------------------ */

export interface OpcionBuscable {
  valor: string;
  texto: string;
  /** Encabezado bajo el que se agrupa; las opciones llegan ya ordenadas por grupo. */
  grupo?: string;
}

/** Sin tildes ni mayúsculas: "investigacion" encuentra "INVESTIGACIÓN". */
const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Un desplegable en el que se escribe para filtrar (SPEC-020). Para listas
 * largas de nombres largos, como los 56 roles de descarga: en un <select>
 * nativo había que recorrerlos uno a uno y se cortaban.
 *
 * La lista se pinta en <body> con posición fija, no debajo del campo: las
 * tarjetas (`Seccion`) llevan `overflow-hidden` y la recortaban. Así además
 * puede ser más ancha que el campo y abrirse hacia arriba si abajo no cabe.
 *
 * Cada palabra escrita debe aparecer en la opción, en cualquier orden:
 * "coord inv" encuentra "COORDINADOR DE INVESTIGACIÓN…". Teclado: ↑ ↓ para
 * moverse, Enter para elegir, Esc para cerrar sin cambiar.
 */
export function SelectorBuscable({
  opciones,
  valor,
  onCambio,
  placeholder = "Escriba para buscar…",
  error,
  id,
  disabled,
  title,
}: {
  opciones: OpcionBuscable[];
  valor: string;
  onCambio: (valor: string) => void;
  placeholder?: string;
  error?: boolean;
  id?: string;
  disabled?: boolean;
  title?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState("");
  const campoRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const [activo, setActivo] = useState(0);
  const base = useId();
  const listaId = `${base}-lista`;
  const opcionId = (i: number) => `${base}-op-${i}`;

  const seleccionada = opciones.find((o) => o.valor === valor);
  const filtradas = useMemo(() => {
    const palabras = normalizar(consulta).split(/\s+/).filter(Boolean);
    if (palabras.length === 0) return opciones;
    return opciones.filter((o) => {
      const texto = normalizar(`${o.texto} ${o.grupo ?? ""}`);
      return palabras.every((p) => texto.includes(p));
    });
  }, [opciones, consulta]);

  // La posición se escribe en el estilo del nodo y no en estado: se
  // recalcula en cada scroll, y un setState por evento volvería a pintar
  // todo el selector.
  useLayoutEffect(() => {
    if (!abierto) return;
    const ubicar = () => {
      const campo = campoRef.current?.getBoundingClientRect();
      const lista = listaRef.current;
      if (!campo || !lista) return;
      const margen = 12;
      const ancho = Math.min(Math.max(campo.width, 440), window.innerWidth - 2 * margen);
      const izquierda = Math.min(Math.max(campo.left, margen), window.innerWidth - margen - ancho);
      const abajo = window.innerHeight - campo.bottom - margen;
      const arriba = campo.top - margen;
      const haciaArriba = abajo < 260 && arriba > abajo;
      Object.assign(lista.style, {
        left: `${izquierda}px`,
        width: `${ancho}px`,
        maxHeight: `${Math.max(Math.min(340, (haciaArriba ? arriba : abajo) - 6), 120)}px`,
        top: haciaArriba ? "" : `${campo.bottom + 6}px`,
        bottom: haciaArriba ? `${window.innerHeight - campo.top + 6}px` : "",
      });
    };
    ubicar();
    // En captura: también se mueve si hace scroll un contenedor, no solo la ventana.
    window.addEventListener("scroll", ubicar, true);
    window.addEventListener("resize", ubicar);
    return () => {
      window.removeEventListener("scroll", ubicar, true);
      window.removeEventListener("resize", ubicar);
    };
  }, [abierto]);

  useEffect(() => {
    if (abierto) document.getElementById(opcionId(activo))?.scrollIntoView({ block: "nearest" });
    // opcionId depende solo de `base`, que no cambia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, activo]);

  const abrir = () => {
    setConsulta("");
    setActivo(Math.max(0, opciones.findIndex((o) => o.valor === valor)));
    setAbierto(true);
  };
  const elegir = (o: OpcionBuscable) => {
    onCambio(o.valor);
    setAbierto(false);
  };

  const alTeclear = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!abierto) return abrir();
      const paso = e.key === "ArrowDown" ? 1 : -1;
      setActivo((i) => Math.min(Math.max(i + paso, 0), filtradas.length - 1));
    } else if (e.key === "Enter") {
      // Sin esto, Enter enviaría el formulario que contenga al selector.
      if (abierto) e.preventDefault();
      const o = filtradas[activo];
      if (abierto && o) elegir(o);
    } else if (e.key === "Escape" && abierto) {
      e.preventDefault();
      setAbierto(false);
    }
  };

  return (
    <div className="relative">
      <input
        ref={campoRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={abierto}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={abierto && filtradas[activo] ? opcionId(activo) : undefined}
        autoComplete="off"
        disabled={disabled}
        title={title ?? seleccionada?.texto}
        // Abierto, el campo es el buscador y la opción elegida queda como
        // pista; cerrado, muestra la elegida.
        value={abierto ? consulta : (seleccionada?.texto ?? "")}
        placeholder={abierto && seleccionada ? seleccionada.texto : placeholder}
        onFocus={abrir}
        onClick={() => !abierto && abrir()}
        onBlur={() => setAbierto(false)}
        onChange={(e) => {
          setConsulta(e.target.value);
          setActivo(0);
          setAbierto(true);
        }}
        onKeyDown={alTeclear}
        className={`campo truncate pe-9 ${error ? "campo-error" : ""}`}
      />
      <FiChevronDown
        className={`pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[var(--color-texto-suave)] transition-transform ${abierto ? "rotate-180" : ""}`}
        aria-hidden
      />
      {abierto && createPortal(
        <ul
          ref={listaRef}
          id={listaId}
          role="listbox"
          // mousedown y no click: el clic llega después del blur del campo,
          // que ya habría cerrado la lista.
          onMouseDown={(e) => e.preventDefault()}
          // Por encima de Modal (z-[9999]): el selector también puede ir en uno.
          className="fixed z-[10000] overflow-auto rounded-xl border border-[var(--color-borde)] bg-white py-1 text-sm shadow-xl ring-1 ring-black/5"
        >
          {filtradas.length === 0 && (
            <li className="px-3 py-2 text-[var(--color-texto-suave)]">Sin coincidencias para «{consulta}».</li>
          )}
          {filtradas.map((o, i) => {
            const nuevoGrupo = o.grupo && o.grupo !== filtradas[i - 1]?.grupo;
            return (
              <Fragment key={o.valor}>
                {nuevoGrupo && (
                  <li
                    role="presentation"
                    className="sticky top-0 z-10 border-y border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[var(--color-texto-suave)] uppercase first:border-t-0"
                  >
                    {o.grupo}
                  </li>
                )}
                <li
                  id={opcionId(i)}
                  role="option"
                  aria-selected={o.valor === valor}
                  onMouseEnter={() => setActivo(i)}
                  onClick={() => elegir(o)}
                  className={`flex cursor-pointer items-start gap-2 px-3 py-1.5 leading-snug ${
                    i === activo ? "bg-cecar-50 text-cecar-800" : "text-[var(--color-texto)]"
                  }`}
                >
                  <FiCheck
                    className={`mt-0.5 h-4 w-4 shrink-0 ${o.valor === valor ? "text-cecar-600" : "invisible"}`}
                    aria-hidden
                  />
                  <span className="whitespace-normal">{o.texto}</span>
                </li>
              </Fragment>
            );
          })}
        </ul>,
        document.body
      )}
    </div>
  );
}

/**
 * Un número pequeño que se ajusta de a uno (SPEC-020): horas de una descarga
 * o del apoyo académico. Con − y + no hace falta borrar y reescribir, pero
 * también se puede teclear.
 */
export function Contador({
  valor,
  onCambio,
  min = 0,
  max,
  sufijo = "h",
  etiqueta,
  error,
  id,
}: {
  valor: number;
  onCambio: (valor: number) => void;
  min?: number;
  max?: number;
  sufijo?: string;
  /** Para lectores de pantalla: qué se está contando. */
  etiqueta: string;
  error?: boolean;
  id?: string;
}) {
  const acotar = (n: number) => Math.min(Math.max(n, min), max ?? Infinity);
  const boton =
    "grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--color-borde)] bg-white text-[var(--color-texto-suave)] " +
    "transition hover:border-cecar-300 hover:text-cecar-700 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className={boton}
        onClick={() => onCambio(acotar(valor - 1))}
        disabled={valor <= min}
        aria-label={`Restar una hora a ${etiqueta}`}
      >
        <FiMinus className="h-4 w-4" aria-hidden />
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={valor}
        aria-label={etiqueta}
        onChange={(e) => onCambio(acotar(Number(e.target.value) || 0))}
        onFocus={(e) => e.target.select()}
        className={`campo w-14 px-1 text-center font-semibold tabular-nums ${error ? "campo-error" : ""}`}
      />
      <button
        type="button"
        className={boton}
        onClick={() => onCambio(acotar(valor + 1))}
        disabled={max !== undefined && valor >= max}
        aria-label={`Sumar una hora a ${etiqueta}`}
      >
        <FiPlus className="h-4 w-4" aria-hidden />
      </button>
      {sufijo && <span className="ms-0.5 text-sm text-[var(--color-texto-suave)]">{sufijo}</span>}
    </div>
  );
}
