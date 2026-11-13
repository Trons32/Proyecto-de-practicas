"use client";

import { create } from "zustand";
import type { Rol, Sesion, Usuario } from "@/lib/auth/sesion";
import { cerrarEnServidor, leerSesion, RENOVAR_CADA_MS } from "@/lib/auth/cliente";

interface SesionStore {
  sesion: Sesion | null;
  /** Ya se preguntó al servidor si hay sesión; antes de esto no se sabe nada. */
  hidratado: boolean;
  /**
   * La cookie venció con la aplicación abierta. La sesión se conserva en
   * memoria para no perder la página ni lo que falta por guardar: el modal de
   * reingreso pide la clave y, al entrar, se reintenta (SPEC-018, CA-018.3).
   */
  vencida: boolean;

  iniciar: (usuario: Usuario) => void;
  /** Refresca los datos del usuario, p. ej. tras cambiar la clave temporal. */
  actualizarUsuario: (usuario: Usuario) => void;
  cerrar: () => void;
  /** Pregunta al servidor por la sesión de la cookie. */
  restaurar: () => Promise<void>;
  marcarVencida: () => void;
  /** Vuelve a la sesión tras el reingreso, sin salir de la página. */
  reanudar: (usuario: Usuario) => void;
  /**
   * Renueva la cookie si pasó `RENOVAR_CADA_MS` desde la última vez. Se
   * llama con la actividad del usuario: así la sesión vence por inactividad
   * y no a una hora fija del login.
   */
  renovar: () => void;
}

/**
 * La sesión ya no se guarda en localStorage ni en sessionStorage, ni lleva
 * vencimiento propio (SPEC-018): la cookie de NextAuth es la única verdad.
 * Antes había dos relojes de una hora, el del navegador y el de la cookie,
 * y vencían en momentos distintos.
 */
let restaurando: Promise<void> | null = null;
let ultimaRenovacion = 0;

export const useSesionStore = create<SesionStore>()((set, get) => ({
  sesion: null,
  hidratado: false,
  vencida: false,

  iniciar: (usuario) => {
    ultimaRenovacion = Date.now();
    set({ sesion: { usuario }, hidratado: true, vencida: false });
  },

  actualizarUsuario: (usuario) =>
    set((estado) => (estado.sesion ? { sesion: { ...estado.sesion, usuario } } : estado)),

  cerrar: () => {
    cerrarEnServidor();
    set({ sesion: null, hidratado: true, vencida: false });
  },

  restaurar: () => {
    restaurando ??= leerSesion()
      .then((usuario) => {
        ultimaRenovacion = Date.now();
        set({ sesion: usuario ? { usuario } : null, hidratado: true, vencida: false });
      })
      // Sin servidor no se sabe si hay sesión: se trata como si no la hubiera
      // y GuardiaSesion lleva al login, que dirá si hay conexión.
      .catch(() => set({ sesion: null, hidratado: true }))
      .finally(() => {
        restaurando = null;
      });
    return restaurando;
  },

  marcarVencida: () => {
    if (get().sesion) set({ vencida: true });
  },

  reanudar: (usuario) => {
    ultimaRenovacion = Date.now();
    set({ sesion: { usuario }, vencida: false });
  },

  renovar: () => {
    const { sesion, vencida } = get();
    if (!sesion || vencida || Date.now() - ultimaRenovacion < RENOVAR_CADA_MS) return;
    ultimaRenovacion = Date.now();
    leerSesion()
      .then((usuario) => {
        if (!usuario) get().marcarVencida();
        // El administrador pudo cambiarle el rol o el nombre entre tanto.
        else if (JSON.stringify(usuario) !== JSON.stringify(get().sesion?.usuario)) get().actualizarUsuario(usuario);
      })
      // Un corte de red no es una sesión vencida: se reintenta con la
      // actividad de dentro de medio minuto, no con cada tecla.
      .catch(() => {
        ultimaRenovacion = Date.now() - RENOVAR_CADA_MS + 30_000;
      });
  },
}));

/** Rol de la sesión actual, o null si no hay sesión. */
export const rolActual = (s: SesionStore): Rol | null => s.sesion?.usuario.rol ?? null;
