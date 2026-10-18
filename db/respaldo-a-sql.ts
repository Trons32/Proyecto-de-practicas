/**
 * Convierte un respaldo JSON (el que descarga /admin/datos) en un script de
 * migración para SQL Server.
 *
 *   npx tsx db/respaldo-a-sql.ts <respaldo.json> [salida.sql]
 *
 * Se ejecuta sobre una base con esquema.sql y semilla.sql aplicados. Todo va
 * en una transacción: o migra entero o no migra nada.
 *
 * Antes de escribir una línea revisa el respaldo contra lo que la base va a
 * exigir, y se detiene con un mensaje legible. Es mejor que el administrador
 * corrija en la aplicación a que el DBA descifre un error de FK a mitad de
 * la migración.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { leerRespaldo, type Respaldo } from "../src/lib/datos/respaldo";
import { CONTRATOS, PROGRAMAS, ROLES } from "../src/lib/catalogos";

// ── Literales T-SQL ───────────────────────────────────────────

/** Texto Unicode; la cadena vacía de la aplicación es "sin dato": NULL. */
const txt = (s: string | null | undefined) =>
  s === null || s === undefined || s === "" ? "NULL" : `N'${s.replace(/'/g, "''")}'`;
const num = (v: number | null | undefined) =>
  v === null || v === undefined || Number.isNaN(v) ? "NULL" : String(v);
const bit = (b: boolean) => (b ? "1" : "0");

/**
 * La aplicación genera UUID, salvo en contextos no seguros (http fuera de
 * localhost), donde cae a un id corto. UNIQUEIDENTIFIER no lo acepta: se le
 * asigna un UUID estable para que todas sus referencias sigan apuntando igual.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ids = new Map<string, string>();
const uid = (id: string) => {
  if (UUID.test(id)) return `'${id}'`;
  if (!ids.has(id)) ids.set(id, randomUUID());
  return `'${ids.get(id)}'`;
};

// ── Revisión previa ───────────────────────────────────────────

function revisar(r: Respaldo): string[] {
  const problemas: string[] = [];
  const { asignaciones, configuracion, novedades } = r.datos;
  const programas = new Set(PROGRAMAS.map((p) => p.nombre));
  const rolesConocidos = new Set([...ROLES.map((x) => x.id), ...configuracion.roles.map((x) => x.id)]);

  for (const a of asignaciones) {
    const donde = `Asignación ${a.programa || "(sin programa)"} ${a.periodo}`;
    if (!programas.has(a.programa)) problemas.push(`${donde}: el programa no está en el catálogo.`);
    if (!/^\d{4}-[12]$/.test(a.periodo)) problemas.push(`${donde}: periodo mal formado.`);

    const documentos = new Set<string>();
    a.docentes.forEach((d, i) => {
      const quien = `${donde}, docente ${i + 1} (${d.nombres || "sin nombre"})`;
      // La cascada, en el mismo orden en que el formulario la llena.
      if (d.tipoContrato && !CONTRATOS[d.tipoContrato]) {
        problemas.push(`${quien}: el contrato ${d.tipoContrato} no existe.`);
      } else if (d.dedicacion && !d.tipoContrato) {
        problemas.push(`${quien}: tiene dedicación pero no contrato.`);
      } else if (d.categoria && !d.dedicacion) {
        problemas.push(`${quien}: tiene categoría pero no dedicación.`);
      } else if (d.dedicacion && !CONTRATOS[d.tipoContrato][d.dedicacion]) {
        problemas.push(`${quien}: la dedicación ${d.dedicacion} no corresponde a ${d.tipoContrato}.`);
      } else if (d.categoria && !CONTRATOS[d.tipoContrato][d.dedicacion].includes(d.categoria)) {
        problemas.push(`${quien}: ${d.tipoContrato} · ${d.dedicacion} · ${d.categoria} no es una combinación del formato.`);
      }
      const doc = d.documento.trim();
      if (/^\d{6,15}$/.test(doc)) {
        if (documentos.has(doc)) problemas.push(`${quien}: el documento ${doc} está repetido en la asignación.`);
        documentos.add(doc);
      }
      for (const x of [...d.descargas, ...d.administrativas]) {
        if (x.rolId !== null && !rolesConocidos.has(x.rolId)) {
          problemas.push(`${quien}: usa el rol ${x.rolId}, que ya no existe. Elija otro rol en la aplicación.`);
        }
      }
    });
  }

  for (const n of novedades) {
    if (n.periodo && !/^\d{4}-[12]$/.test(n.periodo)) problemas.push(`Novedad ${n.numero}: periodo mal formado.`);
  }
  return problemas;
}

// ── Generación ────────────────────────────────────────────────

function generar(r: Respaldo): string {
  const { asignaciones, configuracion: c, novedades } = r.datos;
  const l: string[] = [];
  const sec = (t: string) => l.push("", `-- ${t}`);

  l.push(
    "/*",
    "  Migración de Asignación Académica · CECAR",
    `  Respaldo exportado por ${r.exportadoPor} el ${r.exportado}.`,
    "  GENERADO por db/respaldo-a-sql.ts. Ejecutar sobre esquema.sql + semilla.sql.",
    "*/",
    "SET NOCOUNT ON;",
    "SET QUOTED_IDENTIFIER ON; -- los índices filtrados lo exigen",
    "SET XACT_ABORT ON;",
    "BEGIN TRANSACTION;"
  );

  sec("Parametrización vigente");
  for (const [ded, g] of Object.entries(c.reglas)) {
    l.push(
      `UPDATE aa.regla_dedicacion SET max_horas = ${g.maxHoras}, preparacion = ${g.preparacion}, atencion = ${g.atencion}, comunidades = ${g.comunidades} WHERE dedicacion = ${txt(ded)};`
    );
  }
  l.push(
    `UPDATE aa.limite SET max_cursos = ${c.limites.maxCursos}, max_descargas = ${c.limites.maxDescargas}, max_administrativas = ${c.limites.maxAdministrativas} WHERE id = 1;`
  );
  // Roles: los del respaldo quedan vigentes; los de la semilla que la
  // aplicación eliminó, no vigentes (las cerradas pueden seguir usándolos).
  for (const rol of c.roles) {
    l.push(
      `MERGE aa.rol AS t USING (VALUES (${rol.id}, ${txt(rol.nombre)}, '${rol.tipo}', ${bit(Boolean(rol.reclasificado))})) AS s (id, nombre, tipo, reclasificado) ON t.id = s.id ` +
        `WHEN MATCHED THEN UPDATE SET nombre = s.nombre, tipo = s.tipo, vigente = 1 ` +
        `WHEN NOT MATCHED THEN INSERT (id, nombre, tipo, reclasificado) VALUES (s.id, s.nombre, s.tipo, s.reclasificado);`
    );
  }
  l.push(`UPDATE aa.rol SET vigente = 0 WHERE id NOT IN (${c.roles.map((x) => x.id).join(", ") || "NULL"});`);

  sec("Periodos y convocatorias");
  const periodos = new Set<string>([
    ...asignaciones.map((a) => a.periodo),
    ...Object.keys(c.convocatorias),
    ...novedades.flatMap((n) => (n.periodo ? [n.periodo] : [])),
    ...novedades.flatMap((n) => n.afectadas.map((a) => a.periodo)),
  ]);
  for (const p of [...periodos].sort()) {
    l.push(`IF NOT EXISTS (SELECT 1 FROM aa.periodo WHERE codigo = '${p}') INSERT INTO aa.periodo (codigo) VALUES ('${p}');`);
  }
  for (const v of Object.values(c.convocatorias)) {
    l.push(
      `INSERT INTO aa.convocatoria (periodo, apertura, limite, cerrada_manualmente) VALUES ('${v.periodo}', ${txt(v.apertura)}, ${txt(v.limite)}, ${bit(v.cerradaManualmente)});`
    );
  }

  sec("Docentes (personas), por documento");
  const personas = new Map<string, string>();
  for (const a of asignaciones) {
    for (const d of a.docentes) {
      const doc = d.documento.trim();
      // El nombre más reciente gana: las asignaciones vienen de la más nueva a la más vieja.
      if (/^\d{6,15}$/.test(doc) && !personas.has(doc)) personas.set(doc, d.nombres);
    }
  }
  for (const [doc, nombres] of personas) {
    l.push(`INSERT INTO aa.docente (documento, nombres) VALUES ('${doc}', ${txt(nombres) === "NULL" ? "N'—'" : txt(nombres)});`);
  }

  for (const a of asignaciones) {
    sec(`Asignación ${a.programa} ${a.periodo} (${a.estado})`);
    // plazo_correccion solo vale en en_correccion; fuera de ahí la aplicación lo ignora.
    const plazo = a.estado === "en_correccion" ? txt(a.plazoCorreccion) : "NULL";
    l.push(
      `INSERT INTO aa.asignacion (id, periodo, programa_id, estado, version, plazo_correccion, creada, actualizada) VALUES (${uid(a.id)}, '${a.periodo}', (SELECT id FROM aa.programa WHERE nombre = ${txt(a.programa)}), '${a.estado}', ${a.version}, ${plazo}, ${txt(a.creada)}, ${txt(a.actualizada)});`
    );

    a.docentes.forEach((d, i) => {
      const doc = d.documento.trim();
      const persona = /^\d{6,15}$/.test(doc) ? `(SELECT id FROM aa.docente WHERE documento = '${doc}')` : "NULL";
      l.push(
        `INSERT INTO aa.docente_asignado (id, asignacion_id, docente_id, orden, documento, nombres, nivel_formacion, perfil_profesional, categoria_minciencias, activo_sector_externo, sector_ejerce, tipo_contrato, dedicacion, categoria, sede, evaluacion_docente, observaciones, preparacion, atencion, comunidades) VALUES (` +
          [
            uid(d.id), uid(a.id), persona, i + 1, txt(doc), txt(d.nombres), txt(d.nivelFormacion),
            txt(d.perfilProfesional), txt(d.categoriaMinciencias), txt(d.activoSectorExterno),
            txt(d.sectorEjerce), txt(d.tipoContrato), txt(d.dedicacion), txt(d.categoria), txt(d.sede),
            num(d.evaluacionDocente), txt(d.observaciones), num(d.preparacion), num(d.atencion), num(d.comunidades),
          ].join(", ") +
          ");"
      );
      d.cursos.forEach((k, j) => {
        l.push(
          `INSERT INTO aa.curso_asignado (id, docente_asignado_id, orden, codigo_programa, nombre_programa, codigo_pensum, codigo_curso, nombre_curso, semestre, grupo, jornada, intensidad_horaria, creditos, estudiantes, modalidad) VALUES (` +
            [
              uid(k.id), uid(d.id), j + 1, txt(k.codigoPrograma), txt(k.nombrePrograma), txt(k.codigoPensum),
              txt(k.codigoCurso), txt(k.nombreCurso), num(k.semestre), txt(k.grupo), txt(k.jornada),
              num(k.intensidadHoraria), num(k.creditos), num(k.estudiantes), txt(k.modalidad),
            ].join(", ") +
            ");"
        );
      });
      const actividades = [
        ...d.descargas.map((x) => ({ ...x, clase: "DESCARGA" })),
        ...d.administrativas.map((x) => ({ ...x, clase: "ADMINISTRATIVA" })),
      ];
      actividades.forEach((x, j) => {
        l.push(
          `INSERT INTO aa.actividad (id, docente_asignado_id, clase, orden, rol_id, horas) VALUES (${uid(x.id)}, ${uid(d.id)}, '${x.clase}', ${j + 1}, ${num(x.rolId)}, ${num(x.horas)});`
        );
      });
    });
  }

  // Antes que la bitácora: los eventos de reapertura apuntan a su novedad.
  sec("Novedades");
  for (const n of novedades) {
    l.push(
      `INSERT INTO aa.novedad (id, numero, fecha, autor, rol_autor, periodo, con_convocatoria_cerrada, motivo) VALUES (${uid(n.id)}, ${n.numero}, ${txt(n.fecha)}, ${txt(n.autor)}, '${n.rolAutor}', ${n.periodo ? `'${n.periodo}'` : "NULL"}, ${bit(n.conConvocatoriaCerrada)}, ${txt(n.motivo)});`
    );
    n.cambios.forEach((k, j) => {
      l.push(
        `INSERT INTO aa.novedad_cambio (novedad_id, orden, ambito, parametro, antes, despues) VALUES (${uid(n.id)}, ${j + 1}, '${k.ambito}', ${txt(k.parametro)}, ${txt(k.antes)}, ${txt(k.despues)});`
      );
    });
    for (const f of n.afectadas) {
      l.push(
        `INSERT INTO aa.novedad_afectacion (novedad_id, asignacion_id, programa, facultad, periodo, errores_antes, errores_ahora) VALUES (${uid(n.id)}, ${uid(f.asignacionId)}, ${txt(f.programa)}, ${txt(f.facultad)}, '${f.periodo}', ${f.erroresAntes}, ${f.erroresAhora});`
      );
      f.docentes.forEach((d, j) => {
        l.push(
          `INSERT INTO aa.novedad_afectacion_docente (novedad_id, asignacion_id, orden, nombres, motivos) VALUES (${uid(n.id)}, ${uid(f.asignacionId)}, ${j + 1}, ${txt(d.nombres)}, ${txt(JSON.stringify(d.motivos))});`
        );
      });
    }
    for (const k of n.decisiones) {
      l.push(
        `INSERT INTO aa.novedad_decision (novedad_id, asignacion_id, accion, fecha, autor, nota, plazo) VALUES (${uid(n.id)}, ${uid(k.asignacionId)}, '${k.accion}', ${txt(k.fecha)}, ${txt(k.autor)}, ${txt(k.nota)}, ${txt(k.plazo)});`
      );
    }
  }

  sec("Bitácora");
  for (const a of asignaciones) {
    for (const e of a.bitacora) {
      l.push(
        `INSERT INTO aa.evento_asignacion (id, asignacion_id, tipo, fecha, autor, rol_autor, nota, plazo, version, novedad_id) VALUES (${uid(e.id)}, ${uid(a.id)}, '${e.tipo}', ${txt(e.fecha)}, ${txt(e.autor)}, '${e.rolAutor}', ${txt(e.nota)}, ${txt(e.plazo)}, ${num(e.version)}, ${e.novedadId ? uid(e.novedadId) : "NULL"});`
      );
    }
  }

  l.push("", "COMMIT TRANSACTION;", "");
  return l.join("\n");
}

// ── Principal ─────────────────────────────────────────────────

const [entrada, salida = "db/migracion.sql"] = process.argv.slice(2);
if (!entrada) {
  console.error("Uso: npx tsx db/respaldo-a-sql.ts <respaldo.json> [salida.sql]");
  process.exit(1);
}

const lectura = leerRespaldo(readFileSync(entrada, "utf8"));
if (!lectura.ok) {
  console.error(`✗ ${lectura.error}`);
  process.exit(1);
}

const problemas = revisar(lectura.respaldo);
if (problemas.length > 0) {
  console.error("✗ El respaldo tiene datos que la base rechazaría. Corríjalos en la aplicación:\n");
  for (const p of problemas) console.error(`  · ${p}`);
  process.exit(1);
}

writeFileSync(salida, generar(lectura.respaldo), "utf8");
const d = lectura.respaldo.datos;
console.log(
  `✓ ${salida}: ${d.asignaciones.length} asignaciones, ` +
    `${d.asignaciones.reduce((s, a) => s + a.docentes.length, 0)} docentes, ${d.novedades.length} novedades.` +
    (ids.size ? ` ${ids.size} ids no-UUID recibieron uno nuevo.` : "")
);
