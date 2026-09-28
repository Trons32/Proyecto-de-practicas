"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAsignacionStore, type Autor } from "@/lib/stores/asignacion-store";
import { useConfigStore } from "@/lib/stores/config-store";
import { useSesionStore } from "@/lib/stores/sesion-store";
import { resumirAsignacion, legible, desde } from "@/lib/resumen";
import { useConfiguracion } from "@/lib/usar-configuracion";
import {
  estadoConvocatoria,
  fechaLegible,
  plazoLegible,
  comoFechaInput,
  finDelDia,
} from "@/lib/convocatoria";
import { periodosAsignables, type Asignacion, type EstadoAsignacion } from "@/lib/tipos";
import Encabezado from "@/components/Encabezado";
import Modal from "@/components/Modal";
import ModalConfirmacion from "@/components/ModalConfirmacion";
import { Boton, Campo, Entrada, Insignia, InsigniaEstado, Paginacion } from "@/components/ui";
import { sileo } from "@/lib/toast";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiAlertCircle,
  FiFileText,
  FiClock,
  FiLock,
  FiRefreshCw,
  FiArrowRight,
} from "@/components/iconos";

const POR_PAGINA = 10;

/** Las pestañas del panel, en el orden en que el administrador trabaja. */
const BANDEJAS = [
  { id: "pendientes", texto: "Por revisar", estados: ["enviada", "en_revision"] },
  { id: "corrigiendo", texto: "En corrección", estados: ["en_correccion"] },
  { id: "aprobadas", texto: "Aprobadas", estados: ["aprobada"] },
  { id: "borradores", texto: "Sin entregar", estados: ["borrador"] },
] as const;

type Bandeja = (typeof BANDEJAS)[number]["id"];

export default function AdminAsignaciones() {
  const asignaciones = useAsignacionStore((s) => s.asignaciones);
  const hidratado = useAsignacionStore((s) => s.hidratado);
  const aprobar = useAsignacionStore((s) => s.aprobar);
  const devolver = useAsignacionStore((s) => s.devolver);
  const reabrirPorParametros = useAsignacionStore((s) => s.reabrirPorParametros);

  const convocatorias = useConfigStore((s) => s.convocatorias);
  const abrirConvocatoria = useConfigStore((s) => s.abrirConvocatoria);
  const cerrarConvocatoria = useConfigStore((s) => s.cerrarConvocatoria);
  const reabrirConvocatoria = useConfigStore((s) => s.reabrirConvocatoria);

  const usuario = useSesionStore((s) => s.sesion?.usuario ?? null);
  const config = useConfiguracion();

  const autor: Autor | null = usuario
    ? { nombres: usuario.nombres, rol: usuario.rol }
    : null;

  const [bandeja, setBandeja] = useState<Bandeja>("pendientes");
  const [pagina, setPagina] = useState(1);

  /** La asignación que se está aprobando, devolviendo o reabriendo. */
  const [aprobando, setAprobando] = useState<Asignacion | null>(null);
  const [devolviendo, setDevolviendo] = useState<Asignacion | null>(null);
  const [reabriendo, setReabriendo] = useState<Asignacion | null>(null);

  const filas = useMemo(() => {
    const estados = BANDEJAS.find((b) => b.id === bandeja)!.estados as readonly EstadoAsignacion[];
    return asignaciones
      .filter((a) => estados.includes(a.estado))
      .sort((x, y) => y.actualizada.localeCompare(x.actualizada))
      .map((a) => ({ a, r: resumirAsignacion(a, config) }));
  }, [asignaciones, bandeja, config]);

  const conteos = useMemo(() => {
    const porEstado = new Map<string, number>();
    for (const a of asignaciones) porEstado.set(a.estado, (porEstado.get(a.estado) ?? 0) + 1);
    return Object.fromEntries(
      BANDEJAS.map((b) => [b.id, b.estados.reduce((s, e) => s + (porEstado.get(e) ?? 0), 0)])
    ) as Record<Bandeja, number>;
  }, [asignaciones]);

  const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, paginas);
  const visibles = filas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  const cambiarBandeja = (b: Bandeja) => {
    setBandeja(b);
    setPagina(1);
  };

  const confirmarAprobar = () => {
    if (!aprobando || !autor) return;
    aprobar(aprobando.id, autor);
    sileo.success({
      title: "Asignación aprobada",
      description: `${legible(aprobando.programa)} · ${aprobando.periodo}`,
    });
    setAprobando(null);
  };

  return (
    <main className="px-4 py-6 sm:p-8">
      <Encabezado
        titulo="Asignaciones"
        descripcion="Revisar, aprobar y devolver lo que entregan los coordinadores"
        volver={
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-texto-suave)] transition hover:text-cecar-700"
          >
            <FiArrowLeft aria-hidden /> Volver al panel
          </Link>
        }
      />

      <Convocatorias
        convocatorias={convocatorias}
        onAbrir={abrirConvocatoria}
        onCerrar={cerrarConvocatoria}
        onReabrir={reabrirConvocatoria}
      />

      {/* ---------------- Bandejas ---------------- */}
      <div
        role="tablist"
        aria-label="Bandejas de asignaciones"
        className="mb-4 flex flex-wrap gap-1 border-b border-[var(--color-borde)]"
      >
        {BANDEJAS.map((b) => {
          const activa = b.id === bandeja;
          return (
            <button
              key={b.id}
              role="tab"
              aria-selected={activa}
              type="button"
              onClick={() => cambiarBandeja(b.id)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                activa
                  ? "border-cecar-600 text-cecar-700"
                  : "border-transparent text-[var(--color-texto-suave)] hover:text-[var(--color-texto)]"
              }`}
            >
              {b.texto}
              {conteos[b.id] > 0 && (
                <span
                  className={`ml-2 rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
                    activa ? "bg-cecar-100 text-cecar-800" : "bg-black/5"
                  }`}
                >
                  {conteos[b.id]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!hidratado ? (
        <p className="text-sm text-[var(--color-texto-suave)]">Cargando…</p>
      ) : filas.length === 0 ? (
        <section className="tarjeta p-10 text-center">
          <FiFileText
            className="mx-auto h-10 w-10 text-[var(--color-texto-suave)]/40"
            aria-hidden
          />
          <p className="mt-3 text-sm text-[var(--color-texto-suave)]">
            {bandeja === "pendientes"
              ? "No hay asignaciones esperando revisión."
              : "No hay asignaciones en esta bandeja."}
          </p>
        </section>
      ) : (
        <section className="tarjeta tarjeta-sombra overflow-hidden">
          <ul className="divide-y divide-[var(--color-borde)]">
            {visibles.map(({ a, r }) => (
              <li key={a.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/asignacion/${a.id}`}
                      className="block truncate text-sm font-semibold text-[var(--color-texto)] hover:text-cecar-700"
                    >
                      {legible(a.programa) || "Programa sin definir"}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-[var(--color-texto-suave)]">
                      {legible(a.facultad) || "Facultad sin definir"} · {desde(a.actualizada)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Insignia>{a.periodo}</Insignia>
                    <InsigniaEstado estado={a.estado} />
                    {a.version > 0 && <Insignia>v{a.version}</Insignia>}
                    {r.totalErrores > 0 && (
                      <Insignia tono="rojo">{r.totalErrores} pendientes</Insignia>
                    )}
                    <span className="text-xs tabular-nums text-[var(--color-texto-suave)]">
                      {r.totalDocentes} doc · {r.horasTotales} h
                    </span>
                  </div>
                </div>

                {a.estado === "en_correccion" && a.plazoCorreccion && (
                  <p className="mt-2 text-xs font-semibold text-amber-700">
                    <FiClock className="inline" aria-hidden /> Corrige hasta el{" "}
                    {fechaLegible(a.plazoCorreccion)} · {plazoLegible(a.plazoCorreccion)}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link href={`/asignacion/${a.id}`}>
                    <Boton variante="fantasma">
                      Ver detalle <FiArrowRight aria-hidden />
                    </Boton>
                  </Link>

                  {(a.estado === "enviada" || a.estado === "en_revision") && (
                    <>
                      <Boton variante="secundario" onClick={() => setDevolviendo(a)}>
                        <FiAlertCircle aria-hidden /> Devolver
                      </Boton>
                      <Boton onClick={() => setAprobando(a)}>
                        <FiCheckCircle aria-hidden /> Aprobar
                      </Boton>
                    </>
                  )}

                  {a.estado === "aprobada" && (
                    <Boton variante="secundario" onClick={() => setReabriendo(a)}>
                      <FiRefreshCw aria-hidden /> Solicitar corrección
                    </Boton>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <Paginacion
            pagina={paginaActual}
            paginas={paginas}
            total={filas.length}
            porPagina={POR_PAGINA}
            onCambiar={setPagina}
            etiqueta="asignaciones"
          />
        </section>
      )}

      <ModalConfirmacion
        abierto={aprobando !== null}
        onCerrar={() => setAprobando(null)}
        onConfirmar={confirmarAprobar}
        titulo="Aprobar asignación"
        mensaje="Quedará cerrada y el coordinador no podrá modificarla."
        detalle={
          aprobando
            ? `${legible(aprobando.programa)} · ${aprobando.periodo}`
            : undefined
        }
        etiquetaConfirmar="Aprobar"
      />

      <ModalMotivo
        asignacion={devolviendo}
        onCerrar={() => setDevolviendo(null)}
        titulo="Devolver para corrección"
        ayuda="Explique qué debe corregirse. El coordinador verá este texto y solo podrá editar hasta la fecha que fije."
        etiquetaConfirmar="Devolver"
        onConfirmar={(nota, plazo) => {
          if (!devolviendo || !autor) return;
          devolver(devolviendo.id, autor, nota, plazo);
          sileo.success({
            title: "Asignación devuelta",
            description: `${legible(devolviendo.programa)} · corrige hasta el ${fechaLegible(plazo)}`,
          });
          setDevolviendo(null);
        }}
      />

      <ModalMotivo
        asignacion={reabriendo}
        onCerrar={() => setReabriendo(null)}
        titulo="Solicitar corrección"
        ayuda="Indique qué cambió en los parámetros y qué debe ajustar el coordinador. La asignación volverá a quedar editable hasta la fecha que fije."
        etiquetaConfirmar="Reabrir"
        onConfirmar={(nota, plazo) => {
          if (!reabriendo || !autor) return;
          reabrirPorParametros(reabriendo.id, autor, nota, plazo);
          sileo.success({
            title: "Asignación reabierta",
            description: `${legible(reabriendo.programa)} · corrige hasta el ${fechaLegible(plazo)}`,
          });
          setReabriendo(null);
        }}
      />
    </main>
  );
}

/**
 * Los plazos de entrega, uno por periodo.
 *
 * Se muestran arriba del todo porque condicionan lo demás: sin convocatoria
 * abierta no llega nada que revisar, y el administrador necesita ver de una
 * que el periodo está cerrado antes de preguntarse por qué no hay entregas.
 */
function Convocatorias({
  convocatorias,
  onAbrir,
  onCerrar,
  onReabrir,
}: {
  convocatorias: Record<string, import("@/lib/convocatoria").Convocatoria>;
  onAbrir: (periodo: string, limite: string) => void;
  onCerrar: (periodo: string) => void;
  onReabrir: (periodo: string) => void;
}) {
  const periodos = periodosAsignables();
  const [editando, setEditando] = useState<string | null>(null);
  const [fecha, setFecha] = useState("");

  const empezar = (periodo: string) => {
    const previa = convocatorias[periodo];
    setFecha(previa ? comoFechaInput(previa.limite) : "");
    setEditando(periodo);
  };

  const guardar = () => {
    if (!editando) return;
    if (!fecha) {
      sileo.error({ title: "Falta la fecha", description: "Indique hasta cuándo se puede entregar." });
      return;
    }
    // Una fecha ya pasada dejaría la convocatoria cerrada al nacer.
    if (new Date(finDelDia(fecha)).getTime() <= Date.now()) {
      sileo.error({
        title: "La fecha ya pasó",
        description: "Elija una fecha posterior a hoy.",
      });
      return;
    }
    onAbrir(editando, fecha);
    sileo.success({
      title: "Convocatoria abierta",
      description: `${editando} · hasta el ${fechaLegible(finDelDia(fecha))}`,
    });
    setEditando(null);
  };

  return (
    <>
      <section className="mb-6 grid gap-4 md:grid-cols-2">
        {periodos.map((periodo, i) => {
          const c = convocatorias[periodo] ?? null;
          const estado = estadoConvocatoria(c);

          return (
            <div key={periodo} className="tarjeta p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {/* periodosAsignables() devuelve [actual, siguiente]: el
                      administrador piensa en "este" y "el que viene", y el
                      código queda a la vista como referencia. */}
                  <h3 className="text-sm font-bold text-[var(--color-texto)]">
                    {i === 0 ? "Periodo actual" : "Próximo periodo"}
                    <span className="ms-2 text-xs font-medium text-[var(--color-texto-suave)]">
                      {periodo}
                    </span>
                  </h3>
                  {c ? (
                    <p className="mt-1 text-xs text-[var(--color-texto-suave)]">
                      Hasta el {fechaLegible(c.limite)}
                      {estado === "abierta" && ` · ${plazoLegible(c.limite)}`}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-[var(--color-texto-suave)]">
                      Sin convocatoria: los coordinadores no pueden entregar.
                    </p>
                  )}
                </div>

                <Insignia
                  tono={estado === "abierta" ? "verde" : estado === "cerrada" ? "neutro" : "ambar"}
                >
                  {estado === "abierta" ? "Abierta" : estado === "cerrada" ? "Cerrada" : "Sin abrir"}
                </Insignia>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Boton variante="secundario" onClick={() => empezar(periodo)}>
                  <FiClock aria-hidden /> {c ? "Cambiar fecha" : "Abrir convocatoria"}
                </Boton>

                {c && estado === "abierta" && (
                  <Boton variante="fantasma" onClick={() => onCerrar(periodo)}>
                    <FiLock aria-hidden /> Cerrar ahora
                  </Boton>
                )}

                {c && c.cerradaManualmente && (
                  <Boton variante="fantasma" onClick={() => onReabrir(periodo)}>
                    <FiRefreshCw aria-hidden /> Reabrir
                  </Boton>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <Modal
        abierto={editando !== null}
        onCerrar={() => setEditando(null)}
        titulo={`Convocatoria ${editando ?? ""}`}
        tamano="sm"
      >
        <Campo
          etiqueta="Fecha límite de entrega"
          requerido
          ayuda="Los coordinadores podrán entregar durante todo ese día."
        >
          <Entrada
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            data-foco-inicial
          />
        </Campo>

        <div className="mt-6 flex gap-3">
          <Boton variante="secundario" className="flex-1" onClick={() => setEditando(null)}>
            Cancelar
          </Boton>
          <Boton className="flex-1" onClick={guardar}>
            Guardar
          </Boton>
        </div>
      </Modal>
    </>
  );
}

/**
 * Pide el motivo y el plazo. Ambos son obligatorios: devolver una
 * asignación sin decir qué corregir deja al coordinador adivinando, y sin
 * fecha la corrección no tiene cuándo terminar.
 */
function ModalMotivo({
  asignacion,
  onCerrar,
  onConfirmar,
  titulo,
  ayuda,
  etiquetaConfirmar,
}: {
  asignacion: Asignacion | null;
  onCerrar: () => void;
  onConfirmar: (nota: string, plazo: string) => void;
  titulo: string;
  ayuda: string;
  etiquetaConfirmar: string;
}) {
  const [nota, setNota] = useState("");
  const [fecha, setFecha] = useState("");

  const cerrar = () => {
    setNota("");
    setFecha("");
    onCerrar();
  };

  const confirmar = () => {
    if (!nota.trim()) {
      sileo.error({
        title: "Falta el motivo",
        description: "Explique qué debe corregir el coordinador.",
      });
      return;
    }
    if (!fecha) {
      sileo.error({ title: "Falta el plazo", description: "Indique hasta cuándo puede corregir." });
      return;
    }
    const plazo = finDelDia(fecha);
    if (new Date(plazo).getTime() <= Date.now()) {
      sileo.error({ title: "La fecha ya pasó", description: "Elija una fecha posterior a hoy." });
      return;
    }
    onConfirmar(nota.trim(), plazo);
    setNota("");
    setFecha("");
  };

  return (
    <Modal abierto={asignacion !== null} onCerrar={cerrar} titulo={titulo} tamano="lg">
      {asignacion && (
        <p className="mb-4 rounded-lg bg-[var(--color-superficie)] px-3 py-2 text-sm font-semibold text-[var(--color-texto)]">
          {legible(asignacion.programa)} · {asignacion.periodo}
        </p>
      )}

      <Campo etiqueta="Motivo" requerido ayuda={ayuda}>
        <textarea
          className="campo min-h-28 resize-y"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Ej.: Revisar las horas de los docentes de tiempo completo: tres superan el tope."
          data-foco-inicial
        />
      </Campo>

      <Campo
        etiqueta="Plazo para corregir"
        requerido
        className="mt-4"
        ayuda="Después de esta fecha la asignación se bloquea de nuevo."
      >
        <Entrada type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </Campo>

      <div className="mt-6 flex gap-3">
        <Boton variante="secundario" className="flex-1" onClick={cerrar}>
          Cancelar
        </Boton>
        <Boton className="flex-1" onClick={confirmar}>
          {etiquetaConfirmar}
        </Boton>
      </div>
    </Modal>
  );
}
