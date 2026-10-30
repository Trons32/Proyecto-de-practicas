/**
 * Verificación de la cookie de sesión (SPEC-008).
 *
 *   npx tsx src/lib/servidor/verificar-sesion.ts
 *
 * Lo que importa es lo que NO pasa: una cookie alterada, vencida o firmada
 * con otro secreto no vale como sesión.
 */
process.env.SESION_SECRETO = "secreto-de-prueba-con-mas-de-32-caracteres";

import { DURACION_SESION_MS, type Usuario } from "../auth/sesion";
import { consultarApi } from "./aldea";
import { firmarSesion, proveedorAuth, verificarCredenciales, verificarSesion } from "./sesion";

let fallos = 0;
const comprobar = (nombre: string, ok: boolean, detalle?: unknown) => {
  if (ok) console.log(`✓ ${nombre}`);
  else {
    fallos++;
    console.error(`✗ ${nombre}`, detalle ?? "");
  }
};

const coord: Usuario = { id: "u-coord", nombres: "Coordinador Académico", email: "coordinador@cecar.edu.co", rol: "COORDINADOR" };
const ahora = Date.parse("2026-10-24T15:00:00Z");
const token = firmarSesion(coord, ahora);

comprobar("una cookie propia se acepta", verificarSesion(token, ahora + 1000)?.email === coord.email);
comprobar("vence a la hora", verificarSesion(token, ahora + DURACION_SESION_MS) === null);

// Cambiar el rol dentro del token: es lo primero que intentaría alguien.
const [datos, firma] = token.split(".");
const alterado = Buffer.from(
  JSON.stringify({ ...JSON.parse(Buffer.from(datos, "base64url").toString()), usuario: { ...coord, rol: "ADMIN" } })
).toString("base64url");
comprobar("cambiarse el rol a ADMIN invalida la firma", verificarSesion(`${alterado}.${firma}`, ahora) === null);
comprobar("alargarse el vencimiento invalida la firma", verificarSesion(
  `${Buffer.from(JSON.stringify({ usuario: coord, exp: ahora + 10 * DURACION_SESION_MS })).toString("base64url")}.${firma}`, ahora
) === null);
comprobar("sin firma no vale", verificarSesion(datos, ahora) === null);
comprobar("basura no vale", verificarSesion("no.es-un-token", ahora) === null && verificarSesion(undefined, ahora) === null);

process.env.SESION_SECRETO = "otro-secreto-distinto-tambien-de-mas-de-32";
comprobar("firmada con otro secreto no vale", verificarSesion(token, ahora) === null);

process.env.SESION_SECRETO = "corto";
let rechazaCorto = false;
try {
  firmarSesion(coord);
} catch {
  rechazaCorto = true;
}
comprobar("un secreto corto se rechaza", rechazaCorto);

(async () => {
  comprobar("credenciales correctas", (await verificarCredenciales("ADMIN@cecar.edu.co ", "admin123"))?.rol === "ADMIN");
  comprobar("clave errada", (await verificarCredenciales("admin@cecar.edu.co", "admin")) === null);
  const u = await verificarCredenciales("coordinador@cecar.edu.co", "coord123");
  comprobar("la clave no sale en el usuario", u !== null && !("clave" in u));

  // SPEC-010: la API institucional, con fetch simulado.
  const env = process.env as Record<string, string | undefined>;
  env.NODE_ENV = "production";
  comprobar("en producción, sin AUTH_PROVEEDOR, no se usan los de prueba", proveedorAuth() === "api");
  env.AUTH_PROVEEDOR = "prueba";
  comprobar("AUTH_PROVEEDOR=prueba los habilita a propósito", proveedorAuth() === "prueba");

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
