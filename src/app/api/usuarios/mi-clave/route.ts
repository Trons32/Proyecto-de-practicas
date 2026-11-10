/** El administrador fija su propia clave antes de habilitar AUTH_PROVEEDOR=local. */
import { bd } from "@/lib/servidor/bd";
import { claveValida, hashDeClave } from "@/lib/servidor/credenciales";
import { usuarioActual } from "@/lib/servidor/sesion";

export async function PUT(req: Request) {
  const usuario = await usuarioActual();
  if (!usuario || usuario.rol !== "ADMIN") return Response.json({ mensaje: "Solo el administrador puede cambiar esta clave." }, { status: 403 });
  const cuerpo = await req.json().catch(() => null);
  const clave = typeof cuerpo?.clave === "string" ? cuerpo.clave : "";
  if (!claveValida(clave)) return Response.json({ mensaje: "La contraseña debe tener entre 12 y 128 caracteres." }, { status: 400 });
  const resultado = await bd().usuario.updateMany({ where: { email: usuario.email.trim().toLowerCase(), activo: true }, data: { clave_hash: await hashDeClave(clave), clave_actualizada: new Date() } });
  if (!resultado.count) return Response.json({ mensaje: "Su usuario no está habilitado en la base de datos." }, { status: 409 });
  return new Response(null, { status: 204 });
}
