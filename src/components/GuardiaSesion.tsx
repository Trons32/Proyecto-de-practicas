"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSesionStore } from "@/lib/stores/sesion-store";
import { inicioDeRol } from "@/lib/auth/sesion";

/**
 * Controla el acceso a cada ruta según la sesión:
 *
 * · sin sesión            → al login
 * · con sesión en /login  → a su dashboard
 * · coordinador en /admin → a su inicio
 *
 * La sesión la dice el servidor (la cookie de NextAuth es httpOnly), así que
 * mientras se pregunta no se pinta nada, para no mostrar por un
 * instante contenido que el usuario quizá no puede ver.
 */
export default function GuardiaSesion({ children }: { children: React.ReactNode }) {
  const sesion = useSesionStore((s) => s.sesion);
  const hidratado = useSesionStore((s) => s.hidratado);
  const restaurar = useSesionStore((s) => s.restaurar);

  const ruta = usePathname();
  const router = useRouter();
  const esLogin = ruta === "/login";
  const cambioClave = ruta === "/cambiar-clave";

  useEffect(() => {
    void restaurar();
  }, [restaurar]);

  const rol = sesion?.usuario.rol;
  const zonaAdmin = ruta.startsWith("/admin");

  useEffect(() => {
    if (!hidratado) return;

    if (!sesion) {
      if (!esLogin) router.replace("/login");
      return;
    }
    if (esLogin) {
      router.replace(sesion.usuario.debeCambiarClave ? "/cambiar-clave" : inicioDeRol(sesion.usuario.rol));
      return;
    }
    if (sesion.usuario.debeCambiarClave && !cambioClave) {
      router.replace("/cambiar-clave");
      return;
    }
    if (zonaAdmin && rol !== "ADMIN") router.replace("/");
  }, [hidratado, sesion, esLogin, cambioClave, zonaAdmin, rol, router]);

  if (!hidratado) return null;
  if (!sesion && !esLogin) return null;
  if (sesion && esLogin) return null;
  if (sesion?.usuario.debeCambiarClave && !cambioClave) return null;
  if (sesion && zonaAdmin && rol !== "ADMIN") return null;

  return <>{children}</>;
}
