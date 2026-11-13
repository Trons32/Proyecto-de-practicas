"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { FichaDirectorio } from "./directorio";

export type EstadoDirectorio = "inactivo" | "buscando" | "sugiriendo" | "encontrado" | "no_encontrado" | "error";

/** Debe coincidir con `LOTE_SUGERENCIAS` del servidor: un lote lleno puede tener más. */
const LOTE = 30;
/** Cuántas se muestran a la vez. */
const VISIBLES = 8;
/** Pausa antes de pedir un lote nuevo: corta, porque casi siempre filtra el que ya hay. */
const ESPERA_CONSULTA_MS = 150;
/**
 * Pausa antes de llenar la ficha sola. Más larga a propósito: la cédula de
 * 7 dígitos de alguien puede ser el comienzo de la de 10 que se está
 * escribiendo, y no se debe cargar a esa persona por error.
 */
const ESPERA_AUTOLLENADO_MS = 600;

/** La ficha completa de una cédula, con su última asignación. */
async function traerFicha(doc: string, excluir?: string, signal?: AbortSignal): Promise<FichaDirectorio | null> {
  const params = new URLSearchParams({ q: doc, ...(excluir ? { excluir } : {}) });
  const r = await fetch(`/api/docentes/buscar?${params}`, { signal, cache: "no-store" });
  if (!r.ok) throw new Error(String(r.status));
  const { resultados } = (await r.json()) as { resultados: FichaDirectorio[] };
  return resultados.find((f) => f.documento === doc) ?? null;
}

/**
 * Los candidatos para lo escrito, con lo que ya llegó: el lote del prefijo
 * más largo que se tenga, filtrado. `completo` dice si ese lote trae todas
 * las que empiezan así (vino con menos de `LOTE`) o puede faltar alguna.
 */
function candidatos(lotes: Record<string, FichaDirectorio[]>, cedula: string) {
  for (let n = cedula.length; n >= 4; n--) {
    const lote = lotes[cedula.slice(0, n)];
    if (lote) return { lista: lote.filter((f) => f.documento.startsWith(cedula)), completo: lote.length < LOTE };
  }
  return { lista: null, completo: false };
}

/**
 * El directorio de docentes (SPEC-021) desde el campo «Número de
 * documento», sin campo aparte (lo pidió la coordinación).
 *
 * Sugiere **mientras se escribe**, desde el cuarto dígito. Al llegar a él
 * se pide un lote de cédulas que empiezan así; cada dígito siguiente lo
 * filtra en el navegador, al instante y sin red. Solo si el lote vino lleno
 * se pide otro, más específico, tras una pausa corta (debounce) y
 * cancelando el anterior. La primera versión esperaba a que se dejara de
 * teclear: quien escribía seguido no veía ninguna sugerencia.
 *
 * Las sugerencias son livianas (cédula, nombre, código); la ficha completa
 * —con la última asignación— se pide al elegir una, o al escribir la
 * cédula entera de alguien con la ficha aún sin nombre.
 */
export function useDirectorio({
  documento,
  asignacionId,
  activo,
  autoAplicar,
  alEncontrar,
}: {
  documento: string;
  asignacionId?: string;
  /** En solo lectura no se consulta nada. */
  activo: boolean;
  autoAplicar: boolean;
  /** `elegida`: el coordinador la escogió de la lista, y manda sobre lo escrito. */
  alEncontrar: (ficha: FichaDirectorio, elegida: boolean) => void;
}) {
  const [lotes, setLotes] = useState<Record<string, FichaDirectorio[]>>({});
  const [fallo, setFallo] = useState<string | null>(null);
  const [usada, setUsada] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [resaltada, setResaltada] = useState(0);

  // Los efectos no deben repetirse porque cambien estos: se leen del último
  // render a través de una ref.
  const ultimo = useRef({ autoAplicar, alEncontrar, asignacionId });
  useEffect(() => {
    ultimo.current = { autoAplicar, alEncontrar, asignacionId };
  });

  const cedula = documento.trim();
  const buscable = activo && /^\d{4,15}$/.test(cedula);
  const { lista, completo } = buscable ? candidatos(lotes, cedula) : { lista: null, completo: false };
  const exacta = lista?.find((f) => f.documento === cedula) ?? null;

  // Un lote nuevo solo si lo que hay no alcanza.
  useEffect(() => {
    if (!buscable || completo) return;
    const control = new AbortController();
    const espera = window.setTimeout(async () => {
      try {
        const r = await fetch(`/api/docentes/buscar?modo=prefijo&q=${cedula}`, { signal: control.signal, cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const { resultados } = (await r.json()) as { resultados: FichaDirectorio[] };
        // Un lote con cédulas que no empiezan así no es un lote de
        // sugerencias (p. ej. un servidor viejo que no conoce `modo`):
        // guardarlo diría «nadie empieza así» cuando no es verdad.
        if (!resultados.every((f) => f.documento.startsWith(cedula))) throw new Error("respuesta inesperada");
        setLotes((l) => ({ ...l, [cedula]: resultados }));
      } catch (e) {
        if ((e as Error).name !== "AbortError") setFallo(cedula);
      }
    }, ESPERA_CONSULTA_MS);
    return () => {
      window.clearTimeout(espera);
      control.abort();
    };
  }, [cedula, buscable, completo]);

  // Escribió la cédula entera de alguien y la ficha está vacía: se llena
  // sola, sin obligarlo a elegir, cuando deja de teclear.
  const exactaDoc = exacta?.documento ?? null;
  useEffect(() => {
    if (!exactaDoc || usada === exactaDoc || !ultimo.current.autoAplicar) return;
    const control = new AbortController();
    const espera = window.setTimeout(async () => {
      try {
        const ficha = await traerFicha(exactaDoc, ultimo.current.asignacionId, control.signal);
        if (!ficha || !ultimo.current.autoAplicar) return;
        ultimo.current.alEncontrar(ficha, false);
        setUsada(exactaDoc);
        setAbierto(false);
      } catch {
        // Sin red no se llena nada: la lista sigue ahí para elegir a mano.
      }
    }, ESPERA_AUTOLLENADO_MS);
    return () => {
      window.clearTimeout(espera);
      control.abort();
    };
  }, [exactaDoc, usada]);

  const estado: EstadoDirectorio = !buscable
    ? "inactivo"
    : lista === null
      ? fallo === cedula ? "error" : "buscando"
      : exacta ? "encontrado"
      : lista.length > 0 ? "sugiriendo"
      // Vacío y completo: no hay nadie con esa cédula. Con menos de 6
      // dígitos todavía no se dice, porque falta escribir.
      : completo && cedula.length >= 6 ? "no_encontrado" : "buscando";
  // Ya elegida o aplicada, la lista sobra.
  const sugerencias = abierto && lista && usada !== cedula ? lista.slice(0, VISIBLES) : [];
  const indice = Math.min(resaltada, Math.max(sugerencias.length - 1, 0));

  const elegir = async (f: FichaDirectorio) => {
    setAbierto(false);
    setUsada(f.documento);
    try {
      alEncontrar((await traerFicha(f.documento, asignacionId)) ?? f, true);
    } catch {
      // Sin la última ficha, al menos la identidad.
      alEncontrar(f, true);
    }
  };

  return {
    estado,
    ficha: exacta,
    usada: usada === cedula,
    sugerencias,
    resaltada: indice,
    resaltar: setResaltada,
    elegir,
    abrir: () => {
      setAbierto(true);
      setResaltada(0);
    },
    cerrar: () => setAbierto(false),
    usar: () => {
      if (exacta) void elegir(exacta);
    },
    /** ↑ ↓ para moverse, Enter para elegir, Esc para cerrar. */
    teclado: (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setAbierto(false);
        return;
      }
      if (sugerencias.length === 0) {
        if (e.key === "ArrowDown") setAbierto(true);
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const paso = e.key === "ArrowDown" ? 1 : -1;
        setResaltada((indice + paso + sugerencias.length) % sugerencias.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        void elegir(sugerencias[indice] ?? sugerencias[0]);
      }
    },
  };
}
