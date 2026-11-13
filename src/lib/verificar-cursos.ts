/**
 * Prueba de los cursos conocidos (SPEC-019).
 *
 *   npx tsx src/lib/verificar-cursos.ts
 */
import { GRUPOS } from "./catalogos";
import { buscarFicha, catalogoDeCursos, completarCurso, fichasDePrograma, grupoSiguiente, resumenCurso } from "./cursos-conocidos";
import { nuevoCurso, type Asignacion, type Curso } from "./tipos";

let fallos = 0;
const comprobar = (nombre: string, ok: boolean, detalle?: unknown) => {
  if (ok) console.log(`✓ ${nombre}`);
  else {
    fallos++;
    console.error(`✗ ${nombre}`, detalle ?? "");
  }
};

const SIS = "INGENIERÍA DE SISTEMAS";
const IND = "INGENIERÍA INDUSTRIAL";
const curso = (c: Partial<Curso>): Curso => ({ ...nuevoCurso(), nombrePrograma: SIS, ...c });
const asignacion = (periodo: string, cursos: Curso[]) =>
  ({ periodo, docentes: [{ cursos }] }) as unknown as Asignacion;

const catalogo = catalogoDeCursos([
  asignacion("2025-2", [
    curso({ nombreCurso: "redes de computadores i", codigoCurso: "4623", codigoPensum: "A100", semestre: 6, intensidadHoraria: 4, creditos: 3 }),
    curso({ nombreCurso: "CÁLCULO I", codigoCurso: "1001", semestre: 1, intensidadHoraria: 4, creditos: 4 }),
  ]),
  asignacion("2026-1", [
    // Más reciente: el pensum cambió.
    curso({ nombreCurso: "REDES DE COMPUTADORES I", codigoCurso: "4623", codigoPensum: "A272", semestre: 6, intensidadHoraria: 4, creditos: 3 }),
    // Reciente pero con huecos: no debe tapar la ficha completa de 2025-2.
    curso({ nombreCurso: "CÁLCULO I" }),
    curso({ nombreCurso: "CÁLCULO I", nombrePrograma: IND, codigoCurso: "2001", creditos: 3 }),
    curso({ nombreCurso: "  " }),
  ]),
]);

comprobar("una ficha por programa y nombre, sin vacíos", catalogo.length === 3, catalogo);
const redes = buscarFicha(fichasDePrograma(catalogo, SIS), { nombreCurso: "redes de computadores i " });
comprobar("gana el periodo más reciente", redes?.codigoPensum === "A272", redes);
const calculo = buscarFicha(fichasDePrograma(catalogo, SIS), { nombreCurso: "CÁLCULO I" });
comprobar("la reciente con huecos no tapa una completa", calculo?.creditos === 4 && calculo.codigoCurso === "1001", calculo);
comprobar("el mismo nombre en otro programa es otro curso", buscarFicha(fichasDePrograma(catalogo, IND), { nombreCurso: "CÁLCULO I" })?.creditos === 3);
comprobar("sin fichas del programa, sugiere todas", fichasDePrograma(catalogo, "DERECHO").length === 3);
comprobar("se busca también por código", buscarFicha(catalogo, { codigoCurso: "4623" })?.nombreCurso === "REDES DE COMPUTADORES I");
comprobar("un nombre a medio escribir no completa nada", buscarFicha(catalogo, { nombreCurso: "REDES" }) === undefined);

const escrito = curso({ nombreCurso: "REDES DE COMPUTADORES I", creditos: 2, grupo: "3", jornada: "NOCTURNA" });
const cambios = completarCurso(escrito, redes!);
comprobar("completa lo vacío", cambios.codigoCurso === "4623" && cambios.semestre === 6 && cambios.intensidadHoraria === 4, cambios);
comprobar("no pisa lo escrito a mano", !("creditos" in cambios) && !("nombreCurso" in cambios), cambios);
comprobar("no toca grupo, jornada ni programa", !("grupo" in cambios) && !("jornada" in cambios) && !("nombrePrograma" in cambios));
const porCodigo = completarCurso(curso({ codigoCurso: "4623" }), redes!);
comprobar("por código, también llena el nombre", porCodigo.nombreCurso === "REDES DE COMPUTADORES I");

comprobar("duplicar: el grupo siguiente", grupoSiguiente("1", GRUPOS) === "2");
comprobar("duplicar: sin grupo o en el último, queda por elegir", grupoSiguiente("", GRUPOS) === "" && grupoSiguiente(GRUPOS.at(-1)!, GRUPOS) === "");

const resumen = resumenCurso(curso({ codigoCurso: "4623", semestre: 6, grupo: "1", jornada: "DIURNA", modalidad: "PRESENCIAL", intensidadHoraria: 4, creditos: 3, estudiantes: 35 }));
comprobar("resumen de una línea", resumen.join(" · ") === "Cód. 4623 · Sem 6 · G1 · Diurna · Presencial · 4 h · 3 cr · 35 est.", resumen);
comprobar("el resumen omite lo vacío, pero no los ceros", resumenCurso(curso({ estudiantes: 0 })).join() === "0 est.");

console.log(fallos === 0 ? "\n✓ Cursos conocidos verificados." : `\n✗ ${fallos} fallos.`);
process.exit(fallos === 0 ? 0 : 1);
