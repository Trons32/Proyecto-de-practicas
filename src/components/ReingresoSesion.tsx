"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { Boton, Campo, Entrada } from "@/components/ui";
import { autenticar } from "@/lib/auth/cliente";
import { COOKIE_RECORDARME } from "@/lib/auth/sesion";
import { reanudarGuardado } from "@/lib/datos/reanudar";
import { useSesionStore } from "@/lib/stores/sesion-store";

const ACTIVIDAD = ["pointerdown", "keydown", "focus", "visibilitychange"] as const;

/**
 * Mantiene la sesión mientras se trabaja y, si vence, la recupera sin perder
 * la página (SPEC-018).
 *
 * La actividad renueva la cookie (como mucho cada 5 minutos), así que solo
 * vence quien deja la aplicación quieta una jornada. Si aun así vence con
 * cambios por guardar, se pide la clave aquí en vez de mandar al login: allí
 * se recargarían los datos y el cambio pendiente se perdería.
 */
export default function ReingresoSesion() {
  const router = useRouter();
  const sesion = useSesionStore((s) => s.sesion);
  const vencida = useSesionStore((s) => s.vencida);
  const renovar = useSesionStore((s) => s.renovar);
  const reanudar = useSesionStore((s) => s.reanudar);
  const cerrar = useSesionStore((s) => s.cerrar);

  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    if (!sesion) return;
    for (const evento of ACTIVIDAD) window.addEventListener(evento, renovar, { passive: true });
    return () => {
      for (const evento of ACTIVIDAD) window.removeEventListener(evento, renovar);
    };
  }, [sesion, renovar]);

  if (!sesion || !vencida) return null;
  const { email } = sesion.usuario;

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEntrando(true);
    // "Recordarme" ya quedó elegido en el login: su cookie sigue puesta.
    const r = await autenticar(email, clave, document.cookie.includes(`${COOKIE_RECORDARME}=1`));
    setEntrando(false);
    if (!r.ok || !r.usuario) {
      setError(r.mensaje ?? "No fue posible ingresar.");
      return;
    }
    setClave("");
    reanudar(r.usuario);
    await reanudarGuardado();
  };

  const salir = () => {
    cerrar();
    router.replace("/login");
  };

  return (
    // Sin onCerrar efectivo: con Escape o un clic afuera quedaría la
    // aplicación abierta sin poder guardar.
    <Modal abierto onCerrar={() => {}} titulo="Su sesión venció">
      <form onSubmit={entrar} className="space-y-4">
        <p className="text-sm leading-relaxed text-[var(--color-texto-suave)]">
          Ingrese de nuevo su contraseña para continuar. Lo que no alcanzó a
          guardarse se guardará al entrar.
        </p>
        {error && (
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}
        <Campo etiqueta="Correo">
          <Entrada type="email" value={email} readOnly disabled />
        </Campo>
        <Campo etiqueta="Contraseña" requerido>
          <Entrada
            data-foco-inicial
            type="password"
            autoComplete="current-password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
          />
        </Campo>
        <div className="flex justify-end gap-3">
          <Boton variante="secundario" onClick={salir} disabled={entrando}>
            Salir
          </Boton>
          <Boton type="submit" disabled={entrando}>
            {entrando ? "Ingresando…" : "Continuar"}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
