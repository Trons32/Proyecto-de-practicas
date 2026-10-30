/**
 * ¿El despliegue quedó bien conectado? (SPEC-010). Responde sin sesión para
 * que sistemas lo use como sonda, así que no dice nada que sirva para
 * atacar: ni servidor, ni base, ni el texto del error.
 */
import { pool, sqlHabilitado } from "@/lib/servidor/bd";
import { proveedorAuth } from "@/lib/servidor/sesion";

export const dynamic = "force-dynamic";

export async function GET() {
  const estado = {
    almacen: sqlHabilitado() ? "sql" : "navegador",
    autenticacion: proveedorAuth(),
    base: "sin-usar" as "ok" | "error" | "sin-usar",
    sesion: (process.env.SESION_SECRETO?.length ?? 0) >= 32 ? "ok" : "falta-secreto",
  };
  if (sqlHabilitado()) {
    try {
      // Una tabla del esquema y no `SELECT 1`: confirma también que la base
      // tiene el esquema cargado y que el usuario de la app tiene permisos.
      await (await pool()).request().query("SELECT TOP 1 id FROM aa.usuario");
      estado.base = "ok";
    } catch (e) {
      console.error("[salud] la base no responde:", (e as Error).message);
      estado.base = "error";
    }
  }
  const sano = estado.base !== "error" && estado.sesion === "ok";
  return Response.json(estado, { status: sano ? 200 : 503 });
}
