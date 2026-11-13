/**
 * NextAuth (SPEC-018). Solo servidor: carga `lib/servidor/`, que lleva las
 * credenciales de la base.
 *
 * NextAuth maneja la cookie (cifrada, httpOnly, con CSRF en el login) y su
 * renovación. Quién entra y con qué rol lo siguen decidiendo
 * `verificarCredenciales()` y `public.usuario`: este archivo solo los conecta.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
// Sin importarlo, TypeScript no encuentra el módulo que se amplía abajo.
import "next-auth/jwt";
import type { Usuario } from "@/lib/auth/sesion";
import { MAX_SESION_S, refrescarToken, verificarCredenciales, type DatosToken } from "@/lib/servidor/sesion";

declare module "next-auth" {
  interface User {
    usuario?: Usuario;
  }
  interface Session {
    usuario?: Usuario;
  }
}

declare module "next-auth/jwt" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface JWT extends DatosToken {}
}

export const { handlers, auth } = NextAuth({
  // SESION_SECRETO es el nombre que ya tiene el servidor desde SPEC-008:
  // así el despliegue existente no necesita una variable nueva.
  secret: process.env.AUTH_SECRET ?? process.env.SESION_SECRETO,
  // La VPS atiende detrás de un proxy inverso, que cambia el Host. Es seguro
  // porque el login no redirige (`redirect: false` en el cliente). En
  // producción además hace falta AUTH_URL: ver DESPLIEGUE.md.
  trustHost: true,
  session: { strategy: "jwt", maxAge: MAX_SESION_S },
  pages: { signIn: "/login" },
  logger: {
    // Una clave mal escrita no es un error del servidor: sin esto, cada una
    // deja una traza en el log. Las caídas de Aldea las registra aldea.ts.
    error(error) {
      if ((error as { type?: string }).type === "CredentialsSignin") return;
      console.error("[auth]", error);
    },
  },
  providers: [
    Credentials({
      credentials: { email: {}, clave: {} },
      async authorize(datos) {
        const email = typeof datos?.email === "string" ? datos.email : "";
        const clave = typeof datos?.clave === "string" ? datos.clave : "";
        const usuario = await verificarCredenciales(email, clave);
        // null para usuario inexistente y para clave errada por igual:
        // distinguirlos le diría a quien prueba qué correos existen.
        return usuario ? { id: usuario.id, email: usuario.email, name: usuario.nombres, usuario } : null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.usuario) return { ...token, usuario: user.usuario, verificado: Date.now() };
      return refrescarToken(token);
    },
    session({ session, token }) {
      return { ...session, usuario: token.usuario };
    },
  },
});
