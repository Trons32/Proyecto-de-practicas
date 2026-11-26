"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import { Boton, Casilla } from "./ui";
import { useSesionStore } from "@/lib/stores/sesion-store";

/**
 * El video de cómo usar el sistema, para el coordinador. Se abre al entrar
 * (una vez por sesión del navegador, no en cada cambio de página) hasta que
 * marque «No volver a mostrar». La barra lateral lo reabre con el evento.
 *
 * Es una preferencia de interfaz, no un dato del negocio: va en el
 * navegador, por usuario, y no en los stores que persisten en la base.
 * Perderla al cambiar de equipo solo vuelve a mostrar el video.
 */
export const EVENTO_TUTORIAL = "cecar:abrir-tutorial";
const VIDEO = "/tutorial/uso-del-sistema.mp4";
const claveOculto = (usuarioId: string) => `cecar-tutorial-oculto:${usuarioId}`;
const claveVisto = (usuarioId: string) => `cecar-tutorial-visto:${usuarioId}`;

export const abrirTutorial = () => window.dispatchEvent(new Event(EVENTO_TUTORIAL));

/** Lo que dice el navegador; sin storage (modo privado estricto) no se insiste. */
const leer = (usuarioId: string) => {
  try {
    return {
      oculto: localStorage.getItem(claveOculto(usuarioId)) === "1",
      visto: sessionStorage.getItem(claveVisto(usuarioId)) === "1",
    };
  } catch {
    return { oculto: true, visto: true };
  }
};

export default function TutorialCoordinador() {
  const usuario = useSesionStore((s) => s.sesion?.usuario);
  // La sesión se restaura en el cliente: cuando llega el usuario ya hay
  // storage, y la `key` vuelve a decidir si cambia quien entró.
  if (usuario?.rol !== "COORDINADOR") return null;
  return <Tutorial key={usuario.id} usuarioId={usuario.id} />;
}

function Tutorial({ usuarioId }: { usuarioId: string }) {
  const [abierto, setAbierto] = useState(() => {
    const { oculto, visto } = leer(usuarioId);
    return !oculto && !visto;
  });
  const [noVolver, setNoVolver] = useState(() => leer(usuarioId).oculto);

  // Una vez por sesión del navegador, no en cada recarga.
  useEffect(() => {
    try {
      sessionStorage.setItem(claveVisto(usuarioId), "1");
    } catch {}
  }, [usuarioId]);

  useEffect(() => {
    const abrir = () => {
      setNoVolver(leer(usuarioId).oculto);
      setAbierto(true);
    };
    window.addEventListener(EVENTO_TUTORIAL, abrir);
    return () => window.removeEventListener(EVENTO_TUTORIAL, abrir);
  }, [usuarioId]);

  const cerrar = () => {
    try {
      if (noVolver) localStorage.setItem(claveOculto(usuarioId), "1");
      else localStorage.removeItem(claveOculto(usuarioId));
    } catch {}
    setAbierto(false);
  };

  return (
    <Modal abierto={abierto} onCerrar={cerrar} titulo="Cómo usar Asignación Académica" tamano="xl">
      <p className="mb-4 text-sm text-[var(--color-texto-suave)]">
        Un recorrido corto: crear la asignación, registrar a los docentes, repartir sus horas y
        enviarla a revisión.
      </p>

      <div className="overflow-hidden rounded-xl bg-black shadow-inner">
        {/* Solo se descarga al abrir el modal: preload="metadata" y el modal desmontado si está cerrado. */}
        <video
          src={VIDEO}
          controls
          playsInline
          preload="metadata"
          className="mx-auto block max-h-[60vh] w-full"
        >
          Su navegador no puede reproducir el video.{" "}
          <a href={VIDEO} className="underline">Descárguelo aquí</a>.
        </video>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Casilla
          etiqueta="No volver a mostrar al entrar"
          checked={noVolver}
          onChange={(e) => setNoVolver(e.target.checked)}
        />
        <Boton onClick={cerrar} data-foco-inicial>
          Entendido
        </Boton>
      </div>
      <p className="mt-3 text-xs text-[var(--color-texto-suave)]">
        Puede volver a verlo cuando quiera desde «Ver tutorial», en el menú lateral.
      </p>
    </Modal>
  );
}
