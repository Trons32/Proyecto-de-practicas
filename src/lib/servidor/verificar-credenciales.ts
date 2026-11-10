/** Prueba sin base de los invariantes que protegen las claves de SPEC-014. */
import { claveTemporal, coincideClave, esCorreoInstitucional, hashDeClave } from "./credenciales";

function afirmar(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new Error(mensaje);
  console.log(`✓ ${mensaje}`);
}

async function principal() {
  const clave = claveTemporal();
  const hash = await hashDeClave(clave);
  afirmar(hash !== clave && hash.startsWith("scrypt$"), "la clave no queda en texto plano");
  afirmar(await coincideClave(clave, hash), "la clave correcta coincide con su hash");
  afirmar(!(await coincideClave(`${clave}x`, hash)), "una clave distinta no coincide");
  afirmar(esCorreoInstitucional("Coordinador@CECAR.EDU.CO"), "acepta correo institucional sin importar mayúsculas");
  afirmar(!esCorreoInstitucional("coordinador@gmail.com"), "rechaza correo ajeno a CECAR");
  console.log("\n✓ Credenciales verificadas.");
}

void principal();
