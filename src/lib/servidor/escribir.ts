/**
 * Del dominio a las tablas. Cada guardado va en una transacción: o entra
 * entero o no entra nada.
 *
 * Recibe solo lo que cambió (ver SPEC-006): las asignaciones tocadas, los
 * ids eliminados, las novedades nuevas o con decisiones nuevas. Lo que no
 * viene no se toca, para que un cliente no borre lo que otro creó.
 */
import type { ReglaDedicacion, Rol } from "../catalogos";
import type { Convocatoria } from "../convocatoria";
import type { Limites, Novedad } from "../novedades";
import type { Asignacion } from "../tipos";
import { ejecutor, pool, sql, type Ejecutar } from "./bd";
import { revisarBorrado, revisarGuardado, type Actor } from "../transiciones";
import { aUuid } from "./ids";
import { leerAsignaciones } from "./leer";

async function enTransaccion<T>(trabajo: (ejecutar: Ejecutar) => Promise<T>): Promise<T> {
  const tx = new sql.Transaction(await pool());
  await tx.begin();
  const ejecutar = ejecutor(() => new sql.Request(tx));
  try {
    const resultado = await trabajo(ejecutar);
    await tx.commit();
    return resultado;
  } catch (e) {
    await tx.rollback().catch(() => {});
    throw e;
  }
}

const asegurarPeriodo = (ejecutar: Ejecutar, periodo: string) =>
  ejecutar(`IF NOT EXISTS (SELECT 1 FROM aa.periodo WHERE codigo = ?) INSERT INTO aa.periodo (codigo) VALUES (?)`, periodo, periodo);

/** Un error que el usuario puede corregir en la aplicación, no un fallo del servidor. */
export class DatoRechazado extends Error {}

/**
 * El cambio no respeta el ciclo de vida (SPEC-007). Casi siempre significa
 * que otro usuario movió la asignación mientras tanto: el cliente tiene una
 * copia vieja y debe recargar.
 */
export class CambioRechazado extends Error {}

export async function guardarAsignaciones(asignaciones: Asignacion[], borrados: string[], actor?: Actor) {
  await enTransaccion(async (ejecutar) => {
    // Bloqueadas hasta el commit: dos administradores que aprueban y
    // devuelven a la vez se validan uno después del otro, no los dos contra
    // el mismo estado viejo.
    const ids = [...asignaciones.map((a) => aUuid(a.id)), ...borrados.map(aUuid)];
    await ejecutar(
      `SELECT id FROM aa.asignacion WITH (UPDLOCK, HOLDLOCK)
       WHERE id IN (SELECT CAST(value AS UNIQUEIDENTIFIER) FROM OPENJSON(?))`,
      JSON.stringify(ids)
    );
    const guardadas = new Map(
      (await leerAsignaciones({ ids, ejecutar })).asignaciones.map((a) => [a.id, a])
    );

    for (const idBorrado of borrados) {
      const problema = revisarBorrado(guardadas.get(aUuid(idBorrado)));
      if (problema) throw new CambioRechazado(problema);
      await ejecutar(`DELETE FROM aa.asignacion WHERE id = ?`, aUuid(idBorrado));
    }
    for (const a of asignaciones) {
      const problema = revisarGuardado(guardadas.get(aUuid(a.id)), a, actor);
      if (problema) throw new CambioRechazado(`${a.programa} ${a.periodo}: ${problema}`);
    }

    for (const a of asignaciones) {
      const programa = await ejecutar(`SELECT id FROM aa.programa WHERE nombre = ?`, a.programa);
      if (!programa.recordset[0]) throw new DatoRechazado(`El programa «${a.programa}» no está en el catálogo.`);
      const programaId = programa.recordset[0].id;
      const asigId = aUuid(a.id);

      await asegurarPeriodo(ejecutar, a.periodo);
      await ejecutar(
        `MERGE aa.asignacion AS t
         USING (SELECT ? AS id) AS s ON t.id = s.id
         WHEN MATCHED THEN UPDATE SET periodo = ?, programa_id = ?, estado = ?, version = ?, plazo_correccion = ?, creada = ?, actualizada = ?
         WHEN NOT MATCHED THEN INSERT (id, periodo, programa_id, estado, version, plazo_correccion, creada, actualizada)
           VALUES (s.id, ?, ?, ?, ?, ?, ?, ?);`,
        asigId,
        ...Array(2).fill([
          a.periodo, programaId, a.estado, a.version,
          // Fuera de en_correccion la aplicación ignora el plazo; la base lo prohíbe.
          a.estado === "en_correccion" ? a.plazoCorreccion : null,
          a.creada, a.actualizada,
        ]).flat()
      );

      // Los docentes son parte de la asignación: se reescriben enteros, y la
      // cascada se lleva sus cursos y actividades.
      await ejecutar(`DELETE FROM aa.docente_asignado WHERE asignacion_id = ?`, asigId);

      const enlazados = new Set<string>();
      for (const [i, d] of a.docentes.entries()) {
        const doc = d.documento.trim();
        let personaId: string | null = null;
        // Un documento repetido en un borrador no bloquea el guardado: el
        // segundo queda sin enlazar hasta que el coordinador lo corrija.
        if (/^\d{6,15}$/.test(doc) && !enlazados.has(doc)) {
          enlazados.add(doc);
          const persona = await ejecutar(
            `MERGE aa.docente AS t USING (SELECT ? AS documento) AS s ON t.documento = s.documento
             WHEN MATCHED THEN UPDATE SET nombres = ?
             WHEN NOT MATCHED THEN INSERT (documento, nombres) VALUES (s.documento, ?)
             OUTPUT inserted.id;`,
            doc, d.nombres.trim() || "—", d.nombres.trim() || "—"
          );
          personaId = String(persona.recordset[0].id);
        }

        const daId = aUuid(d.id);
        await ejecutar(
          `INSERT INTO aa.docente_asignado (id, asignacion_id, docente_id, orden, documento, nombres, nivel_formacion,
             perfil_profesional, categoria_minciencias, activo_sector_externo, sector_ejerce, tipo_contrato, dedicacion,
             categoria, sede, evaluacion_docente, observaciones, preparacion, atencion, comunidades)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          daId, asigId, personaId, i + 1, doc, d.nombres, d.nivelFormacion, d.perfilProfesional,
          d.categoriaMinciencias, d.activoSectorExterno, d.sectorEjerce, d.tipoContrato, d.dedicacion,
          d.categoria, d.sede, d.evaluacionDocente, d.observaciones, d.preparacion, d.atencion, d.comunidades
        );

        for (const [j, k] of d.cursos.entries()) {
          await ejecutar(
            `INSERT INTO aa.curso_asignado (id, docente_asignado_id, orden, codigo_programa, nombre_programa, codigo_pensum,
               codigo_curso, nombre_curso, semestre, grupo, jornada, intensidad_horaria, creditos, estudiantes, modalidad)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            aUuid(k.id), daId, j + 1, k.codigoPrograma, k.nombrePrograma, k.codigoPensum, k.codigoCurso,
            k.nombreCurso, k.semestre, k.grupo, k.jornada, k.intensidadHoraria, k.creditos, k.estudiantes, k.modalidad
          );
        }

        const actividades = [
          ...d.descargas.map((x) => ({ ...x, clase: "DESCARGA" })),
          ...d.administrativas.map((x) => ({ ...x, clase: "ADMINISTRATIVA" })),
        ];
        for (const [j, x] of actividades.entries()) {
          await ejecutar(
            `INSERT INTO aa.actividad (id, docente_asignado_id, clase, orden, rol_id, horas) VALUES (?, ?, ?, ?, ?, ?)`,
            aUuid(x.id), daId, x.clase, j + 1, x.rolId, x.horas
          );
        }
      }

      // La bitácora solo crece: se insertan los eventos que la base no tiene.
      for (const e of a.bitacora) {
        await ejecutar(
          `IF NOT EXISTS (SELECT 1 FROM aa.evento_asignacion WHERE id = ?)
           INSERT INTO aa.evento_asignacion (id, asignacion_id, tipo, fecha, autor, rol_autor, nota, plazo, version, novedad_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          aUuid(e.id), aUuid(e.id), asigId, e.tipo, e.fecha, e.autor, e.rolAutor, e.nota, e.plazo, e.version,
          e.novedadId ? aUuid(e.novedadId) : null
        );
      }

      // La línea base se escribe una sola vez: `transiciones.ts` ya
      // comprobó que no cambió, y la tabla no admite UPDATE.
      if (a.lineaBase) {
        const yaEsta = await ejecutar(`SELECT linea_base_fecha FROM aa.asignacion WHERE id = ?`, asigId);
        if (!yaEsta.recordset[0]?.linea_base_fecha) {
          await ejecutar(
            `UPDATE aa.asignacion SET linea_base_fecha = ?, linea_base_version = ? WHERE id = ?`,
            a.lineaBase.fecha, a.lineaBase.version, asigId
          );
          for (const [i, k] of a.lineaBase.cursos.entries()) {
            await ejecutar(
              `INSERT INTO aa.linea_base_curso (asignacion_id, orden, curso_id, docente_id, docente, codigo_curso,
                 nombre_curso, semestre, grupo, intensidad_horaria, estudiantes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              asigId, i + 1, aUuid(k.id), aUuid(k.docenteId), k.docente, k.codigoCurso, k.nombreCurso,
              k.semestre, k.grupo, k.intensidadHoraria, k.estudiantes
            );
          }
        }
      }
    }
  });
}

export async function guardarConfiguracion(c: {
  reglas: Record<string, ReglaDedicacion>;
  roles: Rol[];
  limites: Limites;
  convocatorias: Record<string, Convocatoria>;
}) {
  await enTransaccion(async (ejecutar) => {
    for (const [dedicacion, g] of Object.entries(c.reglas)) {
      await ejecutar(
        `UPDATE aa.regla_dedicacion SET max_horas = ?, preparacion = ?, atencion = ?, comunidades = ? WHERE dedicacion = ?`,
        g.maxHoras, g.preparacion, g.atencion, g.comunidades, dedicacion
      );
    }
    await ejecutar(
      `UPDATE aa.limite SET max_cursos = ?, max_descargas = ?, max_administrativas = ? WHERE id = 1`,
      c.limites.maxCursos, c.limites.maxDescargas, c.limites.maxAdministrativas
    );

    // Los roles que la aplicación quitó no se borran: las asignaciones
    // cerradas los siguen referenciando. Se marcan no vigentes antes del
    // MERGE para que un nombre liberado pueda reutilizarse sin chocar.
    await ejecutar(`UPDATE aa.rol SET vigente = 0`);
    for (const r of c.roles) {
      await ejecutar(
        `MERGE aa.rol AS t USING (SELECT ? AS id) AS s ON t.id = s.id
         WHEN MATCHED THEN UPDATE SET nombre = ?, tipo = ?, reclasificado = ?, vigente = 1
         WHEN NOT MATCHED THEN INSERT (id, nombre, tipo, reclasificado) VALUES (s.id, ?, ?, ?);`,
        r.id, r.nombre, r.tipo, Boolean(r.reclasificado), r.nombre, r.tipo, Boolean(r.reclasificado)
      );
    }

    for (const v of Object.values(c.convocatorias)) {
      await asegurarPeriodo(ejecutar, v.periodo);
      await ejecutar(
        `MERGE aa.convocatoria AS t USING (SELECT ? AS periodo) AS s ON t.periodo = s.periodo
         WHEN MATCHED THEN UPDATE SET apertura = ?, limite = ?, cerrada_manualmente = ?
         WHEN NOT MATCHED THEN INSERT (periodo, apertura, limite, cerrada_manualmente) VALUES (s.periodo, ?, ?, ?);`,
        v.periodo, v.apertura, v.limite, v.cerradaManualmente, v.apertura, v.limite, v.cerradaManualmente
      );
    }
  });
}

/** Las novedades solo se añaden; de una existente solo pueden llegar decisiones nuevas. */
export async function guardarNovedades(novedades: Novedad[]) {
  await enTransaccion(async (ejecutar) => {
    for (const n of novedades) {
      const nId = aUuid(n.id);
      const existe = await ejecutar(`SELECT 1 AS si FROM aa.novedad WHERE id = ?`, nId);

      if (!existe.recordset[0]) {
        if (n.periodo) await asegurarPeriodo(ejecutar, n.periodo);
        await ejecutar(
          `INSERT INTO aa.novedad (id, numero, fecha, autor, rol_autor, periodo, con_convocatoria_cerrada, motivo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          nId, n.numero, n.fecha, n.autor, n.rolAutor, n.periodo, n.conConvocatoriaCerrada, n.motivo
        );
        for (const [j, k] of n.cambios.entries()) {
          await ejecutar(
            `INSERT INTO aa.novedad_cambio (novedad_id, orden, ambito, parametro, antes, despues) VALUES (?, ?, ?, ?, ?, ?)`,
            nId, j + 1, k.ambito, k.parametro, k.antes, k.despues
          );
        }
        for (const f of n.afectadas) {
          await ejecutar(
            `INSERT INTO aa.novedad_afectacion (novedad_id, asignacion_id, programa, facultad, periodo, errores_antes, errores_ahora)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            nId, aUuid(f.asignacionId), f.programa, f.facultad, f.periodo, f.erroresAntes, f.erroresAhora
          );
          for (const [j, d] of f.docentes.entries()) {
            await ejecutar(
              `INSERT INTO aa.novedad_afectacion_docente (novedad_id, asignacion_id, orden, nombres, motivos) VALUES (?, ?, ?, ?, ?)`,
              nId, aUuid(f.asignacionId), j + 1, d.nombres || "—", JSON.stringify(d.motivos)
            );
          }
        }
      }

      // Las decisiones solo se suman, en orden: las que la base ya tiene
      // son las primeras de la lista.
      const previas = await ejecutar(`SELECT COUNT(*) AS total FROM aa.novedad_decision WHERE novedad_id = ?`, nId);
      for (const k of n.decisiones.slice(Number(previas.recordset[0].total))) {
        await ejecutar(
          `INSERT INTO aa.novedad_decision (novedad_id, asignacion_id, accion, fecha, autor, nota, plazo) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          nId, aUuid(k.asignacionId), k.accion, k.fecha, k.autor, k.nota, k.plazo
        );
      }
    }
  });
}
