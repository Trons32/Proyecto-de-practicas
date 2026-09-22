"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Asignacion,
  Docente,
  Evento,
  nuevaAsignacion,
  nuevoDocente,
  nuevoEvento,
  aplicarReglaDedicacion,
  esEditable,
} from "@/lib/tipos";

/** Quién ejecuta la acción; se graba en la bitácora tal cual. */
export interface Autor {
  nombres: string;
  rol: "ADMIN" | "COORDINADOR";
}

interface AsignacionStore {
  /** Todas las asignaciones, incluido el histórico. */
  asignaciones: Asignacion[];
  /** El estado persistido ya se rehidrató desde localStorage. */
  hidratado: boolean;

  setHidratado: (v: boolean) => void;

  crearAsignacion: (
    datos: Pick<Asignacion, "periodo" | "facultad" | "programa">,
    autor?: Autor
  ) => string;
  actualizarAsignacion: (id: string, cambios: Partial<Asignacion>) => void;
  eliminarAsignacion: (id: string) => Asignacion | null;

  agregarDocente: (asignacionId: string) => string | null;
  actualizarDocente: (asignacionId: string, docente: Docente) => void;
  eliminarDocente: (asignacionId: string, docenteId: string) => Docente | null;

  // ---- Ciclo de vida -------------------------------------------------
  /** El coordinador entrega. Sube la versión y congela la asignación. */
  enviar: (id: string, autor: Autor) => void;
  /** El administrador abre la revisión al cerrarse la convocatoria. */
  abrirRevision: (id: string, autor: Autor) => void;
  aprobar: (id: string, autor: Autor, nota?: string) => void;
  /** Devuelve al coordinador con un motivo y un plazo para corregir. */
  devolver: (id: string, autor: Autor, nota: string, plazo: string) => void;
  /** Reabre una asignación ya aprobada porque cambiaron los parámetros. */
  reabrirPorParametros: (id: string, autor: Autor, nota: string, plazo: string) => void;
  /**
   * Reabre varias de una vez, con el mismo motivo y plazo. Devuelve cuántas
   * se reabrieron: las que ya no estaban aprobadas se ignoran.
   */
  reabrirVarias: (ids: string[], autor: Autor, nota: string, plazo: string) => number;
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

      /**
       * Edita solo si la asignación admite cambios. Una vez enviada, el
       * contenido es lo que el administrador está revisando: dejar que se
       * modifique por detrás haría que aprobara algo distinto de lo que vio.
       */
      const editarSiSePuede = (id: string, fn: (a: Asignacion) => Asignacion) => {
        const a = get().asignaciones.find((x) => x.id === id);
        if (!a || !esEditable(a.estado)) return false;
        editar(id, fn);
        return true;
      };

      /** Cambia de estado y deja constancia, en una sola operación. */
      const registrar = (
        id: string,
        estado: Asignacion["estado"],
        evento: Omit<Evento, "id" | "fecha">,
        extra: Partial<Asignacion> = {}
      ) =>
        editar(id, (a) => ({
          ...a,
          ...extra,
          estado,
          bitacora: [...a.bitacora, nuevoEvento(evento)],
        }));

      return {
        asignaciones: [],
        hidratado: false,

        setHidratado: (hidratado) => set({ hidratado }),

        crearAsignacion: (datos, autor) => {
          const a = nuevaAsignacion(datos, autor?.nombres);
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
          if (!asignacion || !esEditable(asignacion.estado)) return null;
          const d = nuevoDocente(asignacion.programa);
          editar(asignacionId, (a) => ({ ...a, docentes: [...a.docentes, d] }));
          return d.id;
        },

        actualizarDocente: (asignacionId, docente) => {
          editarSiSePuede(asignacionId, (a) => ({
            ...a,
            docentes: a.docentes.map((x) => (x.id === docente.id ? docente : x)),
          }));
        },

        eliminarDocente: (asignacionId, docenteId) => {
          const a = get().asignaciones.find((x) => x.id === asignacionId);
          const eliminado = a?.docentes.find((d) => d.id === docenteId);
          if (!eliminado || !a || !esEditable(a.estado)) return null;
          editar(asignacionId, (x) => ({
            ...x,
            docentes: x.docentes.filter((d) => d.id !== docenteId),
          }));
          return eliminado;
        },

        // ---- Ciclo de vida ---------------------------------------------

        enviar: (id, autor) => {
          const a = get().asignaciones.find((x) => x.id === id);
          if (!a || !esEditable(a.estado)) return;

          // Un reenvío es el que sale de una corrección: se distingue en la
          // bitácora porque cuenta una historia distinta de la del primer envío.
          const esReenvio = a.estado === "en_correccion";
          const version = a.version + 1;

          registrar(
            id,
            "enviada",
            {
              tipo: esReenvio ? "reenviada" : "enviada",
              autor: autor.nombres,
              rolAutor: autor.rol,
              version,
            },
            // El plazo de corrección muere con el reenvío: ya se cumplió.
            { version, plazoCorreccion: undefined }
          );
        },

        abrirRevision: (id, autor) => {
          const a = get().asignaciones.find((x) => x.id === id);
          if (!a || a.estado !== "enviada") return;
          registrar(id, "en_revision", {
            tipo: "revision_abierta",
            autor: autor.nombres,
            rolAutor: autor.rol,
            version: a.version,
          });
        },

        aprobar: (id, autor, nota) => {
          const a = get().asignaciones.find((x) => x.id === id);
          // Se puede aprobar lo que está en revisión y también lo que acaba
          // de llegar, sin obligar al administrador a abrir la revisión.
          if (!a || (a.estado !== "en_revision" && a.estado !== "enviada")) return;
          registrar(id, "aprobada", {
            tipo: "aprobada",
            autor: autor.nombres,
            rolAutor: autor.rol,
            nota,
            version: a.version,
          });
        },

        devolver: (id, autor, nota, plazo) => {
          const a = get().asignaciones.find((x) => x.id === id);
          if (!a || (a.estado !== "en_revision" && a.estado !== "enviada")) return;
          registrar(
            id,
            "en_correccion",
            {
              tipo: "devuelta",
              autor: autor.nombres,
              rolAutor: autor.rol,
              nota,
              plazo,
              version: a.version,
            },
            { plazoCorreccion: plazo }
          );
        },

        reabrirPorParametros: (id, autor, nota, plazo) => {
          const a = get().asignaciones.find((x) => x.id === id);
          // Solo lo ya aprobado se reabre: lo demás sigue su curso normal.
          if (!a || a.estado !== "aprobada") return;
          registrar(
            id,
            "en_correccion",
            {
              tipo: "reabierta_por_parametros",
              autor: autor.nombres,
              rolAutor: autor.rol,
              nota,
              plazo,
              version: a.version,
            },
            { plazoCorreccion: plazo }
          );
        },

        reabrirVarias: (ids, autor, nota, plazo) => {
          const objetivo = new Set(ids);
          const ahora = new Date().toISOString();
          let reabiertas = 0;

          // Un solo `set` para todo el lote: N llamadas sueltas dispararían
          // N renders y dejarían estados intermedios visibles.
          set((s) => ({
            asignaciones: s.asignaciones.map((a) => {
              if (!objetivo.has(a.id) || a.estado !== "aprobada") return a;
              reabiertas++;
              return {
                ...a,
                estado: "en_correccion" as const,
                plazoCorreccion: plazo,
                actualizada: ahora,
                bitacora: [
                  ...a.bitacora,
                  nuevoEvento({
                    tipo: "reabierta_por_parametros",
                    autor: autor.nombres,
                    rolAutor: autor.rol,
                    nota,
                    plazo,
                    version: a.version,
                    fecha: ahora,
                  }),
                ],
              };
            }),
          }));

          return reabiertas;
        },
      };
    },
    {
      name: "cecar-asignacion-academica",
      // v1 guardaba una sola asignación en la raíz; se descarta al migrar.
      // v3 introdujo el ciclo de aprobación: lo guardado en v2 solo conocía
      // "borrador" y "completada", y no tenía versión ni bitácora.
      version: 3,
      migrate: (guardado, version) => {
        if (version < 2) return { asignaciones: [] };

        const { asignaciones = [] } = (guardado ?? {}) as { asignaciones?: Asignacion[] };

        return {
          asignaciones: asignaciones.map((a) => {
            // "completada" era lo más parecido a una entrega: pasa a
            // aprobada para no exigirle al coordinador que la rehaga.
            const estado: Asignacion["estado"] =
              (a.estado as string) === "completada" ? "aprobada" : "borrador";
            const version = estado === "aprobada" ? 1 : 0;

            return {
              ...a,
              estado,
              version: a.version ?? version,
              bitacora: a.bitacora ?? [
                nuevoEvento({
                  tipo: "creada",
                  autor: "—",
                  rolAutor: "COORDINADOR",
                  fecha: a.creada,
                }),
              ],
            };
          }),
        };
      },
      partialize: (s) => ({ asignaciones: s.asignaciones }),
      onRehydrateStorage: () => (state) => {
        state?.setHidratado(true);
      },
    }
  )
);

/** Reexport para que las vistas no importen de dos sitios. */
export { aplicarReglaDedicacion };
