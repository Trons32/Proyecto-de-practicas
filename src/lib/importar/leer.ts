/**
 * Leer una hoja de asignación de cualquier año (SPEC-017). Puro.
 *
 *   1. Encabezado: la fila, entre las 40 primeras, cuyos títulos reconocen
 *      más campos. El grupo es la fila de arriba («DESCARGAS DIRECTAS»).
 *   2. Columnas: cada campo a la columna que mejor lo describe, sin que dos
 *      campos se queden con la misma. El administrador puede corregirlo.
 *   3. Docentes: un bloque de filas por docente. Empieza donde cambia la
 *      celda de la primera columna de identidad (No., documento, nombre):
 *      una celda combinada nueva, o un valor distinto del de arriba. Una
 *      celda vacía y suelta sigue al docente anterior: así se leen tanto
 *      el formato de bloques combinados como el que solo llena la primera fila.
 *   4. Dentro del bloque: una fila con curso es un curso; cada celda de
 *      rol (contada una vez aunque esté combinada) es una descarga o una
 *      actividad administrativa con sus horas al lado.
 *
 * Aquí no se decide nada sobre catálogos: se devuelve el texto tal cual
 * para que `armar.ts` lo traduzca y pregunte lo dudoso.
 */
import { CAMPOS, puntaje, type CampoId } from "./campos";
import type { Hoja, Valor } from "./hoja";
import { normalizar, numero, periodoEn, texto } from "./texto";

/** Qué columnas son de cada campo. Varias solo en roles y horas de rol. */
export type Mapeo = Partial<Record<CampoId, number[]>>;

export interface ColumnaHoja {
  col: number;
  /** El título tal cual, con su grupo si lo tiene: «DESCARGAS DIRECTAS › DEDICACIÓN HORAS». */
  titulo: string;
}

export interface ActividadLeida {
  rol: string;
  horas: number | null;
  fila: number;
}

export type CursoLeido = Partial<Record<CampoId, Valor>> & { fila: number };

export interface DocenteLeido {
  /** Primera y última fila del bloque, para que el administrador lo encuentre en el Excel. */
  desde: number;
  hasta: number;
  datos: Partial<Record<CampoId, Valor>>;
  cursos: CursoLeido[];
  descargas: ActividadLeida[];
  administrativas: ActividadLeida[];
}

export interface LecturaHoja {
  hoja: string;
  /** Fila del encabezado; 0 si no se encontró. */
  filaEncabezado: number;
  columnas: ColumnaHoja[];
  mapeo: Mapeo;
  /** Lo que diga el encabezado o el nombre de la hoja; null si nada. */
  periodo: string | null;
  programa: string | null;
  facultad: string | null;
  docentes: DocenteLeido[];
  /** Por qué no parece una hoja de asignación, si no lo parece. */
  descarte: string | null;
  avisos: string[];
}

const FILAS_BUSQUEDA = 40;
/** Con menos campos reconocidos no es una tabla de asignación: es una lista, una portada… */
const MINIMO_CAMPOS = 4;

/** Filas que cierran la tabla: totales y firmas al pie. */
const FIN_DE_TABLA = /^(TOTAL(ES)?( GENERAL)?|GRAN TOTAL|FIRMA|ELABORO|ELABORADO|APROBO|APROBADO|REVISO|REVISADO|VO BO|V B)\b/;
/** «R 1», «R2»: el rótulo del formato en la casilla de rol vacía. */
const ROTULO_ROL = /^R ?\d+$/;
/** La fila de totales de cada bloque («TOTAL DE HORAS DESCARGA DIRECTA») cae en la columna de rol. */
const TOTAL_EN_ROL = /^(TOTAL|SUBTOTAL)\b/;

function tituloDe(h: Hoja, fila: number, c: number): { columna: string; grupo: string } {
  const columna = normalizar(h.valor(fila, c));
  // Una celda combinada a lo alto (No., GRAN TOTAL) repite su texto arriba:
  // eso no es un grupo.
  const arriba = fila > 1 ? normalizar(h.valor(fila - 1, c)) : "";
  return { columna, grupo: arriba === columna ? "" : arriba };
}

/**
 * Las columnas de la tabla. El formato oficial guarda sus listas
 * desplegables lejos a la derecha (DU:EE) con títulos que parecen campos
 * («DECANO», roles…). La tabla es el tramo de títulos contiguo —se
 * toleran tres columnas vacías— donde caen más campos reconocidos.
 */
function bloquePrincipal(h: Hoja, fila: number, reconocidas: number[]): Set<number> {
  const tramos: number[][] = [];
  let vacias = Infinity;
  for (let c = 1; c <= h.columnas; c++) {
    const lleno = Boolean(normalizar(h.valor(fila, c))) || Boolean(fila > 1 && normalizar(h.valor(fila - 1, c)));
    if (!lleno) {
      vacias++;
      continue;
    }
    if (vacias > 3) tramos.push([]);
    tramos[tramos.length - 1].push(c);
    vacias = 0;
  }
  const cuenta = (t: number[]) => reconocidas.filter((c) => t.includes(c)).length;
  const mejor = tramos.sort((a, b) => cuenta(b) - cuenta(a))[0] ?? [];
  return new Set(mejor);
}

/** Cada campo a su mejor columna; empates para el primero que llega. */
export function asignarColumnas(h: Hoja, fila: number): Mapeo {
  type Candidato = { id: CampoId; col: number; p: number; varias: boolean };
  const candidatos: Candidato[] = [];
  for (let c = 1; c <= h.columnas; c++) {
    const { columna, grupo } = tituloDe(h, fila, c);
    if (!columna) continue;
    for (const def of CAMPOS) {
      const p = puntaje(def, columna, grupo);
      if (p > 0) candidatos.push({ id: def.id, col: c, p, varias: Boolean(def.varias) });
    }
  }
  candidatos.sort((a, b) => b.p - a.p || a.col - b.col);
  const enTabla = bloquePrincipal(h, fila, candidatos.map((k) => k.col));

  const mapeo: Mapeo = {};
  const usadas = new Set<number>();
  for (const k of candidatos) {
    if (usadas.has(k.col)) continue;
    if (!enTabla.has(k.col)) continue;
    const ya = mapeo[k.id];
    if (ya && !k.varias) continue;
    mapeo[k.id] = [...(ya ?? []), k.col].sort((a, b) => a - b);
    usadas.add(k.col);
  }

  // Sin grupos, «NÚMERO DE ESTUDIANTES» del docente y el del curso se
  // titulan igual. El del curso es el que está entre los demás campos del curso.
  const cursoCols = (["nombreCurso", "codigoCurso", "intensidadHoraria", "creditos"] as CampoId[])
    .flatMap((id) => mapeo[id] ?? []);
  if (!mapeo.estudiantes && mapeo.ctrlEstudiantes && cursoCols.length) {
    const centro = cursoCols.reduce((s, c) => s + c, 0) / cursoCols.length;
    const sueltas = [...mapeo.ctrlEstudiantes];
    for (let c = 1; c <= h.columnas; c++) {
      const { columna } = tituloDe(h, fila, c);
      if (/ESTUDIANTES|MATRICULADOS|ALUMNOS/.test(columna) && !usadas.has(c)) sueltas.push(c);
    }
    const cerca = sueltas.sort((a, b) => Math.abs(a - centro) - Math.abs(b - centro))[0];
    const lejos = sueltas.find((c) => c !== cerca);
    mapeo.estudiantes = [cerca];
    if (lejos !== undefined) mapeo.ctrlEstudiantes = [lejos];
    else delete mapeo.ctrlEstudiantes;
  }
  return mapeo;
}

const camposReconocidos = (m: Mapeo) => Object.keys(m).length;

/** La fila de encabezado: la que más campos reconoce, y que tenga docente y curso. */
export function buscarEncabezado(h: Hoja): { fila: number; mapeo: Mapeo } | null {
  let mejor: { fila: number; mapeo: Mapeo } | null = null;
  for (let f = 1; f <= Math.min(FILAS_BUSQUEDA, h.filas); f++) {
    const mapeo = asignarColumnas(h, f);
    const tieneDocente = mapeo.nombres || mapeo.documento || mapeo.dedicacion;
    const tieneCurso = mapeo.nombreCurso || mapeo.codigoCurso || mapeo.intensidadHoraria;
    if (!tieneDocente || !tieneCurso) continue;
    if (!mejor || camposReconocidos(mapeo) > camposReconocidos(mejor.mapeo)) mejor = { fila: f, mapeo };
  }
  return mejor && camposReconocidos(mejor.mapeo) >= MINIMO_CAMPOS ? mejor : null;
}

/**
 * «PROGRAMA: DERECHO» en el encabezado: la etiqueta en una celda y el valor
 * en la primera celda distinta a su derecha (o en la misma, tras los dos puntos).
 */
function etiquetado(h: Hoja, hasta: number, etiqueta: RegExp): string | null {
  for (let f = 1; f < hasta; f++) {
    for (let c = 1; c <= Math.min(h.columnas, 60); c++) {
      const crudo = texto(h.valor(f, c));
      const n = normalizar(crudo);
      if (!etiqueta.test(n)) continue;
      const tras = crudo.split(":").slice(1).join(":").trim();
      if (tras) return tras;
      for (let d = c + 1; d <= Math.min(h.columnas, c + 30); d++) {
        const v = texto(h.valor(f, d));
        if (v && normalizar(v) !== n) return v;
      }
    }
  }
  return null;
}

export function leerHoja(h: Hoja, opciones: { archivo?: string; mapeo?: Mapeo; filaEncabezado?: number } = {}): LecturaHoja {
  const avisos: string[] = [];
  const auto = buscarEncabezado(h);
  const fila = opciones.filaEncabezado ?? auto?.fila ?? 0;
  // Aunque la hoja se descarte, sus columnas se devuelven: con ellas el
  // administrador puede señalar a mano qué es cada una.
  const columnas: ColumnaHoja[] = [];
  for (let c = 1; fila && c <= h.columnas; c++) {
    const col = texto(h.valor(fila, c));
    if (!col) continue;
    const arriba = fila > 1 ? texto(h.valor(fila - 1, c)) : "";
    columnas.push({ col: c, titulo: arriba && arriba !== col ? `${arriba} › ${col}` : col });
  }
  const mapeo: Mapeo = fila ? (opciones.mapeo ?? (opciones.filaEncabezado || !auto ? asignarColumnas(h, fila) : auto.mapeo)) : {};
  const vacia = (descarte: string): LecturaHoja => ({
    hoja: h.nombre, filaEncabezado: fila, columnas, mapeo, periodo: null, programa: null,
    facultad: null, docentes: [], descarte, avisos,
  });
  if (!fila) {
    return vacia("No tiene una fila de encabezados con datos del docente y de sus cursos.");
  }

  // ---- Metadatos: encabezado, nombre de la hoja y del archivo ----
  const textosArriba: string[] = [];
  for (let f = 1; f < fila; f++) for (let c = 1; c <= Math.min(h.columnas, 60); c++) textosArriba.push(texto(h.valor(f, c)));
  const periodo =
    periodoEn(etiquetado(h, fila, /PERIODO|SEMESTRE ACADEMICO/)) ??
    periodoEn(h.nombre) ??
    textosArriba.map(periodoEn).find(Boolean) ??
    periodoEn(opciones.archivo ?? "") ??
    null;
  const programa = etiquetado(h, fila, /^(NOMBRE DEL )?PROGRAMA( ACADEMICO)?\b/);
  const facultad = etiquetado(h, fila, /^FACULTAD\b/);

  // ---- Docentes ----
  const primero = (id: CampoId) => mapeo[id]?.[0];
  const identidad = (["numero", "documento", "nombres", "dedicacion"] as CampoId[]).map(primero).find((c) => c !== undefined);
  if (identidad === undefined) return vacia("No se reconoció ninguna columna que identifique al docente.");

  const docentes: DocenteLeido[] = [];
  let actual: DocenteLeido | null = null;
  let claveActual: string | null = null;
  /** Celdas de rol ya contadas: una combinada de tres filas es un solo rol. */
  const contadas = new Set<string>();

  const valorCampo = (f: number, id: CampoId): Valor => {
    const c = primero(id);
    return c === undefined ? null : h.valor(f, c);
  };
  /**
   * Una fila con un mismo texto a lo ancho de media tabla es un título de
   * otra sección («DOCENTES SALIENTES», «CUADRO RESUMEN»): ahí acaba la
   * tabla de docentes, aunque el Excel siga.
   */
  const columnasMapeadas = [...new Set(Object.values(mapeo).flat())] as number[];
  const esTitular = (f: number) => {
    const cuenta = new Map<string, number>();
    for (const c of columnasMapeadas) {
      const v = normalizar(h.valor(f, c));
      if (v && numero(v) === null) cuenta.set(v, (cuenta.get(v) ?? 0) + 1);
    }
    return Math.max(0, ...cuenta.values()) >= Math.max(5, columnasMapeadas.length / 2);
  };
  const filaVacia = (f: number) => {
    for (const cols of Object.values(mapeo)) for (const c of cols ?? []) if (texto(h.valor(f, c))) return false;
    return true;
  };

  for (let f = fila + 1; f <= h.filas; f++) {
    const primeraCelda = normalizar(h.valor(f, identidad));
    if (FIN_DE_TABLA.test(primeraCelda) || FIN_DE_TABLA.test(normalizar(h.valor(f, 1)))) break;
    if (filaVacia(f)) continue;
    if (esTitular(f)) break;

    const maestra = h.maestra(f, identidad);
    const v = texto(h.valor(f, identidad));
    const clave = maestra ? `m${maestra}` : v ? `v${v}` : null;
    if (clave && clave !== claveActual) {
      actual = { desde: f, hasta: f, datos: {}, cursos: [], descargas: [], administrativas: [] };
      docentes.push(actual);
      claveActual = clave;
      contadas.clear();
    }
    if (!actual) continue; // filas antes del primer docente
    actual.hasta = f;

    // Datos del docente: el primer valor no vacío del bloque.
    for (const def of CAMPOS) {
      if (def.ambito !== "docente" && def.ambito !== "control") continue;
      if (actual.datos[def.id] !== undefined) continue;
      // Lo calculado solo en la primera fila: exceljs no guarda el
      // resultado de una fórmula que da 0, y más abajo lo único con valor
      // sería la fila de totales del bloque, que suma otra cosa.
      if (def.ambito === "control" && f !== actual.desde) continue;
      const x = valorCampo(f, def.id);
      if (texto(x)) actual.datos[def.id] = x;
    }

    // Un curso por fila.
    const nombreCurso = texto(valorCampo(f, "nombreCurso"));
    const codigoCurso = texto(valorCampo(f, "codigoCurso"));
    const ih = numero(valorCampo(f, "intensidadHoraria"));
    if (nombreCurso || codigoCurso || (ih !== null && ih > 0)) {
      const curso: CursoLeido = { fila: f };
      for (const def of CAMPOS) if (def.ambito === "curso") curso[def.id] = valorCampo(f, def.id);
      // Una combinada vertical en un campo de curso repetiría el curso de arriba.
      const maestraCurso = primero("nombreCurso") ?? primero("codigoCurso");
      const m = maestraCurso !== undefined ? h.maestra(f, maestraCurso) : null;
      if (!m || !contadas.has(`curso${m}`)) {
        actual.cursos.push(curso);
        if (m) contadas.add(`curso${m}`);
      }
    }

    // Roles: cada columna de rol con su columna de horas, en orden.
    const roles = (rolId: CampoId, horasId: CampoId, destino: ActividadLeida[]) => {
      const rolCols = mapeo[rolId] ?? [];
      const horasCols = mapeo[horasId] ?? [];
      rolCols.forEach((rc, i) => {
        const llave = `${rolId}${h.maestra(f, rc) ?? `${f}:${rc}`}`;
        if (contadas.has(llave)) return;
        const rol = texto(h.valor(f, rc));
        if (TOTAL_EN_ROL.test(normalizar(rol))) return;
        const hc = horasCols[i] ?? horasCols[0];
        const horas = hc !== undefined ? numero(h.valor(f, hc)) : null;
        if ((!rol || ROTULO_ROL.test(normalizar(rol))) && !horas) return;
        contadas.add(llave);
        destino.push({ rol: ROTULO_ROL.test(normalizar(rol)) ? "" : rol, horas, fila: f });
      });
    };
    roles("descargaRol", "descargaHoras", actual.descargas);
    roles("adminRol", "adminHoras", actual.administrativas);
  }

  // Un bloque sin nada propio es una fila suelta (un subtítulo, una nota): fuera.
  const conDatos = docentes.filter(
    (d) => d.cursos.length || d.descargas.length || d.administrativas.length || d.datos.nombres || d.datos.documento || d.datos.dedicacion
  );
  if (conDatos.length < docentes.length) {
    avisos.push(`Se ignoraron ${docentes.length - conDatos.length} bloques sin docente, cursos ni roles.`);
  }
  if (!conDatos.length) return { ...vacia("La tabla no tiene docentes."), periodo, programa, facultad };

  return { hoja: h.nombre, filaEncabezado: fila, columnas, mapeo, periodo, programa, facultad, docentes: conDatos, descarte: null, avisos };
}
