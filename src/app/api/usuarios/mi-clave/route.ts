/** Cada usuario actualiza solo su propia clave; el coordinador reemplaza aquí
 * la temporal que recibió al ser creado. */
import { bd } from "@/lib/servidor/bd";
import { claveValida, hashDeClave } from "@/lib/servidor/credenciales";
import { proveedorAuth, usuarioActual } from "@/lib/servidor/sesion";

export async function PUT(req: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return Response.json({ mensaje: "Inicie sesión para cambiar su contraseña." }, { status: 401 });
  // Con Aldea la clave es de la universidad: un hash local no serviría para
  // entrar y haría creer que se cambió (SPEC-018).
  if (proveedorAuth() === "api") return Response.json({ mensaje: "La contraseña se cambia en Aldea, no en este sistema." }, { status: 409 });
  const cuerpo = await req.json().catch(() => null);
  const clave = typeof cuerpo?.clave === "string" ? cuerpo.clave : "";
  if (!claveValida(clave)) return Response.json({ mensaje: "La contraseña debe tener entre 12 y 128 caracteres." }, { status: 400 });
  const resultado = await bd().usuario.updateMany({ where: { email: usuario.email.trim().toLowerCase(), activo: true }, data: { clave_hash: await hashDeClave(clave), clave_actualizada: new Date(), debe_cambiar_clave: false } });
  if (!resultado.count) return Response.json({ mensaje: "Su usuario no está habilitado en la base de datos." }, { status: 409 });
  // La cookie no se toca aquí: la próxima consulta de la sesión ve
  // `debe_cambiar_clave = false` en la base y actualiza el token.
  return Response.json({ usuario: { ...usuario, debeCambiarClave: false } });
}
