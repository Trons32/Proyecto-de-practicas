/**
 * Leer y escribir las versiones de los criterios (SPEC-025). Solo servidor.
 * Las reglas de forma están en `lib/criterios-versiones.ts`; las de
 * inmutabilidad, además, en el trigger de la base.
 */
import type { SeccionCriterios } from "../criterios";
import { VERSION_INICIAL, type VersionCriterios } from "../criterios-versiones";
import type { Prisma } from "@/generated/prisma/client";
import { bd } from "./bd";

type Fila = Awaited<ReturnType<ReturnType<typeof bd>["criterios_version"]["findFirst"]>> & {};

const aVersion = (f: Fila): VersionCriterios => ({
  periodo: f.periodo,
  numero: f.numero,
  estado: f.estado as VersionCriterios["estado"],
  contenido: f.contenido as unknown as SeccionCriterios[],
  actualizado: f.actualizado.toISOString(),
  actualizadoPor: f.actualizado_por,
  ...(f.publicada ? { publicada: f.publicada.toISOString() } : {}),
  ...(f.publicada_por ? { publicadaPor: f.publicada_por } : {}),
  ...(f.motivo ? { motivo: f.motivo } : {}),
});

/** Todas las versiones publicadas, de la más reciente a la más antigua. */
export async function leerPublicadas(): Promise<VersionCriterios[]> {
  const filas = await bd().criterios_version.findMany({
    where: { estado: "publicada" },
    orderBy: [{ periodo: "desc" }, { numero: "desc" }],
  });
  return filas.length ? filas.map(aVersion) : [VERSION_INICIAL];
}

export async function leerBorradores(): Promise<VersionCriterios[]> {
  const filas = await bd().criterios_version.findMany({ where: { estado: "borrador" }, orderBy: { periodo: "desc" } });
  return filas.map(aVersion);
}

export async function guardarBorrador(periodo: string, contenido: SeccionCriterios[], autor: string) {
  const datos = {
    contenido: contenido as unknown as Prisma.InputJsonValue,
    actualizado: new Date(),
    actualizado_por: autor,
  };
  const actual = await bd().criterios_version.findFirst({ where: { periodo, estado: "borrador" }, select: { id: true } });
  if (actual) await bd().criterios_version.update({ where: { id: actual.id }, data: datos });
  else await bd().criterios_version.create({ data: { periodo, numero: 0, estado: "borrador", ...datos } });
}

/** Convierte el borrador en la versión siguiente del periodo. */
export async function publicarBorrador(periodo: string, motivo: string, autor: string): Promise<number | null> {
  return bd().$transaction(async (tx) => {
    const borrador = await tx.criterios_version.findFirst({ where: { periodo, estado: "borrador" }, select: { id: true } });
    if (!borrador) return null;
    const ultima = await tx.criterios_version.aggregate({ where: { periodo, estado: "publicada" }, _max: { numero: true } });
    const numero = (ultima._max.numero ?? 0) + 1;
    const ahora = new Date();
    await tx.criterios_version.update({
      where: { id: borrador.id },
      data: { estado: "publicada", numero, publicada: ahora, publicada_por: autor, motivo, actualizado: ahora, actualizado_por: autor },
    });
    return numero;
  });
}

export async function descartarBorrador(periodo: string) {
  await bd().criterios_version.deleteMany({ where: { periodo, estado: "borrador" } });
}
