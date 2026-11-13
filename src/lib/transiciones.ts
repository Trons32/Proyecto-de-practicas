/**
 * Qué cambios admite una asignación, comprobado del lado del servidor.
 *
 * El store ya impone el ciclo de vida, pero el store vive en el navegador:
 * quien manipule la petición puede mandar una asignación aprobada con otros
 * docentes, o saltarse la revisión. Aquí se compara lo que hay en la base
 * con lo que llega y se exige que la diferencia se explique con los eventos
 * nuevos de la bitácora, en el orden del ciclo:
 *
 *   enviada                  borrador            → enviada        (versión + 1)
 *   reenviada                en_correccion       → enviada        (versión + 1)
 *   revision_abierta         enviada             → en_revision
 *   aprobada                 enviada|en_revision → aprobada
 *   devuelta                 enviada|en_revision → en_correccion  (con plazo)
 *   reabierta_por_parametros aprobada            → en_correccion  (con plazo)
 *
 * Aparte, la importación (SPEC-017): una asignación nueva puede nacer
 * aprobada si su único evento es `importada` y lo registra el
 * administrador. Después no admite ningún evento ni cambio: es el
 * expediente de un periodo cerrado.
 *
 * Puro, como `calculo.ts`: se verifica con `verificar-transiciones.ts`.
 *
 * `actor` es el usuario de la sesión del servidor (SPEC-008): los eventos
 * nuevos tienen que llevar su nombre y su rol. Sin eso, `rolAutor` sería lo
 * que el navegador quisiera declarar.
 */
import { cursosBase, esEditable, esImportada, type Asignacion, type EstadoAsignacion, type Evento, type TipoEvento } from "./tipos";

interface Paso {
  desde: EstadoAsignacion[];
  hacia: EstadoAsignacion;
  rol: Evento["rolAutor"] | null;
  subeVersion?: boolean;
  conPlazo?: boolean;
}

const PASOS: Partial<Record<TipoEvento, Paso>> = {
  enviada: { desde: ["borrador"], hacia: "enviada", rol: null, subeVersion: true },
  reenviada: { desde: ["en_correccion"], hacia: "enviada", rol: null, subeVersion: true },
  revision_abierta: { desde: ["enviada"], hacia: "en_revision", rol: "ADMIN" },
  aprobada: { desde: ["enviada", "en_revision"], hacia: "aprobada", rol: "ADMIN" },
  devuelta: { desde: ["enviada", "en_revision"], hacia: "en_correccion", rol: "ADMIN", conPlazo: true },
  reabierta_por_parametros: { desde: ["aprobada"], hacia: "en_correccion", rol: "ADMIN", conPlazo: true },
};

/**
 * JSON comparable: claves ordenadas y números a un decimal. La base guarda
 * DECIMAL(5,1) y DECIMAL(3,2); sin redondear, un 4.257 escrito y un 4.26
 * leído parecerían una edición.
 */
const comparable = (v: unknown): string =>
  JSON.stringify(v, (_k, x) =>
    typeof x === "number"
      ? Math.round(x * 10) / 10
      : x && typeof x === "object" && !Array.isArray(x)
        ? Object.fromEntries(Object.entries(x).sort(([p], [q]) => p.localeCompare(q)))
        : x
  );

const contenido = (a: Asignacion) =>
  comparable({ periodo: a.periodo, facultad: a.facultad, programa: a.programa, docentes: a.docentes });

const mismoInstante = (x?: string, y?: string) =>
  (x ? Date.parse(x) : null) === (y ? Date.parse(y) : null);

export interface Actor {
  nombres: string;
  rol: Evento["rolAutor"];
}

/** null si el cambio es legal; si no, el motivo, dicho para el usuario. */
export function revisarGuardado(anterior: Asignacion | undefined, nueva: Asignacion, actor?: Actor): string | null {
  if (!anterior && esImportada(nueva)) return revisarImportacion(nueva, actor);
  if (anterior && esImportada(anterior)) {
    const igual =
      nueva.estado === anterior.estado &&
      nueva.version === anterior.version &&
      nueva.bitacora.length === anterior.bitacora.length &&
      !nueva.lineaBase &&
      contenido(nueva) === contenido(anterior);
    return igual ? null : "Una asignación importada no se modifica.";
  }
  if (!anterior) {
    const [creada, ...resto] = nueva.bitacora;
    // El rol del evento de creación lo fija `nuevaAsignacion`; el nombre sí
    // tiene que ser el de quien la crea.
    if (actor && creada && creada.autor !== actor.nombres) return "La asignación tiene que quedar a nombre de quien la crea.";
    if (nueva.estado !== "borrador" || nueva.version !== 0) {
      return "Una asignación nueva solo puede empezar como borrador.";
    }
    if (creada?.tipo !== "creada" || resto.length > 0) {
      return "Una asignación nueva solo lleva el evento de creación.";
    }
    if (nueva.lineaBase) return "Una asignación nueva no tiene línea base: se fija al aprobarla.";
    return null;
  }

  // La bitácora solo crece: lo guardado tiene que seguir ahí, igual y en orden.
  const previos = anterior.bitacora.map((e) => e.id);
  if (nueva.bitacora.length < previos.length || previos.some((id, i) => nueva.bitacora[i].id !== id)) {
    return "La bitácora no se puede reescribir.";
  }
  if (nueva.creada !== anterior.creada && !mismoInstante(nueva.creada, anterior.creada)) {
    return "La fecha de creación no se puede cambiar.";
  }

  // Se recorre el ciclo con los eventos nuevos, desde lo guardado.
  let estado = anterior.estado;
  let version = anterior.version;
  let plazo = anterior.plazoCorreccion;
  // Las ediciones de contenido que lleguen junto con un envío ocurrieron antes de él.
  const editableAlEmpezar = esEditable(anterior.estado);

  for (const e of nueva.bitacora.slice(previos.length)) {
    const paso = PASOS[e.tipo];
    if (!paso) return `El evento «${e.tipo}» no puede repetirse.`;
    if (!paso.desde.includes(estado)) return `No se puede pasar de «${estado}» con «${e.tipo}».`;
    if (paso.rol && (e.rolAutor !== paso.rol || (actor && actor.rol !== paso.rol))) {
      return `Solo el administrador puede registrar «${e.tipo}».`;
    }
    if (actor && (e.autor !== actor.nombres || e.rolAutor !== actor.rol)) {
      return "Un evento solo puede registrarse a nombre de quien lo hace.";
    }
    if (paso.conPlazo && !e.plazo) return `«${e.tipo}» exige un plazo de corrección.`;
    if (paso.subeVersion) version++;
    if (e.version !== undefined && e.version !== version) return `El evento «${e.tipo}» no corresponde a la versión ${version}.`;
    estado = paso.hacia;
    plazo = paso.conPlazo ? e.plazo : paso.hacia === "enviada" ? undefined : plazo;
  }

  if (nueva.estado !== estado) return `El estado «${nueva.estado}» no se explica con la bitácora.`;
  if (nueva.version !== version) return "La versión no se explica con la bitácora.";
  if (estado === "en_correccion" && !mismoInstante(nueva.plazoCorreccion, plazo)) {
    return "El plazo de corrección solo se fija al devolver o reabrir.";
  }
  const cambioContenido = contenido(nueva) !== contenido(anterior);
  // La administración decide sobre el ciclo (aprobar, devolver o reabrir),
  // pero no sustituye al coordinador al diligenciar la carga docente.
  if (actor?.rol === "ADMIN" && cambioContenido) {
    return "El administrador solo puede revisar la información del docente.";
  }
  if (!editableAlEmpezar && cambioContenido) {
    return "La asignación ya fue entregada: sus docentes no se pueden modificar.";
  }
  return revisarLineaBase(anterior, nueva);
}

/**
 * La línea base (SPEC-009) es lo proyectado: se fija en la primera
 * aprobación, con los cursos de ese momento, y no cambia nunca. Si pudiera
 * moverse, la proyección compararía lo vigente consigo mismo.
 */
function revisarLineaBase(anterior: Asignacion, nueva: Asignacion): string | null {
  if (anterior.lineaBase) {
    return comparable(nueva.lineaBase) === comparable(anterior.lineaBase)
      ? null
      : "La línea base de la proyección no se puede cambiar.";
  }
  const aprobadaAhora = nueva.bitacora.slice(anterior.bitacora.length).some((e) => e.tipo === "aprobada");
  if (!nueva.lineaBase) {
    // Lo aprobado antes de SPEC-009 sigue sin línea base, y está bien; lo
    // que se aprueba desde ahora tiene que llevarla.
    return aprobadaAhora ? "Aprobar fija la línea base de la proyección." : null;
  }
  if (!aprobadaAhora) return "La línea base solo se fija al aprobar.";
  return comparable(nueva.lineaBase.cursos) === comparable(cursosBase(nueva.docentes))
    ? null
    : "La línea base tiene que ser lo que se está aprobando.";
}

/**
 * Una importada nace aprobada, a nombre del administrador, con un solo
 * evento que dice de qué archivo salió. No lleva línea base: no hubo
 * proyección que comparar.
 */
function revisarImportacion(nueva: Asignacion, actor?: Actor): string | null {
  const [evento, ...resto] = nueva.bitacora;
  if (resto.length > 0) return "Una asignación importada solo lleva el evento de importación.";
  if (evento.rolAutor !== "ADMIN" || (actor && actor.rol !== "ADMIN")) {
    return "Solo el administrador importa asignaciones.";
  }
  if (actor && evento.autor !== actor.nombres) return "La importación tiene que quedar a nombre de quien la hace.";
  if (!evento.nota) return "La importación tiene que decir de qué archivo salió.";
  if (nueva.estado !== "aprobada" || nueva.version !== 0) return "Una asignación importada nace aprobada, en la versión 0.";
  if (nueva.lineaBase) return "Una asignación importada no tiene línea base.";
  return null;
}

/**
 * Solo un borrador que nunca se entregó se puede eliminar: lo demás tiene
 * expediente. La excepción es una importada, que el administrador puede
 * reemplazar por otra lectura del mismo periodo: su expediente es el Excel.
 */
export function revisarBorrado(anterior: Asignacion | undefined, actor?: Actor): string | null {
  if (!anterior) return null;
  if (esImportada(anterior)) {
    return actor && actor.rol !== "ADMIN" ? "Solo el administrador reemplaza una asignación importada." : null;
  }
  return anterior.estado === "borrador" && anterior.version === 0
    ? null
    : "Una asignación que ya se entregó no se puede eliminar.";
}
