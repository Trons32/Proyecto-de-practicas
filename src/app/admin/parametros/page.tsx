"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useConfigStore, valoresOficiales } from "@/lib/stores/config-store";
import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import { useNovedadesStore } from "@/lib/stores/novedades-store";
import { useSesionStore } from "@/lib/stores/sesion-store";
import { legible } from "@/lib/resumen";
import type { ReglaDedicacion, TipoRol } from "@/lib/catalogos";
import {
  diferenciasParametros,
  fotoDeImpacto,
  type CambioParametro,
  type Limites,
  type Parametros,
} from "@/lib/novedades";
import Encabezado from "@/components/Encabezado";
import ImpactoParametros from "@/components/ImpactoParametros";
import Modal from "@/components/Modal";
import { Boton, Campo, Entrada, Insignia } from "@/components/ui";
import { sileo } from "@/lib/toast";
import {
  FiPlus,
  FiTrash2,
  FiRefreshCw,
  FiArrowLeft,
  FiArrowRight,
  FiSearch,
  FiAlertTriangle,
} from "@/components/iconos";

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

/** Copia profunda: el borrador no debe compartir objetos con el store. */
const clonar = (p: Parametros): Parametros => ({
  reglas: Object.fromEntries(Object.entries(p.reglas).map(([k, v]) => [k, { ...v }])),
  roles: p.roles.map((r) => ({ ...r })),
  limites: { ...p.limites },
});

export default function PaginaParametros() {
  const hidratado = useConfigStore((s) => s.hidratado);
  const novedadesHidratadas = useNovedadesStore((s) => s.hidratado);

  if (!hidratado || !novedadesHidratadas) {
    return (
      <main className="px-4 py-6 sm:p-8">
        <Encabezado titulo="Parámetros" descripcion="Cargando…" />
      </main>
    );
  }

  // El borrador se siembra con los valores ya rehidratados: montarlo antes
  // lo llenaría con los del formato y los mostraría como cambios.
  return <EditorParametros />;
}

/**
 * Los cambios se preparan en un borrador y se aplican juntos, con un
 * motivo. Aplicarlos al teclear no dejaba un momento que registrar: cada
 * pulsación era un cambio de parámetros sin autor ni razón.
 */
function EditorParametros() {
  const reglasVigentes = useConfigStore((s) => s.reglas);
  const rolesVigentes = useConfigStore((s) => s.roles);
  const limitesVigentes = useConfigStore((s) => s.limites);
  const vigentes = useMemo<Parametros>(
    () => ({ reglas: reglasVigentes, roles: rolesVigentes, limites: limitesVigentes }),
    [reglasVigentes, rolesVigentes, limitesVigentes]
  );

  const [borrador, setBorrador] = useState<Parametros>(() => clonar(vigentes));
  const { reglas, roles, limites } = borrador;

  const cambios = useMemo(() => diferenciasParametros(vigentes, borrador), [vigentes, borrador]);

  const [busqueda, setBusqueda] = useState("");
  const [nuevoRol, setNuevoRol] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<TipoRol>("DOCENCIA");
  const [revisando, setRevisando] = useState(false);

  // Salir con cambios sin aplicar los perdería sin aviso.
  useEffect(() => {
    if (cambios.length === 0) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [cambios.length]);

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

  const actualizarRegla = (dedicacion: string, cambio: Partial<ReglaDedicacion>) =>
    setBorrador((b) => ({
      ...b,
      reglas: { ...b.reglas, [dedicacion]: { ...b.reglas[dedicacion], ...cambio } },
    }));

  const actualizarLimites = (cambio: Partial<Limites>) =>
    setBorrador((b) => ({ ...b, limites: { ...b.limites, ...cambio } }));

  const actualizarRol = (id: number, cambio: Partial<{ nombre: string; tipo: TipoRol }>) =>
    setBorrador((b) => ({
      ...b,
      roles: b.roles.map((r) => (r.id === id ? { ...r, ...cambio } : r)),
    }));

  const eliminarRol = (id: number) =>
    setBorrador((b) => ({ ...b, roles: b.roles.filter((r) => r.id !== id) }));

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
    setBorrador((b) => ({
      ...b,
      // El id sigue al mayor, vigente o en borrador: los roles del formato
      // ocupan 1..56 y un id reutilizado heredaría las horas de otro rol.
      roles: [
        ...b.roles,
        {
          id: Math.max(0, ...b.roles.map((r) => r.id), ...vigentes.roles.map((r) => r.id)) + 1,
          nombre,
          tipo: nuevoTipo,
        },
      ],
    }));
    setNuevoRol("");
  };

  const restaurar = () => {
    setBorrador(valoresOficiales());
    sileo.success({
      title: "Valores oficiales cargados",
      description: "Revise los cambios y aplíquelos para que surtan efecto.",
    });
  };

  const revisar = () => {
    const nombres = roles.map((r) => r.nombre.trim());
    if (nombres.some((n) => !n)) {
      sileo.error({ title: "Hay un rol sin nombre" });
      return;
    }
    const repetido = nombres.find((n, i) => nombres.indexOf(n) !== i);
    if (repetido) {
      sileo.error({ title: "Hay un rol repetido", description: repetido });
      return;
    }
    setRevisando(true);
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
        <Link href="/admin/novedades">
          <Boton variante="secundario">Ver novedades</Boton>
        </Link>
        <Boton variante="secundario" onClick={restaurar}>
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
                {/* Sin confirmación: la baja queda en el borrador y se
                    descarta o se revisa antes de aplicarla. */}
                <button
                  type="button"
                  onClick={() => eliminarRol(r.id)}
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

      {cambios.length > 0 && (
        <div
          role="status"
          className="tarjeta tarjeta-sombra sticky bottom-4 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 border-amber-300 px-5 py-3"
        >
          <p className="text-sm font-semibold text-[var(--color-texto)]">
            {cambios.length === 1 ? "1 cambio sin aplicar" : `${cambios.length} cambios sin aplicar`}
          </p>
          <div className="flex gap-2">
            <Boton variante="secundario" onClick={() => setBorrador(clonar(vigentes))}>
              Descartar
            </Boton>
            <Boton onClick={revisar}>
              <FiArrowRight aria-hidden /> Revisar y aplicar
            </Boton>
          </div>
        </div>
      )}

      <ModalAplicar
        abierto={revisando}
        onCerrar={() => setRevisando(false)}
        cambios={cambios}
        vigentes={vigentes}
        borrador={borrador}
      />
    </main>
  );
}

/** El resumen del cambio, su impacto previsto y el motivo obligatorio. */
function ModalAplicar({
  abierto,
  onCerrar,
  cambios,
  vigentes,
  borrador,
}: {
  abierto: boolean;
  onCerrar: () => void;
  cambios: CambioParametro[];
  vigentes: Parametros;
  borrador: Parametros;
}) {
  const asignaciones = useAsignacionStore((s) => s.asignaciones);
  const usuario = useSesionStore((s) => s.sesion?.usuario ?? null);
  const aplicarParametros = useNovedadesStore((s) => s.aplicarParametros);
  const [motivo, setMotivo] = useState("");

  // La misma foto que guardará la novedad: el administrador ve a quién
  // afecta antes de confirmar, no después.
  const afectadas = useMemo(
    () =>
      abierto
        ? fotoDeImpacto(
            asignaciones,
            { roles: borrador.roles, reglas: borrador.reglas },
            { roles: vigentes.roles, reglas: vigentes.reglas }
          )
        : [],
    [abierto, asignaciones, borrador, vigentes]
  );

  const eliminaRoles = cambios.some((c) => c.ambito === "rol" && c.despues === null);

  const cerrar = () => {
    setMotivo("");
    onCerrar();
  };

  const confirmar = () => {
    if (!motivo.trim()) {
      sileo.error({
        title: "Falta el motivo",
        description: "Quedará registrado en la novedad junto con los cambios.",
      });
      return;
    }
    if (!usuario) return;
    const novedad = aplicarParametros(borrador, motivo, {
      nombres: usuario.nombres,
      rol: usuario.rol,
    });
    cerrar();
    if (novedad) {
      sileo.success({
        title: `Cambios aplicados · novedad N.º ${novedad.numero}`,
        description:
          novedad.afectadas.length === 0
            ? "Ninguna asignación aprobada quedó afectada."
            : novedad.afectadas.length === 1
              ? "1 asignación aprobada quedó afectada."
              : `${novedad.afectadas.length} asignaciones aprobadas quedaron afectadas.`,
      });
    }
  };

  return (
    <Modal abierto={abierto} onCerrar={cerrar} titulo="Aplicar cambios de parámetros" tamano="lg">
      <ul className="mb-4 max-h-64 divide-y divide-[var(--color-borde)] overflow-y-auto rounded-lg border border-[var(--color-borde)]">
        {cambios.map((c, i) => (
          <li key={i} className="px-3 py-2 text-sm">
            <p className="font-medium text-[var(--color-texto)]">{c.parametro}</p>
            <p className="text-xs text-[var(--color-texto-suave)]">
              <span className={c.antes === null ? "italic" : "line-through"}>
                {c.antes ?? "no existía"}
              </span>
              {" → "}
              <span className="font-semibold text-[var(--color-texto)]">
                {c.despues ?? "eliminado"}
              </span>
            </p>
          </li>
        ))}
      </ul>

      {afectadas.length > 0 ? (
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {afectadas.length === 1
              ? "1 asignación aprobada dejará de cumplir las reglas."
              : `${afectadas.length} asignaciones aprobadas dejarán de cumplir las reglas.`}{" "}
            No se reabrirán solas: podrá decidir sobre cada una en la novedad.
          </span>
        </p>
      ) : (
        <p className="mb-4 rounded-lg bg-[var(--color-superficie)] px-3 py-2 text-sm text-[var(--color-texto-suave)]">
          Ninguna asignación aprobada deja de cumplir las reglas con este cambio.
        </p>
      )}

      {eliminaRoles && (
        <p className="mb-4 text-xs text-[var(--color-texto-suave)]">
          Las asignaciones que usaban un rol eliminado dejarán de sumar sus horas.
        </p>
      )}

      <Campo etiqueta="Motivo" requerido ayuda="Queda registrado en la novedad y no se puede editar.">
        <textarea
          className="campo min-h-24 resize-y"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej.: Rectoría redujo la carga de tiempo completo a 38 h desde 2026-2."
          data-foco-inicial
        />
      </Campo>

      <div className="mt-6 flex gap-3">
        <Boton variante="secundario" className="flex-1" onClick={cerrar}>
          Cancelar
        </Boton>
        <Boton className="flex-1" onClick={confirmar}>
          Aplicar y registrar
        </Boton>
      </div>
    </Modal>
  );
}
