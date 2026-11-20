"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import { Bloques } from "@/components/CriteriosBloques";
import { Boton, Entrada, Insignia, Seccion, Seleccion } from "@/components/ui";
import { FiClock, FiEdit3, FiPrinter, FiSearch } from "@/components/iconos";
import { MODALIDADES, type Bloque, type Modalidad, type SeccionCriterios } from "@/lib/criterios";
import { nombreModalidad, seccionesCambiadas, type VersionCriterios } from "@/lib/criterios-versiones";
import { fechaHoraLegible } from "@/lib/convocatoria";
import { useCriterios } from "@/lib/usar-criterios";
import { useSesionStore } from "@/lib/stores/sesion-store";

/**
 * Criterios de asignación (SPEC-015). Fuera de /admin a propósito:
 * el coordinador los necesita mientras arma su asignación, y GuardiaSesion
 * cierra todo /admin a quien no es administrador.
 *
 * Desde SPEC-025 vienen de la base, por periodo y versión publicada; se
 * filtran por modalidad y se descargan en PDF imprimiendo la vista.
 */

/** Sin tildes ni mayúsculas: «tutor» debe encontrar «Tutores» y «práctica» «practica». */
const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function textoDe(b: Bloque): string {
  switch (b.tipo) {
    case "lista":
      return b.items.join(" ");
    case "tabla":
      return [b.titulo, ...b.columnas, ...b.filas.flat()].join(" ");
    default:
      return b.texto;
  }
}

/**
 * Con búsqueda, una tabla conserva solo las filas que coinciden (más su
 * encabezado) y una lista solo sus puntos: mostrar la tabla 5 entera por
 * una palabra obligaría a buscar a ojo dentro de ella.
 */
function filtrar(seccion: SeccionCriterios, q: string): SeccionCriterios | null {
  if (!q) return seccion;
  if (normalizar(seccion.titulo).includes(q)) return seccion;
  const bloques = seccion.bloques.flatMap<Bloque>((b) => {
    if (b.tipo === "tabla") {
      if (normalizar(b.titulo).includes(q)) return [b];
      const filas = b.filas.filter((f) => normalizar(f.join(" ")).includes(q));
      return filas.length ? [{ ...b, filas, grupos: undefined }] : [];
    }
    if (b.tipo === "lista") {
      const items = b.items.filter((i) => normalizar(i).includes(q));
      return items.length ? [{ ...b, items }] : [];
    }
    if (b.tipo === "subtitulo") return [];
    return normalizar(textoDe(b)).includes(q) ? [b] : [];
  });
  return bloques.length ? { ...seccion, bloques } : null;
}

/** La modalidad elegida más lo general, que aplica a todas. */
const deModalidad = (s: SeccionCriterios, m: Modalidad | "") => !m || s.modalidad === m || s.modalidad === "general";

const claveVersion = (v: VersionCriterios) => `${v.periodo}#${v.numero}`;

export default function Criterios() {
  const router = useRouter();
  const { publicadas, error } = useCriterios();
  const esAdmin = useSesionStore((s) => s.sesion?.usuario.rol === "ADMIN");
  const [clave, setClave] = useState("");
  const [modalidad, setModalidad] = useState<Modalidad | "">("");
  const [busqueda, setBusqueda] = useState("");
  const q = normalizar(busqueda.trim());

  // Por defecto, la más reciente: la lista viene ordenada desde el servidor.
  const version = publicadas?.find((v) => claveVersion(v) === clave) ?? publicadas?.[0] ?? null;
  const secciones = useMemo(
    () =>
      (version?.contenido ?? [])
        .filter((s) => deModalidad(s, modalidad))
        .map((s) => filtrar(s, q))
        .filter((s): s is SeccionCriterios => s !== null),
    [version, modalidad, q],
  );
  const historial = useMemo(
    () => (version && publicadas ? publicadas.filter((v) => v.periodo === version.periodo) : []),
    [version, publicadas],
  );

  if (error || !publicadas || !version) {
    return (
      <main className="px-4 py-6 sm:p-8">
        <Encabezado titulo="Criterios de asignación" descripcion={error ?? "Cargando…"} />
      </main>
    );
  }

  // El PDF es el documento (o la modalidad) entero: la búsqueda se limpia
  // antes de imprimir, o saldría solo lo que coincidió.
  const descargarPdf = () => {
    setBusqueda("");
    setTimeout(() => window.print(), 50);
  };

  const opcionesVersion = publicadas.map((v) => ({
    valor: claveVersion(v),
    texto: v.numero === 0 ? `${v.periodo} · documento original` : `${v.periodo} · versión ${v.numero}`,
  }));

  return (
    <main className="px-4 py-6 sm:p-8 print:p-0">
      {/* Solo en el PDF: qué documento es y de cuándo. */}
      <header className="mb-6 hidden border-b-2 border-cecar-600 pb-3 print:block">
        <p className="text-xs font-bold tracking-wide text-cecar-700 uppercase">
          Corporación Universitaria del Caribe · CECAR
        </p>
        <h1 className="mt-1 text-xl font-bold text-[var(--color-texto)]">
          Criterios de asignación académica {version.periodo}
          {modalidad && ` · ${nombreModalidad(modalidad)}`}
        </h1>
        <p className="mt-1 text-xs text-[var(--color-texto-suave)]">
          {version.numero === 0 ? "Documento original del Consejo Académico" : `Versión ${version.numero}`}
          {version.publicada && ` · publicada el ${fechaHoraLegible(version.publicada)}`}
          {version.publicadaPor && ` por ${version.publicadaPor}`}
        </p>
      </header>

      <div className="print:hidden">
        <Encabezado
          titulo="Criterios de asignación"
          descripcion={`Lineamientos del Consejo Académico para el periodo ${version.periodo}, por modalidad.`}
        >
          {esAdmin && (
            <Boton variante="secundario" onClick={() => router.push("/admin/criterios")}>
              <FiEdit3 aria-hidden /> Editar criterios
            </Boton>
          )}
          <Boton onClick={descargarPdf}>
            <FiPrinter aria-hidden /> {modalidad ? `PDF · ${nombreModalidad(modalidad)}` : "PDF completo"}
          </Boton>
        </Encabezado>
      </div>

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] print:block">
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start print:hidden">
          <div>
            <label className="etiqueta">Versión</label>
            <Seleccion
              opciones={opcionesVersion}
              placeholder="Más reciente"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
            />
          </div>
          <div>
            <label className="etiqueta">Modalidad</label>
            <Seleccion
              opciones={MODALIDADES.filter((m) => m.valor !== "general")}
              placeholder="Todas"
              value={modalidad}
              onChange={(e) => setModalidad(e.target.value as Modalidad | "")}
            />
            {modalidad && (
              <p className="mt-1 text-[11px] text-[var(--color-texto-suave)]">Incluye las secciones generales.</p>
            )}
          </div>
          <div className="relative">
            <FiSearch
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--color-texto-suave)]"
              aria-hidden
            />
            <Entrada
              type="search"
              placeholder="Buscar un rol, curso…"
              aria-label="Buscar en los criterios"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="ps-10"
            />
          </div>
          <nav aria-label="Secciones" className="hidden lg:block">
            <ol className="space-y-0.5 text-sm">
              {secciones.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex gap-2 rounded-md px-3 py-1.5 text-[var(--color-texto-suave)] hover:bg-cecar-50 hover:text-cecar-800"
                  >
                    <span className="w-10 shrink-0 tabular-nums text-cecar-600">{s.numero}</span>
                    <span>{s.titulo}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <div className="min-w-0 space-y-6">
          {secciones.length === 0 && (
            <p className="tarjeta p-8 text-center text-sm text-[var(--color-texto-suave)]">
              {busqueda ? `Nada en los criterios coincide con «${busqueda}».` : "No hay secciones para esta modalidad."}
            </p>
          )}
          {secciones.map((s) => (
            <div key={s.id} id={s.id} className="scroll-mt-6">
              <Seccion
                titulo={s.numero ? `${s.numero} · ${s.titulo}` : s.titulo}
                accion={
                  modalidad ? undefined : (
                    <span className="print:hidden">
                      <Insignia>{nombreModalidad(s.modalidad)}</Insignia>
                    </span>
                  )
                }
              >
                <Bloques bloques={s.bloques} />
              </Seccion>
            </div>
          ))}

          {historial.length > 0 && (
            <section className="tarjeta p-5 print:hidden">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wide text-cecar-800 uppercase">
                <FiClock aria-hidden /> Historial de {version.periodo}
              </h3>
              <ol className="space-y-4">
                {historial.map((v, i) => {
                  const anterior = historial[i + 1];
                  const cambios = anterior ? seccionesCambiadas(anterior.contenido, v.contenido) : [];
                  return (
                    <li key={claveVersion(v)} className="text-sm">
                      <p className="font-semibold text-[var(--color-texto)]">
                        {v.numero === 0 ? "Documento original" : `Versión ${v.numero}`}
                        <span className="font-normal text-[var(--color-texto-suave)]">
                          {v.publicada && ` · ${fechaHoraLegible(v.publicada)}`}
                          {v.publicadaPor && ` · ${v.publicadaPor}`}
                        </span>
                      </p>
                      {v.motivo && <p className="mt-0.5 text-[var(--color-texto-suave)]">{v.motivo}</p>}
                      {cambios.length > 0 && (
                        <p className="mt-1 text-xs text-[var(--color-texto-suave)]">
                          {cambios.map((c) => `${c.titulo} (${c.tipo})`).join(" · ")}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
