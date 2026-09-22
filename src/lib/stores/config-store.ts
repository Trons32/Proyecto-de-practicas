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
import { finDelDia, type Convocatoria } from "@/lib/convocatoria";

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
  /** Los plazos de entrega, indexados por periodo académico. */
  convocatorias: Record<string, Convocatoria>;
  hidratado: boolean;

  setHidratado: (v: boolean) => void;

  actualizarRegla: (dedicacion: string, cambios: Partial<ReglaDedicacion>) => void;
  actualizarLimites: (cambios: Partial<Limites>) => void;

  /** Abre el periodo o mueve su fecha límite. `limite` es AAAA-MM-DD. */
  abrirConvocatoria: (periodo: string, limite: string) => void;
  /** Cierra antes de tiempo, o reabre lo cerrado a mano. */
  cerrarConvocatoria: (periodo: string) => void;
  reabrirConvocatoria: (periodo: string) => void;

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
      // Fuera de valoresOficiales: las convocatorias son del calendario de
      // cada semestre, no del formato, y restaurar los valores oficiales no
      // debe borrar los plazos que ya se anunciaron.
      convocatorias: {},
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

      abrirConvocatoria: (periodo, limite) =>
        set((s) => {
          const previa = s.convocatorias[periodo];
          return {
            convocatorias: {
              ...s.convocatorias,
              [periodo]: {
                periodo,
                // Reabrir conserva la apertura original: mover la fecha
                // límite no vuelve a empezar la convocatoria.
                apertura: previa?.apertura ?? new Date().toISOString(),
                limite: finDelDia(limite),
                cerradaManualmente: false,
              },
            },
          };
        }),

      cerrarConvocatoria: (periodo) =>
        set((s) =>
          s.convocatorias[periodo]
            ? {
                convocatorias: {
                  ...s.convocatorias,
                  [periodo]: { ...s.convocatorias[periodo], cerradaManualmente: true },
                },
              }
            : s
        ),

      reabrirConvocatoria: (periodo) =>
        set((s) =>
          s.convocatorias[periodo]
            ? {
                convocatorias: {
                  ...s.convocatorias,
                  [periodo]: { ...s.convocatorias[periodo], cerradaManualmente: false },
                },
              }
            : s
        ),

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
      // v2 añadió las convocatorias. Lo guardado en v1 no las tenía: se
      // completan vacías en vez de descartar la parametrización existente.
      version: 2,
      migrate: (guardado) => ({
        convocatorias: {},
        ...(guardado as object),
      }),
      partialize: (s) => ({
        reglas: s.reglas,
        roles: s.roles,
        limites: s.limites,
        convocatorias: s.convocatorias,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHidratado(true);
      },
    }
  )
);
