"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { almacenamiento, CLAVES } from "@/lib/datos/almacen";
import {
  REGLAS_DEDICACION,
  ROLES,
  MAX_CURSOS,
  MAX_DESCARGAS,
  MAX_ADMINISTRATIVAS,
  type ReglaDedicacion,
  type Rol as RolDescarga,
} from "@/lib/catalogos";
import { finDelDia, type Convocatoria } from "@/lib/convocatoria";
import type { Limites, Parametros } from "@/lib/novedades";

export type { Limites };

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

  /**
   * Sustituye reglas, roles y límites de una vez. No se llama desde las
   * vistas: pasa por `aplicarParametros` del store de novedades, que deja
   * constancia de quién cambió qué. Antes cada campo se guardaba al teclear
   * y un 40 → 38 quedaba como 40 → 4 → 38, sin autor ni motivo.
   */
  reemplazarParametros: (p: Parametros) => void;

  /** Abre el periodo o mueve su fecha límite. `limite` es AAAA-MM-DD. */
  abrirConvocatoria: (periodo: string, limite: string) => void;
  /** Cierra antes de tiempo, o reabre lo cerrado a mano. */
  cerrarConvocatoria: (periodo: string) => void;
  reabrirConvocatoria: (periodo: string) => void;
}

/** Copia profunda de los valores del formato, para no compartir referencias. */
export const valoresOficiales = (): Parametros => ({
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
    (set) => ({
      ...valoresOficiales(),
      // Fuera de valoresOficiales: las convocatorias son del calendario de
      // cada semestre, no del formato, y restaurar los valores oficiales no
      // debe borrar los plazos que ya se anunciaron.
      convocatorias: {},
      hidratado: false,

      setHidratado: (hidratado) => set({ hidratado }),

      reemplazarParametros: ({ reglas, roles, limites }) => set({ reglas, roles, limites }),

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
    }),
    {
      name: CLAVES.configuracion,
      storage: almacenamiento(),
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
