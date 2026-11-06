/**
 * De las tablas al dominio: devuelve cada store con la forma de
 * `lib/tipos.ts` y `lib/novedades.ts`, la misma del respaldo JSON.
 *
 * NULL vuelve a ser lo que la aplicación usa para "sin dato": cadena vacía
 * en los textos, `null` en los números, y la propiedad ausente en los
 * opcionales. Así leer y volver a escribir no cambia nada (CA-006.3).
 */
import type { ReglaDedicacion } from "../catalogos";
import type { Convocatoria } from "../convocatoria";
import type { Limites, Novedad, RolParametro } from "../novedades";
import type { Asignacion, Docente, Evento } from "../tipos";
import { bd, type Cliente } from "./bd";

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
/** Prisma entrega NUMERIC como Decimal; `Number()` lo convierte. */
const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const iso = (v: Date | null | undefined) => (v ? v.toISOString() : "");
/** Solo las claves con valor: los opcionales ausentes no se escriben como `undefined`. */
const opcionales = <T extends object>(o: T): Partial<T> =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== "")) as Partial<T>;

/**
 * `ids` limita la lectura a esas asignaciones; `cliente` permite leer
 * dentro de una transacción, que es como el servidor valida un guardado
 * contra lo que hay (ver `escribir.ts`).
 */
export async function leerAsignaciones(
  { ids, cliente = bd() }: { ids?: string[]; cliente?: Cliente } = {}
): Promise<{ asignaciones: Asignacion[] }> {
  const filas = await cliente.asignacion.findMany({
    where: ids ? { id: { in: ids } } : undefined,
    orderBy: { creada: "desc" },
    include: {
      programa: true,
      docente_asignado: {
        orderBy: { orden: "asc" },
        include: { curso_asignado: { orderBy: { orden: "asc" } }, actividad: { orderBy: { orden: "asc" } } },
      },
      // El orden de inserción es el de la bitácora; la fecha sola empataría
      // eventos del mismo milisegundo.
      evento_asignacion: { orderBy: [{ fecha: "asc" }, { secuencia: "asc" }] },
      linea_base_curso: { orderBy: { orden: "asc" } },
    },
  });

  type FilaDocente = (typeof filas)[number]["docente_asignado"][number];
  const docente = (d: FilaDocente): Docente => {
    const actividad = (x: FilaDocente["actividad"][number]) => ({ id: x.id, rolId: x.rol_id, horas: Number(x.horas) });
    return {
      id: d.id,
      documento: s(d.documento),
      nombres: s(d.nombres),
      nivelFormacion: s(d.nivel_formacion),
      perfilProfesional: s(d.perfil_profesional),
      categoriaMinciencias: s(d.categoria_minciencias),
      activoSectorExterno: s(d.activo_sector_externo) as Docente["activoSectorExterno"],
      sectorEjerce: s(d.sector_ejerce),
      tipoContrato: s(d.tipo_contrato),
      dedicacion: s(d.dedicacion),
      categoria: s(d.categoria),
      sede: s(d.sede),
      evaluacionDocente: n(d.evaluacion_docente),
      observaciones: s(d.observaciones),
      preparacion: Number(d.preparacion),
      atencion: Number(d.atencion),
      comunidades: Number(d.comunidades),
      descargas: d.actividad.filter((x) => x.clase === "DESCARGA").map(actividad),
      administrativas: d.actividad.filter((x) => x.clase === "ADMINISTRATIVA").map(actividad),
      cursos: d.curso_asignado.map((k) => ({
        id: k.id,
        codigoPrograma: s(k.codigo_programa),
        nombrePrograma: s(k.nombre_programa),
        codigoPensum: s(k.codigo_pensum),
        codigoCurso: s(k.codigo_curso),
        nombreCurso: s(k.nombre_curso),
        semestre: k.semestre,
        grupo: s(k.grupo),
        jornada: s(k.jornada),
        intensidadHoraria: n(k.intensidad_horaria),
        creditos: k.creditos,
        estudiantes: k.estudiantes,
        modalidad: s(k.modalidad),
      })),
    };
  };

  const evento = (e: (typeof filas)[number]["evento_asignacion"][number]): Evento => ({
    id: e.id,
    tipo: e.tipo as Evento["tipo"],
    fecha: iso(e.fecha),
    autor: e.autor,
    rolAutor: e.rol_autor as Evento["rolAutor"],
    ...opcionales({
      nota: s(e.nota),
      plazo: iso(e.plazo),
      version: e.version ?? undefined,
      novedadId: s(e.novedad_id),
    }),
  });

  return {
    asignaciones: filas.map((a) => ({
      id: a.id,
      periodo: a.periodo,
      facultad: a.programa.facultad,
      programa: a.programa.nombre,
      estado: a.estado as Asignacion["estado"],
      creada: iso(a.creada),
      actualizada: iso(a.actualizada),
      version: a.version,
      ...opcionales({ plazoCorreccion: iso(a.plazo_correccion) }),
      ...(a.linea_base_fecha
        ? {
            lineaBase: {
              fecha: iso(a.linea_base_fecha),
              version: Number(a.linea_base_version),
              cursos: a.linea_base_curso.map((k) => ({
                id: k.curso_id,
                docenteId: k.docente_id,
                docente: s(k.docente),
                codigoCurso: s(k.codigo_curso),
                nombreCurso: s(k.nombre_curso),
                semestre: k.semestre,
                grupo: s(k.grupo),
                intensidadHoraria: n(k.intensidad_horaria),
                estudiantes: k.estudiantes,
              })),
            },
          }
        : {}),
      docentes: a.docente_asignado.map(docente),
      bitacora: a.evento_asignacion.map(evento),
    })),
  };
}

export async function leerConfiguracion(): Promise<{
  reglas: Record<string, ReglaDedicacion>;
  roles: RolParametro[];
  limites: Limites;
  convocatorias: Record<string, Convocatoria>;
}> {
  const c = bd();
  const [reglas, l, roles, convocatorias] = await Promise.all([
    c.regla_dedicacion.findMany(),
    c.limite.findUniqueOrThrow({ where: { id: 1 } }),
    c.rol.findMany({ orderBy: { id: "asc" } }),
    c.convocatoria.findMany({ orderBy: { periodo: "asc" } }),
  ]);
  return {
    reglas: Object.fromEntries(
      reglas.map((r) => [
        r.dedicacion,
        { maxHoras: r.max_horas, preparacion: r.preparacion, atencion: r.atencion, comunidades: r.comunidades },
      ])
    ),
    roles: roles.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      tipo: r.tipo as RolParametro["tipo"],
      ...(r.reclasificado ? { reclasificado: true } : {}),
      // No vigente = inactivo (SPEC-012): se lee para que las asignaciones
      // que lo usan sigan mostrando su nombre y sumando sus horas.
      ...(r.vigente ? {} : { inactivo: true as const }),
    })),
    limites: { maxCursos: l.max_cursos, maxDescargas: l.max_descargas, maxAdministrativas: l.max_administrativas },
    convocatorias: Object.fromEntries(
      convocatorias.map((v) => [
        v.periodo,
        { periodo: v.periodo, apertura: iso(v.apertura), limite: iso(v.limite), cerradaManualmente: v.cerrada_manualmente },
      ])
    ),
  };
}

export async function leerNovedades(): Promise<{ novedades: Novedad[] }> {
  const filas = await bd().novedad.findMany({
    orderBy: { numero: "asc" },
    include: {
      novedad_cambio: { orderBy: { orden: "asc" } },
      novedad_afectacion: {
        orderBy: { secuencia: "asc" },
        include: {
          novedad_afectacion_docente: { orderBy: { orden: "asc" } },
          novedad_decision: true,
        },
      },
    },
  });

  return {
    novedades: filas.map((v) => ({
      id: v.id,
      numero: v.numero,
      fecha: iso(v.fecha),
      autor: v.autor,
      rolAutor: v.rol_autor as Novedad["rolAutor"],
      periodo: v.periodo ?? null,
      conConvocatoriaCerrada: v.con_convocatoria_cerrada,
      motivo: v.motivo,
      cambios: v.novedad_cambio.map((c) => ({
        ambito: c.ambito as Novedad["cambios"][number]["ambito"],
        parametro: c.parametro,
        antes: c.antes,
        despues: c.despues,
      })),
      afectadas: v.novedad_afectacion.map((f) => ({
        asignacionId: f.asignacion_id,
        programa: f.programa,
        facultad: f.facultad,
        periodo: f.periodo,
        erroresAntes: f.errores_antes,
        erroresAhora: f.errores_ahora,
        docentes: f.novedad_afectacion_docente.map((d) => ({ nombres: d.nombres, motivos: d.motivos as string[] })),
      })),
      // Las decisiones van en el orden en que se tomaron, no por asignación.
      decisiones: v.novedad_afectacion
        .flatMap((f) => f.novedad_decision)
        .sort((a, b) => a.id - b.id)
        .map((k) => ({
          asignacionId: k.asignacion_id,
          accion: k.accion as "reabierta" | "sin_accion",
          fecha: iso(k.fecha),
          autor: k.autor,
          ...opcionales({ nota: s(k.nota), plazo: iso(k.plazo) }),
        })),
    })),
  };
}
