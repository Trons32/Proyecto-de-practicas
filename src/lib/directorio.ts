/**
 * El directorio de docentes (SPEC-021). PURO: leer el listado
 * institucional, depurarlo y completar una ficha con lo que se sabe de la
 * persona. Lo que toca la base está en `lib/servidor/directorio.ts`.
 */
import { CONTRATOS } from "./catalogos";
import type { Hoja, Valor } from "./importar/hoja";
import { normalizar } from "./importar/texto";
import type { Docente } from "./tipos";

/* ------------------------------------------------------------------ */
/* Leer el listado                                                    */
/* ------------------------------------------------------------------ */

/** Una fila del Excel tal como viene, con su número para el informe. */
export interface FilaListado {
  fila: number;
  codigo: string;
  cedula: string;
  nombre: string;
}

/** Una persona lista para la base. */
export interface PersonaListado {
  /** La fila del Excel de la que salió, para el informe. */
  fila?: number;
  documento: string;
  codigo: string | null;
  nombres: string;
}

const texto = (v: Valor) =>
  v === null ? "" : typeof v === "number" ? String(Math.trunc(v)) : String(v);

/**
 * Las columnas se buscan por su encabezado y no por posición: el listado
 * de este semestre trae una columna vacía en la A, y el próximo puede
 * traerla en otro sitio. `NOMBRE_CODIFICADO` («DOCENTE 1649») no es el
 * nombre: es un alias que se deriva del código.
 */
export function filasDelListado(hoja: Hoja): FilaListado[] | null {
  for (let f = 1; f <= Math.min(15, hoja.filas); f++) {
    let codigo = 0, cedula = 0, nombre = 0;
    for (let c = 1; c <= hoja.columnas; c++) {
      const e = normalizar(hoja.valor(f, c));
      if (!e) continue;
      if (!codigo && /^CODIGO\b/.test(e)) codigo = c;
      else if (!cedula && /IDENTIFICACION|CEDULA|DOCUMENTO/.test(e)) cedula = c;
      else if (!nombre && /NOM LARGO|NOMBRE/.test(e) && !/CODIFICADO/.test(e)) nombre = c;
    }
    if (!cedula || !nombre) continue;
    const filas: FilaListado[] = [];
    for (let r = f + 1; r <= hoja.filas; r++) {
      const fila = {
        fila: r,
        codigo: codigo ? texto(hoja.valor(r, codigo)) : "",
        cedula: texto(hoja.valor(r, cedula)),
        nombre: texto(hoja.valor(r, nombre)),
      };
      if (fila.codigo.trim() || fila.cedula.trim() || fila.nombre.trim()) filas.push(fila);
    }
    return filas;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Depurar                                                            */
/* ------------------------------------------------------------------ */

export type Motivo =
  | "sin_datos"
  | "sin_cedula"
  | "cedula_invalida"
  | "sin_nombre"
  | "cedula_con_varios_codigos"
  | "codigo_repetido"
  | "codigo_en_uso";

export const ETIQUETA_MOTIVO: Record<Motivo, string> = {
  sin_datos: "Solo trae el código: sin cédula ni nombre",
  sin_cedula: "Sin cédula",
  cedula_invalida: "Cédula inválida (la base exige de 6 a 15 dígitos)",
  sin_nombre: "Sin nombre",
  cedula_con_varios_codigos: "La misma cédula con códigos distintos: lo decide Talento Humano",
  codigo_repetido: "El mismo código en cédulas distintas",
  codigo_en_uso: "El código ya es de otra persona en la base",
};

export interface Descarte {
  fila: number;
  codigo: string;
  motivo: Motivo;
}

/** La cédula como la exige la base (`ck_docente_documento`), o null. */
export function cedulaValida(v: string): string | null {
  const limpia = v.trim().replace(/[.\s]/g, "");
  return /^\d{6,15}$/.test(limpia) ? limpia : null;
}

const limpiarNombre = (v: string) => v.replace(/\s+/g, " ").trim().toUpperCase();
const limpiarCodigo = (v: string) => {
  const c = v.trim().toUpperCase();
  return c && c.length <= 12 ? c : null;
};

/**
 * Lo cargable y lo que no, con el motivo. Los conflictos no se resuelven
 * adivinando: una cédula con dos códigos queda fuera hasta que Talento
 * Humano diga cuál vale (decisión del 2026-11-13).
 */
export function depurarListado(filas: FilaListado[]): { personas: PersonaListado[]; descartes: Descarte[] } {
  const descartes: Descarte[] = [];
  const validas: (PersonaListado & { fila: number })[] = [];

  for (const f of filas) {
    const cedula = f.cedula.trim();
    const nombre = limpiarNombre(f.nombre);
    const codigo = f.codigo.trim();
    const motivo: Motivo | null =
      !cedula && !nombre ? "sin_datos"
      : !cedula ? "sin_cedula"
      : !cedulaValida(cedula) ? "cedula_invalida"
      : !nombre ? "sin_nombre"
      : null;
    if (motivo) {
      descartes.push({ fila: f.fila, codigo, motivo });
      continue;
    }
    validas.push({ fila: f.fila, documento: cedulaValida(cedula)!, codigo: limpiarCodigo(codigo), nombres: nombre });
  }

  const codigosDe = new Map<string, Set<string>>();
  const cedulasDe = new Map<string, Set<string>>();
  for (const v of validas) {
    if (!v.codigo) continue;
    (codigosDe.get(v.documento) ?? codigosDe.set(v.documento, new Set()).get(v.documento)!).add(v.codigo);
    (cedulasDe.get(v.codigo) ?? cedulasDe.set(v.codigo, new Set()).get(v.codigo)!).add(v.documento);
  }

  const personas: PersonaListado[] = [];
  const vistas = new Set<string>();
  for (const v of validas) {
    const motivo: Motivo | null =
      (codigosDe.get(v.documento)?.size ?? 0) > 1 ? "cedula_con_varios_codigos"
      : v.codigo && (cedulasDe.get(v.codigo)?.size ?? 0) > 1 ? "codigo_repetido"
      : null;
    if (motivo) {
      descartes.push({ fila: v.fila, codigo: v.codigo ?? "", motivo });
      continue;
    }
    // La misma persona dos veces con el mismo código: es una sola.
    if (vistas.has(v.documento)) continue;
    vistas.add(v.documento);
    personas.push({ fila: v.fila, documento: v.documento, codigo: v.codigo, nombres: v.nombres });
  }
  return { personas, descartes };
}

/** Cuántos descartes hay de cada motivo, en el orden de `ETIQUETA_MOTIVO`. */
export function contarMotivos(descartes: Descarte[]): [Motivo, number][] {
  return (Object.keys(ETIQUETA_MOTIVO) as Motivo[])
    .map((m): [Motivo, number] => [m, descartes.filter((d) => d.motivo === m).length])
    .filter(([, n]) => n > 0);
}

/* ------------------------------------------------------------------ */
/* Buscar y completar                                                 */
/* ------------------------------------------------------------------ */

/** Los datos de la última asignación en la que estuvo la persona. */
export interface UltimaFicha {
  periodo: string;
  programa: string;
  nivelFormacion: string;
  perfilProfesional: string;
  categoriaMinciencias: string;
  activoSectorExterno: "SI" | "NO" | "";
  sectorEjerce: string;
  tipoContrato: string;
  dedicacion: string;
  categoria: string;
  sede: string;
}

/** Lo que devuelve la búsqueda: la persona y lo último que se sabe de ella. */
export interface FichaDirectorio {
  documento: string;
  codigo: string | null;
  nombres: string;
  ultima: UltimaFicha | null;
}

export type Consulta =
  | { por: "documento"; valor: string }
  | { por: "codigo"; valor: string }
  | { por: "nombre"; palabras: string[] };

/**
 * Qué busca lo escrito. Muy corto no busca: con tres letras saldrían
 * cientos de nombres, y por una cédula a medias, la de otra persona.
 */
export function interpretarConsulta(q: string): Consulta | null {
  const t = q.trim().toUpperCase();
  if (/^\d{6,15}$/.test(t)) return { por: "documento", valor: t };
  const codigo = /^(?:DOC)?0*(\d{1,7})$/.exec(t);
  if (codigo && (t.startsWith("DOC") || t.length <= 5)) {
    return { por: "codigo", valor: `DOC${codigo[1].padStart(7, "0")}` };
  }
  const palabras = normalizar(t).split(" ").filter((p) => p.length >= 2);
  if (palabras.join("").length >= 4 && !/\d/.test(t)) return { por: "nombre", palabras };
  return null;
}

/** Una cédula de otro, enmascarada: para reconocerla, no para copiarla. */
export const enmascararCedula = (c: string) => (c.length > 4 ? `•••${c.slice(-4)}` : c);

type CamposFicha = Pick<
  Docente,
  | "documento" | "nombres" | "nivelFormacion" | "perfilProfesional" | "categoriaMinciencias"
  | "activoSectorExterno" | "sectorEjerce" | "tipoContrato" | "dedicacion" | "categoria" | "sede"
>;

/**
 * Completa la ficha **solo en lo vacío**, como los cursos (SPEC-019): lo
 * escrito a mano no se pisa. Las horas, cursos, descargas y la evaluación
 * no se copian: son de cada periodo.
 *
 * Contrato, dedicación y categoría van juntos o no van: dependen uno del
 * otro, y uno de una asignación vieja puede ya no existir en el catálogo.
 */
export function completarDocente(d: Docente, ficha: FichaDirectorio): Partial<CamposFicha> {
  const cambios: Partial<CamposFicha> = {};
  if (!d.documento.trim()) cambios.documento = ficha.documento;
  if (!d.nombres.trim()) cambios.nombres = ficha.nombres;
  const u = ficha.ultima;
  if (!u) return cambios;
  if (!d.nivelFormacion && u.nivelFormacion) cambios.nivelFormacion = u.nivelFormacion;
  if (!d.perfilProfesional.trim() && u.perfilProfesional) cambios.perfilProfesional = u.perfilProfesional;
  if (!d.categoriaMinciencias && u.categoriaMinciencias) cambios.categoriaMinciencias = u.categoriaMinciencias;
  if (!d.activoSectorExterno && u.activoSectorExterno) {
    cambios.activoSectorExterno = u.activoSectorExterno;
    if (!d.sectorEjerce && u.sectorEjerce) cambios.sectorEjerce = u.sectorEjerce;
  }
  if (!d.sede && u.sede) cambios.sede = u.sede;
  const vigente = CONTRATOS[u.tipoContrato]?.[u.dedicacion]?.includes(u.categoria);
  if (!d.tipoContrato && !d.dedicacion && !d.categoria && vigente) {
    cambios.tipoContrato = u.tipoContrato;
    cambios.dedicacion = u.dedicacion;
    cambios.categoria = u.categoria;
  }
  return cambios;
}
