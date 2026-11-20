/**
 * Corre todas las verificaciones que no tocan la base:
 *
 *   npm run verificar
 *
 * Las que leen un Excel real se corren si el archivo está en la carpeta de
 * arriba (donde viven los formatos); si no, se dicen omitidas, no pasadas.
 * `verificar-sql.ts` no entra: escribe en la base y exige una de prueba.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const formato = resolve("..", "ASIGNACION_IS_2026_2PV3 (1).xlsx");
const listado = resolve("..", "LISTADO DOCENTES CODIFICADO.xlsx");

const pruebas: { archivo: string; args?: string[]; requiere?: string }[] = [
  { archivo: "src/lib/verificar.ts" },
  { archivo: "src/lib/verificar-transiciones.ts" },
  { archivo: "src/lib/verificar-novedades.ts" },
  { archivo: "src/lib/verificar-respaldo.ts" },
  { archivo: "src/lib/verificar-reportes.ts" },
  { archivo: "src/lib/verificar-cursos.ts" },
  { archivo: "src/lib/verificar-criterios.ts" },
  { archivo: "src/lib/verificar-alcance.ts" },
  { archivo: "src/lib/servidor/verificar-sesion.ts" },
  { archivo: "src/lib/verificar-importacion.ts", args: [formato], requiere: formato },
  { archivo: "src/lib/verificar-directorio.ts", args: [listado], requiere: listado },
];

let fallidas = 0;
for (const p of pruebas) {
  if (p.requiere && !existsSync(p.requiere)) {
    console.log(`– ${p.archivo}: omitida (falta ${p.requiere})`);
    continue;
  }
  // Con shell (lo exige npx en Windows) las rutas con espacios van entre comillas.
  const r = spawnSync("npx", ["tsx", p.archivo, ...(p.args ?? []).map((x) => `"${x}"`)], { encoding: "utf8", shell: true });
  const salida = `${r.stdout}${r.stderr}`;
  const ultima = salida.trim().split("\n").at(-1) ?? "";
  if (r.status === 0) console.log(`✓ ${p.archivo}  ${ultima.replace(/^✓\s*/, "")}`);
  else {
    fallidas++;
    console.log(`✗ ${p.archivo}\n${salida.split("\n").filter((l) => l.startsWith("✗") || /error/i.test(l)).join("\n")}`);
  }
}

console.log(fallidas === 0 ? "\n✓ Todas las verificaciones pasan." : `\n✗ ${fallidas} verificaciones fallan.`);
process.exit(fallidas === 0 ? 0 : 1);
