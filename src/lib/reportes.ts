/**
 * Reportes: la traducción del libro CONSOLIDADO ASIGNACIÓN ACADÉMICA.
 *
 * Funciones puras, como el motor de cálculo: reciben las asignaciones y la
 * configuración como argumento para poder verificarse fuera de React y, el
 * día que exista la base de datos, trasladarse a una vista SQL.
 */

import { calcularTotales, CONFIG_OFICIAL, type Configuracion } from "./calculo";
import type { TipoRol } from "./catalogos";
import type { CuadroHistorico, Modalidad, ProgramaHistorico } from "./historicos";
import { cursosBase, esImportada, periodoAnterior, type Asignacion, type CursoBase, type Docente, type EstadoAsignacion } from "./tipos";

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

/* ------------------------------------------------------------------
   Comparativo estadístico completo (SPEC-009)
   ------------------------------------------------------------------ */

/** «importado»: asignaciones cargadas del Excel de un periodo anterior (SPEC-017). */
export type FuenteDato = "sistema" | "importado" | "historico" | "vacio";

/* ---- Periodos importados: cuándo reemplazan al consolidado (SPEC-017) ---- */

export interface Cobertura {
  /** Programas del consolidado con docentes en ese periodo, enlazados al catálogo. */
  esperados: string[];
  importados: string[];
  faltan: string[];
  /**
   * Ya están todos. Hasta entonces el total del periodo sigue siendo el del
   * consolidado: sumar diez programas importados con cuatro que faltan
   * daría una cifra que no es ni la del Excel ni la real.
   */
  completo: boolean;
}

export function coberturaImportada(asignaciones: Asignacion[], periodo: string, historicos: ProgramaHistorico[]): Cobertura {
  const esperados = historicos
    .filter((h) => h.programa && (h.periodos[periodo]?.total ?? 0) > 0)
    .map((h) => h.programa!);
  const importados = [
    ...new Set(asignaciones.filter((a) => a.periodo === periodo && esImportada(a)).map((a) => a.programa)),
  ];
  const faltan = esperados.filter((p) => !importados.includes(p));
  // Sin programas en el consolidado para ese periodo, lo importado es la única fuente.
  return { esperados, importados, faltan, completo: importados.length > 0 && faltan.length === 0 };
}

/** «sistema» si alguna se hizo en el sistema; «importado» si todas vinieron de un Excel. */
const fuenteDe = (propias: Asignacion[]): FuenteDato => (propias.every(esImportada) ? "importado" : "sistema");

export interface FilaComparable {
  etiqueta: string;
  /** null: sin dato (el Excel no lo traía, o la columna no existía entonces). */
  valores: (number | null)[];
  total: number | null;
  subtotal?: boolean;
}

export interface CuadroComparable {
  periodo: string;
  /** Lo que el Excel decía del periodo ("2024-2 (NOVEDADES)"), o el periodo a secas. */
  etiqueta: string;
  fuente: FuenteDato;
  bloques: { titulo: string; filas: FilaComparable[] }[];
}

const comoComparable = (periodo: string, c: CuadroResumen): CuadroComparable => ({
  periodo,
  etiqueta: periodo,
  fuente: "sistema",
  bloques: c.bloques,
});

/**
 * Todos los periodos con datos hasta el elegido, del más antiguo al más
 * reciente: los históricos del Excel y los del sistema.
 *
 * Un periodo con asignaciones del alcance usa las del sistema aunque haya
 * histórico: es lo vigente. El histórico es institucional, así que con un
 * filtro de facultad o programa no aplica y el periodo queda vacío.
 */
export function comparativoCompleto(
  asignaciones: Asignacion[],
  f: FiltroReporte,
  historicos: CuadroHistorico[],
  config: Configuracion = CONFIG_OFICIAL,
  programasHistoricos: ProgramaHistorico[] = []
): CuadroComparable[] {
  const filtrado = Boolean(f.facultad || f.programa);
  const periodos = [
    ...new Set([...historicos.map((h) => h.periodo), ...asignaciones.map((a) => a.periodo), f.periodo]),
  ]
    .filter((p) => p <= f.periodo)
    .sort();

  return periodos.map((periodo) => {
    const propias = asignacionesDelReporte(asignaciones, { ...f, periodo });
    const h = historicos.find((x) => x.periodo === periodo);
    const fuente = propias.length ? fuenteDe(propias) : null;
    // Importado a medias: manda el consolidado (ver `coberturaImportada`).
    const aMedias =
      fuente === "importado" && h && !filtrado && !coberturaImportada(asignaciones, periodo, programasHistoricos).completo;
    if (fuente && !aMedias) return { ...comoComparable(periodo, cuadroResumen(propias, config)), fuente };
    if (h && !filtrado) return { periodo, etiqueta: h.etiqueta, fuente: "historico", bloques: h.bloques };
    return { ...comoComparable(periodo, cuadroResumen([], config)), fuente: "vacio" };
  });
}

/** El total de una fila del cuadro en un periodo, o null si no hay dato. */
export const totalDe = (c: CuadroComparable, bloque: number, fila: number): number | null =>
  c.fuente === "vacio" ? null : (c.bloques[bloque]?.filas[fila]?.total ?? null);

/* ---- Por programa y por modalidad ---- */

export interface ConteoDocentes {
  tc: number | null;
  mt: number | null;
  cat: number | null;
  tutor: number | null;
  total: number | null;
}

const VACIO: ConteoDocentes = { tc: null, mt: null, cat: null, tutor: null, total: null };

/**
 * Las cuatro columnas del comparativo por programa. HORA_LABOR va con
 * cátedra: el Excel no la tenía y es la otra dedicación por horas; sin
 * esto esos docentes no estarían en ninguna columna.
 */
const GRUPO_DEDICACION: Record<string, keyof Omit<ConteoDocentes, "total">> = {
  TIEMPO_COMPLETO: "tc",
  MEDIO_TIEMPO: "mt",
  "HORA_CÁTEDRA": "cat",
  HORA_LABOR: "cat",
  TUTOR_EAD: "tutor",
  TUTOR_VIRTUAL: "tutor",
};

export function conteoDocentes(asignaciones: Asignacion[]): ConteoDocentes {
  const c = { tc: 0, mt: 0, cat: 0, tutor: 0, total: 0 };
  for (const a of asignaciones) {
    for (const d of a.docentes) {
      const g = GRUPO_DEDICACION[d.dedicacion];
      if (!g) continue;
      c[g]++;
      c.total++;
    }
  }
  return c;
}

export const MODALIDADES: Modalidad[] = ["PRESENCIAL", "DISTANCIA", "VIRTUAL"];

export const ETIQUETA_MODALIDAD: Record<Modalidad, string> = {
  PRESENCIAL: "Presencial",
  DISTANCIA: "A distancia",
  VIRTUAL: "Virtual",
};

/**
 * La modalidad de un programa del catálogo. Se toma del histórico cuando el
 * programa está enlazado (es lo que el consolidado ya decía); si no, del
 * nombre, que en el catálogo la lleva (VIRTUAL, EAD).
 */
export function modalidadDe(programa: string, historicos: ProgramaHistorico[]): Modalidad {
  const h = historicos.find((x) => x.programa === programa);
  if (h) return h.modalidad;
  if (/VIRTUAL/i.test(programa)) return "VIRTUAL";
  if (/\bEAD\b/i.test(programa)) return "DISTANCIA";
  return "PRESENCIAL";
}

type ConteoConFuente = ConteoDocentes & { fuente: FuenteDato };

export interface FilaPrograma {
  modalidad: Modalidad;
  facultad: string;
  /** El nombre a mostrar: el del catálogo, o el del Excel si no está enlazado. */
  nombre: string;
  /** El del catálogo, si existe. */
  programa: string | null;
  periodos: Record<string, ConteoConFuente>;
}

const historicoOVacio = (v: ConteoDocentes | undefined): ConteoConFuente =>
  v ? { ...v, fuente: "historico" } : { ...VACIO, fuente: "vacio" };

/**
 * Docentes por programa y periodo, como las tablas del COMPARATIVO
 * ESTADÍSTICO. Mismas reglas que `comparativoCompleto`: el sistema manda
 * donde tiene asignaciones; el histórico rellena. Los programas del Excel
 * sin equivalente en el catálogo se muestran con su nombre del Excel.
 */
export function comparativoPorPrograma(
  asignaciones: Asignacion[],
  periodos: string[],
  alcance: Alcance,
  historicos: ProgramaHistorico[],
  programas: { nombre: string; facultad: string }[]
): FilaPrograma[] {
  const filas: FilaPrograma[] = programas.map((p) => {
    const h = historicos.find((x) => x.programa === p.nombre);
    return {
      modalidad: modalidadDe(p.nombre, historicos),
      facultad: p.facultad,
      nombre: p.nombre,
      programa: p.nombre,
      periodos: Object.fromEntries(
        periodos.map((periodo): [string, ConteoConFuente] => {
          const propias = asignacionesDelReporte(asignaciones, { periodo, alcance, programa: p.nombre });
          return [
            periodo,
            propias.length > 0 ? { ...conteoDocentes(propias), fuente: fuenteDe(propias) } : historicoOVacio(h?.periodos[periodo]),
          ];
        })
      ),
    };
  });

  for (const h of historicos.filter((x) => x.programa === null)) {
    filas.push({
      modalidad: h.modalidad,
      facultad: h.facultad,
      nombre: h.nombre,
      programa: null,
      periodos: Object.fromEntries(periodos.map((periodo) => [periodo, historicoOVacio(h.periodos[periodo])])),
    });
  }

  // Un programa sin ningún dato en ningún periodo solo estorba en la tabla.
  return filas.filter((f) => Object.values(f.periodos).some((v) => v.fuente !== "vacio"));
}

const sumar = (a: number | null, b: number | null) => (a === null && b === null ? null : (a ?? 0) + (b ?? 0));

/**
 * Docentes por modalidad. En los periodos históricos se usa la tabla del
 * Excel, no la suma de sus programas: el Excel no siempre cuadra consigo
 * mismo y el comparativo debe mostrar lo mismo que él.
 */
export function comparativoPorModalidad(
  filas: FilaPrograma[],
  periodos: string[],
  historicoModalidad: Record<Modalidad, Record<string, Partial<ConteoDocentes>>>,
  /** Periodos importados completos (SPEC-017): ahí la suma reemplaza al Excel. */
  completos: Set<string> = new Set()
): Record<Modalidad, Record<string, ConteoDocentes>> {
  const salida = {} as Record<Modalidad, Record<string, ConteoDocentes>>;
  for (const m of MODALIDADES) {
    salida[m] = {};
    for (const periodo of periodos) {
      const fuentes = filas.filter((f) => f.modalidad === m).map((f) => f.periodos[periodo]?.fuente);
      const conSistema =
        fuentes.includes("sistema") || (fuentes.includes("importado") && completos.has(periodo));
      const h = historicoModalidad[m]?.[periodo];
      if (!conSistema && h) {
        const v = { tc: h.tc ?? null, mt: h.mt ?? null, cat: h.cat ?? null, tutor: h.tutor ?? null };
        salida[m][periodo] = { ...v, total: [v.tc, v.mt, v.cat, v.tutor].reduce(sumar, null) };
        continue;
      }
      const c = { ...VACIO };
      for (const f of filas) {
        const v = f.periodos[periodo];
        if (f.modalidad !== m || !v || v.fuente === "vacio") continue;
        c.tc = sumar(c.tc, v.tc);
        c.mt = sumar(c.mt, v.mt);
        c.cat = sumar(c.cat, v.cat);
        c.tutor = sumar(c.tutor, v.tutor);
        c.total = sumar(c.total, v.total);
      }
      salida[m][periodo] = c;
    }
  }
  return salida;
}

/* ---- Tablas del comparativo que se derivan de las anteriores (SPEC-016) ---- */

/** La suma de varios conteos; null solo si todos lo son ("sin dato" no es cero). */
export function sumarConteos(conteos: (ConteoDocentes | undefined)[]): ConteoDocentes {
  const c = { ...VACIO };
  for (const v of conteos) {
    if (!v) continue;
    c.tc = sumar(c.tc, v.tc);
    c.mt = sumar(c.mt, v.mt);
    c.cat = sumar(c.cat, v.cat);
    c.tutor = sumar(c.tutor, v.tutor);
    c.total = sumar(c.total, v.total);
  }
  return c;
}

/** Fila con datos de un programa en un periodo; "vacio" se trata como ausente. */
const conDato = (f: FilaPrograma, periodo: string): ConteoDocentes | undefined => {
  const v = f.periodos[periodo];
  return v && v.fuente !== "vacio" ? v : undefined;
};

/**
 * La fila TOTAL GENERAL DOCENTES de cada tabla por modalidad del Excel: la
 * suma de los programas que se muestran. Puede no coincidir con la tabla por
 * modalidad, que en los periodos históricos copia la del Excel (que no
 * siempre cuadra consigo mismo); por eso se calcula aparte.
 */
export function totalProgramas(filas: FilaPrograma[], periodos: string[]): Record<string, ConteoDocentes> {
  return Object.fromEntries(periodos.map((p) => [p, sumarConteos(filas.map((f) => conDato(f, p)))]));
}

/**
 * El total de docentes de un periodo por dedicación, del primer renglón del
 * cuadro ("Total docentes"). Agrupa como el comparativo por programa: hora
 * labor con cátedra, y los dos tutores juntos.
 */
export function docentesPorDedicacion(c: CuadroComparable): ConteoDocentes {
  const fila = c.fuente === "vacio" ? undefined : c.bloques[0]?.filas[0];
  if (!fila) return { ...VACIO };
  const v = (i: number) => fila.valores[i] ?? null;
  return { tc: v(0), mt: v(1), cat: sumar(v(2), v(3)), tutor: sumar(v(4), v(5)), total: fila.total };
}

export interface FilaDocentesEstudiantes {
  periodo: string;
  docentes: number | null;
  estudiantes: number | null;
  /** Estudiantes por docente, a un decimal. */
  relacion: number | null;
}

/**
 * La tabla COMPARATIVO HISTÓRICO DOCENTES VS. ESTUDIANTES. Los docentes salen
 * del cuadro (sistema o Excel); los estudiantes solo del consolidado, porque
 * la suma de cupos de los cursos cuenta a una persona varias veces (spec 009).
 */
export function docentesVsEstudiantes(
  cuadros: CuadroComparable[],
  estudiantes: { periodo: string; estudiantes: number | null }[]
): FilaDocentesEstudiantes[] {
  return cuadros
    .filter((c) => c.fuente !== "vacio")
    .map((c) => {
      const docentes = totalDe(c, 0, 0);
      const est = estudiantes.find((e) => e.periodo === c.periodo)?.estudiantes ?? null;
      return {
        periodo: c.periodo,
        docentes,
        estudiantes: est,
        relacion: docentes && est !== null ? Math.round((est / docentes) * 10) / 10 : null,
      };
    });
}

/** Los dos últimos periodos en que alguna fila tiene datos: entre ellos se mide la variación. */
export function periodosDeVariacion(filas: FilaPrograma[], periodos: string[]): [string, string] | null {
  const [ultimo, previo] = periodos.filter((p) => filas.some((f) => conDato(f, p))).reverse();
  return ultimo && previo ? [previo, ultimo] : null;
}

/* ------------------------------------------------------------------
   Proyección: lo aprobado la primera vez contra lo vigente (SPEC-009)
   ------------------------------------------------------------------ */

export interface ResumenCursos {
  cursos: number;
  horas: number;
  /** Σ estudiantes de los cursos: cupos, no personas (una persona toma varios cursos). */
  estudiantes: number;
  /** Grupos distintos de primer semestre: la cohorte que entra. */
  gruposPrimerSemestre: number;
  estudiantesPrimerSemestre: number;
}

export function resumenCursos(cursos: CursoBase[]): ResumenCursos {
  const primero = cursos.filter((k) => k.semestre === 1);
  return {
    cursos: cursos.length,
    horas: cursos.reduce((s, k) => s + (k.intensidadHoraria ?? 0), 0),
    estudiantes: cursos.reduce((s, k) => s + (k.estudiantes ?? 0), 0),
    gruposPrimerSemestre: new Set(primero.map((k) => k.grupo.trim()).filter(Boolean)).size,
    estudiantesPrimerSemestre: primero.reduce((s, k) => s + (k.estudiantes ?? 0), 0),
  };
}

export interface FilaProyeccion {
  asignacionId: string;
  programa: string;
  facultad: string;
  estado: EstadoAsignacion;
  /** Cuándo se aprobó por primera vez. */
  fechaBase: string;
  proyectado: ResumenCursos;
  ajustado: ResumenCursos;
  /** En la línea base y ya no vigentes (por id). */
  cerrados: CursoBase[];
  /** Vigentes que no estaban en la línea base. */
  nuevos: CursoBase[];
}

export interface Proyeccion {
  filas: FilaProyeccion[];
  total: { proyectado: ResumenCursos; ajustado: ResumenCursos; cerrados: number; nuevos: number };
  /** Aprobadas antes de SPEC-009: sin línea base no hay con qué comparar. */
  sinLineaBase: Asignacion[];
}

const sumarResumen = (a: ResumenCursos, b: ResumenCursos): ResumenCursos => ({
  cursos: a.cursos + b.cursos,
  horas: a.horas + b.horas,
  estudiantes: a.estudiantes + b.estudiantes,
  gruposPrimerSemestre: a.gruposPrimerSemestre + b.gruposPrimerSemestre,
  estudiantesPrimerSemestre: a.estudiantesPrimerSemestre + b.estudiantesPrimerSemestre,
});

/**
 * La hoja PROYECCIÓN del consolidado: por programa, los cursos aprobados la
 * primera vez contra los vigentes. Entra toda asignación del periodo con
 * línea base, esté como esté ahora: una reabierta para corregir sigue
 * siendo parte de la proyección, y su estado se muestra.
 */
export function proyeccion(
  asignaciones: Asignacion[],
  f: Pick<FiltroReporte, "periodo" | "facultad" | "programa">
): Proyeccion {
  const delPeriodo = asignacionesDelReporte(asignaciones, { ...f, alcance: "todas" });
  const filas: FilaProyeccion[] = [];
  const sinLineaBase: Asignacion[] = [];

  for (const a of delPeriodo) {
    if (!a.lineaBase) {
      // Una importada nunca tuvo proyección (SPEC-017): no le falta nada.
      if ((a.estado === "aprobada" || a.version > 0) && !esImportada(a)) sinLineaBase.push(a);
      continue;
    }
    const vigentes = cursosBase(a.docentes);
    const idsVigentes = new Set(vigentes.map((k) => k.id));
    const idsBase = new Set(a.lineaBase.cursos.map((k) => k.id));
    filas.push({
      asignacionId: a.id,
      programa: a.programa,
      facultad: a.facultad,
      estado: a.estado,
      fechaBase: a.lineaBase.fecha,
      proyectado: resumenCursos(a.lineaBase.cursos),
      ajustado: resumenCursos(vigentes),
      cerrados: a.lineaBase.cursos.filter((k) => !idsVigentes.has(k.id)),
      nuevos: vigentes.filter((k) => !idsBase.has(k.id)),
    });
  }

  filas.sort((x, y) => x.programa.localeCompare(y.programa));
  const cero = resumenCursos([]);
  return {
    filas,
    total: {
      proyectado: filas.reduce((s, x) => sumarResumen(s, x.proyectado), cero),
      ajustado: filas.reduce((s, x) => sumarResumen(s, x.ajustado), cero),
      cerrados: filas.reduce((s, x) => s + x.cerrados.length, 0),
      nuevos: filas.reduce((s, x) => s + x.nuevos.length, 0),
    },
    sinLineaBase,
  };
}
