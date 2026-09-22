"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useConfigStore } from "@/lib/stores/config-store";
import { legible } from "@/lib/resumen";
import type { TipoRol } from "@/lib/catalogos";
import Encabezado from "@/components/Encabezado";
import ModalConfirmacion from "@/components/ModalConfirmacion";
import ImpactoParametros from "@/components/ImpactoParametros";
import { Boton, Campo, Entrada, Insignia } from "@/components/ui";
import { sileo } from "@/lib/toast";
import { FiPlus, FiTrash2, FiRefreshCw, FiArrowLeft, FiSearch } from "@/components/iconos";

const TIPOS: { valor: TipoRol; texto: string }[] = [
  { valor: "DOCENCIA", texto: "Docencia" },
  { valor: "INVESTIGACION", texto: "Investigación" },
  { valor: "EXTENSION", texto: "Extensión y P. Social" },
];

const TONO_TIPO: Record<TipoRol, "verde" | "azul" | "ambar"> = {
  DOCENCIA: "verde",
  INVESTIGACION: "azul",
  EXTENSION: "ambar",
};

/** Las cuatro cifras que definen cada dedicación. */
const COLUMNAS = [
  { clave: "maxHoras", etiqueta: "Máx. horas" },
  { clave: "preparacion", etiqueta: "Preparación" },
  { clave: "atencion", etiqueta: "Atención" },
  { clave: "comunidades", etiqueta: "Comunidades" },
] as const;

export default function Parametros() {
  const reglas = useConfigStore((s) => s.reglas);
  const roles = useConfigStore((s) => s.roles);
  const limites = useConfigStore((s) => s.limites);
  const hidratado = useConfigStore((s) => s.hidratado);

  const actualizarRegla = useConfigStore((s) => s.actualizarRegla);
  const actualizarLimites = useConfigStore((s) => s.actualizarLimites);
  const agregarRol = useConfigStore((s) => s.agregarRol);
  const actualizarRol = useConfigStore((s) => s.actualizarRol);
  const eliminarRol = useConfigStore((s) => s.eliminarRol);
  const restaurar = useConfigStore((s) => s.restaurarValoresOficiales);

  const [busqueda, setBusqueda] = useState("");
  const [nuevoRol, setNuevoRol] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<TipoRol>("DOCENCIA");
  const [porEliminar, setPorEliminar] = useState<number | null>(null);
  const [confirmarRestaurar, setConfirmarRestaurar] = useState(false);

  const rolesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q ? roles.filter((r) => r.nombre.toLowerCase().includes(q)) : roles;
  }, [roles, busqueda]);

  const porTipo = useMemo(
    () =>
      TIPOS.map((t) => ({
        ...t,
        total: roles.filter((r) => r.tipo === t.valor).length,
      })),
    [roles]
  );

  if (!hidratado) {
    return (
      <main className="px-4 py-6 sm:p-8">
        <Encabezado titulo="Parámetros" descripcion="Cargando…" />
      </main>
    );
  }

  const crearRol = () => {
    const nombre = nuevoRol.trim().toUpperCase();
    if (!nombre) {
      sileo.error({ title: "Falta el nombre del rol" });
      return;
    }
    if (roles.some((r) => r.nombre.toUpperCase() === nombre)) {
      sileo.error({ title: "Ese rol ya existe", description: nombre });
      return;
    }
    agregarRol(nombre, nuevoTipo);
    setNuevoRol("");
    sileo.success({ title: "Rol agregado", description: nombre });
  };

  const confirmarEliminarRol = () => {
    if (porEliminar === null) return;
    const eliminado = eliminarRol(porEliminar);
    setPorEliminar(null);
    if (eliminado) {
      sileo.success({ title: "Rol eliminado", description: eliminado.nombre });
    }
  };

  const aplicarRestauracion = () => {
    restaurar();
    setConfirmarRestaurar(false);
    sileo.success({
      title: "Valores restaurados",
      description: "Se recuperaron los parámetros del formato oficial.",
    });
  };

  return (
    <main className="px-4 py-6 sm:p-8">
      <Encabezado
        titulo="Parámetros"
        descripcion="Los valores que rigen el cálculo de todas las asignaciones"
        volver={
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-texto-suave)] transition hover:text-cecar-700"
          >
            <FiArrowLeft aria-hidden /> Volver al panel
          </Link>
        }
      >
        <Boton variante="secundario" onClick={() => setConfirmarRestaurar(true)}>
          <FiRefreshCw aria-hidden /> Restaurar valores oficiales
        </Boton>
      </Encabezado>

      {/* Va antes que los controles: el administrador debe ver el efecto de
          lo que ya cambió antes de seguir cambiando. */}
      <ImpactoParametros />

      {/* ---------------- Dedicaciones ---------------- */}
      <section className="tarjeta tarjeta-sombra mb-6 overflow-hidden">
        <header className="border-b border-[var(--color-borde)] bg-cecar-50/60 px-5 py-4">
          <h3 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">
            Dedicación docente
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-texto-suave)]">
            Tope de horas semanales y horas de apoyo académico que se precargan por dedicación
          </p>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-borde)] text-left">
                <th className="px-5 py-3 text-[11px] font-semibold tracking-wide text-[var(--color-texto-suave)] uppercase">
                  Dedicación
                </th>
                {COLUMNAS.map((c) => (
                  <th
                    key={c.clave}
                    className="px-3 py-3 text-[11px] font-semibold tracking-wide text-[var(--color-texto-suave)] uppercase"
                  >
                    {c.etiqueta}
                  </th>
                ))}
                <th className="px-5 py-3 text-right text-[11px] font-semibold tracking-wide text-[var(--color-texto-suave)] uppercase">
                  Apoyo total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-borde)]">
              {Object.entries(reglas).map(([dedicacion, r]) => (
                <tr key={dedicacion}>
                  <td className="px-5 py-3 font-medium text-[var(--color-texto)]">
                    {legible(dedicacion)}
                  </td>
                  {COLUMNAS.map((c) => (
                    <td key={c.clave} className="px-3 py-3">
                      <Entrada
                        type="number"
                        min={0}
                        className="w-24"
                        value={r[c.clave]}
                        onChange={(e) =>
                          actualizarRegla(dedicacion, {
                            [c.clave]: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                      />
                    </td>
                  ))}
                  <td className="px-5 py-3 text-right font-bold tabular-nums text-[var(--color-texto)]">
                    {r.preparacion + r.atencion + r.comunidades} h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------- Límites del formato ---------------- */}
      <section className="tarjeta tarjeta-sombra mb-6 overflow-hidden">
        <header className="border-b border-[var(--color-borde)] bg-cecar-50/60 px-5 py-4">
          <h3 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">
            Límites del formato
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-texto-suave)]">
            Cuántos registros puede agregar el coordinador por docente
          </p>
        </header>

        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Campo etiqueta="Máximo de cursos">
            <Entrada
              type="number"
              min={1}
              value={limites.maxCursos}
              onChange={(e) =>
                actualizarLimites({ maxCursos: Math.max(1, Number(e.target.value) || 1) })
              }
            />
          </Campo>
          <Campo etiqueta="Máximo de descargas">
            <Entrada
              type="number"
              min={1}
              value={limites.maxDescargas}
              onChange={(e) =>
                actualizarLimites({ maxDescargas: Math.max(1, Number(e.target.value) || 1) })
              }
            />
          </Campo>
          <Campo etiqueta="Máximo de administrativas">
            <Entrada
              type="number"
              min={1}
              value={limites.maxAdministrativas}
              onChange={(e) =>
                actualizarLimites({ maxAdministrativas: Math.max(1, Number(e.target.value) || 1) })
              }
            />
          </Campo>
        </div>
      </section>

      {/* ---------------- Roles ---------------- */}
      <section className="tarjeta tarjeta-sombra overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-borde)] bg-cecar-50/60 px-5 py-4">
          <div>
            <h3 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">
              Roles de descarga y actividades
            </h3>
            <p className="mt-0.5 text-xs text-[var(--color-texto-suave)]">
              {roles.length} roles · el tipo determina a qué categoría suman las horas
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {porTipo.map((t) => (
              <Insignia key={t.valor} tono={TONO_TIPO[t.valor]}>
                {t.texto}: {t.total}
              </Insignia>
            ))}
          </div>
        </header>

        {/* Alta de un rol nuevo */}
        <div className="grid gap-3 border-b border-[var(--color-borde)] bg-[var(--color-superficie)]/50 p-5 sm:grid-cols-[1fr_14rem_auto] sm:items-end">
          <Campo etiqueta="Nombre del rol">
            <Entrada
              value={nuevoRol}
              onChange={(e) => setNuevoRol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && crearRol()}
              placeholder="COORDINADOR DE LABORATORIO"
            />
          </Campo>
          <Campo etiqueta="Tipo">
            {/* Sin opción vacía: todo rol pertenece a una categoría. */}
            <select
              value={nuevoTipo}
              onChange={(e) => setNuevoTipo(e.target.value as TipoRol)}
              aria-label="Tipo del nuevo rol"
              className="campo"
            >
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.texto}
                </option>
              ))}
            </select>
          </Campo>
          <Boton onClick={crearRol}>
            <FiPlus aria-hidden /> Agregar rol
          </Boton>
        </div>

        <div className="border-b border-[var(--color-borde)] px-5 py-3">
          <div className="relative">
            <FiSearch
              className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-texto-suave)]/60"
              aria-hidden
            />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar rol…"
              aria-label="Buscar rol"
              className="campo ps-9"
            />
          </div>
        </div>

        {rolesFiltrados.length === 0 ? (
          <p className="p-10 text-center text-sm text-[var(--color-texto-suave)]">
            Ningún rol coincide con «{busqueda}».
          </p>
        ) : (
          <ul className="max-h-[32rem] divide-y divide-[var(--color-borde)] overflow-y-auto">
            {rolesFiltrados.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <input
                  value={r.nombre}
                  onChange={(e) => actualizarRol(r.id, { nombre: e.target.value.toUpperCase() })}
                  aria-label={`Nombre del rol ${r.nombre}`}
                  className="campo min-w-0 flex-1"
                />
                <select
                  value={r.tipo}
                  onChange={(e) => actualizarRol(r.id, { tipo: e.target.value as TipoRol })}
                  aria-label={`Tipo del rol ${r.nombre}`}
                  className="campo w-full sm:w-52"
                >
                  {TIPOS.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.texto}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setPorEliminar(r.id)}
                  aria-label={`Eliminar ${r.nombre}`}
                  title="Eliminar rol"
                  className="shrink-0 rounded-lg p-2 text-[var(--color-texto-suave)] transition
                             hover:bg-rose-50 hover:text-rose-600
                             focus:ring-2 focus:ring-rose-500/30 focus:outline-none"
                >
                  <FiTrash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ModalConfirmacion
        abierto={porEliminar !== null}
        onCerrar={() => setPorEliminar(null)}
        onConfirmar={confirmarEliminarRol}
        titulo="Eliminar rol"
        mensaje="Las asignaciones que ya usaban este rol dejarán de sumar sus horas."
        detalle={roles.find((r) => r.id === porEliminar)?.nombre}
        etiquetaConfirmar="Eliminar"
        peligro
      />

      <ModalConfirmacion
        abierto={confirmarRestaurar}
        onCerrar={() => setConfirmarRestaurar(false)}
        onConfirmar={aplicarRestauracion}
        titulo="Restaurar valores oficiales"
        mensaje="Se perderán todos los cambios de parámetros y roles."
        detalle="Volverán las reglas, límites y los 56 roles del formato oficial."
        etiquetaConfirmar="Restaurar"
        peligro
      />
    </main>
  );
}
