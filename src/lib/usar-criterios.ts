"use client";

import { useCallback, useEffect, useState } from "react";
import type { SeccionCriterios } from "@/lib/criterios";
import type { VersionCriterios } from "@/lib/criterios-versiones";

/**
 * Los criterios vienen de /api/criterios y no de un store persistido
 * (SPEC-025): se leen al abrir la vista y cada escritura espera la
 * respuesta del servidor, para que «Publicado» signifique publicado.
 */
export function useCriterios() {
  const [publicadas, setPublicadas] = useState<VersionCriterios[] | null>(null);
  const [borradores, setBorradores] = useState<VersionCriterios[]>([]);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    try {
      const r = await fetch("/api/criterios", { cache: "no-store" });
      const datos = await r.json();
      if (!r.ok) throw new Error(datos.mensaje ?? "No se pudieron cargar los criterios.");
      setPublicadas(datos.publicadas);
      setBorradores(datos.borradores);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // Cargar al montar: el estado se fija cuando llega la respuesta.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void recargar();
  }, [recargar]);

  return { publicadas, borradores, error, recargar };
}

async function pedir(metodo: string, url: string, cuerpo?: unknown) {
  const r = await fetch(url, {
    method: metodo,
    headers: cuerpo ? { "Content-Type": "application/json" } : undefined,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(datos.mensaje ?? "El servidor rechazó el cambio.");
  return datos;
}

export const guardarBorradorCriterios = (periodo: string, contenido: SeccionCriterios[]) =>
  pedir("PUT", "/api/criterios", { periodo, contenido });

export const publicarCriterios = (periodo: string, motivo: string): Promise<{ numero: number }> =>
  pedir("POST", "/api/criterios", { periodo, motivo });

export const descartarBorradorCriterios = (periodo: string) =>
  pedir("DELETE", `/api/criterios?periodo=${encodeURIComponent(periodo)}`);
