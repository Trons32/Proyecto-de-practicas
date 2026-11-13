"use client";

import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import { useConfigStore } from "@/lib/stores/config-store";
import { useNovedadesStore } from "@/lib/stores/novedades-store";
import { fueLeida } from "./almacen";

/**
 * Tras volver a entrar con la sesión vencida (SPEC-018, CA-018.3).
 *
 * Una clave que ya se había leído tiene cambios en memoria que la base
 * rechazó con 401: `setState({})` hace que `persist` vuelva a escribir, y el
 * adaptador envía lo que falta porque nunca lo dio por guardado. Una clave
 * que no se alcanzó a leer no tiene nada pendiente: se lee, como al iniciar
 * sesión. Recargarlas todas borraría justo lo que se quiere salvar.
 */
interface ConPersist {
  setState: (parcial: object) => void;
  persist: { getOptions: () => { name?: string }; rehydrate: () => Promise<void> | void };
}

const reanudar = async (store: ConPersist) => {
  const { name } = store.persist.getOptions();
  if (name && fueLeida(name)) store.setState({});
  else await store.persist.rehydrate();
};

export const reanudarGuardado = () =>
  Promise.all([reanudar(useAsignacionStore), reanudar(useConfigStore), reanudar(useNovedadesStore)]);
