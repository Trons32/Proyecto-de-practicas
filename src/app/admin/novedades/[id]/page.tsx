"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useNovedadesStore } from "@/lib/stores/novedades-store";
import { useAsignacionStore, type Autor } from "@/lib/stores/asignacion-store";
import { useSesionStore } from "@/lib/stores/sesion-store";
import {
  decisionVigente,
  estaAtendida,
  ETIQUETA_AMBITO,
  type AfectacionRegistrada,
  type Novedad,
} from "@/lib/novedades";
import { legible } from "@/lib/resumen";
import { fechaHoraLegible, fechaLegible } from "@/lib/convocatoria";
import Encabezado from "@/components/Encabezado";
import Modal from "@/components/Modal";
import { ModalReabrir } from "@/components/ImpactoParametros";
import { Boton, Campo, Insignia, InsigniaEstado } from "@/components/ui";
import { sileo } from "@/lib/toast";
import { FiArrowLeft, FiChevronDown } from "@/components/iconos";

const volver = (
  <Link
    href="/admin/novedades"
    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-texto-suave)] transition hover:text-cecar-700"
  >
    <FiArrowLeft aria-hidden /> Volver a novedades
  </Link>
);

export default function DetalleNovedad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const novedad = useNovedadesStore((s) => s.novedades.find((n) => n.id === id));
  const hidratado = useNovedadesStore((s) => s.hidratado);
  const asignacionesHidratadas = useAsignacionStore((s) => s.hidratado);

  if (!hidratado || !asignacionesHidratadas) {
    return (
      <main className="px-4 py-6 sm:p-8">
        <Encabezado titulo="Novedad" descripcion="Cargando…" volver={volver} />
      </main>
    );
  }

  if (!novedad) {
    return (
      <main className="px-4 py-6 sm:p-8">
        <Encabezado titulo="Novedad no encontrada" volver={volver} />
        <p className="text-sm text-[var(--color-texto-suave)]">
          No existe una novedad con ese identificador.
        </p>
      </main>
    );
  }

  const atendida = estaAtendida(novedad);

  return (
    <main className="px-4 py-6 sm:p-8">
      <Encabezado
        titulo={`Novedad N.º ${novedad.numero}`}
        descripcion={`${novedad.autor} · ${fechaHoraLegible(novedad.fecha)}${
          novedad.periodo ? ` · periodo ${novedad.periodo}` : ""
        }`}
        volver={volver}
      >
        {novedad.conConvocatoriaCerrada && <Insignia tono="azul">Convocatoria cerrada</Insignia>}
        {novedad.afectadas.length > 0 &&
          (atendida ? (
            <Insignia tono="verde">Atendida</Insignia>
          ) : (
            <Insignia tono="ambar">Pendiente de decisión</Insignia>
          ))}
      </Encabezado>

      <section className="tarjeta tarjeta-sombra mb-6 p-5">
        <h3 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">Motivo</h3>
        <p className="mt-2 text-sm whitespace-pre-line text-[var(--color-texto)]">{novedad.motivo}</p>
      </section>

      <section className="tarjeta tarjeta-sombra mb-6 overflow-hidden">
        <header className="border-b border-[var(--color-borde)] bg-cecar-50/60 px-5 py-4">
          <h3 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">
            Parámetros modificados
          </h3>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-borde)] text-left text-[11px] font-semibold tracking-wide text-[var(--color-texto-suave)] uppercase">
                <th className="px-5 py-3">Ámbito</th>
                <th className="px-3 py-3">Parámetro</th>
                <th className="px-3 py-3">Antes</th>
                <th className="px-5 py-3">Después</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-borde)]">
              {novedad.cambios.map((c, i) => (
                <tr key={i}>
                  <td className="px-5 py-3">
                    <Insignia>{ETIQUETA_AMBITO[c.ambito]}</Insignia>
                  </td>
                  <td className="px-3 py-3 font-medium text-[var(--color-texto)]">{c.parametro}</td>
                  <td className="px-3 py-3 text-[var(--color-texto-suave)]">
                    {c.antes ?? <em>no existía</em>}
                  </td>
                  <td className="px-5 py-3 font-semibold text-[var(--color-texto)]">
                    {c.despues ?? <em className="font-normal text-rose-600">eliminado</em>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tarjeta tarjeta-sombra overflow-hidden">
        <header className="border-b border-[var(--color-borde)] bg-cecar-50/60 px-5 py-4">
          <h3 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">
            Asignaciones afectadas
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-texto-suave)]">
            Las aprobadas que el cambio dejó incumpliendo, tal como estaban al aplicarlo
          </p>
        </header>

        {novedad.afectadas.length === 0 ? (
          <p className="p-10 text-center text-sm text-[var(--color-texto-suave)]">
            Ninguna asignación aprobada dejó de cumplir las reglas con este cambio.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-borde)]">
            {novedad.afectadas.map((a) => (
              <Afectada key={a.asignacionId} novedad={novedad} afectada={a} />
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-xs text-[var(--color-texto-suave)]">
        Las novedades no se editan ni se borran: son el registro de lo que ocurrió.
      </p>
    </main>
  );
}

function Afectada({ novedad, afectada: a }: { novedad: Novedad; afectada: AfectacionRegistrada }) {
  const actual = useAsignacionStore((s) => s.asignaciones.find((x) => x.id === a.asignacionId));
  const usuario = useSesionStore((s) => s.sesion?.usuario ?? null);
  const solicitarCorreccion = useNovedadesStore((s) => s.solicitarCorreccion);
  const marcarSinAccion = useNovedadesStore((s) => s.marcarSinAccion);

  const [desplegada, setDesplegada] = useState(false);
  const [reabriendo, setReabriendo] = useState(false);
  const [descartando, setDescartando] = useState(false);

  const vigente = decisionVigente(novedad, a.asignacionId);
  const historial = novedad.decisiones.filter((d) => d.asignacionId === a.asignacionId);
  const autor: Autor | null = usuario ? { nombres: usuario.nombres, rol: usuario.rol } : null;

  // Solo lo aprobado se reabre; si ya se reabrió por otra vía, no hay qué hacer.
  const puedeReabrir = actual?.estado === "aprobada" && vigente?.accion !== "reabierta";
  const puedeDescartar = !vigente;

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          {actual ? (
            <Link
              href={`/asignacion/${a.asignacionId}`}
              className="block truncate text-sm font-semibold text-[var(--color-texto)] hover:text-cecar-700"
            >
              {legible(a.programa) || "Programa sin definir"}
            </Link>
          ) : (
            <p className="truncate text-sm font-semibold text-[var(--color-texto)]">
              {legible(a.programa) || "Programa sin definir"}
            </p>
          )}
          <p className="mt-0.5 truncate text-xs text-[var(--color-texto-suave)]">
            {legible(a.facultad) || "Facultad sin definir"} · periodo {a.periodo}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Insignia tono="rojo">
            {a.erroresAntes} → {a.erroresAhora} errores
          </Insignia>
          {actual ? <InsigniaEstado estado={actual.estado} /> : <Insignia>Eliminada</Insignia>}
          <button
            type="button"
            onClick={() => setDesplegada((v) => !v)}
            aria-expanded={desplegada}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[var(--color-texto-suave)] transition hover:bg-black/5 hover:text-[var(--color-texto)]"
          >
            {a.docentes.length} {a.docentes.length === 1 ? "docente" : "docentes"}
            <FiChevronDown
              className={`h-3.5 w-3.5 transition ${desplegada ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
        </div>
      </div>

      {desplegada && (
        <ul className="mt-3 ml-1 space-y-2 border-l-2 border-[var(--color-borde)] pl-4">
          {a.docentes.map((d, i) => (
            <li key={i}>
              <p className="text-sm font-medium text-[var(--color-texto)]">{d.nombres}</p>
              <ul className="mt-0.5 space-y-0.5">
                {d.motivos.map((m, j) => (
                  <li key={j} className="text-xs text-rose-600">
                    {m}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {/* Las decisiones, en orden: una "sin acción" seguida de una reapertura
          cuenta que el administrador cambió de criterio, y eso también es
          parte de lo ocurrido. */}
      {historial.length > 0 && (
        <ol className="mt-3 space-y-1.5">
          {historial.map((d, i) => (
            <li
              key={i}
              className="rounded-lg bg-[var(--color-superficie)] px-3 py-2 text-xs text-[var(--color-texto)]"
            >
              <strong>{d.autor}</strong>{" "}
              {d.accion === "reabierta"
                ? `solicitó corrección hasta el ${d.plazo ? fechaLegible(d.plazo) : "—"}`
                : "decidió no reabrirla"}
              <span className="text-[var(--color-texto-suave)]"> · {fechaHoraLegible(d.fecha)}</span>
              {d.nota && <p className="mt-1 text-[var(--color-texto-suave)]">{d.nota}</p>}
            </li>
          ))}
        </ol>
      )}

      {(puedeReabrir || puedeDescartar) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {puedeReabrir && (
            <Boton onClick={() => setReabriendo(true)}>Solicitar corrección</Boton>
          )}
          {puedeDescartar && (
            <Boton variante="secundario" onClick={() => setDescartando(true)}>
              No reabrir
            </Boton>
          )}
        </div>
      )}

      <ModalReabrir
        abierto={reabriendo}
        cantidad={1}
        onCerrar={() => setReabriendo(false)}
        onConfirmar={(nota, plazo) => {
          if (!autor) return;
          const n = solicitarCorreccion([a.asignacionId], autor, nota, plazo, novedad.id);
          setReabriendo(false);
          if (n > 0) {
            sileo.success({
              title: "Asignación reabierta",
              description: `El coordinador puede corregir hasta el ${fechaLegible(plazo)}`,
            });
          }
        }}
      />

      <ModalSinAccion
        abierto={descartando}
        onCerrar={() => setDescartando(false)}
        onConfirmar={(nota) => {
          if (!autor) return;
          marcarSinAccion(novedad.id, a.asignacionId, autor, nota);
          setDescartando(false);
          sileo.success({ title: "Decisión registrada", description: "La asignación no se reabrirá." });
        }}
      />
    </li>
  );
}

/** La nota es opcional: decidir no reabrir ya es la información principal. */
function ModalSinAccion({
  abierto,
  onCerrar,
  onConfirmar,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onConfirmar: (nota: string) => void;
}) {
  const [nota, setNota] = useState("");
  const cerrar = () => {
    setNota("");
    onCerrar();
  };

  return (
    <Modal abierto={abierto} onCerrar={cerrar} titulo="No reabrir la asignación">
      <p className="mb-4 text-sm text-[var(--color-texto-suave)]">
        La asignación seguirá aprobada tal como se entregó. Si más adelante cambia de criterio,
        todavía podrá solicitar la corrección.
      </p>
      <Campo etiqueta="Nota" ayuda="Opcional. Por ejemplo, por qué el cambio no aplica a este periodo.">
        <textarea
          className="campo min-h-20 resize-y"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          data-foco-inicial
        />
      </Campo>
      <div className="mt-6 flex gap-3">
        <Boton variante="secundario" className="flex-1" onClick={cerrar}>
          Cancelar
        </Boton>
        <Boton
          className="flex-1"
          onClick={() => {
            onConfirmar(nota);
            setNota("");
          }}
        >
          Registrar decisión
        </Boton>
      </div>
    </Modal>
  );
}
