/**
 * Dónde se guardan los datos: el único punto a cambiar para pasar a SQL.
 *
 * Los stores no saben dónde persisten; reciben `almacenamiento()` en su
 * opción `storage`. Hoy es localStorage. Cuando exista la API, se escribe
 * aquí un `StateStorage` que lea y escriba contra ella —puede ser
 * asíncrono— y las vistas no cambian: ya esperan a `hidratado` antes de
 * pintar, que es justo lo que exige una carga remota.
 *
 * La sesión queda fuera a propósito: "Recordarme" elige entre dos destinos y
 * `sesion-store.ts` lo maneja a mano (ver AGENTS.md).
 */

import { createJSONStorage, type StateStorage } from "zustand/middleware";

/** Las claves de cada store. Cambiarlas deja huérfano lo ya guardado. */
export const CLAVES = {
  asignaciones: "cecar-asignacion-academica",
  configuracion: "cecar-configuracion",
  novedades: "cecar-novedades",
} as const;

/**
 * localStorage, sin reventar. En modo privado o con el almacenamiento lleno
 * el acceso lanza; perder la persistencia es mejor que perder la página.
 */
const almacenLocal: StateStorage = {
  getItem: (clave) => {
    try {
      return localStorage.getItem(clave);
    } catch {
      return null;
    }
  },
  setItem: (clave, valor) => {
    try {
      localStorage.setItem(clave, valor);
    } catch {
      // Sin espacio o sin permiso: se sigue trabajando en memoria.
    }
  },
  removeItem: (clave) => {
    try {
      localStorage.removeItem(clave);
    } catch {
      // Nada que borrar si no hay acceso.
    }
  },
};

/** El almacenamiento que usan los stores con `persist`. */
export const almacenamiento = <S>() => createJSONStorage<S>(() => almacenLocal);
