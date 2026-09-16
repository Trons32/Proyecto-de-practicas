/**
 * Autenticación y roles.
 *
 * El inicio de sesión se resuelve hoy contra usuarios locales de prueba;
 * `autenticar` es el único punto que habrá que cambiar cuando exista el
 * endpoint real, sin tocar las vistas ni el guard de rutas.
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
 * Valida las credenciales. Al conectar la API real, esta función pasa a
 * hacer el POST y a mapear la respuesta a `Usuario`.
 */
export async function autenticar(email: string, clave: string): Promise<ResultadoAuth> {
  // Retardo breve: sin él el spinner parpadea y la espera se siente rota.
  await new Promise((r) => setTimeout(r, 400));

  const encontrado = USUARIOS.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.clave === clave
  );

  if (!encontrado) {
    return { ok: false, mensaje: "Credenciales incorrectas." };
  }

  // La clave no sale de aquí: solo se devuelven los datos del usuario.
  return {
    ok: true,
    usuario: {
      id: encontrado.id,
      nombres: encontrado.nombres,
      email: encontrado.email,
      rol: encontrado.rol,
    },
  };
}

/** Dónde aterriza cada rol tras iniciar sesión. */
export const inicioDeRol = (rol: Rol): string =>
  rol === "ADMIN" ? "/admin" : "/";
