/**
 * La hoja VARIACIONES del consolidado, en .xlsx (SPEC-028): las mismas
 * columnas —facultad, programa, docente, dedicación, descripción— más el
 * tipo y el motivo por separado, que es lo que permite filtrarla en Excel.
 */
import { legible } from "./resumen";
import type { FilaReporteVariacion } from "./variaciones";
import { ETIQUETA_TIPO_VARIACION, textoMotivo } from "./variaciones";
import { BORDE, cargarExcelJS, encabezado, titulo } from "./exportar-cuadro";

export async function libroVariaciones(periodo: string, filas: FilaReporteVariacion[]) {
  const ExcelJS = await cargarExcelJS();
  const libro = new ExcelJS.Workbook();
  libro.creator = "Asignación Académica · CECAR";
  libro.created = new Date();

  const ws = libro.addWorksheet("VARIACIONES", { views: [{ state: "frozen", ySplit: 4 }] });
  const columnas = ["FACULTAD", "PROGRAMA ACADÉMICO", "NOMBRE DEL DOCENTE", "DEDICACIÓN", "TIPO", "MOTIVO", "DESCRIPCIÓN DE LA VARIACIÓN"];
  titulo(ws, 1, "CORPORACIÓN UNIVERSITARIA DEL CARIBE - CECAR", columnas.length, 13);
  titulo(ws, 2, `SÍNTESIS VARIACIÓN ASIGNACIÓN ACADÉMICA ${periodo}`, columnas.length);
  columnas.forEach((c, i) => (ws.getCell(4, i + 1).value = c));
  encabezado(ws, 4, 1, columnas.length);
  [28, 34, 34, 18, 10, 30, 60].forEach((w, i) => (ws.getColumn(i + 1).width = w));

  filas.forEach((f, i) => {
    const descripcion = [f.variacion.detalle, f.variacion.reemplazaA && `Reemplaza a ${f.variacion.reemplazaA}`, f.variacion.nota]
      .filter(Boolean)
      .join(". ");
    const valores = [
      legible(f.facultad),
      f.programa,
      f.variacion.nombres,
      f.variacion.dedicacion ? legible(f.variacion.dedicacion) : "",
      ETIQUETA_TIPO_VARIACION[f.variacion.tipo],
      textoMotivo(f.variacion.tipo, f.motivo) || "Sin motivo",
      descripcion,
    ];
    valores.forEach((v, j) => {
      const c = ws.getCell(5 + i, j + 1);
      c.value = v;
      c.border = BORDE;
      c.alignment = { vertical: "top", wrapText: true };
    });
  });

  return libro.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}
