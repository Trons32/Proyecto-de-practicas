/**
 * Reportes: la traducción del libro CONSOLIDADO ASIGNACIÓN ACADÉMICA.
 *
 * Funciones puras, como el motor de cálculo: reciben las asignaciones y la
 * configuración como argumento para poder verificarse fuera de React y, el
 * día que exista la base de datos, trasladarse a una vista SQL.
 */

import { calcularTotales, CONFIG_OFICIAL, type Configuracion } from "./calculo";
import type { TipoRol } from "./catalogos";
import { periodoAnterior, type Asignacion, type Docente, type EstadoAsignacion } from "./tipos";

/* ------------------------------------------------------------------
   Qué asignaciones entran
   ------------------------------------------------------------------ */

export type Alcance = "aprobadas" | "entregadas" | "todas";

export const ETIQUETA_ALCANCE: Record<Alcance, string> = {
  aprobadas: "Solo aprobadas",
  entregadas: "Entregadas (incluye en revisión)",
  todas: "Todas, incluso borradores",
};

/**
 * Por defecto el consolidado es de lo aprobado: es lo que la institución da
 * por bueno. Los otros alcances sirven para ver cómo va la convocatoria
 * antes de cerrarla, sabiendo que esas cifras todavía pueden cambiar.
 */
const ESTADOS_DEL_ALCANCE: Record<Alcance, EstadoAsignacion[]> = {
  aprobadas: ["aprobada"],
  entregadas: ["enviada", "en_revision", "aprobada"],
  todas: ["borrador", "enviada", "en_revision", "aprobada", "en_correccion"],
};

export interface FiltroReporte {
  periodo: string;
  alcance: Alcance;
  /** Vacío = todas. */
  facultad?: string;
  programa?: string;
}

export function asignacionesDelReporte(
  asignaciones: Asignacion[],
  f: FiltroReporte
): Asignacion[] {
  const estados = ESTADOS_DEL_ALCANCE[f.alcance];
  return asignaciones.filter(
    (a) =>
      a.periodo === f.periodo &&
      estados.includes(a.estado) &&
      (!f.facultad || a.facultad === f.facultad) &&
      (!f.programa || a.programa === f.programa)
  );
}

/* ------------------------------------------------------------------
   Cuadro resumen
   ------------------------------------------------------------------ */

/**
 * Las columnas del cuadro: una por dedicación. El Excel tiene cinco (TC,
 * medio tiempo, catedrático, tutor a distancia, tutor virtual) y cuenta con
 * COUNTIF sobre la dedicación, así que un docente HORA_LABOR —que el
 * formato 2026 sí ofrece— no caía en ninguna y desaparecía del consolidado.
 * Aquí tiene su columna, por la misma razón que los roles reclasificados:
 * el consolidado no puede perder docentes.
 */
export const COLUMNAS_CUADRO = [
  { dedicacion: "TIEMPO_COMPLETO", texto: "TC" },
  { dedicacion: "MEDIO_TIEMPO", texto: "Medio tiempo" },
  { dedicacion: "HORA_CÁTEDRA", texto: "Catedrático" },
  { dedicacion: "HORA_LABOR", texto: "Hora labor" },
  { dedicacion: "TUTOR_EAD", texto: "Tutor a distancia" },
  { dedicacion: "TUTOR_VIRTUAL", texto: "Tutor virtual" },
] as const;

export interface FilaCuadro {
  etiqueta: string;
  /** Un valor por cada entrada de COLUMNAS_CUADRO, en el mismo orden. */
  valores: number[];
  total: number;
  /** Fila de subtotal del bloque (las que el Excel calcula con SUM). */
  subtotal?: boolean;
}

export interface BloqueCuadro {
  titulo: string;
  filas: FilaCuadro[];
}

export interface CuadroResumen {
  bloques: BloqueCuadro[];
  /** Docentes contados en alguna columna. */
  docentes: number;
  /**
   * Docentes sin una dedicación reconocida. No entran al cuadro —en el
   * Excel tampoco— pero se cuentan para avisarlo en lugar de callarlo.
   */
  sinDedicacion: number;
  asignaciones: number;
  programas: number;
}

/**
 * Lo que cada fila toma de un docente. Las de horas replican las columnas
 * del formato por docente; las de conteo, los COUNTIFS cruzados con la
 * dedicación.
 *
 *   Docencia directa            Z  = Σ horas de clase de los cursos
 *   Preparación / Atención /    AH, AI, AJ
 *     Comunidades
 *   Dedicación total docencia   AM = roles de docencia + Z + AH + AI + AJ
 *   Descargas de investigación  JR = SUMIFS sobre los roles de las DESCARGAS
 *   Complementarias de invest.  JS = SUMIFS sobre los roles COMPLEMENTARIOS
 *   Extensión directa           JT  (descargas)
 *   Extensión administrativa    JU  (complementarias)
 *
 * El Excel decide si un rol es de investigación o de extensión comparando
 * su nombre con una lista escrita a mano en cada fórmula, y las listas no
 * coinciden entre columnas (AO dice "DIRECTOR DE INVESTIGACIÓN", JR dice
 * "DIRECTOR DE GRUPO DE INVESTIGACIÓN"). Aquí lo decide el `tipo` del rol,
 * el mismo que usa el motor de cálculo, para que el cuadro y la ficha del
 * docente no puedan contradecirse.
 */
interface Medida {
  etiqueta: string;
  valor: (d: Docente, ctx: Contexto) => number;
  subtotal?: boolean;
}

interface Contexto {
  totales: ReturnType<typeof calcularTotales>;
  tipoDeRol: (rolId: number | null) => TipoRol | null;
}

const horasDe = (
  items: { rolId: number | null; horas: number }[],
  tipo: TipoRol,
  ctx: Contexto
) => items.filter((x) => ctx.tipoDeRol(x.rolId) === tipo).reduce((s, x) => s + (x.horas || 0), 0);

const conteo =
  (campo: keyof Pick<Docente, "nivelFormacion" | "tipoContrato" | "categoria">, ...valores: string[]) =>
  (d: Docente) =>
    valores.includes(d[campo]) ? 1 : 0;

const BLOQUES: { titulo: string; medidas: Medida[] }[] = [
  {
    titulo: "Distribución por función sustantiva",
    medidas: [
      { etiqueta: "Total docentes", valor: () => 1 },
      { etiqueta: "Horas semanales dedicadas a docencia directa", valor: (_, c) => c.totales.horasClase },
      { etiqueta: "Preparación de clases", valor: (d) => d.preparacion || 0 },
      { etiqueta: "Atención a estudiantes", valor: (d) => d.atencion || 0 },
      { etiqueta: "Comunidades de aprendizaje", valor: (d) => d.comunidades || 0 },
      {
        etiqueta: "Dedicación total función docencia",
        valor: (_, c) => c.totales.docencia,
        subtotal: true,
      },
      {
        etiqueta: "Descargas de investigación",
        valor: (d, c) => horasDe(d.descargas, "INVESTIGACION", c),
      },
      {
        etiqueta: "Horas complementarias para investigación",
        valor: (d, c) => horasDe(d.administrativas, "INVESTIGACION", c),
      },
      {
        etiqueta: "Total horas de investigación",
        valor: (_, c) => c.totales.investigacion,
        subtotal: true,
      },
      {
        etiqueta: "Horas directas semanales dedicadas a extensión o proyección social",
        valor: (d, c) => horasDe(d.descargas, "EXTENSION", c),
      },
      {
        etiqueta: "Horas administrativas dedicadas a extensión y proyección social",
        valor: (d, c) => horasDe(d.administrativas, "EXTENSION", c),
      },
      {
        etiqueta: "Total horas de extensión y proyección social",
        valor: (_, c) => c.totales.extension,
        subtotal: true,
      },
    ],
  },
  {
    titulo: "Distribución por nivel de formación",
    medidas: [
      { etiqueta: "Pregrado", valor: conteo("nivelFormacion", "PREGRADO") },
      { etiqueta: "Especialistas", valor: conteo("nivelFormacion", "ESPECIALIZACIÓN") },
      { etiqueta: "Magíster", valor: conteo("nivelFormacion", "MAGISTER") },
      { etiqueta: "Doctor", valor: conteo("nivelFormacion", "DOCTOR") },
      { etiqueta: "Posdoctor", valor: conteo("nivelFormacion", "POSDOCTOR") },
    ],
  },
  {
    titulo: "Distribución por tipo de contrato",
    medidas: [
      { etiqueta: "Término indefinido", valor: conteo("tipoContrato", "TÉRMINO_INDEFINIDO") },
      // El Excel separa "a un año" de "inferior a un año"; el formato de
      // asignación solo registra TÉRMINO_FIJO, así que no hay con qué partirlo.
      { etiqueta: "Término fijo", valor: conteo("tipoContrato", "TÉRMINO_FIJO") },
      {
        etiqueta: "Labor contratada (tutores y cátedra)",
        valor: conteo("tipoContrato", "LABOR_CONTRATADA", "CÁTEDRAS", "TUTOR_VIRTUAL", "TUTOR_EAD"),
      },
    ],
  },
  {
    titulo: "Distribución por categoría en el escalafón",
    medidas: [
      { etiqueta: "Docente en formación", valor: conteo("categoria", "DOCENTE EN FORMACIÓN") },
      { etiqueta: "Auxiliar", valor: conteo("categoria", "AUXILIAR") },
      { etiqueta: "Asistente", valor: conteo("categoria", "ASISTENTE") },
      { etiqueta: "Asociado", valor: conteo("categoria", "ASOCIADO") },
      { etiqueta: "Titular", valor: conteo("categoria", "TITULAR") },
      { etiqueta: "Categoría I", valor: conteo("categoria", "CATEGORÍA I") },
      { etiqueta: "Categoría II", valor: conteo("categoria", "CATEGORÍA II") },
      { etiqueta: "Categoría III", valor: conteo("categoria", "CATEGORÍA III") },
      { etiqueta: "Categoría IV", valor: conteo("categoria", "CATEGORÍA IV") },
      { etiqueta: "Categoría única", valor: conteo("categoria", "CATEGORÍA ÚNICA") },
    ],
  },
];

/**
 * El CUADRO RESUMEN del consolidado. Cada docente suma en la columna de su
 * dedicación; el total de la fila es la suma de las columnas, como el
 * `SUM(Tabla[[#This Row],[TC]:[TUTOR VIRTUAL]])` del Excel.
 */
export function cuadroResumen(
  asignaciones: Asignacion[],
  config: Configuracion = CONFIG_OFICIAL
): CuadroResumen {
  const rolPorId = new Map(config.roles.map((r) => [r.id, r]));
  const tipoDeRol = (rolId: number | null) =>
    rolId === null ? null : (rolPorId.get(rolId)?.tipo ?? null);

  const columna = new Map<string, number>(COLUMNAS_CUADRO.map((c, i) => [c.dedicacion, i]));
  const acumulados = BLOQUES.map((b) => b.medidas.map(() => COLUMNAS_CUADRO.map(() => 0)));

  let docentes = 0;
  let sinDedicacion = 0;

  for (const a of asignaciones) {
    for (const d of a.docentes) {
      const col = columna.get(d.dedicacion);
      if (col === undefined) {
        sinDedicacion++;
        continue;
      }
      docentes++;
      const ctx: Contexto = { totales: calcularTotales(d, config), tipoDeRol };
      BLOQUES.forEach((b, i) =>
        b.medidas.forEach((m, j) => {
          acumulados[i][j][col] += m.valor(d, ctx);
        })
      );
    }
  }

  return {
    bloques: BLOQUES.map((b, i) => ({
      titulo: b.titulo,
      filas: b.medidas.map((m, j) => ({
        etiqueta: m.etiqueta,
        valores: acumulados[i][j],
        total: acumulados[i][j].reduce((s, v) => s + v, 0),
        subtotal: m.subtotal,
      })),
    })),
    docentes,
    sinDedicacion,
    asignaciones: asignaciones.length,
    programas: new Set(asignaciones.map((a) => a.programa)).size,
  };
}

/* ------------------------------------------------------------------
   Comparativo entre periodos
   ------------------------------------------------------------------ */

/** Cuántos periodos muestra el comparativo, contando el elegido. */
export const PERIODOS_COMPARATIVO = 4;

export interface CuadroDePeriodo {
  periodo: string;
  cuadro: CuadroResumen;
}

/**
 * El cuadro del periodo elegido y de los anteriores, del más antiguo al más
 * reciente, como el COMPARATIVO ESTADÍSTICO del Excel. Cada periodo usa los
 * mismos filtros (alcance, facultad, programa), para que la variación mida
 * un cambio real y no un cambio de lo que se está mirando.
 *
 * El Excel pega a mano las cifras de periodos viejos; aquí salen de las
 * asignaciones guardadas. Un periodo sin asignaciones queda con
 * `cuadro.asignaciones === 0`, y la vista lo distingue de "cero docentes".
 */
export function comparativo(
  asignaciones: Asignacion[],
  f: FiltroReporte,
  config: Configuracion = CONFIG_OFICIAL,
  cantidad = PERIODOS_COMPARATIVO
): CuadroDePeriodo[] {
  const periodos = [f.periodo];
  while (periodos.length < cantidad) periodos.unshift(periodoAnterior(periodos[0]));
  return periodos.map((periodo) => ({
    periodo,
    cuadro: cuadroResumen(asignacionesDelReporte(asignaciones, { ...f, periodo }), config),
  }));
}
