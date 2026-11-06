/**
 * ¿El despliegue quedó bien conectado? (SPEC-010). Responde sin sesión para
 * que sistemas lo use como sonda, así que no dice nada que sirva para
 * atacar: ni servidor, ni base, ni el texto del error.
 */
import { bd } from "@/lib/servidor/bd";
import { proveedorAuth } from "@/lib/servidor/sesion";

export const dynamic = "force-dynamic";

export async function GET() {
  const estado = {
    autenticacion: proveedorAuth(),
    base: "ok" as "ok" | "error",
    sesion: (process.env.SESION_SECRETO?.length ?? 0) >= 32 ? "ok" : "falta-secreto",
  };
  try {
    // Una tabla del esquema y no `SELECT 1`: confirma también que la base
    // tiene el esquema cargado y que el usuario de la app tiene permisos.
    await bd().usuario.findFirst({ select: { id: true } });
  } catch (e) {
    console.error("[salud] la base no responde:", (e as Error).message);
    estado.base = "error";
  }
  const sano = estado.base !== "error" && estado.sesion === "ok";
  return Response.json(estado, { status: sano ? 200 : 503 });
}
