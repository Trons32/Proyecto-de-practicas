"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useNovedadesStore } from "@/lib/stores/novedades-store";
import {
  claseDe,
  estaAtendida,
  ETIQUETA_AMBITO,
  ETIQUETA_CLASE,
  numeroEnSuClase,
  RUTA_CLASE,
  rutaDe,
  type AmbitoCambio,
  type ClaseRegistro,
} from "@/lib/novedades";
import { fechaHoraLegible } from "@/lib/convocatoria";
import Encabezado from "@/components/Encabezado";
import { Boton, Campo, Insignia, Paginacion, Seleccion, TarjetaStat } from "@/components/ui";
import { FiArrowRight, FiBell, FiAlertTriangle, FiCheckCircle } from "@/components/iconos";

const POR_PAGINA = 10;

const ESTADOS = [
  { valor: "pendiente", texto: "Pendientes de decisión" },
  { valor: "atendida", texto: "Atendidas" },
];

const TEXTO: Record<ClaseRegistro, { descripcion: string; vacio: string }> = {
  novedad: {
    descripcion: "Cambios de parámetros con la convocatoria cerrada y las asignaciones aprobadas que afectaron",
    vacio: "con la convocatoria cerrada",
  },
  observacion: {
    descripcion: "Cambios de parámetros mientras la convocatoria está abierta",
    vacio: "con la convocatoria abierta",
  },
};

const AMBITOS = (Object.keys(ETIQUETA_AMBITO) as AmbitoCambio[]).map((a) => ({
  valor: a,
  texto: ETIQUETA_AMBITO[a],
}));

/**
 * Las novedades o las observaciones (SPEC-013): cada cambio de parámetros,
 * con quién, cuándo y por qué, y las asignaciones que dejó incumpliendo.
 * Cada clase tiene su sección porque se revisan en momentos distintos: las
 * novedades son las que pueden tocar lo aprobado. Se muestran de la más
 * reciente a la más antigua porque lo que se busca casi siempre es lo último.
 */
export default function RegistrosParametros({ clase }: { clase: ClaseRegistro }) {
  const todas = useNovedadesStore((s) => s.novedades);
  // La numeración por clase se calcula sobre todas; la lista, solo con las suyas.
  const novedades = useMemo(() => todas.filter((n) => claseDe(n) === clase), [todas, clase]);
  const hidratado = useNovedadesStore((s) => s.hidratado);

  const [periodo, setPeriodo] = useState("");
  const [estado, setEstado] = useState("");
  const [ambito, setAmbito] = useState("");
  const [pagina, setPagina] = useState(1);

  const periodos = useMemo(
    () =>
      [...new Set(novedades.map((n) => n.periodo).filter((p): p is string => Boolean(p)))]
        .sort()
        .reverse(),
    [novedades]
  );

  const filtradas = useMemo(
    () =>
      [...novedades].reverse().filter(
        (n) =>
          (!periodo || n.periodo === periodo) &&
          (!estado || (estado === "atendida") === estaAtendida(n)) &&
          (!ambito || n.cambios.some((c) => c.ambito === ambito))
      ),
    [novedades, periodo, estado, ambito]
  );

  if (!hidratado) {
    return (
      <main className="px-4 py-6 sm:p-8">
        <Encabezado titulo={ETIQUETA_CLASE[clase].plural} descripcion="Cargando…" />
      </main>
    );
  }

  const pendientes = novedades.filter((n) => !estaAtendida(n)).length;
  const etiqueta = ETIQUETA_CLASE[clase];
  const otra: ClaseRegistro = clase === "novedad" ? "observacion" : "novedad";

  const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const actual = Math.min(pagina, paginas);
  const visibles = filtradas.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA);

  // Cambiar un filtro devuelve a la primera página: quedarse en la 3 de
  // un listado que ahora tiene una sola la dejaría vacía.
  const filtrar = (fijar: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    fijar(e.target.value);
    setPagina(1);
  };

  return (
    <main className="px-4 py-6 sm:p-8">
      <Encabezado
        titulo={etiqueta.plural}
        descripcion={TEXTO[clase].descripcion}
      >
        <Link href={RUTA_CLASE[otra]}>
          <Boton variante="secundario">Ver {ETIQUETA_CLASE[otra].plural.toLowerCase()}</Boton>
        </Link>
      </Encabezado>

      <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <TarjetaStat
          etiqueta={`${etiqueta.plural} registradas`}
          valor={novedades.length}
          tono="verde"
          icono={<FiBell className="h-6 w-6" aria-hidden />}
        />
        <TarjetaStat
          etiqueta="Con asignaciones afectadas"
          valor={novedades.filter((n) => n.afectadas.length > 0).length}
          tono="lima"
          icono={<FiCheckCircle className="h-6 w-6" aria-hidden />}
        />
        <TarjetaStat
          etiqueta="Pendientes de decisión"
          valor={pendientes}
          tono={pendientes > 0 ? "ambar" : "lima"}
          icono={<FiAlertTriangle className="h-6 w-6" aria-hidden />}
        />
      </section>

      <section className="tarjeta tarjeta-sombra overflow-hidden">
        <div className="grid gap-4 border-b border-[var(--color-borde)] p-5 sm:grid-cols-3">
          <Campo etiqueta="Periodo">
            <Seleccion
              opciones={periodos}
              placeholder="Todos"
              value={periodo}
              onChange={filtrar(setPeriodo)}
            />
          </Campo>
          <Campo etiqueta="Estado">
            <Seleccion
              opciones={ESTADOS}
              placeholder="Todos"
              value={estado}
              onChange={filtrar(setEstado)}
            />
          </Campo>
          <Campo etiqueta="Parámetro">
            <Seleccion
              opciones={AMBITOS}
              placeholder="Todos"
              value={ambito}
              onChange={filtrar(setAmbito)}
            />
          </Campo>
        </div>

        {filtradas.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-[var(--color-texto)]">
              {novedades.length === 0
                ? `Aún no hay ${etiqueta.plural.toLowerCase()}`
                : `Ninguna ${etiqueta.singular.toLowerCase()} coincide`}
            </p>
            <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
              {novedades.length === 0 ? (
                <>
                  Se registran al cambiar{" "}
                  <Link href="/admin/parametros" className="font-semibold text-cecar-700 hover:underline">
                    Parámetros
                  </Link>{" "}
                  {TEXTO[clase].vacio}.
                </>
              ) : (
                "Pruebe con otros filtros."
              )}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-borde)]">
            {visibles.map((n) => {
              const atendida = estaAtendida(n);
              return (
                <li key={n.id}>
                  <Link
                    href={rutaDe(n)}
                    className="flex items-start gap-4 px-5 py-4 transition hover:bg-cecar-50/40"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-cecar-600/10 text-sm font-bold text-cecar-700 tabular-nums">
                      {numeroEnSuClase(todas, n)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--color-texto)]">
                          {n.cambios.length === 1 ? "1 cambio" : `${n.cambios.length} cambios`}
                          {" · "}
                          {n.afectadas.length === 1
                            ? "1 asignación afectada"
                            : `${n.afectadas.length} asignaciones afectadas`}
                        </p>
                        {n.afectadas.length > 0 &&
                          (atendida ? (
                            <Insignia tono="verde">Atendida</Insignia>
                          ) : (
                            <Insignia tono="ambar">Pendiente</Insignia>
                          ))}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--color-texto-suave)]">
                        {n.motivo}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-texto-suave)]">
                        {n.autor} · {fechaHoraLegible(n.fecha)}
                        {n.periodo && ` · periodo ${n.periodo}`}
                      </p>
                    </div>

                    <FiArrowRight
                      className="mt-1 h-4 w-4 shrink-0 text-[var(--color-texto-suave)]"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <Paginacion
          pagina={actual}
          paginas={paginas}
          total={filtradas.length}
          porPagina={POR_PAGINA}
          onCambiar={setPagina}
          etiqueta={etiqueta.plural.toLowerCase()}
        />
      </section>
    </main>
  );
}
