/**
 * Genera db/semilla.sql desde src/lib/catalogos.ts.
 *
 *   npx tsx db/generar-semilla.ts
 *
 * La semilla no se escribe a mano por la misma razón que el catálogo no se
 * edita a mano: la fuente de verdad es el formato oficial, ya volcado en
 * catalogos.ts. Si el catálogo cambia, se vuelve a generar.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONTRATOS,
  FACULTADES,
  MAX_ADMINISTRATIVAS,
  MAX_CURSOS,
  MAX_DESCARGAS,
  PROGRAMAS,
  REGLAS_DEDICACION,
  ROLES,
} from "../src/lib/catalogos";

/** Literal Unicode de T-SQL, con las comillas escapadas. */
const n = (s: string) => `N'${s.replace(/'/g, "''")}'`;
const nulo = (s?: string) => (s ? n(s) : "NULL");

const unicos = <T>(xs: T[]) => [...new Set(xs)];

const dedicaciones = unicos(Object.values(CONTRATOS).flatMap((d) => Object.keys(d)));
const categorias = unicos(Object.values(CONTRATOS).flatMap((d) => Object.values(d).flat()));
const ternas = Object.entries(CONTRATOS).flatMap(([contrato, porDedicacion]) =>
  Object.entries(porDedicacion).flatMap(([dedicacion, cats]) =>
    cats.map((categoria) => [contrato, dedicacion, categoria])
  )
);

const bloque = (titulo: string, filas: string[]) =>
  filas.length ? `-- ${titulo}\n${filas.join("\n")}\n` : "";

const sql = [
  `/*
  Asignación Académica · CECAR — datos iniciales (SQL Server).
  GENERADO por db/generar-semilla.ts desde src/lib/catalogos.ts. No editar a mano.
  Ejecutar después de db/esquema.sql.
*/
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;
`,
  bloque("Facultades", FACULTADES.map((f) => `INSERT INTO aa.facultad (codigo) VALUES (${n(f)});`)),
  bloque(
    "Programas",
    PROGRAMAS.map(
      (p) =>
        `INSERT INTO aa.programa (nombre, facultad, codigo) VALUES (${n(p.nombre)}, ${n(p.facultad)}, ${nulo(p.codigo)});`
    )
  ),
  bloque("Tipos de contrato", Object.keys(CONTRATOS).map((c) => `INSERT INTO aa.tipo_contrato (codigo) VALUES (${n(c)});`)),
  bloque("Dedicaciones", dedicaciones.map((d) => `INSERT INTO aa.dedicacion (codigo) VALUES (${n(d)});`)),
  bloque("Categorías", categorias.map((c) => `INSERT INTO aa.categoria (codigo) VALUES (${n(c)});`)),
  bloque(
    `Cascada contrato → dedicación → categoría (${ternas.length} combinaciones, SPEC-001)`,
    ternas.map(
      ([c, d, k]) =>
        `INSERT INTO aa.contrato_dedicacion_categoria (tipo_contrato, dedicacion, categoria) VALUES (${n(c)}, ${n(d)}, ${n(k)});`
    )
  ),
  bloque(
    "Reglas por dedicación",
    Object.entries(REGLAS_DEDICACION).map(
      ([d, r]) =>
        `INSERT INTO aa.regla_dedicacion (dedicacion, max_horas, preparacion, atencion, comunidades) VALUES (${n(d)}, ${r.maxHoras}, ${r.preparacion}, ${r.atencion}, ${r.comunidades});`
    )
  ),
  bloque("Límites", [
    `INSERT INTO aa.limite (id, max_cursos, max_descargas, max_administrativas) VALUES (1, ${MAX_CURSOS}, ${MAX_DESCARGAS}, ${MAX_ADMINISTRATIVAS});`,
  ]),
  bloque(
    "Roles del formato oficial",
    ROLES.map(
      (r) =>
        `INSERT INTO aa.rol (id, nombre, tipo, reclasificado) VALUES (${r.id}, ${n(r.nombre)}, '${r.tipo}', ${r.reclasificado ? 1 : 0});`
    )
  ),
  "COMMIT TRANSACTION;\n",
].join("\n");

const destino = join(__dirname, "semilla.sql");
writeFileSync(destino, sql, "utf8");
console.log(`✓ ${destino}: ${ternas.length} combinaciones, ${ROLES.length} roles, ${PROGRAMAS.length} programas.`);
