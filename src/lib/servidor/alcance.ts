/**
 * Qué asignaciones le tocan a cada usuario. Solo servidor.
 *
 * El administrador ve todas. Un coordinador solo las suyas: las de su
 * programa (`usuario.programa_id`) y las que él creó. Antes el GET de
 * /api/estado devolvía todas a cualquiera, y un coordinador veía en su
 * historial las de los demás programas.
 *
 * Lo segundo existe porque un coordinador puede crear la asignación de un
 * programa que no es el de su ficha (o no tener programa asignado): no
 * debe perderla de vista por eso.
 */
import type { Asignacion } from "../tipos";
import type { Usuario } from "../auth/sesion";
import type { Prisma } from "@/generated/prisma/client";
import { bd } from "./bd";

export interface Alcance {
  programa: string | null;
  nombres: string;
}

/** null: sin restricción (administrador). */
export async function alcanceDe(usuario: Usuario): Promise<Alcance | null> {
  if (usuario.rol === "ADMIN") return null;
  const fila = await bd().usuario.findFirst({
    where: { email: usuario.email },
    select: { programa: { select: { nombre: true } } },
  });
  return { programa: fila?.programa?.nombre ?? null, nombres: usuario.nombres };
}

export const filtroAlcance = (a: Alcance): Prisma.asignacionWhereInput => ({
  OR: [
    ...(a.programa ? [{ programa: { nombre: a.programa } }] : []),
    { evento_asignacion: { some: { tipo: "creada", autor: a.nombres } } },
  ],
});

/** La misma regla, sobre una asignación ya leída. PURO. */
export const dentroDelAlcance = (asignacion: Asignacion, a: Alcance): boolean =>
  (a.programa !== null && asignacion.programa === a.programa) ||
  asignacion.bitacora.some((e) => e.tipo === "creada" && e.autor === a.nombres);
