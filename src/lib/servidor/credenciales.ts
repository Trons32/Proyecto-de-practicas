/** Credenciales locales de SPEC-014. Solo servidor: el hash y la clave no
 * deben llegar al bundle del navegador ni a un estado persistido. */
import { randomBytes, scrypt as scryptBase, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptBase);
const LONGITUD_SAL = 16;
const LONGITUD_HASH = 64;

export const normalizarCorreo = (email: string) => email.trim().toLowerCase();

export function esCorreoInstitucional(email: string): boolean {
  return /^[^\s@]+@cecar\.edu\.co$/i.test(normalizarCorreo(email));
}

/** Formato autocontenido para que el coste y la sal puedan evolucionar. */
export async function hashDeClave(clave: string): Promise<string> {
  const sal = randomBytes(LONGITUD_SAL).toString("base64url");
  const hash = (await scrypt(clave, sal, LONGITUD_HASH)) as Buffer;
  return `scrypt$${sal}$${hash.toString("base64url")}`;
}

export async function coincideClave(clave: string, almacenada: string | null): Promise<boolean> {
  const [algoritmo, sal, hash] = almacenada?.split("$") ?? [];
  if (algoritmo !== "scrypt" || !sal || !hash) return false;
  const esperada = Buffer.from(hash, "base64url");
  const calculada = (await scrypt(clave, sal, esperada.length)) as Buffer;
  return esperada.length === calculada.length && timingSafeEqual(esperada, calculada);
}

/** No usa caracteres ambiguos, para que sea viable transcribirla desde el correo. */
export function claveTemporal(): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!#$%*+-";
  const bytes = randomBytes(16);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

export const claveValida = (clave: string) => clave.length >= 12 && clave.length <= 128;
