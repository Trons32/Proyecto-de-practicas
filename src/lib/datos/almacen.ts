/**
 * Dónde se guardan los datos: el único punto a cambiar para pasar a SQL.
 *
 * Los stores no saben dónde persisten; reciben `almacenamiento()` en su
 * opción `storage`. Por defecto es localStorage; con
 * `NEXT_PUBLIC_ALMACEN=sql` es PostgreSQL a través de `/api/estado`. Las
 * vistas no cambian: ya esperan a `hidratado` antes de pintar, que es justo
 * lo que exige una carga remota.
 *
 * La sesión queda fuera a propósito: "Recordarme" elige entre dos destinos y
 * `sesion-store.ts` lo maneja a mano (ver AGENTS.md).
 */

import {
  createJSONStorage,
  type PersistStorage,
  type StateStorage,
  type StorageValue,
} from "zustand/middleware";

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

// ── PostgreSQL, a través de /api/estado (SPEC-006) ───────────

/** Las colecciones que se envían por diferencia; la configuración va entera. */
const COLECCION: Record<string, "asignaciones" | "novedades" | undefined> = {
  [CLAVES.asignaciones]: "asignaciones",
  [CLAVES.novedades]: "novedades",
};

type ConId = { id: string };

/**
 * Lo último que se leyó o escribió, por clave: id → JSON. Contra esto se
 * calcula qué cambió. Enviar el estado entero haría que el último en
 * guardar borrara lo que otro creó entre tanto.
 */
const ultimo = new Map<string, Map<string, string>>();
const ultimaConfig = new Map<string, string>();
/**
 * Solo se escribe en una clave que ya se leyó bien. Antes de eso —o si la
 * lectura falló— el store tiene sus valores por defecto, y escribirlos
 * reemplazaría lo que hay en la base.
 */
const leidas = new Set<string>();
/** En orden: una reapertura apunta a una novedad que debe existir antes. */
let cola: Promise<void> = Promise.resolve();

function recordar(clave: string, state: Record<string, unknown>) {
  const coleccion = COLECCION[clave];
  if (coleccion) {
    const items = (state[coleccion] ?? []) as ConId[];
    ultimo.set(clave, new Map(items.map((x) => [x.id, JSON.stringify(x)])));
  } else {
    ultimaConfig.set(clave, JSON.stringify(state));
  }
}

/** El cuerpo del PUT, o null si no hay nada que enviar. */
function diferencia(clave: string, state: Record<string, unknown>): object | null {
  const coleccion = COLECCION[clave];
  if (!coleccion) {
    return ultimaConfig.get(clave) === JSON.stringify(state) ? null : { state };
  }
  const antes = ultimo.get(clave) ?? new Map<string, string>();
  const items = (state[coleccion] ?? []) as ConId[];
  const cambiados = items.filter((x) => antes.get(x.id) !== JSON.stringify(x));
  const vigentes = new Set(items.map((x) => x.id));
  const borrados = [...antes.keys()].filter((id) => !vigentes.has(id));
  if (cambiados.length === 0 && borrados.length === 0) return null;
  return { [coleccion]: cambiados, borrados };
}

const avisar = (descripcion: string) =>
  void import("@/lib/toast").then(({ sileo }) =>
    sileo.error({ title: "No se guardó en el servidor", description: descripcion })
  );

const almacenRemoto: PersistStorage<unknown> = {
  getItem: async (clave) => {
    // Al prerenderizar, `persist` también hidrata en el servidor. Ahí no hay
    // a quién pedirle nada: el navegador hidrata de verdad al cargar.
    if (typeof window === "undefined") return null;
    try {
      const r = await fetch(`/api/estado/${encodeURIComponent(clave)}`, { cache: "no-store" });
      // Sin sesión (en /login, o vencida): no es una falla de conexión. Al
      // iniciar sesión, `recargarDatos` vuelve a pedirlo.
      if (r.status === 401) {
        // Si el navegador cree tener sesión pero la cookie ya no vale, se
        // vería la aplicación vacía sin explicación: mejor volver al login.
        const { useSesionStore } = await import("@/lib/stores/sesion-store");
        const s = useSesionStore.getState();
        if (!s.hidratado) s.restaurar();
        if (useSesionStore.getState().sesion) useSesionStore.getState().cerrar();
        return null;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const valor = (await r.json()) as StorageValue<Record<string, unknown>>;
      recordar(clave, valor.state);
      leidas.add(clave);
      return valor;
    } catch (e) {
      console.error(`No se pudo leer ${clave}:`, e);
      void import("@/lib/toast").then(({ sileo }) =>
        sileo.error({
          title: "Sin conexión con la base de datos",
          description: "Lo que haga ahora no se guardará. Recargue la página cuando el servidor responda.",
        })
      );
      return null;
    }
  },
  setItem: (clave, valor) => {
    if (!leidas.has(clave)) return;
    const state = valor.state as Record<string, unknown>;
    cola = cola.then(async () => {
      const cuerpo = diferencia(clave, state);
      if (!cuerpo) return;
      try {
        const r = await fetch(`/api/estado/${encodeURIComponent(clave)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cuerpo),
        });
        if (r.status === 401) {
          // La cookie venció: lo que no se guardó se pierde al salir, y
          // seguir trabajando sin poder guardar sería peor.
          void import("@/lib/toast").then(({ sileo }) =>
            sileo.warning({ title: "La sesión venció", description: "Inicie sesión de nuevo; el último cambio no se guardó." })
          );
          const { useSesionStore } = await import("@/lib/stores/sesion-store");
          useSesionStore.getState().cerrar();
          return;
        }
        if (!r.ok) {
          const { mensaje } = await r.json().catch(() => ({ mensaje: `Error ${r.status}.` }));
          // 409: otro usuario movió la asignación y esta copia quedó vieja.
          // Reintentar no sirve; hay que traer lo que hay en la base.
          avisar(r.status === 409 ? `${mensaje} Recargue la página para ver la versión vigente.` : mensaje);
          // No se recuerda: el siguiente cambio reintentará lo pendiente.
          return;
        }
        recordar(clave, state);
      } catch {
        avisar("El servidor no respondió. Se reintentará con el próximo cambio.");
      }
    });
  },
  // Ningún store borra su clave; en la base no hay nada que hacer.
  removeItem: () => {},
};

/** El almacenamiento que usan los stores con `persist`. */
export const almacenamiento = <S>(): PersistStorage<S> | undefined =>
  process.env.NEXT_PUBLIC_ALMACEN === "sql"
    ? (almacenRemoto as PersistStorage<S>)
    : createJSONStorage<S>(() => almacenLocal);
