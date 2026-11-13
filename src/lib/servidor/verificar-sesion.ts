/**
 * Verificación de la sesión (SPEC-008, SPEC-010, SPEC-018).
 *
 *   npx tsx src/lib/servidor/verificar-sesion.ts
 *
 * La firma y el cifrado de la cookie son de NextAuth. Lo que se prueba aquí
 * es lo nuestro: quién entra, qué lleva el token y cuándo deja de valer.
 * La base y Aldea se simulan.
 */
import type { Usuario } from "../auth/sesion";
import { consultarApi } from "./aldea";
import { ajustarRecordarme, proveedorAuth, refrescarToken, REVALIDAR_MS, verificarCredenciales } from "./sesion";

let fallos = 0;
const comprobar = (nombre: string, ok: boolean, detalle?: unknown) => {
  if (ok) console.log(`✓ ${nombre}`);
  else {
    fallos++;
    console.error(`✗ ${nombre}`, detalle ?? "");
  }
};

const coord: Usuario = { id: "u-coord", nombres: "Coordinador Académico", email: "coordinador@cecar.edu.co", rol: "COORDINADOR" };
const ahora = Date.parse("2026-11-12T15:00:00Z");

(async () => {
  // ── El token se pone al día con public.usuario (SPEC-018) ──────────────
  let consultas = 0;
  const base = (fila: Usuario | null) => async () => {
    consultas++;
    return fila;
  };
  const token = { usuario: coord, verificado: ahora };

  consultas = 0;
  const reciente = await refrescarToken(token, { ahora: ahora + 60_000, buscar: base(coord), proveedor: "local" });
  comprobar("token reciente: no consulta la base", reciente === token && consultas === 0);

  const desactivado = await refrescarToken(token, { ahora: ahora + REVALIDAR_MS, buscar: base(null), proveedor: "local" });
  comprobar("CA-018.5 desactivado: a los 15 min la sesión termina", desactivado === null);

  const ascendido = await refrescarToken(token, { ahora: ahora + REVALIDAR_MS, buscar: base({ ...coord, rol: "ADMIN" }), proveedor: "local" });
  comprobar("cambio de rol en la base llega al token", ascendido?.usuario?.rol === "ADMIN" && ascendido.verificado === ahora + REVALIDAR_MS);

  consultas = 0;
  const pendiente = { usuario: { ...coord, debeCambiarClave: true }, verificado: ahora };
  const cambiada = await refrescarToken(pendiente, { ahora: ahora + 1000, buscar: base({ ...coord, debeCambiarClave: false }), proveedor: "local" });
  comprobar("clave temporal: se revisa en cada consulta y se libera al cambiarla", consultas === 1 && cambiada?.usuario?.debeCambiarClave === false);

  consultas = 0;
  const dePrueba = await refrescarToken(token, { ahora: ahora + 10 * REVALIDAR_MS, buscar: base(null), proveedor: "prueba" });
  comprobar("usuarios de prueba: no se buscan en la base", dePrueba === token && consultas === 0);

  comprobar("token sin usuario no vale", (await refrescarToken({}, { ahora, buscar: base(coord), proveedor: "local" })) === null);

  // ── "Recordarme" ──────────────────────────────────────────────────────
  const cookie = "authjs.session-token=abc; Path=/; Expires=Thu, 13 Nov 2026 00:00:00 GMT; HttpOnly; SameSite=Lax";
  const segura = "__Secure-authjs.session-token.0=abc; Path=/; Max-Age=28800; HttpOnly; Secure";
  const borrar = "authjs.session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
  const csrf = "authjs.csrf-token=x; Path=/; Expires=Thu, 13 Nov 2026 00:00:00 GMT";
  const sin = ajustarRecordarme([cookie, segura, borrar, csrf], false);
  comprobar("sin Recordarme: la cookie de sesión muere con el navegador", !/expires|max-age/i.test(sin[0]) && !/max-age/i.test(sin[1]), sin);
  comprobar("sin Recordarme: borrar la sesión sigue funcionando", sin[2] === borrar);
  comprobar("sin Recordarme: las demás cookies no se tocan", sin[3] === csrf);
  comprobar("con Recordarme: nada cambia", ajustarRecordarme([cookie], true)[0] === cookie);

  // ── Credenciales (SPEC-008) ───────────────────────────────────────────
  comprobar("credenciales correctas", (await verificarCredenciales("ADMIN@cecar.edu.co ", "admin123"))?.rol === "ADMIN");
  comprobar("clave errada", (await verificarCredenciales("admin@cecar.edu.co", "admin")) === null);
  const u = await verificarCredenciales("coordinador@cecar.edu.co", "coord123");
  comprobar("la clave no sale en el usuario", u !== null && !("clave" in u));

  // ── La API institucional (SPEC-010), con fetch simulado ───────────────
  const env = process.env as Record<string, string | undefined>;
  env.NODE_ENV = "production";
  comprobar("en producción, sin AUTH_PROVEEDOR, no se usan los de prueba", proveedorAuth() === "api");
  env.AUTH_PROVEEDOR = "prueba";
  comprobar("AUTH_PROVEEDOR=prueba los habilita a propósito", proveedorAuth() === "prueba");
  env.AUTH_PROVEEDOR = "local";
  comprobar("AUTH_PROVEEDOR=local para el piloto (SPEC-018)", proveedorAuth() === "local");

  env.AUTH_API_URL = "https://api.ejemplo/validar";
  env.AUTH_API_SIN_DOMINIO = "1";
  let enviado: Record<string, string> = {};
  const simular = (status: number, cuerpo: unknown) => {
    globalThis.fetch = (async (_: unknown, init?: RequestInit) => {
      enviado = JSON.parse(String(init?.body));
      return new Response(JSON.stringify(cuerpo), { status });
    }) as typeof fetch;
  };
  simular(200, { valido: true });
  comprobar("API: 200 valida", await consultarApi("jperez@cecar.edu.co", "x"));
  comprobar("API: usuario sin dominio", enviado.usuario === "jperez" && enviado.clave === "x", enviado);
  simular(200, { success: false });
  comprobar("API: 200 con success=false no valida", !(await consultarApi("a@b.co", "x")));
  simular(401, {});
  comprobar("API: 401 no valida", !(await consultarApi("a@b.co", "x")));

  console.log(fallos === 0 ? "\n✓ Sesión verificada." : `\n✗ ${fallos} fallos.`);
  process.exit(fallos === 0 ? 0 : 1);
})();
