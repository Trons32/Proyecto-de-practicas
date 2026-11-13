/**
 * La sesión del lado del servidor (SPEC-018). NextAuth (`src/auth.ts`) firma
 * y cifra la cookie; aquí vive lo que decide quién entra y qué lleva el
 * token, para que se pueda probar sin levantar NextAuth.
 *
 * Sin tabla de sesiones, como en SPEC-008: el token es un JWT en cookie. Lo
 * que antes era un vencimiento fijo de una hora ahora es por inactividad:
 * cada consulta a `/api/auth/session` vuelve a firmarlo con `MAX_SESION_S`
 * por delante.
 */
import { buscarUsuarioDePrueba, type Usuario } from "../auth/sesion";
export { COOKIE_RECORDARME } from "../auth/sesion";
import { verificarConApi } from "./aldea";
import { coincideClave, hashDeClave, normalizarCorreo } from "./credenciales";
import { bd } from "./bd";
import type { Rol } from "../auth/sesion";

/** Tiempo sin actividad que aguanta la sesión: una jornada. */
export const MAX_SESION_S = 8 * 60 * 60;
/**
 * Cada cuánto el token vuelve a mirar `public.usuario`. Sin esto, un usuario
 * desactivado o con otro rol seguiría con la sesión vieja hasta que venza.
 */
export const REVALIDAR_MS = 15 * 60 * 1000;

/** Lo que guarda el JWT, además de los campos propios de NextAuth. */
export interface DatosToken {
  usuario?: Usuario;
  /** Cuándo se comparó por última vez con `public.usuario` (ms). */
  verificado?: number;
}

/**
 * Pone al día el usuario del token. Devuelve `null` si ya no debe tener
 * sesión: NextAuth borra entonces la cookie.
 *
 * `buscar` es `usuarioVigente` en el servidor; la prueba pasa uno falso.
 */
export async function refrescarToken<T extends DatosToken>(
  token: T,
  { ahora = Date.now(), buscar = usuarioVigente, proveedor = proveedorAuth() }: {
    ahora?: number;
    buscar?: (email: string) => Promise<Usuario | null>;
    proveedor?: ReturnType<typeof proveedorAuth>;
  } = {}
): Promise<T | null> {
  const usuario = token.usuario;
  if (!usuario) return null;
  // Los usuarios de prueba no están en la base: no hay con qué comparar.
  if (proveedor === "prueba") return token;
  // Quien debe cambiar la clave temporal se revisa en cada consulta: así,
  // al cambiarla, la sesión lo nota sin esperar 15 minutos.
  const toca = usuario.debeCambiarClave || ahora - (token.verificado ?? 0) >= REVALIDAR_MS;
  if (!toca) return token;
  const vigente = await buscar(usuario.email);
  if (!vigente) return null;
  return { ...token, usuario: vigente, verificado: ahora };
}

/** El usuario activo en `public.usuario`, con su rol de hoy. */
export async function usuarioVigente(email: string): Promise<Usuario | null> {
  const fila = await bd().usuario.findFirst({
    where: { email: normalizarCorreo(email), activo: true },
    select: { id: true, email: true, nombres: true, rol: true, debe_cambiar_clave: true },
  });
  if (!fila) return null;
  return {
    id: String(fila.id),
    email: String(fila.email),
    nombres: String(fila.nombres),
    rol: fila.rol as Rol,
    // Con Aldea la clave no es nuestra: un coordinador del piloto que nunca
    // cambió la temporal quedaría atrapado cambiando una clave que ya no usa.
    debeCambiarClave: proveedorAuth() === "api" ? false : fila.debe_cambiar_clave,
  };
}

/** El usuario de la petición en curso, según su cookie. */
export async function usuarioActual(): Promise<Usuario | null> {
  // Importación diferida: `src/auth.ts` importa este archivo, y las pruebas
  // lo usan sin cargar NextAuth.
  const { auth } = await import("@/auth");
  try {
    const sesion = await auth();
    return sesion?.usuario ?? null;
  } catch (e) {
    // Sin AUTH_URL, NextAuth arma la URL con los encabezados del proxy, y un
    // `x-forwarded-proto: "https,http"` la rompe. Antes eso salía como un
    // 500 vacío en cada ruta; ahora queda en el log y la ruta niega el acceso.
    console.error("[sesion] no se pudo leer la sesión (¿falta AUTH_URL?):", e);
    return null;
  }
}

/**
 * NextAuth fija siempre una fecha de vencimiento en la cookie de sesión.
 * Sin "Recordarme" se la quita, para que muera al cerrar el navegador. Las
 * cookies vacías (cerrar sesión, sesión vencida) se dejan como vienen:
 * quitarles la fecha pasada impediría borrarlas.
 */
export function ajustarRecordarme(cookies: string[], recordarme: boolean): string[] {
  if (recordarme) return cookies;
  return cookies.map((c) =>
    /^(__Secure-)?authjs\.session-token(\.\d+)?=[^;]/.test(c)
      ? c.replace(/;\s*(Expires|Max-Age)=[^;]*/gi, "")
      : c
  );
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
  const fila = await bd().usuario.findFirst({ where: { email: normalizarCorreo(email), activo: true }, select: { id: true, email: true, nombres: true, rol: true, clave_hash: true, debe_cambiar_clave: true } });
  if (!fila) return null;
  if (fila.clave_hash && await coincideClave(clave, fila.clave_hash)) {
    return { id: fila.id, email: fila.email, nombres: fila.nombres, rol: fila.rol as Rol, debeCambiarClave: fila.debe_cambiar_clave };
  }
  // Las instalaciones anteriores tienen el administrador de arranque sin
  // hash. La primera entrada le permite fijar una credencial local; luego la
  // clave publicada deja de funcionar porque ya existe un hash propio.
  const inicial = buscarUsuarioDePrueba(email, clave);
  if (!fila.clave_hash && inicial?.email === fila.email && inicial.rol === "ADMIN") {
    await bd().usuario.update({ where: { id: fila.id }, data: { clave_hash: await hashDeClave(clave), clave_actualizada: new Date() } });
    return { id: fila.id, email: fila.email, nombres: fila.nombres, rol: fila.rol as Rol };
  }
  return null;
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
