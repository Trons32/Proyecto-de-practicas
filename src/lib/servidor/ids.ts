/**
 * La base guarda los ids como UNIQUEIDENTIFIER. Los datos creados antes de
 * SPEC-006 en un contexto sin `crypto.randomUUID` traen ids cortos; se
 * convierten a un UUID derivado del id original, siempre el mismo, para que
 * cada referencia a ese id siga apuntando a la misma fila en cada guardado.
 */
import { createHash } from "node:crypto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function aUuid(id: string): string {
  if (UUID.test(id)) return id.toLowerCase();
  const h = createHash("sha1").update(`cecar:${id}`).digest("hex");
  // Versión 5 y variante RFC 4122: un UUID válido, no solo con su forma.
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    `5${h.slice(13, 16)}`,
    ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + h.slice(18, 20),
    h.slice(20, 32),
  ].join("-");
}
