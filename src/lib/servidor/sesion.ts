/**
 * La sesión del lado del servidor (SPEC-008): una cookie httpOnly con el
 * usuario y su vencimiento, firmada con HMAC. El navegador la lleva pero no
 * puede leerla ni alterarla; la API decide con ella quién pide qué, en vez
 * de creerle al cuerpo de la petición.
 *
 * Sin estado en el servidor a propósito: no hay tabla de sesiones que
 * limpiar, y cerrar sesión es borrar la cookie. El costo es que una cookie
 * robada vale hasta que vence (una hora, como el formato institucional).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { buscarUsuarioDePrueba, DURACION_SESION_MS, type Usuario } from "../auth/sesion";
import { verificarConApi } from "./aldea";
import { coincideClave, normalizarCorreo } from "./credenciales";
import { bd } from "./bd";
import type { Rol } from "../auth/sesion";

export const COOKIE_SESION = "cecar-sesion";

function secreto(): string {
  const s = process.env.SESION_SECRETO;
  // Un secreto corto se adivina por fuerza bruta y con él se fabrica
  // cualquier sesión, incluida la de administrador.
  if (!s || s.length < 32) throw new Error("Defina SESION_SECRETO (32 caracteres o más) en el servidor.");
  return s;
}

const firma = (datos: string) => createHmac("sha256", secreto()).update(datos).digest("base64url");

export function firmarSesion(usuario: Usuario, ahora = Date.now()): string {
  const datos = Buffer.from(JSON.stringify({ usuario, exp: ahora + DURACION_SESION_MS })).toString("base64url");
  return `${datos}.${firma(datos)}`;
}

/** El usuario del token, o null si está alterado o vencido. */
export function verificarSesion(token: string | undefined, ahora = Date.now()): Usuario | null {
  if (!token) return null;
  const [datos, recibida] = token.split(".");
  if (!datos || !recibida) return null;
  const esperada = Buffer.from(firma(datos));
  const dada = Buffer.from(recibida);
  // Comparación en tiempo constante: una normal filtraría cuántos
  // caracteres de la firma acertó un atacante.
  if (esperada.length !== dada.length || !timingSafeEqual(esperada, dada)) return null;
  try {
    const { usuario, exp } = JSON.parse(Buffer.from(datos, "base64url").toString()) as { usuario: Usuario; exp: number };
    return ahora < exp ? usuario : null;
  } catch {
    return null;
  }
}

/** El usuario de la petición en curso, según su cookie. */
export async function usuarioActual(): Promise<Usuario | null> {
  return verificarSesion((await cookies()).get(COOKIE_SESION)?.value);
}

/**
 * Con qué se validan las claves. En producción, la API institucional por
 * defecto: los usuarios de prueba tienen claves publicadas en el repo y no
 * pueden quedar abiertos en el servidor por olvidar una variable.
 */
export const proveedorAuth = (): "api" | "prueba" | "local" => {
  const proveedor = process.env.AUTH_PROVEEDOR ?? (process.env.NODE_ENV === "production" ? "api" : "prueba");
  return proveedor === "prueba" || proveedor === "local" ? proveedor : "api";
};

async function verificarLocal(email: string, clave: string): Promise<Usuario | null> {
  if (!email.trim() || !clave) return null;
  const fila = await bd().usuario.findFirst({ where: { email: normalizarCorreo(email), activo: true }, select: { id: true, email: true, nombres: true, rol: true, clave_hash: true } });
  if (!fila || !(await coincideClave(clave, fila.clave_hash))) return null;
  return { id: fila.id, email: fila.email, nombres: fila.nombres, rol: fila.rol as Rol };
}

/**
 * Valida usuario y clave. **Este es el punto donde entra Aldea** (SPEC-010):
 * la API institucional valida la clave y `public.usuario` decide si entra y con
 * qué rol. Ver `lib/servidor/aldea.ts`.
 */
export async function verificarCredenciales(email: string, clave: string): Promise<Usuario | null> {
  const proveedor = proveedorAuth();
  if (proveedor === "prueba") return buscarUsuarioDePrueba(email, clave);
  return proveedor === "local" ? verificarLocal(email, clave) : verificarConApi(email, clave);
}
