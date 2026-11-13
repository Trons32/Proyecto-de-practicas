/**
 * El directorio de docentes en la base (SPEC-021). Solo servidor.
 *
 * La carga es un `upsert` por cédula en dos pasos —planear y aplicar— para
 * que el administrador vea qué va a pasar antes de que pase, y para que la
 * misma lógica sirva a la pantalla y al script de la primera carga.
 */
import { bd } from "./bd";
import type { Descarte, FichaDirectorio, PersonaListado, UltimaFicha } from "../directorio";
import { interpretarConsulta } from "../directorio";

export interface PlanCarga {
  nuevos: PersonaListado[];
  actualizar: { documento: string; codigo?: string; nombres?: string }[];
  sinCambios: number;
  /** Lo que la base rechaza: hoy, un código que ya es de otra persona. */
  descartes: Descarte[];
}

/**
 * Qué hará la carga, sin escribir nada.
 *
 * - Persona nueva: entra con el nombre del listado y `origen = 'listado'`.
 * - Persona existente: recibe el código. El nombre solo se reescribe si lo
 *   puso el listado; si lo puso una asignación, se conserva (decisión del
 *   2026-11-13: el listado trae apellidos primero, la ficha nombres primero).
 * - Nadie se borra: quien no venga en el listado sigue en sus asignaciones.
 */
export async function planearCarga(personas: PersonaListado[]): Promise<PlanCarga> {
  const documentos = personas.map((p) => p.documento);
  const codigos = personas.flatMap((p) => (p.codigo ? [p.codigo] : []));
  const [existentes, conCodigo] = await Promise.all([
    bd().docente.findMany({ where: { documento: { in: documentos } }, select: { documento: true, codigo: true, nombres: true, origen: true } }),
    bd().docente.findMany({ where: { codigo: { in: codigos } }, select: { documento: true, codigo: true } }),
  ]);
  const porDocumento = new Map(existentes.map((e) => [e.documento, e]));
  const duenoDe = new Map(conCodigo.map((e) => [e.codigo!, e.documento]));

  const plan: PlanCarga = { nuevos: [], actualizar: [], sinCambios: 0, descartes: [] };
  for (const p of personas) {
    const dueno = p.codigo ? duenoDe.get(p.codigo) : undefined;
    // Si el código ya es de otra cédula, no se adivina quién tiene razón.
    if (dueno && dueno !== p.documento) {
      plan.descartes.push({ fila: p.fila ?? 0, codigo: p.codigo ?? "", motivo: "codigo_en_uso" });
      continue;
    }
    const e = porDocumento.get(p.documento);
    if (!e) {
      plan.nuevos.push(p);
      continue;
    }
    const cambio: PlanCarga["actualizar"][number] = { documento: p.documento };
    if (p.codigo && e.codigo !== p.codigo) cambio.codigo = p.codigo;
    if (e.origen === "listado" && e.nombres !== p.nombres) cambio.nombres = p.nombres;
    if (cambio.codigo || cambio.nombres) plan.actualizar.push(cambio);
    else plan.sinCambios++;
  }
  return plan;
}

/** Escribe el plan en una transacción: o entra todo o no entra nada. */
export async function aplicarCarga(plan: PlanCarga, ahora = new Date()): Promise<void> {
  await bd().$transaction(
    async (tx) => {
      for (const c of plan.actualizar) {
        await tx.docente.update({
          where: { documento: c.documento },
          data: { ...(c.codigo && { codigo: c.codigo }), ...(c.nombres && { nombres: c.nombres }), actualizado: ahora },
        });
      }
      if (plan.nuevos.length) {
        await tx.docente.createMany({
          data: plan.nuevos.map((p) => ({ documento: p.documento, codigo: p.codigo, nombres: p.nombres, origen: "listado", actualizado: ahora })),
          skipDuplicates: true,
        });
      }
    },
    // Unas 2.000 filas por la red de la universidad: el límite por defecto
    // de Prisma (5 s) se queda corto.
    { timeout: 120_000, maxWait: 10_000 }
  );
}

const cadena = (v: string | null | undefined) => (v ?? "").trim();

/**
 * Busca por cédula, código o nombre. Como mucho 8 personas: el directorio
 * no se entrega entero (las cédulas son datos personales, Ley 1581).
 *
 * `excluirAsignacion` deja fuera la asignación que se está editando: si no,
 * la "última ficha" del docente sería la que el coordinador escribe ahora.
 */
export async function buscarDocentes(q: string, excluirAsignacion?: string): Promise<FichaDirectorio[]> {
  const c = interpretarConsulta(q);
  if (!c) return [];
  return conUltimaFicha(
    await bd().docente.findMany({
      where:
        c.por === "documento" ? { OR: [{ documento: c.valor }, { codigo: c.valor }] }
        : c.por === "codigo" ? { codigo: c.valor }
        : { AND: c.palabras.map((p) => ({ nombres: { contains: p, mode: "insensitive" as const } })) },
      select: { id: true, documento: true, codigo: true, nombres: true },
      orderBy: { nombres: "asc" },
      take: 8,
    }),
    excluirAsignacion
  );
}

/** Cuántas cédulas trae un lote de sugerencias. */
export const LOTE_SUGERENCIAS = 30;

/**
 * Sugerencias mientras se escribe la cédula: las que empiezan por lo
 * escrito, desde 4 dígitos. Un lote de hasta `LOTE_SUGERENCIAS`: el
 * navegador lo filtra con cada dígito nuevo sin volver a preguntar, y solo
 * pide otro si este vino lleno. Livianas a propósito —sin la última
 * ficha—; la ficha se trae al elegir una (`buscarDocentes`).
 */
export async function sugerirPorCedula(prefijo: string): Promise<FichaDirectorio[]> {
  if (!/^\d{4,15}$/.test(prefijo)) return [];
  const personas = await bd().docente.findMany({
    where: { documento: { startsWith: prefijo } },
    select: { documento: true, codigo: true, nombres: true },
    orderBy: { documento: "asc" },
    take: LOTE_SUGERENCIAS,
  });
  return personas.map((p) => ({ ...p, ultima: null }));
}

async function conUltimaFicha(
  personas: { id: string; documento: string; codigo: string | null; nombres: string }[],
  excluirAsignacion?: string
): Promise<FichaDirectorio[]> {
  return Promise.all(
    personas.map(async (p): Promise<FichaDirectorio> => {
      // Por persona enlazada o por cédula: los borradores aún no enlazan.
      const da = await bd().docente_asignado.findFirst({
        where: {
          OR: [{ docente_id: p.id }, { documento: p.documento }],
          ...(excluirAsignacion && /^[0-9a-f-]{36}$/i.test(excluirAsignacion) ? { NOT: { asignacion_id: excluirAsignacion } } : {}),
        },
        orderBy: [{ asignacion: { periodo: "desc" } }, { asignacion: { actualizada: "desc" } }],
        select: {
          nivel_formacion: true, perfil_profesional: true, categoria_minciencias: true,
          activo_sector_externo: true, sector_ejerce: true, tipo_contrato: true,
          dedicacion: true, categoria: true, sede: true,
          asignacion: { select: { periodo: true, programa: { select: { nombre: true } } } },
        },
      });
      const ultima: UltimaFicha | null = da && {
        periodo: da.asignacion.periodo.trim(),
        programa: da.asignacion.programa.nombre,
        nivelFormacion: cadena(da.nivel_formacion),
        perfilProfesional: cadena(da.perfil_profesional),
        categoriaMinciencias: cadena(da.categoria_minciencias),
        activoSectorExterno: (["SI", "NO"].includes(cadena(da.activo_sector_externo)) ? cadena(da.activo_sector_externo) : "") as UltimaFicha["activoSectorExterno"],
        sectorEjerce: cadena(da.sector_ejerce),
        tipoContrato: cadena(da.tipo_contrato),
        dedicacion: cadena(da.dedicacion),
        categoria: cadena(da.categoria),
        sede: cadena(da.sede),
      };
      return { documento: p.documento, codigo: p.codigo, nombres: p.nombres, ultima };
    })
  );
}
