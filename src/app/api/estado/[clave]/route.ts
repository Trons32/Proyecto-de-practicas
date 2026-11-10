/**
 * Lectura y escritura de cada store contra PostgreSQL (SPEC-006, SPEC-011).
 *
 * GET devuelve `{ state, version }`, la forma que espera `persist`, con la
 * versión vigente de cada store para que no dispare su `migrate`.
 *
 * Exige la cookie de sesión (SPEC-008). Leer puede cualquier usuario;
 * parámetros y novedades solo los escribe el administrador, y en las
 * asignaciones cada evento nuevo tiene que ser de quien tiene la sesión.
 */
import { CLAVES } from "@/lib/datos/almacen";
import { CambioRechazado, DatoRechazado, esRechazoDeLaBase, guardarAsignaciones, guardarConfiguracion, guardarNovedades } from "@/lib/servidor/escribir";
import { leerAsignaciones, leerConfiguracion, leerNovedades } from "@/lib/servidor/leer";
import { usuarioActual } from "@/lib/servidor/sesion";

/** Deben coincidir con `version` de cada store. */
const VERSIONES = { asignaciones: 4, configuracion: 2, novedades: 1 } as const;

type Nombre = keyof typeof CLAVES;
const nombreDe = (clave: string) =>
  (Object.keys(CLAVES) as Nombre[]).find((k) => CLAVES[k] === clave);

const error = (status: number, mensaje: string) => Response.json({ mensaje }, { status });

export async function GET(_req: Request, ctx: { params: Promise<{ clave: string }> }) {
  const nombre = nombreDe((await ctx.params).clave);
  if (!nombre) return error(404, "Clave desconocida.");
  if (!(await usuarioActual())) return error(401, "Inicie sesión.");

  try {
    const state =
      nombre === "asignaciones" ? await leerAsignaciones()
      : nombre === "configuracion" ? await leerConfiguracion()
      : await leerNovedades();
    return Response.json({ state, version: VERSIONES[nombre] });
  } catch (e) {
    console.error(`[api/estado] GET ${nombre}:`, e);
    return error(500, "No se pudo leer la base de datos.");
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ clave: string }> }) {
  const nombre = nombreDe((await ctx.params).clave);
  if (!nombre) return error(404, "Clave desconocida.");

  const usuario = await usuarioActual();
  if (!usuario) return error(401, "Inicie sesión.");
  if (usuario.debeCambiarClave) {
    return error(403, "Actualice la contraseña temporal antes de modificar información.");
  }
  if (nombre !== "asignaciones" && usuario.rol !== "ADMIN") {
    return error(403, "Solo el administrador cambia parámetros y novedades.");
  }

  const cuerpo = await req.json().catch(() => null);
  if (!cuerpo || typeof cuerpo !== "object") return error(400, "Cuerpo inválido.");

  try {
    if (nombre === "asignaciones") {
      await guardarAsignaciones(cuerpo.asignaciones ?? [], cuerpo.borrados ?? [], usuario);
    } else if (nombre === "configuracion") {
      await guardarConfiguracion(cuerpo.state);
    } else {
      await guardarNovedades(cuerpo.novedades ?? []);
    }
    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof DatoRechazado) return error(422, e.message);
    if (e instanceof CambioRechazado) return error(409, e.message);
    // Una restricción de la base (cascada inválida, valor fuera de rango):
    // el dato está mal, no el servidor.
    if (esRechazoDeLaBase(e)) {
      console.warn(`[api/estado] PUT ${nombre} rechazado:`, (e as unknown as Error).message);
      return error(422, "La base rechazó un dato. Revise los campos del docente que estaba editando.");
    }
    console.error(`[api/estado] PUT ${nombre}:`, e);
    return error(500, "No se pudo guardar en la base de datos.");
  }
}
