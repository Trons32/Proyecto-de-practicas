/** Administración de accesos (SPEC-014). Este endpoint no usa los stores:
 * usuarios y hashes son datos sensibles y solo se consultan desde el servidor. */
import { bd } from "@/lib/servidor/bd";
import { claveTemporal, esCorreoInstitucional, hashDeClave, normalizarCorreo } from "@/lib/servidor/credenciales";
import { entregarCredenciales } from "@/lib/servidor/correo";
import { usuarioActual } from "@/lib/servidor/sesion";

const error = (status: number, mensaje: string) => Response.json({ mensaje }, { status });

async function administrador() {
  const usuario = await usuarioActual();
  return usuario?.rol === "ADMIN" ? usuario : null;
}

export async function GET() {
  if (!(await administrador())) return error(403, "Solo el administrador gestiona usuarios.");
  const [usuarios, programas] = await Promise.all([
    bd().usuario.findMany({
      select: { id: true, email: true, nombres: true, rol: true, activo: true, programa: { select: { nombre: true } } },
      orderBy: [{ rol: "asc" }, { nombres: "asc" }],
    }),
    bd().programa.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);
  return Response.json({ usuarios: usuarios.map((u) => ({ ...u, programa: u.programa?.nombre ?? null })), programas });
}

export async function POST(req: Request) {
  if (!(await administrador())) return error(403, "Solo el administrador crea usuarios.");
  const cuerpo = await req.json().catch(() => null);
  const nombres = typeof cuerpo?.nombres === "string" ? cuerpo.nombres.trim() : "";
  const email = typeof cuerpo?.email === "string" ? normalizarCorreo(cuerpo.email) : "";
  const rol = cuerpo?.rol === "ADMIN" || cuerpo?.rol === "COORDINADOR" ? cuerpo.rol : null;
  const programaId = typeof cuerpo?.programaId === "number" ? cuerpo.programaId : null;
  if (nombres.length < 3 || nombres.length > 150) return error(400, "Indique el nombre completo (3 a 150 caracteres).");
  if (!esCorreoInstitucional(email)) return error(400, "Use un correo institucional @cecar.edu.co.");
  if (!rol) return error(400, "Seleccione el rol del usuario.");
  if (rol === "COORDINADOR" && !programaId) return error(400, "Seleccione el programa del coordinador.");
  if (programaId && !(await bd().programa.findUnique({ where: { id: programaId }, select: { id: true } }))) return error(400, "El programa seleccionado no existe.");
  const clave = claveTemporal();
  let creado: { id: string };
  try {
    creado = await bd().usuario.create({ data: { email, nombres, rol, programa_id: rol === "COORDINADOR" ? programaId : null, clave_hash: await hashDeClave(clave), clave_actualizada: new Date(), debe_cambiar_clave: rol === "COORDINADOR" }, select: { id: true } });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return error(409, "Ya existe un usuario con ese correo.");
    throw e;
  }
  try {
    const entrega = await entregarCredenciales(email, nombres, clave);
    if (entrega === "prueba") {
      return Response.json({
        mensaje: "Usuario creado. Copie la contraseña temporal ahora: no se volverá a mostrar.",
        clave,
        entrega,
      }, { status: 201 });
    }
  } catch (e) {
    // Un usuario nuevo sin conocer su clave no debe quedar habilitado.
    await bd().usuario.delete({ where: { id: creado.id } }).catch(() => {});
    console.error("[usuarios] no se enviaron las credenciales:", (e as Error).message);
    return error(502, "No fue posible enviar el correo. Revise la configuración SMTP e intente de nuevo.");
  }
  return Response.json({ mensaje: `Credenciales enviadas a ${email}.` }, { status: 201 });
}

export async function PATCH(req: Request) {
  if (!(await administrador())) return error(403, "Solo el administrador gestiona usuarios.");
  const cuerpo = await req.json().catch(() => null);
  const id = typeof cuerpo?.id === "string" ? cuerpo.id : "";
  const activo = typeof cuerpo?.activo === "boolean" ? cuerpo.activo : null;
  if (!id || activo === null) return error(400, "La solicitud no es válida.");
  // Activar o desactivar es el único cambio que llega sin el formulario.
  if (typeof cuerpo?.nombres !== "string") {
    await bd().usuario.update({ where: { id }, data: { activo } }).catch(() => null);
    return new Response(null, { status: 204 });
  }
  const nombres = cuerpo.nombres.trim();
  const email = typeof cuerpo?.email === "string" ? normalizarCorreo(cuerpo.email) : "";
  const rol = cuerpo?.rol === "ADMIN" || cuerpo?.rol === "COORDINADOR" ? cuerpo.rol : null;
  const programaId = typeof cuerpo?.programaId === "number" ? cuerpo.programaId : null;
  if (nombres.length < 3 || nombres.length > 150) return error(400, "Indique el nombre completo (3 a 150 caracteres).");
  if (!esCorreoInstitucional(email)) return error(400, "Use un correo institucional @cecar.edu.co.");
  if (!rol) return error(400, "Seleccione el rol del usuario.");
  if (rol === "COORDINADOR" && !programaId) return error(400, "Seleccione el programa del coordinador.");
  if (programaId && !(await bd().programa.findUnique({ where: { id: programaId }, select: { id: true } }))) return error(400, "El programa seleccionado no existe.");
  try {
    await bd().usuario.update({
      where: { id },
      data: { nombres, email, rol, programa_id: rol === "COORDINADOR" ? programaId : null, activo },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return error(409, "Ya existe un usuario con ese correo.");
    return error(404, "El usuario ya no existe.");
  }
  return Response.json({ mensaje: "Usuario actualizado." });
}
