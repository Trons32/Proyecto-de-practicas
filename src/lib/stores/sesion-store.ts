"use client";

import { create } from "zustand";
import {
  CLAVE_SESION,
  DURACION_SESION_MS,
  type Sesion,
  type Usuario,
  type Rol,
} from "@/lib/auth/sesion";

interface SesionStore {
  sesion: Sesion | null;
  /** Ya se intentó leer la sesión guardada; antes de esto no se sabe nada. */
  hidratado: boolean;

  iniciar: (usuario: Usuario, recordarme: boolean) => void;
  cerrar: () => void;
  /** Lee la sesión guardada y descarta la que haya expirado. */
  restaurar: () => void;
}

/**
 * "Recordarme" decide el almacenamiento: localStorage sobrevive al cierre
 * del navegador, sessionStorage no. Por eso la persistencia se maneja a
 * mano en vez de con el middleware `persist`, que fija un solo destino.
 */
const guardar = (sesion: Sesion, recordarme: boolean) => {
  try {
    const json = JSON.stringify(sesion);
    localStorage.removeItem(CLAVE_SESION);
    sessionStorage.removeItem(CLAVE_SESION);
    (recordarme ? localStorage : sessionStorage).setItem(CLAVE_SESION, json);
  } catch {
    // Modo privado o almacenamiento bloqueado: la sesión vive en memoria.
  }
};

const borrar = () => {
  try {
    localStorage.removeItem(CLAVE_SESION);
    sessionStorage.removeItem(CLAVE_SESION);
  } catch {
    /* nada que limpiar */
  }
};

const leer = (): Sesion | null => {
  try {
    const json =
      localStorage.getItem(CLAVE_SESION) ?? sessionStorage.getItem(CLAVE_SESION);
    if (!json) return null;
    const s = JSON.parse(json) as Sesion;
    if (!s?.usuario || Date.now() >= Number(s.expiracion ?? 0)) {
      borrar();
      return null;
    }
    return s;
  } catch {
    return null;
  }
};

export const useSesionStore = create<SesionStore>()((set) => ({
  sesion: null,
  hidratado: false,

  iniciar: (usuario, recordarme) => {
    const sesion: Sesion = { usuario, expiracion: Date.now() + DURACION_SESION_MS };
    guardar(sesion, recordarme);
    set({ sesion, hidratado: true });
  },

  cerrar: () => {
    borrar();
    set({ sesion: null, hidratado: true });
  },

  restaurar: () => set({ sesion: leer(), hidratado: true }),
}));

/** Rol de la sesión actual, o null si no hay sesión. */
export const rolActual = (s: SesionStore): Rol | null => s.sesion?.usuario.rol ?? null;
