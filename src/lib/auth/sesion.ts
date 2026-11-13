/**
 * Autenticación y roles.
 *
 * Tipos, roles y usuarios de prueba; lo usan el navegador y el servidor.
 * Quién entra lo decide `verificarCredenciales` de `lib/servidor/sesion.ts`
 * (ahí entra Aldea); lo que habla con NextAuth desde el navegador está en
 * `lib/auth/cliente.ts`.
 */

export type Rol = "ADMIN" | "COORDINADOR";

export interface Usuario {
  id: string;
  nombres: string;
  email: string;
  rol: Rol;
  /** Solo se marca en credenciales locales temporales de coordinadores. */
  debeCambiarClave?: boolean;
}

/**
 * Sin vencimiento propio (SPEC-018): el navegador ya no lleva reloj. Si la
 * sesión sigue viva lo dice la cookie, y solo el servidor la lee.
 */
export interface Sesion {
  usuario: Usuario;
}

/**
 * Cookie que dice si el usuario marcó "Recordarme". La pone el navegador al
 * iniciar sesión y la lee la ruta de NextAuth. No es secreta: alterarla solo
 * cambia si la cookie de sesión del propio usuario sobrevive al cierre del
 * navegador.
 */
export const COOKIE_RECORDARME = "cecar-recordarme";

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

/**
 * Busca entre los usuarios de prueba. La usa `verificarCredenciales` del
 * servidor con `AUTH_PROVEEDOR=prueba`.
 */
export function buscarUsuarioDePrueba(email: string, clave: string): Usuario | null {
  const encontrado = USUARIOS.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.clave === clave
  );
  if (!encontrado) return null;
  // La clave no sale de aquí: solo se devuelven los datos del usuario.
  return { id: encontrado.id, nombres: encontrado.nombres, email: encontrado.email, rol: encontrado.rol };
}

/** Dónde aterriza cada rol tras iniciar sesión. */
export const inicioDeRol = (rol: Rol): string =>
  rol === "ADMIN" ? "/admin" : "/";
