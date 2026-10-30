/**
 * De las tablas al dominio: devuelve cada store con la forma de
 * `lib/tipos.ts` y `lib/novedades.ts`, la misma del respaldo JSON.
 *
 * NULL vuelve a ser lo que la aplicación usa para "sin dato": cadena vacía
 * en los textos, `null` en los números, y la propiedad ausente en los
 * opcionales. Así leer y volver a escribir no cambia nada (CA-006.3).
 */
import type { ReglaDedicacion, Rol } from "../catalogos";
import type { Convocatoria } from "../convocatoria";
import type { Limites, Novedad } from "../novedades";
import type { Asignacion, Docente, Evento } from "../tipos";
import { ejecutarSuelto, pool, type Ejecutar } from "./bd";

type Fila = Record<string, unknown>;

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : s(v));
/** Solo las claves con valor: los opcionales ausentes no se escriben como `undefined`. */
const opcionales = <T extends object>(o: T): Partial<T> =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== "")) as Partial<T>;

/** Agrupa filas por una columna, conservando el orden de la consulta. */
function agrupar(filas: Fila[], clave: string): Map<string, Fila[]> {
  const m = new Map<string, Fila[]>();
  for (const f of filas) {
    const k = String(f[clave]).toLowerCase();
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(f);
  }
  return m;
}

const id = (v: unknown) => String(v).toLowerCase();

/**
 * `ids` limita la lectura a esas asignaciones; `ejecutar` permite leer
 * dentro de una transacción, que es como el servidor valida un guardado
 * contra lo que hay (ver `escribir.ts`). Las consultas van una tras otra:
 * una transacción de mssql no admite peticiones simultáneas.
 */
export async function leerAsignaciones(
  { ids, ejecutar = ejecutarSuelto }: { ids?: string[]; ejecutar?: Ejecutar } = {}
): Promise<{ asignaciones: Asignacion[] }> {
  const filtro = ids ? `IN (SELECT CAST(value AS UNIQUEIDENTIFIER) FROM OPENJSON(?))` : null;
  const lista = ids ? [JSON.stringify(ids)] : [];
  const deAsignaciones = (columna: string) => (filtro ? `WHERE ${columna} ${filtro}` : "");
  const deDocentes = filtro
    ? `WHERE docente_asignado_id IN (SELECT id FROM aa.docente_asignado WHERE asignacion_id ${filtro})`
    : "";

  const asig = await ejecutar(
    `SELECT a.*, p.nombre AS programa, p.facultad FROM aa.asignacion a
     JOIN aa.programa p ON p.id = a.programa_id ${deAsignaciones("a.id")} ORDER BY a.creada DESC`,
    ...lista
  );
  const docs = await ejecutar(`SELECT * FROM aa.docente_asignado ${deAsignaciones("asignacion_id")} ORDER BY asignacion_id, orden`, ...lista);
  const cursos = await ejecutar(`SELECT * FROM aa.curso_asignado ${deDocentes} ORDER BY docente_asignado_id, orden`, ...lista);
  const acts = await ejecutar(`SELECT * FROM aa.actividad ${deDocentes} ORDER BY docente_asignado_id, orden`, ...lista);
  // El orden de inserción es el de la bitácora; la fecha sola empataría
  // eventos del mismo milisegundo.
  const eventos = await ejecutar(
    `SELECT * FROM aa.evento_asignacion ${deAsignaciones("asignacion_id")} ORDER BY asignacion_id, fecha, %%physloc%%`,
    ...lista
  );

  const docsPor = agrupar(docs.recordset, "asignacion_id");
  const cursosPor = agrupar(cursos.recordset, "docente_asignado_id");
  const actsPor = agrupar(acts.recordset, "docente_asignado_id");
  const eventosPor = agrupar(eventos.recordset, "asignacion_id");
  const base = await ejecutar(
    `SELECT * FROM aa.linea_base_curso ${deAsignaciones("asignacion_id")} ORDER BY asignacion_id, orden`,
    ...lista
  );
  const basePor = agrupar(base.recordset, "asignacion_id");

  const docente = (d: Fila): Docente => {
    const actividades = actsPor.get(id(d.id)) ?? [];
    const actividad = (x: Fila) => ({ id: id(x.id), rolId: n(x.rol_id), horas: Number(x.horas) });
    return {
      id: id(d.id),
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
      descargas: actividades.filter((x) => x.clase === "DESCARGA").map(actividad),
      administrativas: actividades.filter((x) => x.clase === "ADMINISTRATIVA").map(actividad),
      cursos: (cursosPor.get(id(d.id)) ?? []).map((k) => ({
        id: id(k.id),
        codigoPrograma: s(k.codigo_programa),
        nombrePrograma: s(k.nombre_programa),
        codigoPensum: s(k.codigo_pensum),
        codigoCurso: s(k.codigo_curso),
        nombreCurso: s(k.nombre_curso),
        semestre: n(k.semestre),
        grupo: s(k.grupo),
        jornada: s(k.jornada),
        intensidadHoraria: n(k.intensidad_horaria),
        creditos: n(k.creditos),
        estudiantes: n(k.estudiantes),
        modalidad: s(k.modalidad),
      })),
    };
  };

  const evento = (e: Fila): Evento => ({
    id: id(e.id),
    tipo: e.tipo as Evento["tipo"],
    fecha: iso(e.fecha),
    autor: s(e.autor),
    rolAutor: e.rol_autor as Evento["rolAutor"],
    ...opcionales({
      nota: s(e.nota),
      plazo: e.plazo ? iso(e.plazo) : "",
      version: n(e.version) ?? undefined,
      novedadId: e.novedad_id ? id(e.novedad_id) : "",
    }),
  });

  return {
    asignaciones: asig.recordset.map((a) => ({
      id: id(a.id),
      periodo: s(a.periodo),
      facultad: s(a.facultad),
      programa: s(a.programa),
      estado: a.estado as Asignacion["estado"],
      creada: iso(a.creada),
      actualizada: iso(a.actualizada),
      version: Number(a.version),
      ...opcionales({ plazoCorreccion: a.plazo_correccion ? iso(a.plazo_correccion) : "" }),
      ...(a.linea_base_fecha
        ? {
            lineaBase: {
              fecha: iso(a.linea_base_fecha),
              version: Number(a.linea_base_version),
              cursos: (basePor.get(id(a.id)) ?? []).map((k) => ({
                id: id(k.curso_id),
                docenteId: id(k.docente_id),
                docente: s(k.docente),
                codigoCurso: s(k.codigo_curso),
                nombreCurso: s(k.nombre_curso),
                semestre: n(k.semestre),
                grupo: s(k.grupo),
                intensidadHoraria: n(k.intensidad_horaria),
                estudiantes: n(k.estudiantes),
              })),
            },
          }
        : {}),
      docentes: (docsPor.get(id(a.id)) ?? []).map(docente),
      bitacora: (eventosPor.get(id(a.id)) ?? []).map(evento),
    })),
  };
}

export async function leerConfiguracion(): Promise<{
  reglas: Record<string, ReglaDedicacion>;
  roles: Rol[];
  limites: Limites;
  convocatorias: Record<string, Convocatoria>;
}> {
  const bd = await pool();
  const [reglas, limite, roles, convocatorias] = await Promise.all([
    bd.query(`SELECT * FROM aa.regla_dedicacion`),
    bd.query(`SELECT * FROM aa.limite WHERE id = 1`),
    bd.query(`SELECT * FROM aa.rol WHERE vigente = 1 ORDER BY id`),
    bd.query(`SELECT * FROM aa.convocatoria ORDER BY periodo`),
  ]);
  const l = limite.recordset[0];
  return {
    reglas: Object.fromEntries(
      reglas.recordset.map((r) => [
        r.dedicacion,
        { maxHoras: r.max_horas, preparacion: r.preparacion, atencion: r.atencion, comunidades: r.comunidades },
      ])
    ),
    roles: roles.recordset.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      tipo: r.tipo,
      ...(r.reclasificado ? { reclasificado: true } : {}),
    })),
    limites: { maxCursos: l.max_cursos, maxDescargas: l.max_descargas, maxAdministrativas: l.max_administrativas },
    convocatorias: Object.fromEntries(
      convocatorias.recordset.map((c) => [
        c.periodo,
        { periodo: c.periodo, apertura: iso(c.apertura), limite: iso(c.limite), cerradaManualmente: Boolean(c.cerrada_manualmente) },
      ])
    ),
  };
}

export async function leerNovedades(): Promise<{ novedades: Novedad[] }> {
  const bd = await pool();
  const [novs, cambios, afect, afectDoc, decisiones] = await Promise.all([
    bd.query(`SELECT * FROM aa.novedad ORDER BY numero`),
    bd.query(`SELECT * FROM aa.novedad_cambio ORDER BY novedad_id, orden`),
    bd.query(`SELECT * FROM aa.novedad_afectacion ORDER BY novedad_id, %%physloc%%`),
    bd.query(`SELECT * FROM aa.novedad_afectacion_docente ORDER BY novedad_id, asignacion_id, orden`),
    bd.query(`SELECT * FROM aa.novedad_decision ORDER BY id`),
  ]);
  const cambiosPor = agrupar(cambios.recordset, "novedad_id");
  const afectPor = agrupar(afect.recordset, "novedad_id");
  const decisionesPor = agrupar(decisiones.recordset, "novedad_id");
  const docsPor = new Map<string, Fila[]>();
  for (const d of afectDoc.recordset) {
    const k = `${id(d.novedad_id)}|${id(d.asignacion_id)}`;
    if (!docsPor.has(k)) docsPor.set(k, []);
    docsPor.get(k)!.push(d);
  }

  return {
    novedades: novs.recordset.map((v) => ({
      id: id(v.id),
      numero: v.numero,
      fecha: iso(v.fecha),
      autor: v.autor,
      rolAutor: v.rol_autor,
      periodo: v.periodo ?? null,
      conConvocatoriaCerrada: Boolean(v.con_convocatoria_cerrada),
      motivo: v.motivo,
      cambios: (cambiosPor.get(id(v.id)) ?? []).map((c) => ({
        ambito: c.ambito as Novedad["cambios"][number]["ambito"],
        parametro: s(c.parametro),
        antes: (c.antes as string | null) ?? null,
        despues: (c.despues as string | null) ?? null,
      })),
      afectadas: (afectPor.get(id(v.id)) ?? []).map((f) => ({
        asignacionId: id(f.asignacion_id),
        programa: s(f.programa),
        facultad: s(f.facultad),
        periodo: s(f.periodo),
        erroresAntes: Number(f.errores_antes),
        erroresAhora: Number(f.errores_ahora),
        docentes: (docsPor.get(`${id(v.id)}|${id(f.asignacion_id)}`) ?? []).map((d) => ({
          nombres: s(d.nombres),
          motivos: JSON.parse(String(d.motivos)) as string[],
        })),
      })),
      decisiones: (decisionesPor.get(id(v.id)) ?? []).map((k) => ({
        asignacionId: id(k.asignacion_id),
        accion: k.accion as "reabierta" | "sin_accion",
        fecha: iso(k.fecha),
        autor: s(k.autor),
        ...opcionales({ nota: s(k.nota), plazo: k.plazo ? iso(k.plazo) : "" }),
      })),
    })),
  };
}
