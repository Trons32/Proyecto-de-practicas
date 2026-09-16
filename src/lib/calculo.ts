import { ROLES, REGLAS_DEDICACION, TipoRol, type Rol, type ReglaDedicacion } from "./catalogos";
import type { Docente } from "./tipos";

/**
 * Roles y reglas con los que se calcula. Por defecto son los del formato
 * oficial; el administrador puede parametrizarlos y entonces las vistas
 * pasan los suyos. Se mantiene como argumento —y no como import de un
 * store— para que el motor siga siendo puro y verificable fuera de React.
 */
export interface Configuracion {
  roles: Rol[];
  reglas: Record<string, ReglaDedicacion>;
}

export const CONFIG_OFICIAL: Configuracion = { roles: ROLES, reglas: REGLAS_DEDICACION };

/** Una descarga o actividad administrativa, ya clasificada. */
export interface Actividad {
  rol: string;
  horas: number;
  tipo: TipoRol;
  origen: "descarga" | "administrativa";
}

export interface Totales {
  /** Σ intensidad horaria de los cursos (Excel: T = SUM(AT:AT)) */
  horasClase: number;
  /** Σ horas de descargas directas (Excel: U = SUM(S:S)) */
  totalDescargas: number;
  /** Σ horas administrativas */
  totalAdministrativas: number;
  /** preparación + atención + comunidades (Excel: AB) */
  apoyoAcademico: number;
  /** Σ estudiantes de los cursos (Excel: N = SUM(AV:AV)) */
  totalEstudiantes: number;
  /** cursos distintos por código (Excel: O) */
  cursosDiferentes: number;
  /** Excel: AD, AF, AH */
  docencia: number;
  investigacion: number;
  extension: number;
  /** Excel: AJ = AD+AF+AH */
  totalSemanal: number;
  /** Excel: AE, AG, AI — fracciones 0..1 */
  pctDocencia: number;
  pctInvestigacion: number;
  pctExtension: number;
  /** Tope según la dedicación; null si no hay dedicación elegida */
  maxHoras: number | null;
  /** Descargas y administrativas con horas, para el detalle del panel */
  actividades: Actividad[];
}

/**
 * Traducción de las fórmulas matriciales del formato oficial:
 *
 *   AD {=SUM(SUMIF(R,$DU$9:$DU$33,S)+SUMIF(W,$DU$9:$DU$33,X))+T+Y+Z+AA}
 *   AF {=SUM(SUMIF(R,$DU$34:$DU$46,S)+SUMIF(W,$DU$34:$DU$46,X))}
 *   AH {=SUM(SUMIF(R,$DU$47:$DU$56,S)+SUMIF(W,$DU$47:$DU$56,X))}
 *   AJ  =AD+AF+AH
 *
 * La clasificación por posición en la lista de roles se reemplaza por el
 * campo `tipo` del catálogo, lo que además corrige los roles que en el
 * Excel caían fuera de todo rango y perdían sus horas.
 */
export function calcularTotales(d: Docente, config: Configuracion = CONFIG_OFICIAL): Totales {
  const rolPorId = new Map(config.roles.map((r) => [r.id, r]));
  const tipoDeRol = (rolId: number | null): TipoRol | null =>
    rolId === null ? null : (rolPorId.get(rolId)?.tipo ?? null);

  const horasClase = d.cursos.reduce((s, c) => s + (c.intensidadHoraria ?? 0), 0);
  const totalEstudiantes = d.cursos.reduce((s, c) => s + (c.estudiantes ?? 0), 0);
  const cursosDiferentes = new Set(
    d.cursos.map((c) => c.codigoCurso.trim()).filter(Boolean)
  ).size;

  const totalDescargas = d.descargas.reduce((s, x) => s + (x.horas || 0), 0);
  const totalAdministrativas = d.administrativas.reduce((s, x) => s + (x.horas || 0), 0);
  const apoyoAcademico = (d.preparacion || 0) + (d.atencion || 0) + (d.comunidades || 0);

  /**
   * Cada descarga y actividad administrativa, con el rol que la
   * identifica y la categoría a la que suma. Alimenta el detalle del
   * panel de dedicación: sin esto, el coordinador ve el total pero no
   * de dónde sale.
   */
  const actividades: Actividad[] = [
    ...d.descargas.map((x) => ({ x, origen: "descarga" as const })),
    ...d.administrativas.map((x) => ({ x, origen: "administrativa" as const })),
  ]
    .filter(({ x }) => x.rolId !== null && (x.horas || 0) > 0)
    .map(({ x, origen }) => ({
      rol: rolPorId.get(x.rolId as number)?.nombre ?? "Rol sin identificar",
      horas: x.horas || 0,
      tipo: tipoDeRol(x.rolId) ?? "DOCENCIA",
      origen,
    }));

  const porTipo = (tipo: TipoRol) =>
    [...d.descargas, ...d.administrativas]
      .filter((x) => tipoDeRol(x.rolId) === tipo)
      .reduce((s, x) => s + (x.horas || 0), 0);

  const docencia = porTipo("DOCENCIA") + horasClase + apoyoAcademico;
  const investigacion = porTipo("INVESTIGACION");
  const extension = porTipo("EXTENSION");
  const totalSemanal = docencia + investigacion + extension;

  const pct = (n: number) => (totalSemanal > 0 ? n / totalSemanal : 0);

  return {
    horasClase,
    totalDescargas,
    totalAdministrativas,
    apoyoAcademico,
    totalEstudiantes,
    cursosDiferentes,
    docencia,
    investigacion,
    extension,
    totalSemanal,
    pctDocencia: pct(docencia),
    pctInvestigacion: pct(investigacion),
    pctExtension: pct(extension),
    maxHoras: config.reglas[d.dedicacion]?.maxHoras ?? null,
    actividades,
  };
}

export type Severidad = "error" | "aviso";

export interface Hallazgo {
  campo: string;
  mensaje: string;
  severidad: Severidad;
}

/** Validaciones del formato oficial + las reglas de negocio deducidas. */
export function validarDocente(d: Docente, t: Totales): Hallazgo[] {
  const h: Hallazgo[] = [];
  const req = (valor: string, campo: string, etiqueta: string) => {
    if (!valor.trim()) {
      h.push({ campo, mensaje: etiqueta + " es obligatorio.", severidad: "error" });
    }
  };

  req(d.documento, "documento", "El número de documento");
  req(d.nombres, "nombres", "El nombre del docente");
  req(d.nivelFormacion, "nivelFormacion", "El nivel de formación");
  req(d.tipoContrato, "tipoContrato", "El tipo de contrato");
  req(d.dedicacion, "dedicacion", "La dedicación");
  req(d.categoria, "categoria", "La categoría");
  req(d.sede, "sede", "La sede");

  if (d.documento && !/^\d{6,15}$/.test(d.documento.trim())) {
    h.push({
      campo: "documento",
      mensaje: "El documento debe tener entre 6 y 15 dígitos.",
      severidad: "error",
    });
  }

  if (d.evaluacionDocente !== null && (d.evaluacionDocente < 0 || d.evaluacionDocente > 5)) {
    h.push({
      campo: "evaluacionDocente",
      mensaje: "La evaluación docente va de 0 a 5.",
      severidad: "error",
    });
  }

  // El formato exige mayúsculas: EXACT(C9,UPPER(C9))
  if (d.nombres && d.nombres !== d.nombres.toUpperCase()) {
    h.push({ campo: "nombres", mensaje: "El nombre debe ir en mayúsculas.", severidad: "aviso" });
  }

  if (t.maxHoras !== null && t.totalSemanal > t.maxHoras) {
    const ded = d.dedicacion.replace(/_/g, " ").toLowerCase();
    h.push({
      campo: "totalSemanal",
      mensaje:
        "El total (" + t.totalSemanal + " h) supera las " + t.maxHoras + " h de " + ded + ".",
      severidad: "error",
    });
  }

  if (t.maxHoras !== null && t.totalSemanal > 0 && t.totalSemanal < t.maxHoras) {
    h.push({
      campo: "totalSemanal",
      mensaje:
        "Faltan " + (t.maxHoras - t.totalSemanal) + " h para completar las " + t.maxHoras + " h.",
      severidad: "aviso",
    });
  }

  d.descargas.forEach((x, i) => {
    if (x.rolId === null && x.horas > 0) {
      h.push({
        campo: "descarga-" + i,
        mensaje: "Descarga R" + (i + 1) + ": falta seleccionar el rol.",
        severidad: "error",
      });
    }
    if (x.rolId !== null && x.horas <= 0) {
      h.push({
        campo: "descarga-" + i,
        mensaje: "Descarga R" + (i + 1) + ": las horas deben ser mayores a 0.",
        severidad: "error",
      });
    }
  });

  d.administrativas.forEach((x, i) => {
    if (x.rolId === null && x.horas > 0) {
      h.push({
        campo: "admin-" + i,
        mensaje: "Actividad R" + (i + 1) + ": falta seleccionar el rol.",
        severidad: "error",
      });
    }
    if (x.rolId !== null && x.horas <= 0) {
      h.push({
        campo: "admin-" + i,
        mensaje: "Actividad R" + (i + 1) + ": las horas deben ser mayores a 0.",
        severidad: "error",
      });
    }
  });

  const cursosConDatos = d.cursos.filter(
    (c) => c.nombreCurso.trim() || c.codigoCurso.trim() || c.intensidadHoraria
  );

  if (cursosConDatos.length === 0 && t.totalDescargas === 0 && t.totalAdministrativas === 0) {
    h.push({
      campo: "cursos",
      mensaje: "El docente no tiene cursos ni actividades asignadas.",
      severidad: "aviso",
    });
  }

  cursosConDatos.forEach((c, i) => {
    const et = "Curso " + (i + 1);
    if (!c.nombreCurso.trim())
      h.push({ campo: "curso-" + i, mensaje: et + ": falta el nombre.", severidad: "error" });
    if (c.nombreCurso && c.nombreCurso !== c.nombreCurso.toUpperCase())
      h.push({
        campo: "curso-" + i,
        mensaje: et + ": el nombre debe ir en mayúsculas.",
        severidad: "aviso",
      });
    if (!c.intensidadHoraria)
      h.push({ campo: "curso-" + i, mensaje: et + ": falta la intensidad horaria.", severidad: "error" });
    if (!c.creditos)
      h.push({ campo: "curso-" + i, mensaje: et + ": faltan los créditos.", severidad: "error" });
    if (!c.jornada)
      h.push({ campo: "curso-" + i, mensaje: et + ": falta la jornada.", severidad: "error" });
    if (!c.modalidad)
      h.push({ campo: "curso-" + i, mensaje: et + ": falta la modalidad.", severidad: "error" });
  });

  // Mismo curso y mismo grupo repetidos
  const conteo = new Map<string, number>();
  cursosConDatos.forEach((c) => {
    if (!c.codigoCurso.trim()) return;
    const k = c.codigoCurso.trim() + "|" + c.grupo.trim();
    conteo.set(k, (conteo.get(k) ?? 0) + 1);
  });
  conteo.forEach((n, k) => {
    if (n > 1) {
      const [cod, grp] = k.split("|");
      h.push({
        campo: "cursos",
        mensaje: "El curso " + cod + " grupo " + (grp || "—") + " está repetido.",
        severidad: "error",
      });
    }
  });

  return h;
}

export const formatoPct = (v: number) => Math.round(v * 100) + "%";
