/**
 * Envía por el relay SMTP las credenciales que el administrador acaba de
 * recibir (SPEC-014 §Entrega). El servidor no guarda la clave en claro, así
 * que el navegador la devuelve; antes de enviarla se comprueba contra el
 * hash, para que este endpoint no sirva para mandar texto arbitrario
 * con el remitente institucional.
 */
import { bd } from "@/lib/servidor/bd";
import { coincideClave } from "@/lib/servidor/credenciales";
import { enviarCredenciales } from "@/lib/servidor/correo";
import { usuarioActual } from "@/lib/servidor/sesion";

const error = (status: number, mensaje: string) => Response.json({ mensaje }, { status });

export async function POST(req: Request) {
  if ((await usuarioActual())?.rol !== "ADMIN") return error(403, "Solo el administrador envía credenciales.");
  const cuerpo = await req.json().catch(() => null);
  const id = typeof cuerpo?.id === "string" ? cuerpo.id : "";
  const clave = typeof cuerpo?.clave === "string" ? cuerpo.clave : "";
  const fila = id ? await bd().usuario.findUnique({ where: { id }, select: { email: true, nombres: true, activo: true, clave_hash: true, debe_cambiar_clave: true } }) : null;
  // Solo la temporal vigente: una clave ya cambiada por el usuario no se
  // vuelve a enviar, aunque alguien la conozca.
  if (!fila?.activo || !fila.debe_cambiar_clave || !(await coincideClave(clave, fila.clave_hash))) {
    return error(409, "Esa contraseña temporal ya no es la vigente. Genere una nueva.");
  }
  try {
    await enviarCredenciales(fila.email, fila.nombres, clave);
  } catch (e) {
    console.error("[usuarios] no se enviaron las credenciales:", (e as Error).message);
    return error(502, "El correo institucional no respondió. Use otra opción de envío.");
  }
  return Response.json({ mensaje: `Credenciales enviadas a ${fila.email}.` });
}
