"use client";

import { useMemo } from "react";
import { useConfigStore } from "@/lib/stores/config-store";
import type { Configuracion } from "@/lib/calculo";

/**
 * La configuración vigente, en la forma que espera el motor de cálculo.
 * Mientras el store no se rehidrata devuelve los valores por defecto, que
 * son los del formato oficial.
 */
export function useConfiguracion(): Configuracion {
  const roles = useConfigStore((s) => s.roles);
  const reglas = useConfigStore((s) => s.reglas);
  return useMemo(() => ({ roles, reglas }), [roles, reglas]);
}
