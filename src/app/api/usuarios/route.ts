/** Administración de accesos (SPEC-014). Este endpoint no usa los stores:
 * usuarios y hashes son datos sensibles y solo se consultan desde el servidor. */
import { bd } from "@/lib/servidor/bd";
import { claveTemporal, esCorreoInstitucional, hashDeClave, normalizarCorreo } from "@/lib/servidor/credenciales";
import { avisarAcceso, smtpConfigurado } from "@/lib/servidor/correo";
import { proveedorAuth, usuarioActual } from "@/lib/servidor/sesion";

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
  return Response.json({ usuarios: usuarios.map((u) => ({ ...u, programa: u.programa?.nombre ?? null })), programas, proveedor: proveedorAuth(), smtp: smtpConfigurado() });
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
  if (proveedorAuth() === "api") return crearConAldea({ email, nombres, rol, programaId });
  const clave = claveTemporal();
  let creado: { id: string };
  try {
    creado = await bd().usuario.create({ data: { email, nombres, rol, programa_id: rol === "COORDINADOR" ? programaId : null, clave_hash: await hashDeClave(clave), clave_actualizada: new Date(), debe_cambiar_clave: true }, select: { id: true } });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return error(409, "Ya existe un usuario con ese correo.");
    throw e;
  }
  return credenciales(201, { id: creado.id, email, nombres, clave });
}

/**
 * La clave temporal va al administrador, que la entrega como prefiera
 * (copiar, WhatsApp, su correo o el relay SMTP). Es la única vez que sale en
 * claro: en la base solo queda el hash, y el usuario debe cambiarla al
 * primer ingreso (CA-014.8), así que lo que viaje por un chat deja de servir
 * en cuanto entra. `no-store` para que ningún caché la guarde.
 */
function credenciales(status: number, datos: { id: string; email: string; nombres: string; clave: string }) {
  return Response.json({ credenciales: datos }, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Alta con Aldea (SPEC-018, sección 2): sin clave, porque la valida la
 * universidad. Si el aviso por correo falla la cuenta se queda: no hay un
 * secreto que el coordinador no conozca, solo un aviso que no le llegó.
 */
async function crearConAldea({ email, nombres, rol, programaId }: { email: string; nombres: string; rol: "ADMIN" | "COORDINADOR"; programaId: number | null }) {
  try {
    await bd().usuario.create({ data: { email, nombres, rol, programa_id: rol === "COORDINADOR" ? programaId : null, clave_hash: null, debe_cambiar_clave: false }, select: { id: true } });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return error(409, "Ya existe un usuario con ese correo.");
    throw e;
  }
  try {
    await avisarAcceso(email, nombres);
  } catch (e) {
    console.error("[usuarios] no se envió el aviso de acceso:", (e as Error).message);
    return Response.json({ mensaje: `Acceso habilitado. No se pudo enviar el aviso por correo: avísele a ${email} que ya puede entrar con su usuario de Aldea.` }, { status: 201 });
  }
  return Response.json({ mensaje: `Acceso habilitado. Se avisó a ${email} que entre con su usuario de Aldea.` }, { status: 201 });
}

/**
 * Nueva clave temporal para quien perdió la suya, o para cuando el
 * administrador cerró la entrega sin copiarla: solo existe el hash, así que
 * no hay forma de volver a mostrar la anterior.
 */
async function restablecer(id: string) {
  const yo = await administrador();
  if (!yo) return error(403, "Solo el administrador gestiona usuarios.");
  if (proveedorAuth() === "api") return error(409, "La contraseña se cambia en Aldea, no en este sistema.");
  if (id === yo.id) return error(409, "Cambie su propia contraseña en «Mi contraseña de administrador».");
  const fila = await bd().usuario.findUnique({ where: { id }, select: { id: true, email: true, nombres: true, activo: true } });
  if (!fila) return error(404, "El usuario ya no existe.");
  if (!fila.activo) return error(409, "Active el usuario antes de generarle una contraseña.");
  const clave = claveTemporal();
  await bd().usuario.update({ where: { id }, data: { clave_hash: await hashDeClave(clave), clave_actualizada: new Date(), debe_cambiar_clave: true } });
  return credenciales(200, { id: fila.id, email: fila.email, nombres: fila.nombres, clave });
}

export async function PATCH(req: Request) {
  if (!(await administrador())) return error(403, "Solo el administrador gestiona usuarios.");
  const cuerpo = await req.json().catch(() => null);
  const id = typeof cuerpo?.id === "string" ? cuerpo.id : "";
  if (cuerpo?.restablecer === true) return restablecer(id);
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
