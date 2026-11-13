/**
 * De lo leído a una asignación (SPEC-017). Puro.
 *
 * El texto del Excel se traduce al catálogo. Lo que coincide sin duda se
 * traduce solo; lo dudoso queda «pendiente» y lo decide el administrador.
 * Con la respuesta se vuelve a armar: nada se adivina en silencio.
 *
 * Al final se recalcula cada docente con el motor y se compara con lo que
 * el propio Excel decía (gran total, horas de clase…). Esa comparación es
 * la prueba de que la lectura fue fiel.
 */
import { calcularTotales, type Configuracion } from "../calculo";
import { CATEGORIAS_MINCIENCIAS, CONTRATOS, JORNADAS, MODALIDADES, NIVELES_FORMACION, PROGRAMAS, SECTORES, SEDES, codigoDePrograma } from "../catalogos";
import {
  nuevaAdministrativa,
  nuevaDescarga,
  nuevoCurso,
  nuevoDocente,
  nuevoEvento,
  nuevoId,
  type Asignacion,
  type Curso,
  type Docente,
} from "../tipos";
import type { RolParametro } from "../novedades";
import type { CampoId } from "./campos";
import type { Valor } from "./hoja";
import type { DocenteLeido, LecturaHoja } from "./leer";
import { masParecida, normalizar, numero, texto } from "./texto";

/* ------------------------------------------------------------------
   Pendientes y decisiones
   ------------------------------------------------------------------ */

export type TipoPendiente = "rol" | "dedicacion" | "contrato";

export interface Pendiente {
  /** `${tipo}::${texto normalizado}`: la misma duda en dos hojas es una sola. */
  clave: string;
  tipo: TipoPendiente;
  /** Lo que dice el Excel. */
  valor: string;
  /** Lo más parecido del catálogo, si hay algo. */
  sugerencia: string | null;
  /** Entre qué elegir: [valor, etiqueta]. */
  opciones: [string, string][];
  /** Cuántas veces aparece en la hoja. */
  veces: number;
}

/**
 * Lo que decidió el administrador. `null` = dejarlo vacío (el rol se
 * ignora; la dedicación queda sin dato). Sin entrada = sigue pendiente.
 */
export type Decisiones = Record<string, string | null>;

export const clavePendiente = (tipo: TipoPendiente, valor: string) => `${tipo}::${normalizar(valor)}`;

/* ------------------------------------------------------------------
   Traducción de valores
   ------------------------------------------------------------------ */

const DEDICACIONES = Object.keys(Object.values(CONTRATOS).reduce((s, d) => ({ ...s, ...d }), {}));

/** Cómo se ha escrito cada dedicación a mano. */
const SINONIMOS_DEDICACION: [RegExp, string][] = [
  [/^(T ?C|TIEMPO COMPLETO|COMPLETO)$/, "TIEMPO_COMPLETO"],
  [/^(M ?T|MEDIO TIEMPO|MEDIO)$/, "MEDIO_TIEMPO"],
  [/^(H ?C|CAT|CATEDRA(TICO)?|HORA CATEDRA|CATEDRAS)$/, "HORA_CÁTEDRA"],
  [/^(H ?L|HORA LABOR|LABOR( CONTRATADA)?)$/, "HORA_LABOR"],
  [/^TUTOR( DE)? VIRTUAL(IDAD)?$/, "TUTOR_VIRTUAL"],
  [/^TUTOR( (EAD|DISTANCIA|A DISTANCIA|DISTANCIA TRADICIONAL))?$/, "TUTOR_EAD"],
];

const SINONIMOS_CONTRATO: [RegExp, string][] = [
  [/FIJO/, "TÉRMINO_FIJO"],
  [/INDEFINIDO/, "TÉRMINO_INDEFINIDO"],
  [/LABOR/, "LABOR_CONTRATADA"],
  [/CATEDRA/, "CÁTEDRAS"],
  [/TUTOR.*VIRTUAL/, "TUTOR_VIRTUAL"],
  [/TUTOR/, "TUTOR_EAD"],
];

/** El contrato que corresponde a una dedicación, cuando hay uno solo. */
function contratoUnico(dedicacion: string): string | null {
  const c = Object.entries(CONTRATOS).filter(([, d]) => dedicacion in d).map(([k]) => k);
  return c.length === 1 ? c[0] : null;
}

const legibleClave = (k: string) => k.replace(/_/g, " ");

function traducirDedicacion(v: string): string | null {
  const n = normalizar(v);
  if (!n) return null;
  const directo = DEDICACIONES.find((d) => normalizar(d) === n);
  if (directo) return directo;
  return SINONIMOS_DEDICACION.find(([p]) => p.test(n))?.[1] ?? null;
}

function traducirContrato(v: string): string | null {
  const n = normalizar(v);
  if (!n) return null;
  const directo = Object.keys(CONTRATOS).find((d) => normalizar(d) === n);
  if (directo) return directo;
  return SINONIMOS_CONTRATO.find(([p]) => p.test(n))?.[1] ?? null;
}

const ROMANO: Record<string, string> = { "1": "I", "2": "II", "3": "III", "4": "IV" };

/** «CAT III», «Categoría 3», «III», «asistente»: a la categoría de la cascada, si existe. */
function traducirCategoria(v: string, contrato: string, dedicacion: string): string | null {
  const validas = CONTRATOS[contrato]?.[dedicacion] ?? [];
  const n = normalizar(v).replace(/^CAT(EGORIA)? ?/, "");
  if (!n) return null;
  const romano = ROMANO[n] ?? n;
  return (
    validas.find((c) => normalizar(c) === normalizar(v)) ??
    validas.find((c) => normalizar(c).replace(/^CATEGORIA /, "") === romano) ??
    validas.find((c) => normalizar(c) === n) ??
    null
  );
}

/** A una lista abierta (sede, jornada…): la opción si coincide clara; si no, el texto tal cual. */
function aLista(v: string, lista: string[]): string {
  if (!v) return "";
  const m = masParecida(v, lista, (x) => x);
  return m && m.puntaje >= 0.8 && m.clara ? m.opcion : v;
}

/** Límites de la base (VARCHAR): lo que no cabe se recorta y se avisa. */
const LARGO: Partial<Record<keyof Docente | keyof Curso, number>> = {
  documento: 15, nombres: 150, nivelFormacion: 30, categoriaMinciencias: 20, sectorEjerce: 60,
  categoria: 40, sede: 40, codigoPrograma: 10, nombrePrograma: 120, codigoPensum: 20, codigoCurso: 20,
  nombreCurso: 150, grupo: 5, jornada: 15, modalidad: 15,
};

/* ------------------------------------------------------------------
   Armar
   ------------------------------------------------------------------ */

export interface Diferencia {
  medida: string;
  excel: number;
  sistema: number;
}

export interface RevisionDocente {
  fila: number;
  nombre: string;
  dedicacion: string;
  cursos: number;
  totalSemanal: number;
  /** Lo que el Excel calculó y no coincide con el motor. */
  diferencias: Diferencia[];
  avisos: string[];
}

export interface Armado {
  docentes: Docente[];
  pendientes: Pendiente[];
  revision: RevisionDocente[];
  /** Avisos de la hoja entera. */
  avisos: string[];
}

/**
 * Armar los docentes de una hoja. `config` trae los roles vigentes y los
 * inactivos: un rol de 2022 que ya no se ofrece sigue siendo un rol.
 */
export function armarDocentes(lectura: LecturaHoja, decisiones: Decisiones, config: Configuracion, programa: string): Armado {
  const pendientes = new Map<string, Pendiente>();
  const avisos: string[] = [...lectura.avisos];
  const rolesPorNombre = config.roles;

  const pedir = (tipo: TipoPendiente, valor: string, sugerencia: string | null, opciones: [string, string][]) => {
    const clave = clavePendiente(tipo, valor);
    const p = pendientes.get(clave);
    if (p) p.veces++;
    else pendientes.set(clave, { clave, tipo, valor, sugerencia, opciones, veces: 1 });
  };
  /** La decisión del administrador si la hay; `undefined` si sigue pendiente. */
  const decidido = (tipo: TipoPendiente, valor: string) => {
    const k = clavePendiente(tipo, valor);
    return k in decisiones ? decisiones[k] : undefined;
  };

  const opcionesRol: [string, string][] = rolesPorNombre.map((r) => [String(r.id), r.nombre + ((r as RolParametro).inactivo ? " (inactivo)" : "")]);
  const opcionesDedicacion: [string, string][] = DEDICACIONES.map((d) => [d, legibleClave(d)]);
  const opcionesContrato: [string, string][] = Object.keys(CONTRATOS).map((c) => [c, legibleClave(c)]);

  /** El rol del catálogo para un texto del Excel; null si se ignora o falta decidir. */
  const rolDe = (valor: string): number | null => {
    const d = decidido("rol", valor);
    if (d !== undefined) return d === null ? null : Number(d);
    const m = masParecida(valor, rolesPorNombre, (r) => r.nombre);
    if (m && m.puntaje === 1) return m.opcion.id;
    if (m && m.puntaje >= 0.85 && m.clara) return m.opcion.id;
    pedir("rol", valor, m && m.puntaje >= 0.4 ? String(m.opcion.id) : null, opcionesRol);
    return null;
  };

  const revision: RevisionDocente[] = [];
  const docentes = lectura.docentes.map((leido, i) => {
    const av: string[] = [];
    const dato = (id: CampoId) => texto(leido.datos[id]);
    const recorte = <K extends keyof Docente | keyof Curso>(campo: K, v: string) => {
      const max = LARGO[campo];
      if (max && v.length > max) {
        av.push(`«${campo}» tenía ${v.length} caracteres; se guardan ${max}.`);
        return v.slice(0, max);
      }
      return v;
    };

    // ---- Dedicación y contrato ----
    const dedTexto = dato("dedicacion");
    let dedicacion = "";
    if (dedTexto) {
      const auto = traducirDedicacion(dedTexto);
      const d = auto ?? decidido("dedicacion", dedTexto);
      if (d) dedicacion = d;
      else if (d === undefined) {
        const m = masParecida(dedTexto, DEDICACIONES, legibleClave);
        pedir("dedicacion", dedTexto, m && m.puntaje >= 0.4 ? m.opcion : null, opcionesDedicacion);
      }
    } else {
      av.push("Sin dedicación: no cuenta en el comparativo por dedicación.");
    }

    const conTexto = dato("tipoContrato");
    let contrato = "";
    if (dedicacion) {
      const auto = conTexto ? traducirContrato(conTexto) : null;
      const unico = contratoUnico(dedicacion);
      if (auto && CONTRATOS[auto]?.[dedicacion]) contrato = auto;
      else if (unico) contrato = unico;
      else {
        // Tiempo completo o medio tiempo sin contrato legible: fijo o
        // indefinido es un dato del docente que el Excel no trae.
        const valor = conTexto || `(sin contrato) ${legibleClave(dedicacion)}`;
        const d = decidido("contrato", valor);
        if (d && CONTRATOS[d]?.[dedicacion]) contrato = d;
        else if (d === undefined) {
          pedir("contrato", valor, "TÉRMINO_FIJO", opcionesContrato.filter(([c]) => CONTRATOS[c][dedicacion]));
        }
      }
    }
    // La base no admite dedicación sin contrato: hasta decidir, ninguna de las dos.
    if (dedicacion && !contrato) dedicacion = "";

    const catTexto = dato("categoria");
    let categoria = "";
    if (catTexto && contrato && dedicacion) {
      categoria = traducirCategoria(catTexto, contrato, dedicacion) ?? "";
      if (!categoria) av.push(`La categoría «${catTexto}» no existe para ${legibleClave(dedicacion)}; queda vacía.`);
    }

    // ---- Datos sueltos ----
    const activo = normalizar(dato("activoSectorExterno"));
    const evaluacion = numero(leido.datos.evaluacionDocente);
    if (evaluacion !== null && (evaluacion < 0 || evaluacion > 5)) av.push(`Evaluación ${evaluacion} fuera de 0–5; queda vacía.`);
    const documento = dato("documento").replace(/[.\s]/g, "");

    const docente: Docente = {
      ...nuevoDocente(),
      documento: recorte("documento", documento),
      nombres: recorte("nombres", dato("nombres")),
      nivelFormacion: recorte("nivelFormacion", aLista(dato("nivelFormacion"), NIVELES_FORMACION)),
      perfilProfesional: dato("perfilProfesional"),
      categoriaMinciencias: recorte("categoriaMinciencias", aLista(dato("categoriaMinciencias"), CATEGORIAS_MINCIENCIAS)),
      activoSectorExterno: activo.startsWith("S") ? "SI" : activo.startsWith("N") ? "NO" : "",
      sectorEjerce: recorte("sectorEjerce", aLista(dato("sectorEjerce"), SECTORES)),
      tipoContrato: contrato,
      dedicacion,
      categoria,
      sede: recorte("sede", aLista(dato("sede"), SEDES)),
      evaluacionDocente: evaluacion !== null && evaluacion >= 0 && evaluacion <= 5 ? Math.round(evaluacion * 100) / 100 : null,
      observaciones: dato("observaciones"),
      // Lo que el Excel registró, no lo que la regla de hoy pondría.
      preparacion: Math.max(0, numero(leido.datos.preparacion) ?? 0),
      atencion: Math.max(0, numero(leido.datos.atencion) ?? 0),
      comunidades: Math.max(0, numero(leido.datos.comunidades) ?? 0),
      cursos: leido.cursos.map((k) => {
        const t = (id: CampoId) => texto(k[id]);
        const semestre = numero(k.semestre);
        const n = (id: CampoId) => {
          const x = numero(k[id]);
          return x === null || x < 0 ? null : x;
        };
        const nombrePrograma = t("nombrePrograma") || programa;
        return {
          ...nuevoCurso(),
          codigoPrograma: recorte("codigoPrograma", t("codigoPrograma") || codigoDePrograma(nombrePrograma)),
          nombrePrograma: recorte("nombrePrograma", nombrePrograma),
          codigoPensum: recorte("codigoPensum", t("codigoPensum")),
          codigoCurso: recorte("codigoCurso", t("codigoCurso")),
          nombreCurso: recorte("nombreCurso", t("nombreCurso")),
          semestre: semestre !== null && semestre >= 1 && semestre <= 10 ? Math.round(semestre) : null,
          grupo: recorte("grupo", t("grupo")),
          jornada: recorte("jornada", aLista(t("jornada"), JORNADAS)),
          intensidadHoraria: n("intensidadHoraria"),
          creditos: n("creditos") === null ? null : Math.min(255, Math.round(n("creditos")!)),
          estudiantes: n("estudiantes") === null ? null : Math.min(32767, Math.round(n("estudiantes")!)),
          modalidad: recorte("modalidad", aLista(t("modalidad"), MODALIDADES)),
        } satisfies Curso;
      }),
      descargas: leido.descargas
        .map((x) => ({ ...nuevaDescarga(), rolId: x.rol ? rolDe(x.rol) : null, horas: Math.max(0, x.horas ?? 0) }))
        .filter((x) => x.rolId !== null || x.horas > 0),
      administrativas: leido.administrativas
        .map((x) => ({ ...nuevaAdministrativa(), rolId: x.rol ? rolDe(x.rol) : null, horas: Math.max(0, x.horas ?? 0) }))
        .filter((x) => x.rolId !== null || x.horas > 0),
    };
    const sinRol = [...docente.descargas, ...docente.administrativas].filter((x) => x.rolId === null && x.horas > 0);
    if (sinRol.length) av.push(`${sinRol.length} actividad(es) con horas y sin rol: no suman a docencia, investigación ni extensión.`);

    revision.push(revisar(leido, docente, config, av, i));
    return docente;
  });

  return { docentes, pendientes: [...pendientes.values()], revision, avisos };
}

/** Lo que el Excel calculó contra lo que calcula el motor. */
function revisar(leido: DocenteLeido, d: Docente, config: Configuracion, avisos: string[], i: number): RevisionDocente {
  const t = calcularTotales(d, config);
  const control = (id: CampoId): number | null => numero(leido.datos[id] as Valor);
  const medidas: [string, CampoId, number][] = [
    ["Gran total de horas", "ctrlGranTotal", t.totalSemanal],
    ["Horas de clase", "ctrlHorasClase", t.horasClase],
    ["Horas de descarga", "ctrlDescargas", t.totalDescargas],
    ["Apoyo académico", "ctrlApoyo", t.apoyoAcademico],
    ["Estudiantes", "ctrlEstudiantes", t.totalEstudiantes],
  ];
  const diferencias: Diferencia[] = [];
  for (const [medida, id, sistema] of medidas) {
    const excel = control(id);
    if (excel !== null && Math.abs(excel - sistema) > 0.05) diferencias.push({ medida, excel, sistema });
  }
  // El total semanal solo cuando no hay gran total: el formato lo calculaba
  // por posición del rol y perdía horas (ver calculo.ts); el gran total no.
  if (control("ctrlGranTotal") === null) {
    const excel = control("ctrlTotalSemanal");
    if (excel !== null && Math.abs(excel - t.totalSemanal) > 0.05) {
      diferencias.push({ medida: "Total horas semanales", excel, sistema: t.totalSemanal });
    }
  }
  return {
    fila: leido.desde,
    nombre: d.nombres || d.documento || `Docente ${i + 1}`,
    dedicacion: d.dedicacion,
    cursos: d.cursos.length,
    totalSemanal: t.totalSemanal,
    diferencias,
    avisos,
  };
}

/* ------------------------------------------------------------------
   Programa y asignación
   ------------------------------------------------------------------ */

/** El programa del catálogo para lo que diga el Excel; null si no hay uno claro. */
export function programaDe(...textos: (string | null | undefined)[]): { programa: string | null; puntaje: number } {
  let mejor: { programa: string | null; puntaje: number } = { programa: null, puntaje: 0 };
  for (const t of textos) {
    if (!t) continue;
    const m = masParecida(t, PROGRAMAS, (p) => p.nombre);
    if (m && m.clara && m.puntaje > mejor.puntaje) mejor = { programa: m.opcion.nombre, puntaje: m.puntaje };
  }
  return mejor.puntaje >= 0.6 ? mejor : { programa: null, puntaje: mejor.puntaje };
}

/** El programa que más se repite en los cursos: el de la hoja si el encabezado no lo dice. */
export function programaDeLosCursos(lectura: LecturaHoja): string | null {
  const cuenta = new Map<string, number>();
  for (const d of lectura.docentes) {
    for (const k of d.cursos) {
      const n = texto(k.nombrePrograma);
      if (n) cuenta.set(n, (cuenta.get(n) ?? 0) + 1);
    }
  }
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export interface Origen {
  archivo: string;
  hoja: string;
  huella: string;
}

/** La nota del evento: de dónde salió, para siempre. */
export const notaDeOrigen = (o: Origen, docentes: number) =>
  `Archivo «${o.archivo}», hoja «${o.hoja}» · huella ${o.huella} · ${docentes} docentes.`;

/** ¿Esta hoja de este archivo ya se importó? Se reconoce por la nota. */
export const yaImportada = (a: Asignacion, o: Origen) =>
  a.bitacora[0]?.tipo === "importada" &&
  Boolean(a.bitacora[0].nota?.includes(`huella ${o.huella}`)) &&
  Boolean(a.bitacora[0].nota?.includes(`hoja «${o.hoja}»`));

export function asignacionImportada(
  datos: { periodo: string; programa: string; docentes: Docente[] },
  origen: Origen,
  autor: string
): Asignacion {
  const ahora = new Date().toISOString();
  const facultad = PROGRAMAS.find((p) => p.nombre === datos.programa)?.facultad ?? "";
  return {
    id: nuevoId(),
    periodo: datos.periodo,
    facultad,
    programa: datos.programa,
    estado: "aprobada",
    version: 0,
    creada: ahora,
    actualizada: ahora,
    docentes: datos.docentes,
    bitacora: [
      nuevoEvento({ tipo: "importada", autor, rolAutor: "ADMIN", fecha: ahora, nota: notaDeOrigen(origen, datos.docentes.length) }),
    ],
  };
}
