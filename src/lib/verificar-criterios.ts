/**
 * Verificación de las versiones de los criterios (SPEC-025).
 *
 *   npx tsx src/lib/verificar-criterios.ts
 */
import { CRITERIOS, type Bloque, type SeccionCriterios } from "./criterios";
import { quitarFila, revisarContenido, seccionesCambiadas } from "./criterios-versiones";

let fallos = 0;
const comprobar = (nombre: string, ok: boolean, detalle?: unknown) => {
  if (ok) console.log(`✓ ${nombre}`);
  else {
    fallos++;
    console.error(`✗ ${nombre}`, detalle ?? "");
  }
};

const r = revisarContenido(CRITERIOS);
comprobar("la transcripción original es válida", r === null, r);
comprobar("cada sección original tiene modalidad", CRITERIOS.every((s) => s.modalidad));
comprobar("hay secciones de distancia y de virtual", ["distancia", "virtual"].every((m) => CRITERIOS.some((s) => s.modalidad === m)));

const copia = (): SeccionCriterios[] => structuredClone(CRITERIOS);
comprobar("vacío no es válido", revisarContenido([]) !== null);
comprobar("modalidad desconocida", revisarContenido([{ ...copia()[0], modalidad: "nocturna" }]) !== null);
comprobar("id repetido", revisarContenido([copia()[0], copia()[0]]) !== null);
comprobar("fila con celdas de menos", revisarContenido([
  { ...copia()[0], bloques: [{ tipo: "tabla", titulo: "T", columnas: ["a", "b"], filas: [["1"]] }] },
]) !== null);
comprobar("bloque desconocido", revisarContenido([{ ...copia()[0], bloques: [{ tipo: "imagen" } as unknown as Bloque] }]) !== null);

const editado = copia();
editado[1] = { ...editado[1], titulo: editado[1].titulo + " (ajustado)" };
editado.splice(2, 1);
editado.push({ id: "nueva", modalidad: "virtual", numero: "", titulo: "Nueva", bloques: [] });
const cambios = seccionesCambiadas(CRITERIOS, editado);
comprobar("detecta modificada, eliminada y agregada", cambios.map((c) => c.tipo).sort().join() === "agregada,eliminada,modificada", cambios);
comprobar("sin cambios no reporta nada", seccionesCambiadas(CRITERIOS, copia()).length === 0);

const tabla: Extract<Bloque, { tipo: "tabla" }> = {
  tipo: "tabla", titulo: "T", columnas: ["a"], filas: [["1"], ["2"], ["3"], ["4"]], grupos: { 1: "G1", 3: "G3" },
};
comprobar("quitar una fila antes de un grupo lo corre", JSON.stringify(quitarFila(tabla, 0).grupos) === JSON.stringify({ 0: "G1", 2: "G3" }));
comprobar("quitar la fila de un grupo lo pasa a la siguiente", JSON.stringify(quitarFila(tabla, 1).grupos) === JSON.stringify({ 1: "G1", 2: "G3" }));
comprobar("quitar la última fila con grupo lo elimina", JSON.stringify(quitarFila(tabla, 3).grupos) === JSON.stringify({ 1: "G1" }));

console.log(fallos === 0 ? "\n✓ Criterios verificados." : `\n✗ ${fallos} fallos.`);
process.exit(fallos === 0 ? 0 : 1);
