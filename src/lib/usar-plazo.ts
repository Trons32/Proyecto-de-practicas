"use client";

import { useMemo } from "react";
import { useConfigStore } from "@/lib/stores/config-store";
import { estadoConvocatoria, restante, type Convocatoria } from "@/lib/convocatoria";
import { esEditable, type Asignacion } from "@/lib/tipos";

export interface Plazo {
  convocatoria: Convocatoria | null;
  /** La fecha que rige ahora mismo: la de corrección si la hay, si no la de la convocatoria. */
  limite: string | null;
  /** Se puede enviar en este instante. */
  puedeEnviar: boolean;
  /** Por qué no se puede, para decírselo al coordinador. */
  motivo: string | null;
  /** Está corrigiendo con un plazo propio, al margen de la convocatoria. */
  corrigiendo: boolean;
}

/**
 * Si el coordinador puede entregar esta asignación, y hasta cuándo.
 *
 * Hay dos relojes distintos y conviene no confundirlos. La convocatoria es
 * el plazo general del periodo; el plazo de corrección es el que el
 * administrador fija al devolver una asignación concreta. Cuando una
 * asignación está en corrección manda el segundo: la convocatoria ya cerró
 * y aun así el coordinador tiene que poder reenviar.
 */
export function usePlazo(asignacion: Asignacion | null | undefined): Plazo {
  const convocatorias = useConfigStore((s) => s.convocatorias);

  return useMemo(() => {
    if (!asignacion) {
      return {
        convocatoria: null,
        limite: null,
        puedeEnviar: false,
        motivo: null,
        corrigiendo: false,
      };
    }

    const convocatoria = convocatorias[asignacion.periodo] ?? null;
    const corrigiendo = asignacion.estado === "en_correccion";

    if (corrigiendo) {
      const limite = asignacion.plazoCorreccion ?? null;
      // Sin plazo fijado no se bloquea: el administrador devolvió sin fecha
      // y el coordinador no tiene por qué quedar atrapado por ese olvido.
      const vencido = limite !== null && restante(limite) <= 0;
      return {
        convocatoria,
        limite,
        corrigiendo: true,
        puedeEnviar: !vencido,
        motivo: vencido ? "El plazo para corregir ya venció." : null,
      };
    }

    if (!esEditable(asignacion.estado)) {
      return {
        convocatoria,
        limite: convocatoria?.limite ?? null,
        corrigiendo: false,
        puedeEnviar: false,
        motivo: "La asignación ya fue entregada y está en manos del administrador.",
      };
    }

    const estado = estadoConvocatoria(convocatoria);

    if (estado === "sin_abrir") {
      return {
        convocatoria,
        limite: convocatoria?.limite ?? null,
        corrigiendo: false,
        puedeEnviar: false,
        motivo: convocatoria
          ? "La convocatoria de este periodo aún no abre."
          : "El administrador todavía no ha abierto la convocatoria de este periodo.",
      };
    }

    if (estado === "cerrada") {
      return {
        convocatoria,
        limite: convocatoria?.limite ?? null,
        corrigiendo: false,
        puedeEnviar: false,
        motivo: "El plazo para entregar este periodo ya cerró.",
      };
    }

    return {
      convocatoria,
      limite: convocatoria?.limite ?? null,
      corrigiendo: false,
      puedeEnviar: true,
      motivo: null,
    };
  }, [asignacion, convocatorias]);
}
