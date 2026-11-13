/**
 * Importar la asignación de un periodo anterior (SPEC-017).
 *
 * Una por petición y con respuesta: la vista importa hoja por hoja y sabe
 * cuál entró y cuál no, en vez de mandar un lote por el adaptador de los
 * stores, que guarda en segundo plano y no espera confirmación.
 *
 * Las reglas son las de siempre (`transiciones.ts`, vía `guardarAsignaciones`):
 * solo el administrador, nace aprobada, un único evento `importada`. Aquí se
 * añade lo que depende de lo que ya hay en la base: una asignación hecha en
 * el sistema nunca se pisa, y una importada solo se reemplaza si se pide.
 */
import { esImportada, type Asignacion } from "@/lib/tipos";
import { bd } from "@/lib/servidor/bd";
import { CambioRechazado, DatoRechazado, esRechazoDeLaBase, guardarAsignaciones } from "@/lib/servidor/escribir";
import { leerAsignaciones } from "@/lib/servidor/leer";
import { usuarioActual } from "@/lib/servidor/sesion";

const error = (status: number, mensaje: string) => Response.json({ mensaje }, { status });

export async function POST(req: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return error(401, "Inicie sesión.");
  if (usuario.rol !== "ADMIN") return error(403, "Solo el administrador importa asignaciones.");
  if (usuario.debeCambiarClave) return error(403, "Actualice la contraseña temporal antes de modificar información.");

  const cuerpo = (await req.json().catch(() => null)) as { asignacion?: Asignacion; reemplazar?: string } | null;
  const a = cuerpo?.asignacion;
  if (!a || typeof a !== "object" || !Array.isArray(a.docentes) || !Array.isArray(a.bitacora)) {
    return error(400, "Cuerpo inválido.");
  }
  if (!esImportada(a)) return error(400, "Por aquí solo entran asignaciones importadas.");
  if (!/^[12]\d{3}-[12]$/.test(a.periodo)) return error(422, `El periodo «${a.periodo}» no es válido.`);

  try {
    // Lo que ya hay de ese programa en ese periodo.
    const ids = (
      await bd().asignacion.findMany({
        where: { periodo: a.periodo, programa: { nombre: a.programa } },
        select: { id: true },
      })
    ).map((x) => x.id);
    const existentes = ids.length ? (await leerAsignaciones({ ids })).asignaciones : [];
    const propia = existentes.find((x) => !esImportada(x));
    if (propia) {
      return error(409, `${a.programa} ya tiene una asignación de ${a.periodo} hecha en el sistema; no se reemplaza con un Excel.`);
    }
    const otra = existentes.find((x) => x.id !== cuerpo?.reemplazar);
    if (otra) {
      return error(409, `${a.programa} ya tiene una asignación importada de ${a.periodo}. Elija reemplazarla.`);
    }
    const reemplazar = existentes.filter((x) => x.id === cuerpo?.reemplazar).map((x) => x.id);

    await guardarAsignaciones([a], reemplazar, usuario);
    return Response.json({ id: a.id }, { status: 201 });
  } catch (e) {
    if (e instanceof DatoRechazado) return error(422, e.message);
    if (e instanceof CambioRechazado) return error(409, e.message);
    if (esRechazoDeLaBase(e)) {
      console.warn("[api/importar] rechazado:", (e as Error).message);
      return error(422, "La base rechazó un dato de esta hoja. Revise los valores marcados en la revisión.");
    }
    console.error("[api/importar]:", e);
    return error(500, "No se pudo guardar en la base de datos.");
  }
}
