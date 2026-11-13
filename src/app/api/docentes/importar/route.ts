/**
 * Cargar el listado institucional de docentes (SPEC-021). Solo el
 * administrador.
 *
 * El navegador lee el Excel y manda las filas tal como vienen; la
 * depuración se repite aquí, para no confiar en lo que llega del cliente.
 * Sin `confirmar` solo devuelve el plan: es la vista previa.
 */
import { contarMotivos, depurarListado, type FilaListado } from "@/lib/directorio";
import { aplicarCarga, planearCarga } from "@/lib/servidor/directorio";
import { usuarioActual } from "@/lib/servidor/sesion";

const error = (status: number, mensaje: string) => Response.json({ mensaje }, { status });

const esFila = (f: unknown): f is FilaListado => {
  const o = f as Record<string, unknown>;
  return !!o && typeof o.fila === "number" && ["codigo", "cedula", "nombre"].every((k) => typeof o[k] === "string");
};

export async function POST(req: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return error(401, "Inicie sesión.");
  if (usuario.rol !== "ADMIN") return error(403, "Solo el administrador carga el listado de docentes.");
  if (usuario.debeCambiarClave) return error(403, "Actualice la contraseña temporal antes de modificar información.");

  const cuerpo = (await req.json().catch(() => null)) as { filas?: unknown[]; confirmar?: boolean } | null;
  const filas = cuerpo?.filas;
  if (!Array.isArray(filas) || filas.length === 0 || filas.length > 20_000 || !filas.every(esFila)) {
    return error(400, "El listado no llegó completo o no tiene la forma esperada.");
  }

  try {
    const { personas, descartes } = depurarListado(filas);
    const plan = await planearCarga(personas);
    const resumen = {
      filas: filas.length,
      nuevos: plan.nuevos.length,
      actualizados: plan.actualizar.length,
      sinCambios: plan.sinCambios,
      motivos: contarMotivos([...descartes, ...plan.descartes]),
      // Para revisar a mano: número de fila y código, sin cédulas ni nombres.
      descartes: descartes.slice(0, 500),
    };
    if (!cuerpo?.confirmar) return Response.json({ ...resumen, aplicado: false });
    await aplicarCarga(plan);
    return Response.json({ ...resumen, aplicado: true });
  } catch (e) {
    console.error("[docentes/importar]", e);
    return error(500, "No se pudo cargar el listado. No se guardó nada.");
  }
}
