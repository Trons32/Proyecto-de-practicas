"use client";

import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import { useConfigStore } from "@/lib/stores/config-store";
import { useNovedadesStore } from "@/lib/stores/novedades-store";
import { crearRespaldo, type Respaldo } from "./respaldo";

/** El estado vigente de los tres stores, como respaldo. */
export function respaldoActual(autor: string): Respaldo {
  const { reglas, roles, limites, convocatorias } = useConfigStore.getState();
  return crearRespaldo(
    {
      asignaciones: useAsignacionStore.getState().asignaciones,
      configuracion: { reglas, roles, limites, convocatorias },
      novedades: useNovedadesStore.getState().novedades,
    },
    autor
  );
}

/**
 * Reemplaza todo el estado por el del respaldo.
 *
 * Es el único sitio, junto con `aplicarParametros`, que escribe los stores
 * sin pasar por sus acciones. Aquí es correcto: restaurar no es una
 * transición ni un cambio de parámetros, es volver a un expediente completo
 * —bitácoras y novedades incluidas— tal como estaba. Registrarlo como
 * novedad o como evento sería inventar algo que no ocurrió en esos datos.
 */
export function restaurarRespaldo(r: Respaldo) {
  const { asignaciones, configuracion, novedades } = r.datos;
  useAsignacionStore.setState({ asignaciones });
  useConfigStore.setState({
    reglas: configuracion.reglas,
    roles: configuracion.roles,
    limites: configuracion.limites,
    convocatorias: configuracion.convocatorias,
  });
  useNovedadesStore.setState({ novedades });
}
