/**
 * Del dominio a las tablas. Cada guardado va en una transacción: o entra
 * entero o no entra nada.
 *
 * Recibe solo lo que cambió (ver SPEC-006): las asignaciones tocadas, los
 * ids eliminados, las novedades nuevas o con decisiones nuevas. Lo que no
 * viene no se toca, para que un cliente no borre lo que otro creó.
 */
import { Prisma } from "@/generated/prisma/client";
import type { ReglaDedicacion } from "../catalogos";
import type { Convocatoria } from "../convocatoria";
import type { Limites, Novedad, RolParametro } from "../novedades";
import type { Asignacion } from "../tipos";
import { bd, type Cliente } from "./bd";
import { revisarBorrado, revisarGuardado, type Actor } from "../transiciones";
import { aUuid } from "./ids";
import { leerAsignaciones } from "./leer";

/** La cadena vacía de la aplicación es "sin dato": NULL. */
const t = (v: string | null | undefined) => (v === "" || v === undefined ? null : v);
const f = (v: string | null | undefined) => (v ? new Date(v) : null);
const num = (v: number | null | undefined) => (v === undefined || (typeof v === "number" && Number.isNaN(v)) ? null : v);

/**
 * 45 docentes con sus cursos son cientos de filas: el plazo predeterminado
 * de Prisma (5 s) se queda corto en un servidor lento. La espera cubre el
 * caso de dos administradores que guardan la misma asignación a la vez.
 */
const enTransaccion = <T>(trabajo: (tx: Cliente) => Promise<T>) =>
  bd().$transaction(trabajo, { timeout: 60_000, maxWait: 15_000 });

const asegurarPeriodo = (tx: Cliente, periodo: string) =>
  tx.periodo.createMany({ data: [{ codigo: periodo }], skipDuplicates: true });

/** Un error que el usuario puede corregir en la aplicación, no un fallo del servidor. */
export class DatoRechazado extends Error {}

/**
 * El cambio no respeta el ciclo de vida (SPEC-007). Casi siempre significa
 * que otro usuario movió la asignación mientras tanto: el cliente tiene una
 * copia vieja y debe recargar.
 */
export class CambioRechazado extends Error {}

/**
 * ¿La base rechazó un dato (cascada inválida, valor fuera de rango, clave
 * repetida)? Entonces el dato está mal, no el servidor. Prisma traduce FK,
 * UNIQUE y longitud a sus códigos P20xx; un CHECK le llega como error del
 * motor, con el SQLSTATE de clase 22 o 23 de PostgreSQL.
 */
export function esRechazoDeLaBase(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (["P2000", "P2002", "P2003", "P2004", "P2011", "P2020"].includes(e.code)) return true;
  }
  const texto = JSON.stringify(e, Object.getOwnPropertyNames(e ?? {}));
  return /"(originalCode|code)":"2[23][0-9A-Z]{3}"/.test(texto) || /violates check constraint/.test(texto);
}

export async function guardarAsignaciones(asignaciones: Asignacion[], borrados: string[], actor?: Actor) {
  await enTransaccion(async (tx) => {
    // Bloqueadas hasta el commit: dos administradores que aprueban y
    // devuelven a la vez se validan uno después del otro, no los dos contra
    // el mismo estado viejo. En READ COMMITTED la lectura siguiente ya ve lo
    // que el otro confirmó. Dos clientes que crean el mismo id nuevo no
    // tienen fila que bloquear: ahí los separa la clave primaria.
    const ids = [...asignaciones.map((a) => aUuid(a.id)), ...borrados.map(aUuid)];
    await tx.$queryRaw`SELECT id FROM public.asignacion WHERE id = ANY(${ids}::uuid[]) ORDER BY id FOR UPDATE`;
    const guardadas = new Map(
      (await leerAsignaciones({ ids, cliente: tx })).asignaciones.map((a) => [a.id, a])
    );

    for (const idBorrado of borrados) {
      const problema = revisarBorrado(guardadas.get(aUuid(idBorrado)));
      if (problema) throw new CambioRechazado(problema);
      await tx.asignacion.delete({ where: { id: aUuid(idBorrado) } });
    }
    for (const a of asignaciones) {
      const problema = revisarGuardado(guardadas.get(aUuid(a.id)), a, actor);
      if (problema) throw new CambioRechazado(`${a.programa} ${a.periodo}: ${problema}`);
    }

    for (const a of asignaciones) {
      const programa = await tx.programa.findUnique({ where: { nombre: a.programa }, select: { id: true } });
      if (!programa) throw new DatoRechazado(`El programa «${a.programa}» no está en el catálogo.`);
      const asigId = aUuid(a.id);

      await asegurarPeriodo(tx, a.periodo);
      const datos = {
        periodo: a.periodo,
        programa_id: programa.id,
        estado: a.estado,
        version: a.version,
        // Fuera de en_correccion la aplicación ignora el plazo; la base lo prohíbe.
        plazo_correccion: a.estado === "en_correccion" ? f(a.plazoCorreccion) : null,
        creada: new Date(a.creada),
        actualizada: new Date(a.actualizada),
      };
      await tx.asignacion.upsert({ where: { id: asigId }, update: datos, create: { id: asigId, ...datos } });

      // Los docentes son parte de la asignación: se reescriben enteros, y la
      // cascada se lleva sus cursos y actividades.
      await tx.docente_asignado.deleteMany({ where: { asignacion_id: asigId } });

      const enlazados = new Set<string>();
      for (const [i, d] of a.docentes.entries()) {
        const doc = d.documento.trim();
        let personaId: string | null = null;
        // El borrador se persiste en cada tecla. Con seis dígitos ya cumple el
        // formato mínimo, pero todavía puede ser un prefijo del documento que
        // el coordinador sigue escribiendo; crear aquí la persona histórica
        // dejaba filas como 100326, 1003262, 10032621… Solo una entrega fija
        // el vínculo con el docente real. En corrección aplica lo mismo: se
        // enlaza al reenviar, no durante la edición.
        const fijaDocentes = a.estado !== "borrador" && a.estado !== "en_correccion";
        // Un documento repetido no bloquea el guardado: el segundo queda sin
        // enlazar hasta que el coordinador lo corrija.
        if (fijaDocentes && /^\d{6,15}$/.test(doc) && !enlazados.has(doc)) {
          enlazados.add(doc);
          const nombres = d.nombres.trim() || "—";
          const persona = await tx.docente.upsert({
            where: { documento: doc },
            update: { nombres },
            create: { documento: doc, nombres },
            select: { id: true },
          });
          personaId = persona.id;
        }

        const daId = aUuid(d.id);
        await tx.docente_asignado.create({
          data: {
            id: daId, asignacion_id: asigId, docente_id: personaId, orden: i + 1,
            documento: t(doc), nombres: t(d.nombres), nivel_formacion: t(d.nivelFormacion),
            perfil_profesional: t(d.perfilProfesional), categoria_minciencias: t(d.categoriaMinciencias),
            activo_sector_externo: t(d.activoSectorExterno), sector_ejerce: t(d.sectorEjerce),
            tipo_contrato: t(d.tipoContrato), dedicacion: t(d.dedicacion), categoria: t(d.categoria),
            sede: t(d.sede), evaluacion_docente: num(d.evaluacionDocente), observaciones: t(d.observaciones),
            preparacion: d.preparacion, atencion: d.atencion, comunidades: d.comunidades,
          },
        });

        await tx.curso_asignado.createMany({
          data: d.cursos.map((k, j) => ({
            id: aUuid(k.id), docente_asignado_id: daId, orden: j + 1,
            codigo_programa: t(k.codigoPrograma), nombre_programa: t(k.nombrePrograma),
            codigo_pensum: t(k.codigoPensum), codigo_curso: t(k.codigoCurso), nombre_curso: t(k.nombreCurso),
            semestre: num(k.semestre), grupo: t(k.grupo), jornada: t(k.jornada),
            intensidad_horaria: num(k.intensidadHoraria), creditos: num(k.creditos),
            estudiantes: num(k.estudiantes), modalidad: t(k.modalidad),
          })),
        });

        const actividades = [
          ...d.descargas.map((x) => ({ ...x, clase: "DESCARGA" })),
          ...d.administrativas.map((x) => ({ ...x, clase: "ADMINISTRATIVA" })),
        ];
        await tx.actividad.createMany({
          data: actividades.map((x, j) => ({
            id: aUuid(x.id), docente_asignado_id: daId, clase: x.clase, orden: j + 1, rol_id: x.rolId, horas: x.horas,
          })),
        });
      }

      // La bitácora solo crece: se insertan los eventos que la base no tiene
      // (skipDuplicates es ON CONFLICT DO NOTHING; nunca un UPDATE).
      await tx.evento_asignacion.createMany({
        data: a.bitacora.map((e) => ({
          id: aUuid(e.id), asignacion_id: asigId, tipo: e.tipo, fecha: new Date(e.fecha), autor: e.autor,
          rol_autor: e.rolAutor, nota: t(e.nota), plazo: f(e.plazo), version: e.version ?? null,
          novedad_id: e.novedadId ? aUuid(e.novedadId) : null,
        })),
        skipDuplicates: true,
      });

      // La línea base se escribe una sola vez: `transiciones.ts` ya
      // comprobó que no cambió, y la tabla no admite UPDATE.
      if (a.lineaBase) {
        const yaEsta = await tx.asignacion.findUnique({ where: { id: asigId }, select: { linea_base_fecha: true } });
        if (!yaEsta?.linea_base_fecha) {
          await tx.asignacion.update({
            where: { id: asigId },
            data: { linea_base_fecha: new Date(a.lineaBase.fecha), linea_base_version: a.lineaBase.version },
          });
          await tx.linea_base_curso.createMany({
            data: a.lineaBase.cursos.map((k, i) => ({
              asignacion_id: asigId, orden: i + 1, curso_id: aUuid(k.id), docente_id: aUuid(k.docenteId),
              docente: t(k.docente), codigo_curso: t(k.codigoCurso), nombre_curso: t(k.nombreCurso),
              semestre: num(k.semestre), grupo: t(k.grupo), intensidad_horaria: num(k.intensidadHoraria),
              estudiantes: num(k.estudiantes),
            })),
          });
        }
      }
    }
  });
}

export async function guardarConfiguracion(c: {
  reglas: Record<string, ReglaDedicacion>;
  roles: RolParametro[];
  limites: Limites;
  convocatorias: Record<string, Convocatoria>;
}) {
  await enTransaccion(async (tx) => {
    for (const [dedicacion, g] of Object.entries(c.reglas)) {
      await tx.regla_dedicacion.updateMany({
        where: { dedicacion },
        data: { max_horas: g.maxHoras, preparacion: g.preparacion, atencion: g.atencion, comunidades: g.comunidades },
      });
    }
    await tx.limite.update({
      where: { id: 1 },
      data: {
        max_cursos: c.limites.maxCursos,
        max_descargas: c.limites.maxDescargas,
        max_administrativas: c.limites.maxAdministrativas,
      },
    });

    // Los roles no se borran: las asignaciones los siguen referenciando.
    // `inactivo` (SPEC-012) se guarda como no vigente; uno que no viene en
    // la lista, también.
    await tx.rol.updateMany({ where: { id: { notIn: c.roles.map((r) => r.id) } }, data: { vigente: false } });
    for (const r of c.roles) {
      const datos = { nombre: r.nombre, tipo: r.tipo, reclasificado: Boolean(r.reclasificado), vigente: !r.inactivo };
      await tx.rol.upsert({ where: { id: r.id }, update: datos, create: { id: r.id, ...datos } });
    }

    for (const v of Object.values(c.convocatorias)) {
      await asegurarPeriodo(tx, v.periodo);
      const datos = { apertura: new Date(v.apertura), limite: new Date(v.limite), cerrada_manualmente: v.cerradaManualmente };
      await tx.convocatoria.upsert({ where: { periodo: v.periodo }, update: datos, create: { periodo: v.periodo, ...datos } });
    }
  });
}

/** Las novedades solo se añaden; de una existente solo pueden llegar decisiones nuevas. */
export async function guardarNovedades(novedades: Novedad[]) {
  await enTransaccion(async (tx) => {
    for (const n of novedades) {
      const nId = aUuid(n.id);
      const existe = await tx.novedad.findUnique({ where: { id: nId }, select: { id: true } });

      if (!existe) {
        if (n.periodo) await asegurarPeriodo(tx, n.periodo);
        await tx.novedad.create({
          data: {
            id: nId, numero: n.numero, fecha: new Date(n.fecha), autor: n.autor, rol_autor: n.rolAutor,
            periodo: n.periodo, con_convocatoria_cerrada: n.conConvocatoriaCerrada, motivo: n.motivo,
          },
        });
        await tx.novedad_cambio.createMany({
          data: n.cambios.map((k, j) => ({
            novedad_id: nId, orden: j + 1, ambito: k.ambito, parametro: k.parametro, antes: t(k.antes), despues: t(k.despues),
          })),
        });
        // Una por una: el orden de inserción (secuencia) es el de la novedad.
        for (const a of n.afectadas) {
          await tx.novedad_afectacion.create({
            data: {
              novedad_id: nId, asignacion_id: aUuid(a.asignacionId), programa: a.programa, facultad: a.facultad,
              periodo: a.periodo, errores_antes: a.erroresAntes, errores_ahora: a.erroresAhora,
            },
          });
          await tx.novedad_afectacion_docente.createMany({
            data: a.docentes.map((d, j) => ({
              novedad_id: nId, asignacion_id: aUuid(a.asignacionId), orden: j + 1,
              nombres: d.nombres || "—", motivos: d.motivos,
            })),
          });
        }
      }

      // Las decisiones solo se suman, en orden: las que la base ya tiene
      // son las primeras de la lista.
      const previas = await tx.novedad_decision.count({ where: { novedad_id: nId } });
      for (const k of n.decisiones.slice(previas)) {
        await tx.novedad_decision.create({
          data: {
            novedad_id: nId, asignacion_id: aUuid(k.asignacionId), accion: k.accion, fecha: new Date(k.fecha),
            autor: k.autor, nota: t(k.nota), plazo: f(k.plazo),
          },
        });
      }
    }
  });
}
