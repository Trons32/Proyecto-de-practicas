"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAsignacionStore, type Autor } from "@/lib/stores/asignacion-store";
import { useSesionStore } from "@/lib/stores/sesion-store";
import { useConfiguracion } from "@/lib/usar-configuracion";
import { asignacionesAfectadas } from "@/lib/impacto";
import { legible } from "@/lib/resumen";
import { fechaLegible, finDelDia } from "@/lib/convocatoria";
import Modal from "@/components/Modal";
import { Boton, Campo, Entrada, Insignia } from "@/components/ui";
import { sileo } from "@/lib/toast";
import {
  FiAlertTriangle,
  FiRefreshCw,
  FiChevronDown,
  FiArrowRight,
} from "@/components/iconos";

/**
 * El efecto de los parámetros actuales sobre lo que ya está aprobado.
 *
 * Cambiar un tope no recalcula las asignaciones cerradas: siguen guardadas
 * como se entregaron. Este panel las vuelve a validar con las reglas
 * vigentes y muestra cuáles dejarían de cumplirlas, para que el
 * administrador vea el daño antes de decidir a quién se lo devuelve.
 *
 * La decisión es suya, no automática: puede que un cambio sea a futuro y no
 * deba tocar lo ya aprobado. Por eso aquí nada se reabre solo.
 */
export default function ImpactoParametros() {
  const asignaciones = useAsignacionStore((s) => s.asignaciones);
  const hidratado = useAsignacionStore((s) => s.hidratado);
  const reabrirVarias = useAsignacionStore((s) => s.reabrirVarias);
  const usuario = useSesionStore((s) => s.sesion?.usuario ?? null);
  const config = useConfiguracion();

  const afectadas = useMemo(
    () => asignacionesAfectadas(asignaciones, config),
    [asignaciones, config]
  );

  /** Las que el administrador marcó para reabrir. */
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  /** Cuáles tienen el detalle de docentes desplegado. */
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [confirmando, setConfirmando] = useState(false);

  const alternar = (conjunto: Set<string>, id: string) => {
    const copia = new Set(conjunto);
    if (copia.has(id)) copia.delete(id);
    else copia.add(id);
    return copia;
  };

  if (!hidratado || afectadas.length === 0) {
    // Sin nada roto no se pinta la sección: un panel que siempre dice "todo
    // bien" acaba siendo ruido que se deja de leer.
    return null;
  }

  const total = afectadas.length;
  const seleccionadas = afectadas.filter((x) => marcadas.has(x.asignacion.id));
  const todasMarcadas = marcadas.size === total;

  return (
    <section className="tarjeta tarjeta-sombra mb-6 overflow-hidden border-amber-200">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-200 bg-amber-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <FiAlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <div className="min-w-0">
            <h3 className="text-sm font-bold tracking-wide text-amber-900 uppercase">
              Asignaciones afectadas por los parámetros actuales
            </h3>
            <p className="mt-0.5 text-xs text-amber-900">
              {total === 1
                ? "1 asignación aprobada dejó de cumplir las reglas vigentes."
                : `${total} asignaciones aprobadas dejaron de cumplir las reglas vigentes.`}{" "}
              Decida cuáles deben corregirse.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Boton
            variante="secundario"
            onClick={() =>
              setMarcadas(todasMarcadas ? new Set() : new Set(afectadas.map((x) => x.asignacion.id)))
            }
          >
            {todasMarcadas ? "Quitar selección" : "Seleccionar todas"}
          </Boton>
          <Boton disabled={marcadas.size === 0} onClick={() => setConfirmando(true)}>
            <FiRefreshCw aria-hidden /> Solicitar corrección ({marcadas.size})
          </Boton>
        </div>
      </header>

      <ul className="divide-y divide-[var(--color-borde)]">
        {afectadas.map(({ asignacion: a, docentes, erroresAhora, erroresAntes }) => {
          const desplegada = abiertas.has(a.id);
          const nuevos = erroresAhora - erroresAntes;

          return (
            <li key={a.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start gap-3">
                <input
                  type="checkbox"
                  checked={marcadas.has(a.id)}
                  onChange={() => setMarcadas((m) => alternar(m, a.id))}
                  aria-label={`Marcar ${legible(a.programa)} para corrección`}
                  className="mt-1 h-4 w-4 shrink-0 accent-cecar-600"
                />

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/asignacion/${a.id}`}
                    className="block truncate text-sm font-semibold text-[var(--color-texto)] hover:text-cecar-700"
                  >
                    {legible(a.programa) || "Programa sin definir"}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-[var(--color-texto-suave)]">
                    {legible(a.facultad) || "Facultad sin definir"} · periodo {a.periodo}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Insignia tono="rojo">
                    {erroresAhora} {erroresAhora === 1 ? "error" : "errores"}
                  </Insignia>
                  {/* Distinguir lo que rompió el cambio de lo que ya venía
                      mal evita culpar a los parámetros de todo. */}
                  {nuevos > 0 && erroresAntes > 0 && (
                    <Insignia tono="ambar">{nuevos} por el cambio</Insignia>
                  )}
                  <button
                    type="button"
                    onClick={() => setAbiertas((s) => alternar(s, a.id))}
                    aria-expanded={desplegada}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[var(--color-texto-suave)] transition hover:bg-black/5 hover:text-[var(--color-texto)]"
                  >
                    {docentes.length} {docentes.length === 1 ? "docente" : "docentes"}
                    <FiChevronDown
                      className={`h-3.5 w-3.5 transition ${desplegada ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                </div>
              </div>

              {desplegada && (
                <ul className="mt-3 ml-7 space-y-2 border-l-2 border-[var(--color-borde)] pl-4">
                  {docentes.map((d) => (
                    <li key={d.id}>
                      <p className="text-sm font-medium text-[var(--color-texto)]">{d.nombres}</p>
                      <ul className="mt-0.5 space-y-0.5">
                        {d.motivos.map((m, i) => (
                          <li key={i} className="text-xs text-rose-600">
                            {m}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <ModalReabrir
        abierto={confirmando}
        cantidad={seleccionadas.length}
        onCerrar={() => setConfirmando(false)}
        onConfirmar={(nota, plazo) => {
          if (!usuario) return;
          const autor: Autor = { nombres: usuario.nombres, rol: usuario.rol };
          const n = reabrirVarias(
            seleccionadas.map((x) => x.asignacion.id),
            autor,
            nota,
            plazo
          );
          setConfirmando(false);
          setMarcadas(new Set());
          sileo.success({
            title: n === 1 ? "Asignación reabierta" : `${n} asignaciones reabiertas`,
            description: `Los coordinadores pueden corregir hasta el ${fechaLegible(plazo)}`,
          });
        }}
      />
    </section>
  );
}

/** Motivo y plazo comunes a todo el lote. */
function ModalReabrir({
  abierto,
  cantidad,
  onCerrar,
  onConfirmar,
}: {
  abierto: boolean;
  cantidad: number;
  onCerrar: () => void;
  onConfirmar: (nota: string, plazo: string) => void;
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
        description: "Explique qué cambió y qué deben ajustar los coordinadores.",
      });
      return;
    }
    if (!fecha) {
      sileo.error({ title: "Falta el plazo", description: "Indique hasta cuándo pueden corregir." });
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
    <Modal abierto={abierto} onCerrar={cerrar} titulo="Solicitar corrección" tamano="lg">
      <p className="mb-4 rounded-lg bg-[var(--color-superficie)] px-3 py-2 text-sm font-semibold text-[var(--color-texto)]">
        {cantidad === 1
          ? "1 asignación volverá a quedar editable"
          : `${cantidad} asignaciones volverán a quedar editables`}
      </p>

      <Campo
        etiqueta="Motivo"
        requerido
        ayuda="El mismo texto llega a todos los coordinadores afectados. Diga qué parámetro cambió."
      >
        <textarea
          className="campo min-h-28 resize-y"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Ej.: El tope de tiempo completo bajó de 40 a 38 h. Ajuste las cargas que lo superan."
          data-foco-inicial
        />
      </Campo>

      <Campo
        etiqueta="Plazo para corregir"
        requerido
        className="mt-4"
        ayuda="Después de esta fecha las asignaciones se bloquean de nuevo."
      >
        <Entrada type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </Campo>

      <div className="mt-6 flex gap-3">
        <Boton variante="secundario" className="flex-1" onClick={cerrar}>
          Cancelar
        </Boton>
        <Boton className="flex-1" onClick={confirmar}>
          <FiArrowRight aria-hidden /> Reabrir
        </Boton>
      </div>
    </Modal>
  );
}
