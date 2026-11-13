"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boton, Campo, Entrada } from "@/components/ui";
import { FiLock } from "@/components/iconos";
import { inicioDeRol } from "@/lib/auth/sesion";
import { leerSesion } from "@/lib/auth/cliente";
import { recargarDatos } from "@/lib/datos/recargar";
import { useSesionStore } from "@/lib/stores/sesion-store";

export default function CambiarClave() {
  const router = useRouter();
  const actualizarUsuario = useSesionStore((s) => s.actualizarUsuario);
  const [clave, setClave] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const guardar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setError("");
    if (clave !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setGuardando(true);
    try {
      const respuesta = await fetch("/api/usuarios/mi-clave", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave }),
      });
      const datos = await respuesta.json().catch(() => ({})) as { mensaje?: string };
      if (!respuesta.ok) {
        throw new Error(datos.mensaje ?? "No fue posible actualizar la contraseña.");
      }
      // Consultar la sesión la pone al día: con la clave temporal pendiente,
      // el token vuelve a leer la base en cada consulta (SPEC-018).
      const usuario = await leerSesion();
      if (!usuario) throw new Error("Su sesión venció. Ingrese con la nueva contraseña.");
      actualizarUsuario(usuario);
      await recargarDatos();
      router.replace(inicioDeRol(usuario.rol));
    } catch (causa) {
      setError((causa as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="login-fondo flex min-h-screen items-center justify-center p-4">
      <section className="tarjeta-sombra w-full max-w-md rounded-2xl bg-white/95 p-8 backdrop-blur-sm">
        <div className="mb-6 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cecar-50 text-cecar-700">
            <FiLock className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-texto)]">Actualice su contraseña</h1>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-texto-suave)]">
              Para proteger su cuenta, debe reemplazar la contraseña temporal antes de continuar.
            </p>
          </div>
        </div>

        {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

        <form onSubmit={guardar} className="space-y-4">
          <Campo etiqueta="Nueva contraseña" requerido ayuda="Entre 12 y 128 caracteres.">
            <Entrada type="password" autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} minLength={12} maxLength={128} required autoFocus />
          </Campo>
          <Campo etiqueta="Confirme la nueva contraseña" requerido>
            <Entrada type="password" autoComplete="new-password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} minLength={12} maxLength={128} required />
          </Campo>
          <Boton type="submit" className="mt-2 w-full" disabled={guardando}>
            {guardando ? "Actualizando…" : "Guardar y continuar"}
          </Boton>
        </form>
      </section>
    </main>
  );
}
