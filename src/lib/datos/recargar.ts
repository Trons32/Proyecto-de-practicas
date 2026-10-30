"use client";

import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import { useConfigStore } from "@/lib/stores/config-store";
import { useNovedadesStore } from "@/lib/stores/novedades-store";

/**
 * Vuelve a leer los tres stores de su almacenamiento. Con SQL hace falta al
 * iniciar sesión: los stores intentaron hidratarse al cargar la página, y
 * sin cookie la API los rechazó, así que quedaron vacíos y sin permiso de
 * escribir (ver `leidas` en `almacen.ts`).
 */
export const recargarDatos = () =>
  Promise.all([
    useAsignacionStore.persist.rehydrate(),
    useConfigStore.persist.rehydrate(),
    useNovedadesStore.persist.rehydrate(),
  ]);
