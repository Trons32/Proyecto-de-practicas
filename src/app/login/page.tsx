"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSesionStore } from "@/lib/stores/sesion-store";
import { autenticar, inicioDeRol } from "@/lib/auth/sesion";
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle } from "@/components/iconos";

export default function Login() {
  const router = useRouter();
  const iniciar = useSesionStore((s) => s.iniciar);

  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [recordarme, setRecordarme] = useState(false);
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCargando(true);

    const r = await autenticar(email, clave);

    if (!r.ok || !r.usuario) {
      setError(r.mensaje ?? "No fue posible iniciar sesión.");
      setCargando(false);
      return;
    }

    iniciar(r.usuario, recordarme);
    router.replace(inicioDeRol(r.usuario.rol));
  };

  return (
    <div className="login-fondo flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="tarjeta-sombra rounded-2xl bg-white/95 p-8 backdrop-blur-sm">
          <div className="mb-8 flex flex-col items-center">
            <Image
              src="/logocecar.png"
              alt="CECAR"
              width={260}
              height={80}
              priority
              className="h-20 w-auto"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              <FiAlertCircle className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={enviar} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-[var(--color-texto)]"
              >
                Correo electrónico
              </label>
              {/* El hueco para el icono se abre con padding lógico (ps, pe) y no
                  con pl/pr: `.campo` ya declara px-3 y, entre dos reglas de
                  padding-left, gana la de la hoja y el texto queda bajo el icono. */}
              <div className="relative">
                <FiMail
                  className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-[var(--color-texto-suave)]/60"
                  aria-hidden
                />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@cecar.edu.co"
                  className="campo py-3 ps-11"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="clave"
                className="mb-2 block text-sm font-medium text-[var(--color-texto)]"
              >
                Contraseña
              </label>
              <div className="relative">
                <FiLock
                  className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-[var(--color-texto-suave)]/60"
                  aria-hidden
                />
                <input
                  id="clave"
                  type={verClave ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  placeholder="••••••••"
                  className="campo py-3 ps-11 pe-11"
                />
                <button
                  type="button"
                  onClick={() => setVerClave((v) => !v)}
                  aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-[var(--color-texto-suave)]/60 transition hover:text-[var(--color-texto)]"
                >
                  {verClave ? (
                    <FiEyeOff className="h-5 w-5" aria-hidden />
                  ) : (
                    <FiEye className="h-5 w-5" aria-hidden />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-[var(--color-texto-suave)]">
                <input
                  type="checkbox"
                  checked={recordarme}
                  onChange={(e) => setRecordarme(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--color-borde)] accent-cecar-600"
                />
                <span>Recordarme</span>
              </label>
              <span className="font-medium text-[var(--color-texto-suave)]/70">
                ¿Olvidaste tu contraseña?
              </span>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-cecar-600 px-4 py-3
                         text-sm font-semibold text-white shadow-md transition
                         hover:-translate-y-0.5 hover:bg-cecar-700 hover:shadow-lg
                         focus:ring-2 focus:ring-cecar-500/40 focus:outline-none
                         active:scale-95 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {cargando ? "Ingresando…" : "Ingresar"}
              {cargando && (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent"
                  aria-hidden
                />
              )}
            </button>
          </form>
        </div>

        <footer className="w-full py-4 text-center">
          <p className="text-sm text-white/90">
            © {new Date().getFullYear()} Asignación Académica · CECAR
          </p>
        </footer>
      </div>
    </div>
  );
}
