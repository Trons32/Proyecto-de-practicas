"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Asignacion,
  Docente,
  nuevaAsignacion,
  nuevoDocente,
  aplicarReglaDedicacion,
} from "@/lib/tipos";

interface AsignacionStore {
  /** Todas las asignaciones, incluido el histórico. */
  asignaciones: Asignacion[];
  /** El estado persistido ya se rehidrató desde localStorage. */
  hidratado: boolean;

  setHidratado: (v: boolean) => void;

  crearAsignacion: (datos: Pick<Asignacion, "periodo" | "facultad" | "programa">) => string;
  actualizarAsignacion: (id: string, cambios: Partial<Asignacion>) => void;
  eliminarAsignacion: (id: string) => Asignacion | null;

  agregarDocente: (asignacionId: string) => string | null;
  actualizarDocente: (asignacionId: string, docente: Docente) => void;
  eliminarDocente: (asignacionId: string, docenteId: string) => Docente | null;
}

/** Selector puro: evita repetir el `find` en cada vista. */
export const buscarAsignacion = (s: AsignacionStore, id: string) =>
  s.asignaciones.find((a) => a.id === id);

export const useAsignacionStore = create<AsignacionStore>()(
  persist(
    (set, get) => {
      /**
       * Aplica un cambio a una asignación y refresca su marca de tiempo.
       * Todas las mutaciones pasan por aquí para que `actualizada` nunca
       * quede desfasada respecto al contenido.
       */
      const editar = (id: string, fn: (a: Asignacion) => Asignacion) =>
        set((s) => ({
          asignaciones: s.asignaciones.map((a) =>
            a.id === id ? { ...fn(a), actualizada: new Date().toISOString() } : a
          ),
        }));

      return {
        asignaciones: [],
        hidratado: false,

        setHidratado: (hidratado) => set({ hidratado }),

        crearAsignacion: (datos) => {
          const a = nuevaAsignacion(datos);
          set((s) => ({ asignaciones: [a, ...s.asignaciones] }));
          return a.id;
        },

        actualizarAsignacion: (id, cambios) => editar(id, (a) => ({ ...a, ...cambios })),

        eliminarAsignacion: (id) => {
          const eliminada = get().asignaciones.find((a) => a.id === id);
          if (!eliminada) return null;
          set((s) => ({ asignaciones: s.asignaciones.filter((a) => a.id !== id) }));
          return eliminada;
        },

        agregarDocente: (asignacionId) => {
          const asignacion = get().asignaciones.find((a) => a.id === asignacionId);
          if (!asignacion) return null;
          const d = nuevoDocente(asignacion.programa);
          editar(asignacionId, (a) => ({ ...a, docentes: [...a.docentes, d] }));
          return d.id;
        },

        actualizarDocente: (asignacionId, docente) =>
          editar(asignacionId, (a) => ({
            ...a,
            docentes: a.docentes.map((x) => (x.id === docente.id ? docente : x)),
          })),

        eliminarDocente: (asignacionId, docenteId) => {
          const a = get().asignaciones.find((x) => x.id === asignacionId);
          const eliminado = a?.docentes.find((d) => d.id === docenteId);
          if (!eliminado) return null;
          editar(asignacionId, (x) => ({
            ...x,
            docentes: x.docentes.filter((d) => d.id !== docenteId),
          }));
          return eliminado;
        },
      };
    },
    {
      name: "cecar-asignacion-academica",
      // v1 guardaba una sola asignación en la raíz; se descarta al migrar.
      version: 2,
      migrate: () => ({ asignaciones: [] }),
      partialize: (s) => ({ asignaciones: s.asignaciones }),
      onRehydrateStorage: () => (state) => {
        state?.setHidratado(true);
      },
    }
  )
);

/** Reexport para que las vistas no importen de dos sitios. */
export { aplicarReglaDedicacion };
