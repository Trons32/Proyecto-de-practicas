/**
 * Iniciar y cerrar sesión (SPEC-008). La clave solo viaja aquí y no se
 * guarda en ninguna parte: lo que queda es la cookie firmada.
 */
import { cookies } from "next/headers";
import { DURACION_SESION_MS } from "@/lib/auth/sesion";
import { sqlHabilitado } from "@/lib/servidor/bd";
import { COOKIE_SESION, firmarSesion, verificarCredenciales } from "@/lib/servidor/sesion";

export async function POST(req: Request) {
  if (!sqlHabilitado()) return Response.json({ mensaje: "El servidor no está habilitado." }, { status: 503 });

  const cuerpo = await req.json().catch(() => null);
  const email = typeof cuerpo?.email === "string" ? cuerpo.email : "";
  const clave = typeof cuerpo?.clave === "string" ? cuerpo.clave : "";
  const usuario = await verificarCredenciales(email, clave);
  // El mismo mensaje para usuario inexistente y clave errada: distinguirlos
  // le diría a quien prueba qué correos existen.
  if (!usuario) return Response.json({ mensaje: "Credenciales incorrectas." }, { status: 401 });

  (await cookies()).set(COOKIE_SESION, firmarSesion(usuario), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Sin "Recordarme" es cookie de sesión: muere al cerrar el navegador,
    // igual que el sessionStorage del cliente.
    ...(cuerpo?.recordarme ? { maxAge: DURACION_SESION_MS / 1000 } : {}),
  });
  return Response.json({ usuario });
}

export async function DELETE() {
  (await cookies()).delete(COOKIE_SESION);
  return new Response(null, { status: 204 });
}
