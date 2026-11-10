/** Cada usuario actualiza solo su propia clave; el coordinador reemplaza aquí
 * la temporal que recibió al ser creado. */
import { cookies } from "next/headers";
import { bd } from "@/lib/servidor/bd";
import { claveValida, hashDeClave } from "@/lib/servidor/credenciales";
import { COOKIE_SESION, firmarSesion, usuarioActual } from "@/lib/servidor/sesion";
import type { Usuario } from "@/lib/auth/sesion";

export async function PUT(req: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return Response.json({ mensaje: "Inicie sesión para cambiar su contraseña." }, { status: 401 });
  const cuerpo = await req.json().catch(() => null);
  const clave = typeof cuerpo?.clave === "string" ? cuerpo.clave : "";
  if (!claveValida(clave)) return Response.json({ mensaje: "La contraseña debe tener entre 12 y 128 caracteres." }, { status: 400 });
  const resultado = await bd().usuario.updateMany({ where: { email: usuario.email.trim().toLowerCase(), activo: true }, data: { clave_hash: await hashDeClave(clave), clave_actualizada: new Date(), debe_cambiar_clave: false } });
  if (!resultado.count) return Response.json({ mensaje: "Su usuario no está habilitado en la base de datos." }, { status: 409 });
  const actualizado: Usuario = { ...usuario, debeCambiarClave: false };
  (await cookies()).set(COOKIE_SESION, firmarSesion(actualizado), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/",
  });
  return Response.json({ usuario: actualizado });
}
