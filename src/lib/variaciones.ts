/**
 * Docentes que salen, que llegan y que cambian (SPEC-027, SPEC-028). PURO.
 *
 * El formato trae DOCENTES SALIENTES y DOCENTES NUEVOS, y el consolidado
 * los junta en la hoja VARIACIONES junto con lo que les pasa a los que
 * siguen («asume coordinación», «pasa a docente TC»). Aquí la lista sale
 * sola de comparar con la asignación del mismo programa en el periodo
 * anterior; el coordinador elige el motivo de un catálogo, para que las
 * variaciones se puedan contar, y si hace falta añade una observación.
 */
import { legible } from "./resumen";
import { periodoAnterior, type Asignacion, type Docente, type Variacion } from "./tipos";

export type TipoVariacion = Variacion["tipo"];

export const ETIQUETA_TIPO_VARIACION: Record<TipoVariacion, string> = {
  saliente: "Sale",
  nuevo: "Llega",
  cambio: "Cambia",
};

/**
 * Los motivos, sacados de las descripciones de la hoja VARIACIONES 2025.
 * El código es lo que se guarda: cambiar el texto no altera lo registrado.
 */
export const MOTIVOS: Record<TipoVariacion, { codigo: string; texto: string }[]> = {
  saliente: [
    { codigo: "SIN_CURSOS", texto: "Sin disponibilidad de cursos" },
    { codigo: "NO_SE_PROYECTA", texto: "No se proyecta en la asignación" },
    { codigo: "FUSION_GRUPOS", texto: "Fusión de grupos" },
    { codigo: "RENUNCIA", texto: "Renuncia" },
    { codigo: "TERMINACION_CONTRATO", texto: "Terminación de contrato" },
    { codigo: "LICENCIA", texto: "Licencia o comisión" },
    { codigo: "TRASLADO", texto: "Traslado a otro programa" },
    { codigo: "OTRO", texto: "Otro motivo" },
  ],
  nuevo: [
    { codigo: "NUEVO_INGRESO", texto: "Nuevo ingreso" },
    { codigo: "REINGRESO", texto: "Reingreso" },
    { codigo: "REEMPLAZO", texto: "Reemplaza a un docente que sale" },
    { codigo: "PERFIL", texto: "Asume cursos por su perfil profesional" },
    { codigo: "TRASLADO", texto: "Viene de otro programa" },
    { codigo: "OTRO", texto: "Otro motivo" },
  ],
  cambio: [
    { codigo: "ASUME_ROL", texto: "Asume un rol o coordinación" },
    { codigo: "DEJA_ROL", texto: "Deja un rol o coordinación" },
    { codigo: "CAMBIO_DEDICACION", texto: "Cambio de dedicación" },
    { codigo: "DESCARGA_ROL", texto: "Descarga por rol" },
    { codigo: "OTRO", texto: "Otro motivo" },
  ],
};

export const textoMotivo = (tipo: TipoVariacion, codigo: string | undefined): string =>
  MOTIVOS[tipo].find((m) => m.codigo === codigo)?.texto ?? "";

/**
 * Lo guardado antes de SPEC-028 traía solo texto libre en `nota`: cuenta
 * como «otro motivo» con esa observación, en vez de quedar como pendiente.
 */
export const motivoDe = (v: Variacion): string => v.motivo ?? (v.nota.trim() ? "OTRO" : "");

/** La cédula identifica; sin cédula, el nombre sin tildes ni espacios de más. */
export const claveDocente = (d: Pick<Docente, "documento" | "nombres">): string =>
  d.documento.trim() ||
  "n:" + d.nombres.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toUpperCase();

const conNombre = (d: Docente) => d.documento.trim() !== "" || d.nombres.trim() !== "";

/**
 * La asignación con la que se compara: la del mismo programa en el periodo
 * anterior. Si hay varias (una importada y otra hecha aquí), la aprobada
 * más reciente; si no, la más reciente.
 */
export function asignacionAnterior(actual: Asignacion, todas: Asignacion[]): Asignacion | undefined {
  const previo = periodoAnterior(actual.periodo);
  const candidatas = todas
    .filter((a) => a.id !== actual.id && a.programa === actual.programa && a.periodo === previo)
    .sort((x, y) => Number(y.estado === "aprobada") - Number(x.estado === "aprobada") || y.actualizada.localeCompare(x.actualizada));
  return candidatas[0];
}

const rolesDe = (d: Docente) =>
  new Set([...d.descargas, ...d.administrativas].map((x) => x.rolId).filter((id): id is number => id !== null));

/**
 * Qué cambió en un docente que sigue: dedicación y roles. Las horas de
 * cursos cambian todos los semestres y no son una variación; asumir o dejar
 * un rol, o pasar de catedrático a TC, sí. null si no cambió nada de eso.
 */
export function cambioDe(antes: Docente, ahora: Docente, nombreRol: (id: number) => string): { detalle: string; sugerido: string } | null {
  const partes: string[] = [];
  let sugerido = "";
  if (antes.dedicacion && ahora.dedicacion && antes.dedicacion !== ahora.dedicacion) {
    partes.push(`${legible(antes.dedicacion)} → ${legible(ahora.dedicacion)}`);
    sugerido = "CAMBIO_DEDICACION";
  }
  const r0 = rolesDe(antes);
  const r1 = rolesDe(ahora);
  const asume = [...r1].filter((id) => !r0.has(id));
  const deja = [...r0].filter((id) => !r1.has(id));
  if (asume.length) {
    partes.push(`Asume: ${asume.map(nombreRol).join(", ")}`);
    sugerido ||= "ASUME_ROL";
  }
  if (deja.length) {
    partes.push(`Deja: ${deja.map(nombreRol).join(", ")}`);
    sugerido ||= "DEJA_ROL";
  }
  return partes.length ? { detalle: partes.join(" · "), sugerido } : null;
}

/**
 * Las filas que hay que mostrar: lo que sale de comparar, con lo que el
 * coordinador ya eligió, más lo que agregó a mano. Lo guardado que ya no
 * corresponde (el docente volvió a la lista) se cae solo.
 */
export function filasVariacion(
  actual: Asignacion,
  anterior: Asignacion | undefined,
  nombreRol: (id: number) => string = (id) => `Rol ${id}`
): Variacion[] {
  const guardadas = new Map((actual.variaciones ?? []).filter((v) => !v.manual).map((v) => [`${v.tipo}:${claveDocente(v)}`, v]));
  const filas: Variacion[] = [];
  const fila = (tipo: TipoVariacion, d: Docente, detalle?: string): Variacion => {
    const g = guardadas.get(`${tipo}:${claveDocente(d)}`);
    return {
      id: g?.id ?? `${tipo}:${claveDocente(d)}`,
      tipo,
      documento: d.documento.trim(),
      nombres: d.nombres.trim(),
      dedicacion: d.dedicacion,
      nota: g?.nota ?? "",
      ...(g && motivoDe(g) ? { motivo: motivoDe(g) } : {}),
      ...(detalle ? { detalle } : {}),
      ...(g?.reemplazaA ? { reemplazaA: g.reemplazaA } : {}),
    };
  };

  if (anterior) {
    const previos = new Map(anterior.docentes.filter(conNombre).map((d) => [claveDocente(d), d]));
    const ahora = new Set(actual.docentes.filter(conNombre).map(claveDocente));
    for (const d of anterior.docentes) if (conNombre(d) && !ahora.has(claveDocente(d))) filas.push(fila("saliente", d));
    for (const d of actual.docentes) {
      if (!conNombre(d)) continue;
      const antes = previos.get(claveDocente(d));
      if (!antes) {
        filas.push(fila("nuevo", d));
        continue;
      }
      const cambio = cambioDe(antes, d, nombreRol);
      if (cambio) {
        const f = fila("cambio", d, cambio.detalle);
        // Se propone el motivo que se deduce; el coordinador lo confirma o lo cambia.
        filas.push(f.motivo ? f : { ...f, motivo: cambio.sugerido });
      }
    }
  }
  return [...filas, ...(actual.variaciones ?? []).filter((v) => v.manual)];
}

/**
 * Lo que impide entregar: un saliente o un cambio sin motivo, o «otro
 * motivo» sin decir cuál. Un ingreso no lo exige: su porqué suele ser obvio.
 */
export const variacionesPendientes = (filas: Variacion[]): Variacion[] =>
  filas.filter((v) => {
    if (v.tipo === "nuevo") return motivoDe(v) === "OTRO" && !v.nota.trim();
    const m = motivoDe(v);
    return !m || (m === "OTRO" && !v.nota.trim());
  });

/**
 * Las variaciones de una asignación para el reporte. Lo entregado usa la
 * foto que quedó al enviar; lo que se sigue editando, la comparación en
 * vivo, que es la que ve el coordinador.
 */
export function variacionesDe(a: Asignacion, todas: Asignacion[], nombreRol?: (id: number) => string): Variacion[] {
  const editable = a.estado === "borrador" || a.estado === "en_correccion";
  if (!editable && a.variaciones) return a.variaciones;
  return filasVariacion(a, asignacionAnterior(a, todas), nombreRol);
}

export interface FilaReporteVariacion {
  asignacionId: string;
  facultad: string;
  programa: string;
  estado: Asignacion["estado"];
  motivo: string;
  variacion: Variacion;
}

/**
 * La hoja VARIACIONES: todas las de un periodo, programa por programa. Las
 * importadas no entran: su Excel no traía motivos y compararlas con el
 * periodo anterior inventaría variaciones que nadie declaró.
 */
export function reporteVariaciones(
  todas: Asignacion[],
  periodo: string,
  nombreRol?: (id: number) => string
): FilaReporteVariacion[] {
  return todas
    .filter((a) => a.periodo === periodo && a.bitacora[0]?.tipo !== "importada")
    .sort((x, y) => x.facultad.localeCompare(y.facultad) || x.programa.localeCompare(y.programa))
    .flatMap((a) =>
      variacionesDe(a, todas, nombreRol).map((v) => ({
        asignacionId: a.id,
        facultad: a.facultad,
        programa: a.programa,
        estado: a.estado,
        motivo: motivoDe(v),
        variacion: v,
      }))
    );
}
