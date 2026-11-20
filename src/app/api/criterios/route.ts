/**
 * Criterios de asignación (SPEC-025).
 *
 *   GET     las versiones publicadas (los dos roles) y, al administrador, los borradores
 *   PUT     { periodo, contenido }   guarda el borrador del periodo
 *   POST    { periodo, motivo }      publica el borrador
 *   DELETE  ?periodo=                descarta el borrador
 *
 * Escribir es solo del administrador; el rol sale de la cookie.
 */
import type { SeccionCriterios } from "@/lib/criterios";
import { PERIODO_VALIDO, revisarContenido } from "@/lib/criterios-versiones";
import { descartarBorrador, guardarBorrador, leerBorradores, leerPublicadas, publicarBorrador } from "@/lib/servidor/criterios";
import { esRechazoDeLaBase } from "@/lib/servidor/escribir";
import { usuarioActual } from "@/lib/servidor/sesion";

const error = (status: number, mensaje: string) => Response.json({ mensaje }, { status });

async function administrador() {
  const usuario = await usuarioActual();
  if (!usuario) return { fallo: error(401, "Inicie sesión.") };
  if (usuario.rol !== "ADMIN") return { fallo: error(403, "Solo el administrador edita los criterios.") };
  if (usuario.debeCambiarClave) return { fallo: error(403, "Actualice la contraseña temporal antes de modificar información.") };
  return { usuario };
}

async function seguro(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (e) {
    if (esRechazoDeLaBase(e)) {
      console.warn("[api/criterios] rechazado:", (e as Error).message);
      return error(409, "La base rechazó el cambio.");
    }
    console.error("[api/criterios]", e);
    return error(500, "No se pudo completar la operación.");
  }
}

export async function GET() {
  const usuario = await usuarioActual();
  if (!usuario) return error(401, "Inicie sesión.");
  return seguro(async () =>
    Response.json({
      publicadas: await leerPublicadas(),
      borradores: usuario.rol === "ADMIN" ? await leerBorradores() : [],
    })
  );
}

export async function PUT(req: Request) {
  const { usuario, fallo } = await administrador();
  if (fallo) return fallo;
  const cuerpo = (await req.json().catch(() => null)) as { periodo?: string; contenido?: SeccionCriterios[] } | null;
  if (!cuerpo?.periodo || !PERIODO_VALIDO.test(cuerpo.periodo)) return error(422, "El periodo no es válido.");
  const problema = revisarContenido(cuerpo.contenido);
  if (problema) return error(422, problema);
  return seguro(async () => {
    await guardarBorrador(cuerpo.periodo!, cuerpo.contenido!, usuario.nombres);
    return Response.json({ ok: true });
  });
}

export async function POST(req: Request) {
  const { usuario, fallo } = await administrador();
  if (fallo) return fallo;
  const cuerpo = (await req.json().catch(() => null)) as { periodo?: string; motivo?: string } | null;
  if (!cuerpo?.periodo || !PERIODO_VALIDO.test(cuerpo.periodo)) return error(422, "El periodo no es válido.");
  if (!cuerpo.motivo?.trim()) return error(422, "Publicar exige un motivo.");
  return seguro(async () => {
    const numero = await publicarBorrador(cuerpo.periodo!, cuerpo.motivo!.trim(), usuario.nombres);
    return numero === null ? error(404, "No hay borrador para publicar.") : Response.json({ numero });
  });
}

export async function DELETE(req: Request) {
  const { fallo } = await administrador();
  if (fallo) return fallo;
  const periodo = new URL(req.url).searchParams.get("periodo") ?? "";
  if (!PERIODO_VALIDO.test(periodo)) return error(422, "El periodo no es válido.");
  return seguro(async () => {
    await descartarBorrador(periodo);
    return Response.json({ ok: true });
  });
}
