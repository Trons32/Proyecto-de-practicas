"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { almacenamiento, CLAVES } from "@/lib/datos/almacen";
import {
  diferenciasParametros,
  fotoDeImpacto,
  novedadDeAfectada,
  decisionVigente,
  periodoDeReferencia,
  type Decision,
  type Novedad,
  type Parametros,
} from "@/lib/novedades";
import { useConfigStore } from "./config-store";
import { useAsignacionStore, type Autor } from "./asignacion-store";

// Igual que en tipos.ts: randomUUID no existe fuera de contextos seguros.
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

interface NovedadesStore {
  /** Del más antiguo al más reciente. Solo se añaden. */
  novedades: Novedad[];
  hidratado: boolean;
  setHidratado: (v: boolean) => void;

  /**
   * La única forma de cambiar los parámetros. Aplica el borrador, y en la
   * misma operación registra la novedad con sus diferencias y la foto de lo
   * que afectó. Devuelve la novedad, o `null` si no había nada que cambiar.
   */
  aplicarParametros: (borrador: Parametros, motivo: string, autor: Autor) => Novedad | null;

  /**
   * Reabre asignaciones aprobadas y deja la decisión en la novedad que las
   * registró. Sin `novedadId`, cada una se atribuye a la última novedad que
   * la afectó; las que ninguna registró se reabren igual, sin vínculo.
   * Devuelve cuántas se reabrieron.
   */
  solicitarCorreccion: (
    ids: string[],
    autor: Autor,
    nota: string,
    plazo: string,
    novedadId?: string
  ) => number;

  /** Deja constancia de que una afectada se revisó y no se reabrirá. */
  marcarSinAccion: (novedadId: string, asignacionId: string, autor: Autor, nota?: string) => void;
}

export const useNovedadesStore = create<NovedadesStore>()(
  persist(
    (set, get) => {
      /** Añade decisiones a una novedad; nunca toca las que ya tiene. */
      const decidir = (novedadId: string, nuevas: Decision[]) =>
        set((s) => ({
          novedades: s.novedades.map((n) =>
            n.id === novedadId ? { ...n, decisiones: [...n.decisiones, ...nuevas] } : n
          ),
        }));

      return {
        novedades: [],
        hidratado: false,
        setHidratado: (hidratado) => set({ hidratado }),

        aplicarParametros: (borrador, motivo, autor) => {
          const config = useConfigStore.getState();
          const vigentes: Parametros = {
            reglas: config.reglas,
            roles: config.roles,
            limites: config.limites,
          };

          const cambios = diferenciasParametros(vigentes, borrador);
          if (cambios.length === 0 || !motivo.trim()) return null;

          // La foto se toma antes de aplicar, con las dos configuraciones a
          // mano: después ya no habría forma de saber cuál era la anterior.
          const afectadas = fotoDeImpacto(
            useAsignacionStore.getState().asignaciones,
            { roles: borrador.roles, reglas: borrador.reglas },
            { roles: vigentes.roles, reglas: vigentes.reglas }
          );
          const { periodo, cerrada } = periodoDeReferencia(config.convocatorias);

          const novedad: Novedad = {
            id: uid(),
            numero: get().novedades.length + 1,
            fecha: new Date().toISOString(),
            autor: autor.nombres,
            rolAutor: autor.rol,
            periodo,
            conConvocatoriaCerrada: cerrada,
            motivo: motivo.trim(),
            cambios,
            afectadas,
            decisiones: [],
          };

          config.reemplazarParametros(borrador);
          set((s) => ({ novedades: [...s.novedades, novedad] }));
          return novedad;
        },

        solicitarCorreccion: (ids, autor, nota, plazo, novedadId) => {
          const asignaciones = useAsignacionStore.getState().asignaciones;
          const aprobadas = ids.filter(
            (id) => asignaciones.find((a) => a.id === id)?.estado === "aprobada"
          );

          // Agrupadas por la novedad que las originó, para que cada evento
          // de la bitácora apunte a la suya.
          const grupos = new Map<string | undefined, string[]>();
          for (const id of aprobadas) {
            const origen = novedadId ?? novedadDeAfectada(get().novedades, id)?.id;
            grupos.set(origen, [...(grupos.get(origen) ?? []), id]);
          }

          const fecha = new Date().toISOString();
          let total = 0;
          for (const [origen, grupo] of grupos) {
            total += useAsignacionStore.getState().reabrirVarias(grupo, autor, nota, plazo, origen);
            if (origen) {
              decidir(
                origen,
                grupo.map((asignacionId) => ({
                  asignacionId,
                  accion: "reabierta" as const,
                  fecha,
                  autor: autor.nombres,
                  nota,
                  plazo,
                }))
              );
            }
          }
          return total;
        },

        marcarSinAccion: (novedadId, asignacionId, autor, nota) => {
          const n = get().novedades.find((x) => x.id === novedadId);
          if (!n || !n.afectadas.some((a) => a.asignacionId === asignacionId)) return;
          // Una reapertura ya ocurrió y quedó en la bitácora: marcarla
          // después como "sin acción" contradiría lo que pasó.
          if (decisionVigente(n, asignacionId)?.accion === "reabierta") return;
          decidir(novedadId, [
            {
              asignacionId,
              accion: "sin_accion",
              fecha: new Date().toISOString(),
              autor: autor.nombres,
              nota: nota?.trim() || undefined,
            },
          ]);
        },
      };
    },
    {
      name: CLAVES.novedades,
      storage: almacenamiento(),
      version: 1,
      partialize: (s) => ({ novedades: s.novedades }),
      onRehydrateStorage: () => (state) => {
        state?.setHidratado(true);
      },
    }
  )
);
