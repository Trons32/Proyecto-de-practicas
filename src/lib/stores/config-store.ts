"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  REGLAS_DEDICACION,
  ROLES,
  MAX_CURSOS,
  MAX_DESCARGAS,
  MAX_ADMINISTRATIVAS,
  type ReglaDedicacion,
  type Rol as RolDescarga,
  type TipoRol,
} from "@/lib/catalogos";

export interface Limites {
  maxCursos: number;
  maxDescargas: number;
  maxAdministrativas: number;
}

interface ConfigStore {
  /** Topes de horas y horas de apoyo, por dedicación. */
  reglas: Record<string, ReglaDedicacion>;
  /** Roles que pueden elegirse en descargas y actividades administrativas. */
  roles: RolDescarga[];
  limites: Limites;
  hidratado: boolean;

  setHidratado: (v: boolean) => void;

  actualizarRegla: (dedicacion: string, cambios: Partial<ReglaDedicacion>) => void;
  actualizarLimites: (cambios: Partial<Limites>) => void;

  agregarRol: (nombre: string, tipo: TipoRol) => void;
  actualizarRol: (id: number, cambios: Partial<Omit<RolDescarga, "id">>) => void;
  eliminarRol: (id: number) => RolDescarga | null;

  /** Devuelve todo a los valores del formato oficial. */
  restaurarValoresOficiales: () => void;
}

/** Copia profunda de los valores del formato, para no compartir referencias. */
const valoresOficiales = () => ({
  reglas: Object.fromEntries(
    Object.entries(REGLAS_DEDICACION).map(([k, v]) => [k, { ...v }])
  ),
  roles: ROLES.map((r) => ({ ...r })),
  limites: {
    maxCursos: MAX_CURSOS,
    maxDescargas: MAX_DESCARGAS,
    maxAdministrativas: MAX_ADMINISTRATIVAS,
  },
});

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set, get) => ({
      ...valoresOficiales(),
      hidratado: false,

      setHidratado: (hidratado) => set({ hidratado }),

      actualizarRegla: (dedicacion, cambios) =>
        set((s) => ({
          reglas: {
            ...s.reglas,
            [dedicacion]: { ...s.reglas[dedicacion], ...cambios },
          },
        })),

      actualizarLimites: (cambios) => set((s) => ({ limites: { ...s.limites, ...cambios } })),

      agregarRol: (nombre, tipo) =>
        set((s) => ({
          // El id sigue al mayor existente: los roles del formato ocupan
          // 1..56 y los añadidos continúan desde ahí sin colisionar.
          roles: [...s.roles, { id: Math.max(0, ...s.roles.map((r) => r.id)) + 1, nombre, tipo }],
        })),

      actualizarRol: (id, cambios) =>
        set((s) => ({
          roles: s.roles.map((r) => (r.id === id ? { ...r, ...cambios } : r)),
        })),

      eliminarRol: (id) => {
        const eliminado = get().roles.find((r) => r.id === id);
        if (!eliminado) return null;
        set((s) => ({ roles: s.roles.filter((r) => r.id !== id) }));
        return eliminado;
      },

      restaurarValoresOficiales: () => set({ ...valoresOficiales() }),
    }),
    {
      name: "cecar-configuracion",
      version: 1,
      partialize: (s) => ({ reglas: s.reglas, roles: s.roles, limites: s.limites }),
      onRehydrateStorage: () => (state) => {
        state?.setHidratado(true);
      },
    }
  )
);
