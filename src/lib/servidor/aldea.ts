/**
 * Validación de credenciales contra la API institucional (SPEC-010). Solo
 * servidor: la URL y el token de la API no pueden llegar al bundle.
 *
 * La API responde una sola pregunta —¿esta clave es de este usuario?—. Quién
 * entra y con qué rol lo decide `aa.usuario`: estar en el directorio de la
 * universidad no da acceso a la asignación académica.
 *
 * Mientras sistemas no entregue el contrato definitivo, la petición se arma
 * con variables de entorno (ver `db/env.produccion.ejemplo`). Si el contrato
 * real no cabe en ellas, lo único que cambia es `consultarApi()`.
 */
import { bd } from "./bd";
import type { Rol, Usuario } from "../auth/sesion";

/** Pasado este tiempo se responde "credenciales incorrectas" en vez de colgar el login. */
const ESPERA_MS = Number(process.env.AUTH_API_ESPERA_MS ?? 8000);

/**
 * El usuario que se le manda a la API. Muchos directorios piden el usuario
 * sin dominio (`jperez`, no `jperez@cecar.edu.co`): `AUTH_API_SIN_DOMINIO=1`.
 */
const usuarioParaApi = (email: string) =>
  process.env.AUTH_API_SIN_DOMINIO === "1" ? email.split("@")[0] : email;

/** Si un 200 dice explícitamente que no, es que no. */
const NEGATIVOS = ["valido", "valid", "autenticado", "authenticated", "success", "ok"];

export async function consultarApi(email: string, clave: string): Promise<boolean> {
  const url = process.env.AUTH_API_URL;
  if (!url) throw new Error("Defina AUTH_API_URL en el servidor.");

  const cabeceras: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (process.env.AUTH_API_TOKEN) cabeceras.Authorization = `Bearer ${process.env.AUTH_API_TOKEN}`;

  const r = await fetch(url, {
    method: "POST",
    headers: cabeceras,
    body: JSON.stringify({
      [process.env.AUTH_API_CAMPO_USUARIO ?? "usuario"]: usuarioParaApi(email),
      [process.env.AUTH_API_CAMPO_CLAVE ?? "clave"]: clave,
    }),
    signal: AbortSignal.timeout(ESPERA_MS),
    cache: "no-store",
  });
  if (!r.ok) return false;

  const cuerpo = await r.json().catch(() => null);
  if (cuerpo && typeof cuerpo === "object") {
    for (const campo of NEGATIVOS) if ((cuerpo as Record<string, unknown>)[campo] === false) return false;
  }
  return true;
}

/** El usuario habilitado en la aplicación, o null si no lo está. */
export async function usuarioRegistrado(email: string): Promise<Usuario | null> {
  const fila = await bd().usuario.findFirst({
    where: { email: email.trim().toLowerCase(), activo: true },
    select: { id: true, email: true, nombres: true, rol: true },
  });
  if (!fila) return null;
  return { id: String(fila.id), email: String(fila.email), nombres: String(fila.nombres), rol: fila.rol as Rol };
}

export async function verificarConApi(email: string, clave: string): Promise<Usuario | null> {
  if (!email.trim() || !clave) return null;
  // Primero la base: a quien no está habilitado no se le consulta la clave,
  // y la API no recibe intentos de gente ajena al sistema.
  const usuario = await usuarioRegistrado(email);
  if (!usuario) return null;
  try {
    return (await consultarApi(email.trim(), clave)) ? usuario : null;
  } catch (e) {
    // Caída o lentitud de la API: se registra para sistemas y el usuario
    // ve lo mismo que con una clave errada.
    console.error("[aldea] no se pudo validar contra la API:", (e as Error).message);
    return null;
  }
}
