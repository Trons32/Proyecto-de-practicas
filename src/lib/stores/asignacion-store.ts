"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Asignacion, Docente, nuevoDocente, aplicarReglaDedicacion } from "@/lib/tipos";

interface AsignacionStore extends Asignacion {
  /** Índice del docente que se está editando. */
  activo: number;
  /** El estado persistido ya se rehidrató desde localStorage. */
  hidratado: boolean;

  setPeriodo: (periodo: string) => void;
  setFacultad: (facultad: string) => void;
  setPrograma: (programa: string) => void;
  setActivo: (i: number) => void;
  setHidratado: (v: boolean) => void;

  actualizarDocente: (d: Docente) => void;
  agregarDocente: () => number;
  eliminarDocente: (i: number) => Docente | null;
  reiniciar: () => void;
}

const estadoInicial = () => ({
  periodo: "2026-2",
  facultad: "",
  programa: "",
  docentes: [nuevoDocente()],
  activo: 0,
});

export const useAsignacionStore = create<AsignacionStore>()(
  persist(
    (set, get) => ({
      ...estadoInicial(),
      hidratado: false,

      setPeriodo: (periodo) => set({ periodo }),

      // Cambiar de facultad invalida el programa elegido.
      setFacultad: (facultad) => set({ facultad, programa: "" }),

      setPrograma: (programa) => set({ programa }),
      setActivo: (activo) => set({ activo }),
      setHidratado: (hidratado) => set({ hidratado }),

      actualizarDocente: (d) =>
        set((s) => ({
          docentes: s.docentes.map((x, i) => (i === s.activo ? d : x)),
        })),

      agregarDocente: () => {
        const indice = get().docentes.length;
        set((s) => ({ docentes: [...s.docentes, nuevoDocente()], activo: indice }));
        return indice;
      },

      eliminarDocente: (i) => {
        const { docentes } = get();
        if (docentes.length === 1) return null;
        const eliminado = docentes[i];
        set((s) => ({
          docentes: s.docentes.filter((_, k) => k !== i),
          activo: s.activo >= i && s.activo > 0 ? s.activo - 1 : s.activo,
        }));
        return eliminado;
      },

      reiniciar: () => set({ ...estadoInicial() }),
    }),
    {
      name: "cecar-asignacion-academica",
      version: 1,
      // El índice activo es de sesión, no vale la pena persistirlo.
      partialize: (s) => ({
        periodo: s.periodo,
        facultad: s.facultad,
        programa: s.programa,
        docentes: s.docentes,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHidratado(true);
      },
    }
  )
);

/** Reexport para que las vistas no importen de dos sitios. */
export { aplicarReglaDedicacion };
