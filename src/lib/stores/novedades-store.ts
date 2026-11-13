"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { almacenamiento, CLAVES, marcaDeGuardado } from "@/lib/datos/almacen";
import {
  diferenciasParametros,
  fotoDeImpacto,
  motivoPorDefecto,
  novedadDeAfectada,
  decisionVigente,
  periodoDeReferencia,
  type Decision,
  type Novedad,
  type Parametros,
} from "@/lib/novedades";
import { useConfigStore } from "./config-store";
import { useAsignacionStore, type Autor } from "./asignacion-store";
import { reabrible } from "@/lib/plazos";

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
   * La única forma de cambiar los parámetros. Aplica `siguiente` y en la
   * misma operación registra la novedad con sus diferencias y la foto de lo
   * que afectó. Se resuelve cuando la base confirmó las dos escrituras; si
   * alguna falla, deshace en memoria y devuelve el error (SPEC-012). El
   * motivo vacío se reemplaza por `motivoPorDefecto`, salvo con impacto.
   */
  aplicarParametros: (siguiente: Parametros, motivo: string, autor: Autor) => Promise<ResultadoAplicar>;

  /**
   * Reabre asignaciones entregadas (o bloqueadas por el cierre, SPEC-022) y deja la decisión en la novedad que las
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

export type ResultadoAplicar = { ok: true; novedad: Novedad } | { ok: false; error: string };

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

        aplicarParametros: async (borrador, motivo, autor) => {
          const config = useConfigStore.getState();
          const vigentes: Parametros = {
            reglas: config.reglas,
            roles: config.roles,
            limites: config.limites,
          };

          const cambios = diferenciasParametros(vigentes, borrador);
          if (cambios.length === 0) return { ok: false, error: "No hay cambios que guardar." };

          // La foto se toma antes de aplicar, con las dos configuraciones a
          // mano: después ya no habría forma de saber cuál era la anterior.
          const afectadas = fotoDeImpacto(
            useAsignacionStore.getState().asignaciones,
            { roles: borrador.roles, reglas: borrador.reglas },
            { roles: vigentes.roles, reglas: vigentes.reglas }
          );
          // Con impacto, el motivo lo escribe el administrador: de esa novedad
          // salen las decisiones de reapertura (SPEC-012).
          if (!motivo.trim() && afectadas.length > 0) {
            return { ok: false, error: "Este cambio afecta asignaciones entregadas: escriba el motivo." };
          }
          const { periodo, cerrada } = periodoDeReferencia(config.convocatorias);

          const novedad: Novedad = {
            id: uid(),
            numero: get().novedades.length + 1,
            fecha: new Date().toISOString(),
            autor: autor.nombres,
            rolAutor: autor.rol,
            periodo,
            conConvocatoriaCerrada: cerrada,
            motivo: motivo.trim() || motivoPorDefecto(cambios),
            cambios,
            afectadas,
            decisiones: [],
          };

          // En dos tiempos: si la configuración no se guarda, la novedad no
          // se envía; una novedad sin el cambio que describe mentiría.
          let esperar = marcaDeGuardado();
          config.reemplazarParametros(borrador);
          let error = await esperar();
          if (!error) {
            esperar = marcaDeGuardado();
            set((s) => ({ novedades: [...s.novedades, novedad] }));
            error = await esperar();
            if (error) set((s) => ({ novedades: s.novedades.filter((n) => n.id !== novedad.id) }));
          }
          if (error) {
            // Lo que no llegó a la base no queda en pantalla. Si la
            // configuración sí llegó, deshacerla la vuelve a escribir.
            useConfigStore.getState().reemplazarParametros(vigentes);
            return { ok: false, error };
          }
          return { ok: true, novedad };
        },

        solicitarCorreccion: (ids, autor, nota, plazo, novedadId) => {
          const asignaciones = useAsignacionStore.getState().asignaciones;
          const convocatorias = useConfigStore.getState().convocatorias;
          // Con la convocatoria cerrada, no solo lo aprobado (SPEC-022): también
          // lo enviado, lo que está en revisión y el borrador que el cierre bloqueó.
          const elegibles = ids.filter((id) => {
            const a = asignaciones.find((x) => x.id === id);
            return a !== undefined && reabrible(a, convocatorias);
          });

          // Agrupadas por la novedad que las originó, para que cada evento de
          // la bitácora apunte a la suya. Las que el administrador eligió sin
          // que la novedad las marcara apuntan a la más reciente: es la que
          // explica al coordinador qué parámetros cambiaron.
          const novedades = get().novedades;
          const reciente = novedades.at(-1)?.id;
          const grupos = new Map<string | undefined, string[]>();
          for (const id of elegibles) {
            const origen = novedadId ?? novedadDeAfectada(novedades, id)?.id ?? reciente;
            grupos.set(origen, [...(grupos.get(origen) ?? []), id]);
          }

          const fecha = new Date().toISOString();
          let total = 0;
          for (const [origen, grupo] of grupos) {
            total += useAsignacionStore.getState().reabrirVarias(grupo, autor, nota, plazo, origen);
            // La decisión solo se registra sobre una afectada de esa novedad:
            // la base la exige (fk_nd_afectacion), y para las demás la
            // constancia es el evento de la bitácora.
            const afectadas = new Set(novedades.find((n) => n.id === origen)?.afectadas.map((a) => a.asignacionId));
            const decididas = grupo.filter((asignacionId) => afectadas.has(asignacionId));
            if (origen && decididas.length) {
              decidir(
                origen,
                decididas.map((asignacionId) => ({
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
