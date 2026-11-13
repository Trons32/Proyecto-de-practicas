"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useConfigStore, valoresOficiales } from "@/lib/stores/config-store";
import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import { useNovedadesStore } from "@/lib/stores/novedades-store";
import { useSesionStore } from "@/lib/stores/sesion-store";
import { legible } from "@/lib/resumen";
import type { ReglaDedicacion, TipoRol } from "@/lib/catalogos";
import {
  diferenciasParametros,
  ETIQUETA_CLASE,
  fotoDeImpacto,
  motivoPorDefecto,
  periodoDeReferencia,
  tituloDe,
  type Limites,
  type Parametros,
  type RolParametro,
} from "@/lib/novedades";
import Encabezado from "@/components/Encabezado";
import ImpactoParametros from "@/components/ImpactoParametros";
import Modal from "@/components/Modal";
import { Boton, Campo, Entrada, Insignia } from "@/components/ui";
import { sileo } from "@/lib/toast";
import {
  FiPlus,
  FiRefreshCw,
  FiArrowLeft,
  FiSearch,
  FiAlertTriangle,
  FiEdit3,
  FiEye,
  FiEyeOff,
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

const CAMPOS_LIMITE = [
  { clave: "maxCursos", etiqueta: "Máximo de cursos" },
  { clave: "maxDescargas", etiqueta: "Máximo de descargas" },
  { clave: "maxAdministrativas", etiqueta: "Máximo de administrativas" },
] as const;

/** Lo que el administrador está editando; cada caso abre su propio modal. */
type Edicion =
  | { caso: "rol"; rol: RolParametro | null }
  | { caso: "estadoRol"; rol: RolParametro }
  | { caso: "dedicacion"; dedicacion: string }
  | { caso: "limites" }
  | { caso: "oficiales" };

/** Un número escrito en un campo: entero ≥ `min`, o `null` si no lo es. */
const entero = (texto: string, min: number) => {
  if (!/^\d+$/.test(texto.trim())) return null;
  const n = Number(texto);
  return n >= min ? n : null;
};

const useVigentes = (): Parametros => {
  const reglas = useConfigStore((s) => s.reglas);
  const roles = useConfigStore((s) => s.roles);
  const limites = useConfigStore((s) => s.limites);
  return useMemo(() => ({ reglas, roles, limites }), [reglas, roles, limites]);
};

export default function PaginaParametros() {
  const hidratado = useConfigStore((s) => s.hidratado);
  const novedadesHidratadas = useNovedadesStore((s) => s.hidratado);
  const asignacionesHidratadas = useAsignacionStore((s) => s.hidratado);

  // El impacto de cada cambio se calcula contra las asignaciones: sin ellas
  // un cambio que rompe aprobadas parecería inocuo.
  if (!hidratado || !novedadesHidratadas || !asignacionesHidratadas) {
    return (
      <main className="px-4 py-6 sm:p-8">
        <Encabezado titulo="Parámetros" descripcion="Cargando…" />
      </main>
    );
  }
  return <EditorParametros />;
}

/**
 * Cada cosa se cambia por separado, en un modal, y se guarda al pulsar
 * Guardar (SPEC-012). Antes todo era un solo borrador con "Revisar y
 * aplicar": un rol recién agregado parecía guardado sin estarlo.
 */
function EditorParametros() {
  const { reglas, roles, limites } = useVigentes();
  const [busqueda, setBusqueda] = useState("");
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const cerrar = () => setEdicion(null);

  // Activos primero: los inactivos solo están para reactivarlos.
  const rolesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return roles
      .filter((r) => !q || r.nombre.toLowerCase().includes(q))
      .sort((a, b) => Number(Boolean(a.inactivo)) - Number(Boolean(b.inactivo)));
  }, [roles, busqueda]);

  const activos = roles.filter((r) => !r.inactivo);
  const porTipo = TIPOS.map((t) => ({ ...t, total: activos.filter((r) => r.tipo === t.valor).length }));
  const inactivos = roles.length - activos.length;

  const botonEditar = (etiqueta: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      title={etiqueta}
      className="shrink-0 rounded-lg p-2 text-[var(--color-texto-suave)] transition
                 hover:bg-cecar-50 hover:text-cecar-700
                 focus:ring-2 focus:ring-cecar-500/30 focus:outline-none"
    >
      <FiEdit3 className="h-4 w-4" aria-hidden />
    </button>
  );

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
          <Boton variante="secundario">Novedades</Boton>
        </Link>
        <Link href="/admin/observaciones">
          <Boton variante="secundario">Observaciones</Boton>
        </Link>
        <Boton variante="secundario" onClick={() => setEdicion({ caso: "oficiales" })}>
          <FiRefreshCw aria-hidden /> Restaurar valores oficiales
        </Boton>
      </Encabezado>

      {/* Va antes que los controles: el administrador debe ver el efecto de
          lo que ya cambió antes de seguir cambiando. */}
      <ImpactoParametros />

      {/* ---------------- Dedicaciones ---------------- */}
      <section className="tarjeta tarjeta-sombra mb-6 overflow-hidden">
        <header className="border-b border-[var(--color-borde)] bg-cecar-50/60 px-5 py-4">
          <h3 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">Dedicación docente</h3>
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
                    className="px-3 py-3 text-right text-[11px] font-semibold tracking-wide text-[var(--color-texto-suave)] uppercase"
                  >
                    {c.etiqueta}
                  </th>
                ))}
                <th className="px-3 py-3 text-right text-[11px] font-semibold tracking-wide text-[var(--color-texto-suave)] uppercase">
                  Apoyo total
                </th>
                <th className="w-14 px-3 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-borde)]">
              {Object.entries(reglas).map(([dedicacion, r]) => (
                <tr key={dedicacion}>
                  <td className="px-5 py-3 font-medium text-[var(--color-texto)]">{legible(dedicacion)}</td>
                  {COLUMNAS.map((c) => (
                    <td key={c.clave} className="px-3 py-3 text-right tabular-nums text-[var(--color-texto)]">
                      {r[c.clave]}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right font-bold tabular-nums text-[var(--color-texto)]">
                    {r.preparacion + r.atencion + r.comunidades} h
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {botonEditar(`Editar ${legible(dedicacion)}`, () =>
                      setEdicion({ caso: "dedicacion", dedicacion })
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------- Límites del formato ---------------- */}
      <section className="tarjeta tarjeta-sombra mb-6 overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--color-borde)] bg-cecar-50/60 px-5 py-4">
          <div>
            <h3 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">Límites del formato</h3>
            <p className="mt-0.5 text-xs text-[var(--color-texto-suave)]">
              Cuántos registros puede agregar el coordinador por docente
            </p>
          </div>
          {botonEditar("Editar límites", () => setEdicion({ caso: "limites" }))}
        </header>

        <dl className="grid gap-4 p-5 sm:grid-cols-3">
          {CAMPOS_LIMITE.map((c) => (
            <div key={c.clave}>
              <dt className="etiqueta">{c.etiqueta}</dt>
              <dd className="text-lg font-bold tabular-nums text-[var(--color-texto)]">{limites[c.clave]}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ---------------- Roles ---------------- */}
      <section className="tarjeta tarjeta-sombra overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-borde)] bg-cecar-50/60 px-5 py-4">
          <div>
            <h3 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">
              Roles de descarga y actividades
            </h3>
            <p className="mt-0.5 text-xs text-[var(--color-texto-suave)]">
              {activos.length} activos{inactivos > 0 ? ` · ${inactivos} inactivos` : ""} · el tipo determina a
              qué categoría suman las horas
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {porTipo.map((t) => (
              <Insignia key={t.valor} tono={TONO_TIPO[t.valor]}>
                {t.texto}: {t.total}
              </Insignia>
            ))}
            <Boton onClick={() => setEdicion({ caso: "rol", rol: null })}>
              <FiPlus aria-hidden /> Nuevo rol
            </Boton>
          </div>
        </header>

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
              <li key={r.id} className={`flex items-center gap-3 px-5 py-2.5 ${r.inactivo ? "opacity-60" : ""}`}>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-texto)]">
                  {r.nombre}
                </span>
                {r.inactivo ? (
                  <Insignia>Inactivo</Insignia>
                ) : (
                  <Insignia tono={TONO_TIPO[r.tipo]}>{TIPOS.find((t) => t.valor === r.tipo)?.texto}</Insignia>
                )}
                {botonEditar(`Editar ${r.nombre}`, () => setEdicion({ caso: "rol", rol: r }))}
                <button
                  type="button"
                  onClick={() => setEdicion({ caso: "estadoRol", rol: r })}
                  aria-label={r.inactivo ? `Reactivar ${r.nombre}` : `Desactivar ${r.nombre}`}
                  title={r.inactivo ? "Reactivar rol" : "Desactivar rol"}
                  className="shrink-0 rounded-lg p-2 text-[var(--color-texto-suave)] transition
                             hover:bg-rose-50 hover:text-rose-600
                             focus:ring-2 focus:ring-rose-500/30 focus:outline-none"
                >
                  {r.inactivo ? <FiEye className="h-4 w-4" aria-hidden /> : <FiEyeOff className="h-4 w-4" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Se montan al abrir: cada modal siembra sus campos con lo vigente. */}
      {edicion?.caso === "rol" && <ModalRol rol={edicion.rol} onCerrar={cerrar} />}
      {edicion?.caso === "estadoRol" && <ModalEstadoRol rol={edicion.rol} onCerrar={cerrar} />}
      {edicion?.caso === "dedicacion" && <ModalDedicacion dedicacion={edicion.dedicacion} onCerrar={cerrar} />}
      {edicion?.caso === "limites" && <ModalLimites onCerrar={cerrar} />}
      {edicion?.caso === "oficiales" && (
        <ModalParametro
          titulo="Restaurar valores oficiales"
          onCerrar={cerrar}
          siguiente={(v) => ({ ...valoresOficiales(), roles: conRolesOficiales(v.roles) })}
          motivoObligatorio
          etiquetaGuardar="Restaurar"
        >
          <p className="text-sm text-[var(--color-texto-suave)]">
            Vuelven las horas, los límites y los roles del formato oficial. Los roles creados aquí quedan
            inactivos, no se borran.
          </p>
        </ModalParametro>
      )}
    </main>
  );
}

/**
 * Los roles del formato, más los creados aquí marcados inactivos: un rol no
 * desaparece de la lista porque las asignaciones lo siguen referenciando.
 */
function conRolesOficiales(vigentes: RolParametro[]): RolParametro[] {
  const oficiales = valoresOficiales().roles;
  const ids = new Set(oficiales.map((r) => r.id));
  return [...oficiales, ...vigentes.filter((r) => !ids.has(r.id)).map((r) => ({ ...r, inactivo: true as const }))];
}

function ModalRol({ rol, onCerrar }: { rol: RolParametro | null; onCerrar: () => void }) {
  const roles = useConfigStore((s) => s.roles);
  const [nombre, setNombre] = useState(rol?.nombre ?? "");
  const [tipo, setTipo] = useState<TipoRol>(rol?.tipo ?? "DOCENCIA");

  const limpio = nombre.trim().toUpperCase();
  // Contra todos, también los inactivos: el nombre es único en la base.
  const repetido = roles.some((r) => r.id !== rol?.id && r.nombre.toUpperCase() === limpio);
  const error = !limpio ? "Escriba el nombre del rol." : repetido ? "Ya existe un rol con ese nombre." : null;

  return (
    <ModalParametro
      titulo={rol ? "Editar rol" : "Nuevo rol"}
      onCerrar={onCerrar}
      siguiente={
        error
          ? null
          : (v) =>
              rol
                ? { ...v, roles: v.roles.map((r) => (r.id === rol.id ? { ...r, nombre: limpio, tipo } : r)) }
                : {
                    ...v,
                    // El id sigue al mayor: los del formato ocupan 1..56 y uno
                    // reutilizado heredaría las horas de otro rol.
                    roles: [...v.roles, { id: Math.max(0, ...v.roles.map((r) => r.id)) + 1, nombre: limpio, tipo }],
                  }
      }
      etiquetaGuardar={rol ? "Guardar" : "Crear rol"}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
        <Campo etiqueta="Nombre del rol" requerido error={Boolean(nombre) && Boolean(error)} ayuda={nombre ? (error ?? undefined) : undefined}>
          <Entrada
            value={nombre}
            onChange={(e) => setNombre(e.target.value.toUpperCase())}
            placeholder="COORDINADOR DE LABORATORIO"
            error={Boolean(nombre) && Boolean(error)}
            data-foco-inicial
          />
        </Campo>
        <Campo etiqueta="Tipo" requerido>
          {/* Sin opción vacía: todo rol pertenece a una categoría. */}
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoRol)} className="campo">
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.texto}
              </option>
            ))}
          </select>
        </Campo>
      </div>
    </ModalParametro>
  );
}

function ModalEstadoRol({ rol, onCerrar }: { rol: RolParametro; onCerrar: () => void }) {
  const asignaciones = useAsignacionStore((s) => s.asignaciones);
  const usos = useMemo(
    () =>
      asignaciones.filter((a) =>
        a.docentes.some((d) => [...d.descargas, ...d.administrativas].some((x) => x.rolId === rol.id))
      ).length,
    [asignaciones, rol.id]
  );
  const desactivar = !rol.inactivo;

  return (
    <ModalParametro
      titulo={desactivar ? "Desactivar rol" : "Reactivar rol"}
      onCerrar={onCerrar}
      siguiente={(v) => ({
        ...v,
        roles: v.roles.map((r) => {
          if (r.id !== rol.id) return r;
          if (desactivar) return { ...r, inactivo: true as const };
          const activo = { ...r };
          delete activo.inactivo;
          return activo;
        }),
      })}
      etiquetaGuardar={desactivar ? "Desactivar" : "Reactivar"}
      peligro={desactivar}
    >
      <p className="text-sm text-[var(--color-texto)]">
        <strong>{rol.nombre}</strong>{" "}
        {desactivar
          ? "dejará de ofrecerse al coordinador en descargas y actividades."
          : "volverá a ofrecerse al coordinador."}
      </p>
      {desactivar && (
        <p className="mt-2 text-sm text-[var(--color-texto-suave)]">
          {usos === 0
            ? "Ninguna asignación lo usa."
            : `${usos === 1 ? "1 asignación lo usa" : `${usos} asignaciones lo usan`}: conservan el rol y sus horas siguen sumando.`}
        </p>
      )}
    </ModalParametro>
  );
}

function ModalDedicacion({ dedicacion, onCerrar }: { dedicacion: string; onCerrar: () => void }) {
  const regla = useConfigStore((s) => s.reglas[dedicacion]);
  const [valores, setValores] = useState<Record<keyof ReglaDedicacion, string>>(() => ({
    maxHoras: String(regla.maxHoras),
    preparacion: String(regla.preparacion),
    atencion: String(regla.atencion),
    comunidades: String(regla.comunidades),
  }));

  const numeros = Object.fromEntries(
    COLUMNAS.map((c) => [c.clave, entero(valores[c.clave], c.clave === "maxHoras" ? 1 : 0)])
  ) as Record<keyof ReglaDedicacion, number | null>;
  const invalidos = COLUMNAS.filter((c) => numeros[c.clave] === null).map((c) => c.clave);
  const apoyo = (numeros.preparacion ?? 0) + (numeros.atencion ?? 0) + (numeros.comunidades ?? 0);
  const excede = invalidos.length === 0 && apoyo > (numeros.maxHoras ?? 0);
  const valida = invalidos.length === 0 && !excede;

  return (
    <ModalParametro
      titulo={`Dedicación · ${legible(dedicacion)}`}
      onCerrar={onCerrar}
      siguiente={
        valida
          ? (v) => ({ ...v, reglas: { ...v.reglas, [dedicacion]: numeros as ReglaDedicacion } })
          : null
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {COLUMNAS.map((c, i) => (
          <Campo
            key={c.clave}
            etiqueta={c.clave === "maxHoras" ? "Máximo de horas" : c.etiqueta}
            requerido
            error={invalidos.includes(c.clave)}
            ayuda={invalidos.includes(c.clave) ? `Entero ≥ ${c.clave === "maxHoras" ? 1 : 0}.` : undefined}
          >
            <Entrada
              type="number"
              min={c.clave === "maxHoras" ? 1 : 0}
              value={valores[c.clave]}
              onChange={(e) => setValores((x) => ({ ...x, [c.clave]: e.target.value }))}
              error={invalidos.includes(c.clave)}
              {...(i === 0 ? { "data-foco-inicial": true } : {})}
            />
          </Campo>
        ))}
      </div>
      <p className={`mt-3 text-sm ${excede ? "font-medium text-rose-600" : "text-[var(--color-texto-suave)]"}`}>
        Apoyo total: <strong className="tabular-nums">{apoyo} h</strong>
        {excede && ` · supera el máximo de ${numeros.maxHoras} h`}
      </p>
    </ModalParametro>
  );
}

function ModalLimites({ onCerrar }: { onCerrar: () => void }) {
  const limites = useConfigStore((s) => s.limites);
  const [valores, setValores] = useState<Record<keyof Limites, string>>(() => ({
    maxCursos: String(limites.maxCursos),
    maxDescargas: String(limites.maxDescargas),
    maxAdministrativas: String(limites.maxAdministrativas),
  }));
  const numeros = Object.fromEntries(
    CAMPOS_LIMITE.map((c) => [c.clave, entero(valores[c.clave], 1)])
  ) as Record<keyof Limites, number | null>;
  const valida = CAMPOS_LIMITE.every((c) => numeros[c.clave] !== null);

  return (
    <ModalParametro
      titulo="Límites del formato"
      onCerrar={onCerrar}
      siguiente={valida ? (v) => ({ ...v, limites: numeros as Limites }) : null}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {CAMPOS_LIMITE.map((c, i) => (
          <Campo
            key={c.clave}
            etiqueta={c.etiqueta}
            requerido
            error={numeros[c.clave] === null}
            ayuda={numeros[c.clave] === null ? "Entero ≥ 1." : undefined}
          >
            <Entrada
              type="number"
              min={1}
              value={valores[c.clave]}
              onChange={(e) => setValores((x) => ({ ...x, [c.clave]: e.target.value }))}
              error={numeros[c.clave] === null}
              {...(i === 0 ? { "data-foco-inicial": true } : {})}
            />
          </Campo>
        ))}
      </div>
    </ModalParametro>
  );
}

/**
 * El modal común: campos, resumen antes → después, impacto, motivo y
 * guardar. `siguiente` recibe lo vigente **al guardar**, no una copia de
 * cuando se abrió, para que dos cambios seguidos no se pisen. `null` = hay
 * errores en los campos.
 */
function ModalParametro({
  titulo,
  onCerrar,
  siguiente,
  motivoObligatorio = false,
  etiquetaGuardar = "Guardar",
  peligro = false,
  children,
}: {
  titulo: string;
  onCerrar: () => void;
  siguiente: ((vigentes: Parametros) => Parametros) | null;
  motivoObligatorio?: boolean;
  etiquetaGuardar?: string;
  peligro?: boolean;
  children: ReactNode;
}) {
  const vigentes = useVigentes();
  const asignaciones = useAsignacionStore((s) => s.asignaciones);
  const usuario = useSesionStore((s) => s.sesion?.usuario ?? null);
  const aplicarParametros = useNovedadesStore((s) => s.aplicarParametros);
  const convocatorias = useConfigStore((s) => s.convocatorias);
  // Lo mismo que decidirá el store al guardar (SPEC-013): se avisa antes.
  const referencia = periodoDeReferencia(convocatorias);
  const clase = ETIQUETA_CLASE[referencia.cerrada ? "novedad" : "observacion"].singular.toLowerCase();
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const propuesta = siguiente ? siguiente(vigentes) : null;
  const cambios = useMemo(() => (propuesta ? diferenciasParametros(vigentes, propuesta) : []), [vigentes, propuesta]);
  // La misma foto que guardará la novedad: se ve a quién afecta antes de guardar.
  const afectadas = useMemo(
    () =>
      propuesta && cambios.length > 0
        ? fotoDeImpacto(
            asignaciones,
            { roles: propuesta.roles, reglas: propuesta.reglas },
            { roles: vigentes.roles, reglas: vigentes.reglas }
          )
        : [],
    [asignaciones, propuesta, vigentes, cambios.length]
  );

  const exigeMotivo = motivoObligatorio || afectadas.length > 0;
  const faltaMotivo = exigeMotivo && !motivo.trim();
  const puedeGuardar = Boolean(propuesta) && cambios.length > 0 && !faltaMotivo && !guardando && Boolean(usuario);

  const guardar = async () => {
    if (!siguiente || !usuario || !puedeGuardar) return;
    setGuardando(true);
    setError(null);
    const r = await aplicarParametros(siguiente(vigentesActuales()), motivo, {
      nombres: usuario.nombres,
      rol: usuario.rol,
    });
    setGuardando(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    onCerrar();
    const n = r.novedad.afectadas.length;
    sileo.success({
      title: `Guardado · ${tituloDe(useNovedadesStore.getState().novedades, r.novedad).toLowerCase()}`,
      description:
        n === 0
          ? r.novedad.motivo
          : `${n === 1 ? "1 asignación entregada quedó afectada" : `${n} asignaciones entregadas quedaron afectadas`}. Decida en ${tituloDe(useNovedadesStore.getState().novedades, r.novedad)}.`,
    });
  };

  return (
    <Modal abierto onCerrar={guardando ? () => {} : onCerrar} titulo={titulo} tamano="lg">
      {children}

      {cambios.length > 0 && (
        <ul className="mt-5 max-h-48 divide-y divide-[var(--color-borde)] overflow-y-auto rounded-lg border border-[var(--color-borde)]">
          {cambios.map((c, i) => (
            <li key={i} className="px-3 py-2 text-sm">
              <p className="font-medium text-[var(--color-texto)]">{c.parametro}</p>
              <p className="text-xs text-[var(--color-texto-suave)]">
                <span className={c.antes === null ? "italic" : "line-through"}>{c.antes ?? "no existía"}</span>
                {" → "}
                <span className="font-semibold text-[var(--color-texto)]">{c.despues ?? "eliminado"}</span>
              </p>
            </li>
          ))}
        </ul>
      )}

      {cambios.length > 0 && (
        <p className="mt-4 text-xs text-[var(--color-texto-suave)]">
          Se registrará como <strong className="text-[var(--color-texto)]">{clase}</strong>:{" "}
          {referencia.periodo
            ? `la convocatoria ${referencia.periodo} está ${referencia.cerrada ? "cerrada" : "abierta"}.`
            : "aún no se ha cerrado ninguna convocatoria."}
        </p>
      )}

      {afectadas.length > 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {afectadas.length === 1
              ? "1 asignación entregada dejará de cumplir las reglas."
              : `${afectadas.length} asignaciones entregadas dejarán de cumplir las reglas.`}{" "}
            No se reabrirán solas: podrá decidir sobre cada una en la {clase}.
          </span>
        </p>
      )}

      {cambios.length > 0 && (
        <Campo
          etiqueta="Motivo"
          requerido={exigeMotivo}
          className="mt-4"
          ayuda={
            exigeMotivo
              ? `Obligatorio: queda en la ${clase} y no se puede editar.`
              : `Opcional. Si lo deja vacío se registra «${motivoPorDefecto(cambios)}».`
          }
        >
          <textarea
            className="campo min-h-20 resize-y"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej.: Rectoría redujo la carga de tiempo completo a 38 h desde 2026-2."
          />
        </Campo>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          No se guardó: {error}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <Boton variante="secundario" className="flex-1" onClick={onCerrar} disabled={guardando}>
          Cancelar
        </Boton>
        <Boton
          variante={peligro ? "peligroSolido" : "primario"}
          className="flex-1"
          onClick={guardar}
          disabled={!puedeGuardar}
        >
          {guardando ? "Guardando…" : etiquetaGuardar}
        </Boton>
      </div>
    </Modal>
  );
}

/** Lo vigente en el instante de guardar, fuera del ciclo de render. */
function vigentesActuales(): Parametros {
  const { reglas, roles, limites } = useConfigStore.getState();
  return { reglas, roles, limites };
}
