/**
 * Autenticación y roles.
 *
 * El inicio de sesión se resuelve hoy contra usuarios de prueba: en el
 * navegador sin SQL, en el servidor con SQL. Cuando llegue Aldea, el único
 * punto a cambiar es `verificarCredenciales` de `lib/servidor/sesion.ts`.
 */

export type Rol = "ADMIN" | "COORDINADOR";

export interface Usuario {
  id: string;
  nombres: string;
  email: string;
  rol: Rol;
}

export interface Sesion {
  usuario: Usuario;
  /** Marca de tiempo (ms) en que la sesión deja de ser válida. */
  expiracion: number;
}

export const DURACION_SESION_MS = 60 * 60 * 1000; // 1 hora, como el formato institucional

export const CLAVE_SESION = "cecar-asignacion-sesion";

export const ETIQUETA_ROL: Record<Rol, string> = {
  ADMIN: "Administrador",
  COORDINADOR: "Coordinador",
};

/** Usuarios de prueba mientras no exista el servicio de autenticación. */
const USUARIOS: (Usuario & { clave: string })[] = [
  {
    id: "u-admin",
    nombres: "Administrador del Sistema",
    email: "admin@cecar.edu.co",
    rol: "ADMIN",
    clave: "admin123",
  },
  {
    id: "u-coord",
    nombres: "Coordinador Académico",
    email: "coordinador@cecar.edu.co",
    rol: "COORDINADOR",
    clave: "coord123",
  },
];

export interface ResultadoAuth {
  ok: boolean;
  usuario?: Usuario;
  mensaje?: string;
}

/**
 * Busca entre los usuarios de prueba. La usan `autenticar` en modo local y
 * `verificarCredenciales` del servidor hasta que llegue Aldea.
 */
export function buscarUsuarioDePrueba(email: string, clave: string): Usuario | null {
  const encontrado = USUARIOS.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.clave === clave
  );
  if (!encontrado) return null;
  // La clave no sale de aquí: solo se devuelven los datos del usuario.
  return { id: encontrado.id, nombres: encontrado.nombres, email: encontrado.email, rol: encontrado.rol };
}

/**
 * Valida las credenciales en el servidor (SPEC-008), que deja una cookie
 * firmada: sin ella la API no responde. `recordarme` decide si esa cookie
 * sobrevive al cierre del navegador.
 */
export async function autenticar(email: string, clave: string, recordarme = false): Promise<ResultadoAuth> {
  try {
    const r = await fetch("/api/sesion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, clave, recordarme }),
    });
    const cuerpo = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, usuario: cuerpo.usuario } : { ok: false, mensaje: cuerpo.mensaje ?? "Credenciales incorrectas." };
  } catch {
    return { ok: false, mensaje: "No hay conexión con el servidor." };
  }
}

/** Borra la cookie del servidor. */
export function cerrarEnServidor(): void {
  void fetch("/api/sesion", { method: "DELETE" }).catch(() => {});
}

/** Dónde aterriza cada rol tras iniciar sesión. */
export const inicioDeRol = (rol: Rol): string =>
  rol === "ADMIN" ? "/admin" : "/";
