/**
 * Las rutas de NextAuth (SPEC-018): login, logout, CSRF y la consulta de
 * sesión que la renueva.
 *
 * NextAuth no distingue "Recordarme": su cookie siempre lleva fecha de
 * vencimiento. Se la quita aquí a quien no lo marcó, para que muera al
 * cerrar el navegador como antes.
 */
import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { ajustarRecordarme, COOKIE_RECORDARME } from "@/lib/servidor/sesion";

type Manejador = (req: NextRequest) => Promise<Response>;

const conRecordarme = (manejar: Manejador): Manejador => async (req) => {
  const respuesta = await manejar(req);
  const recordarme = req.cookies.get(COOKIE_RECORDARME)?.value !== "0";
  const cookies = respuesta.headers.getSetCookie();
  if (recordarme || cookies.length === 0) return respuesta;
  const cabeceras = new Headers(respuesta.headers);
  cabeceras.delete("set-cookie");
  for (const c of ajustarRecordarme(cookies, false)) cabeceras.append("set-cookie", c);
  return new Response(respuesta.body, { status: respuesta.status, statusText: respuesta.statusText, headers: cabeceras });
};

export const GET = conRecordarme(handlers.GET);
export const POST = conRecordarme(handlers.POST);
