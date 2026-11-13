/**
 * Buscar un docente en el directorio (SPEC-021). Cualquier usuario con
 * sesión, una consulta a la vez y como mucho 8 resultados: no hay forma de
 * bajar el directorio entero.
 *
 * `modo=prefijo`: las sugerencias mientras se escribe la cédula, sin la
 * última ficha (se piden en cada pausa del teclado).
 */
import { buscarDocentes, sugerirPorCedula } from "@/lib/servidor/directorio";
import { usuarioActual } from "@/lib/servidor/sesion";

export async function GET(req: Request) {
  if (!(await usuarioActual())) return Response.json({ mensaje: "Inicie sesión." }, { status: 401 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 80);
  try {
    const resultados = url.searchParams.get("modo") === "prefijo"
      ? await sugerirPorCedula(q.trim())
      : await buscarDocentes(q, url.searchParams.get("excluir") ?? undefined);
    return Response.json({ resultados }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[docentes/buscar]", e);
    return Response.json({ mensaje: "No se pudo consultar el directorio." }, { status: 500 });
  }
}
