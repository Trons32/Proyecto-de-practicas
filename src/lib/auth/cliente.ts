"use client";

/**
 * La sesión vista desde el navegador (SPEC-018). Habla con NextAuth por sus
 * rutas (`/api/auth/*`); la cookie es httpOnly y el navegador nunca la lee.
 */
import { signIn, signOut } from "next-auth/react";
import { COOKIE_RECORDARME, type Usuario } from "./sesion";

export interface ResultadoAuth {
  ok: boolean;
  usuario?: Usuario;
  mensaje?: string;
}

/**
 * Un solo mensaje para clave errada y para cuenta no habilitada (SPEC-018,
 * sección 2): distinguirlos revelaría qué correos están registrados.
 */
export const MENSAJE_CREDENCIALES =
  "Correo o contraseña incorrectos, o su cuenta no está habilitada en este sistema. Si es coordinador, pida acceso al administrador.";

/** El usuario de la cookie, o null. Consultarla también la renueva. */
export async function leerSesion(): Promise<Usuario | null> {
  const r = await fetch("/api/auth/session", { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const sesion = (await r.json().catch(() => null)) as { usuario?: Usuario } | null;
  return sesion?.usuario ?? null;
}

export async function autenticar(email: string, clave: string, recordarme = false): Promise<ResultadoAuth> {
  try {
    // La ruta de NextAuth la lee para decidir si la cookie sobrevive al
    // cierre del navegador; debe estar puesta antes del login.
    document.cookie = recordarme
      ? `${COOKIE_RECORDARME}=1; path=/; max-age=31536000; samesite=lax`
      : `${COOKIE_RECORDARME}=0; path=/; samesite=lax`;
    const r = await signIn("credentials", { email, clave, redirect: false });
    if (!r || r.error) return { ok: false, mensaje: MENSAJE_CREDENCIALES };
    const usuario = await leerSesion();
    return usuario ? { ok: true, usuario } : { ok: false, mensaje: MENSAJE_CREDENCIALES };
  } catch {
    return { ok: false, mensaje: "No hay conexión con el servidor." };
  }
}

/** Borra la cookie de sesión en el servidor. */
export function cerrarEnServidor(): void {
  void signOut({ redirect: false }).catch(() => {});
}

/** Cada cuánto, como mucho, la actividad del usuario renueva la sesión. */
export const RENOVAR_CADA_MS = 5 * 60 * 1000;
