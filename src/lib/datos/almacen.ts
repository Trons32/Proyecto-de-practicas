/**
 * Dónde se guardan los datos: siempre en PostgreSQL, a través de
 * `/api/estado`. Los stores reciben `almacenamiento()` en su opción
 * `storage`; las vistas esperan a `hidratado` antes de pintar, que es justo
 * lo que exige una carga remota. No hay copia en localStorage: dos
 * navegadores con datos distintos es lo que se quiso eliminar.
 *
 * La sesión queda fuera a propósito: vive en la cookie de NextAuth y
 * `sesion-store.ts` solo la consulta (SPEC-018).
 */

import type { PersistStorage, StorageValue } from "zustand/middleware";

/** Las claves de cada store. Cambiarlas deja huérfano lo ya guardado. */
export const CLAVES = {
  asignaciones: "cecar-asignacion-academica",
  configuracion: "cecar-configuracion",
  novedades: "cecar-novedades",
} as const;

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
/** Cada escritura rechazada, en orden; `esperarGuardado` mira las nuevas. */
const fallos: string[] = [];

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
        // vería la aplicación vacía sin explicación: se pide la clave, y al
        // entrar `reanudarGuardado` vuelve a leer esta clave.
        const { useSesionStore } = await import("@/lib/stores/sesion-store");
        useSesionStore.getState().marcarVencida();
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
          // La cookie venció. El cambio no se recuerda como guardado, así que
          // sigue pendiente: el modal de reingreso pide la clave y
          // `reanudarGuardado` lo vuelve a enviar (SPEC-018, CA-018.3).
          // Antes se cerraba la sesión y el cambio se perdía.
          fallos.push("La sesión venció. Ingrese de nuevo para guardar.");
          const { useSesionStore } = await import("@/lib/stores/sesion-store");
          useSesionStore.getState().marcarVencida();
          return;
        }
        if (!r.ok) {
          const { mensaje } = await r.json().catch(() => ({ mensaje: `Error ${r.status}.` }));
          // 409: otro usuario movió la asignación y esta copia quedó vieja.
          // Reintentar no sirve; hay que traer lo que hay en la base.
          const texto = r.status === 409 ? `${mensaje} Recargue la página para ver la versión vigente.` : mensaje;
          fallos.push(texto);
          avisar(texto);
          // No se recuerda: el siguiente cambio reintentará lo pendiente.
          return;
        }
        recordar(clave, state);
      } catch {
        fallos.push("El servidor no respondió.");
        avisar("El servidor no respondió. Se reintentará con el próximo cambio.");
      }
    });
  },
  // Ningún store borra su clave; en la base no hay nada que hacer.
  removeItem: () => {},
};

/** Si la clave ya se leyó bien de la base y, por tanto, se puede escribir. */
export const fueLeida = (clave: string) => leidas.has(clave);

/** El almacenamiento que usan los stores con `persist`. */
export const almacenamiento = <S>(): PersistStorage<S> => almacenRemoto as PersistStorage<S>;

/**
 * Espera a que la base confirme todo lo que se mandó a guardar hasta ahora.
 * Devuelve el primer error de esas escrituras, o `null` si todas pasaron.
 *
 * `persist` llama a `setItem` dentro del mismo `set()`, así que lo que la
 * acción acaba de cambiar ya está en la cola cuando se llama a esto. Lo usa
 * `aplicarParametros` (SPEC-012): el modal solo se cierra con el dato en la base.
 */
export function marcaDeGuardado(): () => Promise<string | null> {
  const desde = fallos.length;
  return async () => {
    await cola;
    return fallos[desde] ?? null;
  };
}
