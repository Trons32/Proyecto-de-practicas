"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  CONTRATOS,
  NIVELES_FORMACION,
  CATEGORIAS_MINCIENCIAS,
  SECTORES,
  SEDES,
  JORNADAS,
  MODALIDADES,
  PROGRAMAS,
  SEMESTRES,
  GRUPOS,
  codigoDePrograma,
  type Rol as RolDescarga,
} from "@/lib/catalogos";
import { useConfigStore } from "@/lib/stores/config-store";
import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import { completarDocente, type FichaDirectorio } from "@/lib/directorio";
import { useDirectorio } from "@/lib/usar-directorio";
import SugerenciasCedula from "./SugerenciasCedula";
import { buscarFicha, catalogoDeCursos, completarCurso, fichasDePrograma, grupoSiguiente, resumenCurso } from "@/lib/cursos-conocidos";
import {
  Docente,
  Curso,
  Descarga,
  Administrativa,
  nuevaDescarga,
  nuevaAdministrativa,
  nuevoCurso,
  aplicarReglaDedicacion,
} from "@/lib/tipos";
import { calcularTotales, validarDocente, Hallazgo, Totales } from "@/lib/calculo";
import { REGLAS, type CamposDocente } from "@/lib/esquema-docente";
import { Campo, Contador, Entrada, Seleccion, Seccion, SelectorBuscable, Boton, Insignia, type OpcionBuscable } from "./ui";
import { sileo } from "@/lib/toast";
import { FiPlus, FiTrash2, FiRefreshCw, FiSave, FiCopy, FiChevronDown, FiAlertCircle, FiCheckCircle } from "./iconos";

const ETIQUETA_TIPO = {
  DOCENCIA: "Docencia",
  INVESTIGACION: "Investigación",
  EXTENSION: "Extensión",
} as const;

/** El tipo no va en el texto de la opción: lo muestra la insignia de al lado. */
// Se construye dentro del componente: los roles son parametrizables.

/** Le falta algo obligatorio: no se puede guardar así. */
const cursoIncompleto = (c: Curso) =>
  !c.nombreCurso.trim() || !c.intensidadHoraria || !c.creditos || !c.jornada || !c.modalidad;

/** Los tres componentes del apoyo académico, en el orden del formato. */
const APOYO = [
  { clave: "preparacion", etiqueta: "Preparación de clases" },
  { clave: "atencion", etiqueta: "Atención a estudiantes" },
  { clave: "comunidades", etiqueta: "Comunidades académicas" },
] as const;

export default function FormularioDocente({
  docente,
  totales,
  hallazgos,
  programaPorDefecto,
  onCambio,
  onGuardar,
  pasoActivo,
  soloLectura = false,
}: {
  docente: Docente;
  totales: Totales;
  hallazgos: Hallazgo[];
  programaPorDefecto: string;
  onCambio: (d: Docente) => void;
  onGuardar: (d: Docente) => void;
  pasoActivo: number;
  soloLectura?: boolean;
}) {
  const [filasPendientes, setFilasPendientes] = useState<Set<string>>(new Set());
  const set = <K extends keyof Docente>(campo: K, valor: Docente[K]) =>
    onCambio({ ...docente, [campo]: valor });

  /**
   * react-hook-form valida los datos identificatorios del docente y da el
   * feedback al salir de cada campo. El estado de verdad sigue siendo el
   * store: cada cambio se propaga con `set` para que los totales se
   * recalculen en vivo.
   */
  const {
    register,
    trigger,
    formState: { errors: erroresRHF },
  } = useForm<CamposDocente>({
    mode: "onBlur",
    values: {
      documento: docente.documento,
      nombres: docente.nombres,
      nivelFormacion: docente.nivelFormacion,
      tipoContrato: docente.tipoContrato,
      dedicacion: docente.dedicacion,
      categoria: docente.categoria,
      sede: docente.sede,
      evaluacionDocente: docente.evaluacionDocente,
    },
  });

  /** Une el registro de RHF con la escritura al store. */
  const campo = <K extends keyof CamposDocente>(
    nombre: K,
    alCambiar: (valor: string) => void
  ) => {
    const { onChange, onBlur, ref } = register(nombre, REGLAS[nombre]);
    return {
      ref,
      onBlur,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        alCambiar(e.target.value);
        void onChange(e);
      },
    };
  };

  const errores = useMemo(() => {
    const m = new Set<string>();
    hallazgos.filter((h) => h.severidad === "error").forEach((h) => m.add(h.campo));
    return m;
  }, [hallazgos]);

  /** Mensaje a mostrar: primero el de RHF, si no el del motor de cálculo. */
  const mensajeDe = (nombre: keyof CamposDocente, ayuda?: string) =>
    (erroresRHF[nombre]?.message as string | undefined) ?? ayuda;

  const invalido = (nombre: keyof CamposDocente) =>
    Boolean(erroresRHF[nombre]) || errores.has(nombre);

  // Roles, reglas y límites son parametrizables por el administrador.
  const roles = useConfigStore((s) => s.roles);
  const reglas = useConfigStore((s) => s.reglas);
  const limites = useConfigStore((s) => s.limites);

  const dedicaciones = docente.tipoContrato ? Object.keys(CONTRATOS[docente.tipoContrato] ?? {}) : [];
  const categorias =
    docente.tipoContrato && docente.dedicacion
      ? (CONTRATOS[docente.tipoContrato]?.[docente.dedicacion] ?? [])
      : [];

  // Los inactivos no se ofrecen, salvo el que el docente ya tiene: si no,
  // el desplegable lo mostraría vacío y parecería que se perdió (SPEC-012).
  const OPCIONES_ROL = useMemo(() => {
    const enUso = new Set([...docente.descargas, ...docente.administrativas].map((x) => x.rolId));
    // Agrupados por tipo y en orden alfabético (SPEC-020): en el orden del
    // formato, 56 nombres seguidos no se dejaban recorrer.
    const orden = ["DOCENCIA", "INVESTIGACION", "EXTENSION"] as const;
    return roles
      .filter((r) => !r.inactivo || enUso.has(r.id))
      .sort((a, b) => orden.indexOf(a.tipo) - orden.indexOf(b.tipo) || a.nombre.localeCompare(b.nombre, "es"))
      .map((r): OpcionBuscable => ({
        valor: String(r.id),
        texto: r.inactivo ? `${r.nombre} (inactivo)` : r.nombre,
        grupo: ETIQUETA_TIPO[r.tipo],
      }));
  }, [roles, docente.descargas, docente.administrativas]);

  const regla = reglas[docente.dedicacion];
  const apoyoInicializado = useRef<string | null>(null);

  useEffect(() => {
    if (!regla || soloLectura) return;
    const clave = `${docente.id}:${docente.dedicacion}:${regla.preparacion}:${regla.atencion}:${regla.comunidades}`;
    if (apoyoInicializado.current === clave) return;
    apoyoInicializado.current = clave;

    // Los docentes creados antes de escoger la dedicación conservan ceros.
    // Al abrirlos por primera vez se ofrecen los valores institucionales, sin
    // volver a imponerlos después de que el coordinador los ajuste.
    if (docente.preparacion === 0 && docente.atencion === 0 && docente.comunidades === 0) {
      onCambio({
        ...docente,
        preparacion: regla.preparacion,
        atencion: regla.atencion,
        comunidades: regla.comunidades,
      });
    }
  }, [docente, onCambio, regla, soloLectura]);

  /**
   * Las horas de apoyo se precargan desde la dedicación, pero el
   * coordinador puede ajustarlas: la carga real cambia a medida que
   * completa la asignación. `ajustado` solo sirve para ofrecer la vuelta
   * a los valores del formato institucional.
   */
  const ajustado = Boolean(regla) && APOYO.some(({ clave }) => docente[clave] !== regla[clave]);

  const restaurarApoyo = () => {
    if (!regla) return;
    onCambio({
      ...docente,
      preparacion: regla.preparacion,
      atencion: regla.atencion,
      comunidades: regla.comunidades,
    });
    sileo.info({
      title: "Horas de apoyo restauradas",
      description: `${regla.preparacion} + ${regla.atencion} + ${regla.comunidades} h según la dedicación.`,
    });
  };

  /* Avisa una sola vez al cruzar el tope de horas, no en cada pulsación. */
  const excede = totales.maxHoras !== null && totales.totalSemanal > totales.maxHoras;
  const excedeAnterior = useRef(false);

  useEffect(() => {
    if (excede && !excedeAnterior.current) {
      sileo.warning({
        title: "Se superó el máximo de horas",
        description:
          `${totales.totalSemanal} h asignadas sobre un máximo de ${totales.maxHoras} h ` +
          `para ${docente.dedicacion.replace(/_/g, " ").toLowerCase()}.`,
      });
    }
    excedeAnterior.current = excede;
  }, [excede, totales.totalSemanal, totales.maxHoras, docente.dedicacion]);

  /* ---------- listas anidadas ---------- */
  const quitarFilaPendiente = (id: string) =>
    setFilasPendientes((actuales) => {
      if (!actuales.has(id)) return actuales;
      const siguientes = new Set(actuales);
      siguientes.delete(id);
      return siguientes;
    });
  const setDescarga = (id: string, cambios: Partial<Descarga>) => {
    const descarga = docente.descargas.find((x) => x.id === id);
    const siguiente = descarga && { ...descarga, ...cambios };
    set("descargas", docente.descargas.map((x) => (x.id === id ? { ...x, ...cambios } : x)));
    if (siguiente && siguiente.rolId !== null && siguiente.horas > 0) quitarFilaPendiente(id);
  };
  const setAdmin = (id: string, cambios: Partial<Administrativa>) => {
    const actividad = docente.administrativas.find((x) => x.id === id);
    const siguiente = actividad && { ...actividad, ...cambios };
    set("administrativas", docente.administrativas.map((x) => (x.id === id ? { ...x, ...cambios } : x)));
    if (siguiente && siguiente.rolId !== null && siguiente.horas > 0) quitarFilaPendiente(id);
  };
  const setCurso = (id: string, cambios: Partial<Curso>) => {
    const curso = docente.cursos.find((x) => x.id === id);
    const siguiente = curso && { ...curso, ...cambios };
    set("cursos", docente.cursos.map((x) => (x.id === id ? { ...x, ...cambios } : x)));
    if (siguiente && !cursoIncompleto(siguiente)) quitarFilaPendiente(id);
  };

  /* ---------- cursos: plegar, duplicar, autocompletar (SPEC-019) ---------- */
  /**
   * Con muchos cursos, tarjetas de 12 campos abiertas hacían una página
   * interminable. Los completos se pliegan en una línea de resumen; los que
   * faltan por llenar arrancan abiertos.
   */
  const [abiertos, setAbiertos] = useState<Set<string>>(
    () => new Set(docente.cursos.filter(cursoIncompleto).map((c) => c.id))
  );
  const abrir = (ids: Iterable<string>) =>
    setAbiertos((actuales) => new Set([...actuales, ...ids]));
  const alternar = (id: string, abierto: boolean) =>
    setAbiertos((actuales) => {
      if (actuales.has(id) === abierto) return actuales;
      const siguientes = new Set(actuales);
      if (abierto) siguientes.add(id);
      else siguientes.delete(id);
      return siguientes;
    });

  /** El campo al que hay que llevar al usuario cuando su curso ya esté pintado. */
  const enfocar = useRef<string | null>(null);
  useEffect(() => {
    const id = enfocar.current;
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    enfocar.current = null;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.focus({ preventScroll: true });
  }, [docente.cursos, docente.descargas, docente.administrativas, abiertos]);

  // Lo ya registrado en cualquier asignación —también las importadas de
  // periodos anteriores— sirve para no volver a escribir la ficha del curso.
  const asignaciones = useAsignacionStore((s) => s.asignaciones);
  const catalogo = useMemo(() => catalogoDeCursos(asignaciones), [asignaciones]);
  const programasEnUso = [...new Set(docente.cursos.map((c) => c.nombrePrograma))];
  const listaDe = (programa: string, tipo: "nombre" | "codigo") =>
    `fichas-${tipo}-${programasEnUso.indexOf(programa)}`;

  const hayCupo = () => {
    if (docente.cursos.length < limites.maxCursos) return true;
    sileo.warning({
      title: "Límite de cursos alcanzado",
      description: `El formato permite hasta ${limites.maxCursos} cursos por docente.`,
    });
    return false;
  };

  /** Un curso nuevo hereda del anterior lo que casi nunca cambia entre cursos. */
  const agregarCurso = () => {
    if (!hayCupo()) return;
    const ultimo = docente.cursos.at(-1);
    const programa = ultimo?.nombrePrograma || programaPorDefecto;
    const nuevo: Curso = {
      ...nuevoCurso(),
      nombrePrograma: programa,
      codigoPrograma: ultimo?.nombrePrograma ? ultimo.codigoPrograma : codigoDePrograma(programa),
      jornada: ultimo?.jornada ?? "",
      modalidad: ultimo?.modalidad ?? "",
    };
    set("cursos", [...docente.cursos, nuevo]);
    abrir([nuevo.id]);
    enfocar.current = `curso-nombre-${nuevo.id}`;
  };

  /** El mismo curso en otro grupo: el caso más repetido del formato. */
  const duplicarCurso = (curso: Curso) => {
    if (!hayCupo()) return;
    const copia: Curso = {
      ...curso,
      id: nuevoCurso().id,
      grupo: grupoSiguiente(curso.grupo, GRUPOS),
      estudiantes: null,
    };
    const i = docente.cursos.findIndex((x) => x.id === curso.id);
    set("cursos", [...docente.cursos.slice(0, i + 1), copia, ...docente.cursos.slice(i + 1)]);
    abrir([copia.id]);
    enfocar.current = `curso-grupo-${copia.id}`;
  };

  /* ---------- directorio de docentes (SPEC-021) ---------- */
  const asignacionActual = useMemo(
    () => asignaciones.find((a) => a.docentes.some((d) => d.id === docente.id)),
    [asignaciones, docente.id]
  );
  const documentosEnAsignacion = useMemo(
    () => new Set((asignacionActual?.docentes ?? []).filter((d) => d.id !== docente.id).map((d) => d.documento.trim()).filter(Boolean)),
    [asignacionActual, docente.id]
  );
  /** Completa lo vacío con el directorio; la dedicación trae su apoyo, como al elegirla a mano. */
  const usarFicha = (ficha: FichaDirectorio, elegida = false) => {
    // Elegida de la lista, su identidad manda sobre lo escrito: puede ser
    // otra persona que la que se estaba tecleando.
    const base: Docente = elegida ? { ...docente, documento: ficha.documento, nombres: ficha.nombres } : docente;
    const cambios = completarDocente(base, ficha);
    const cambioIdentidad = base.documento !== docente.documento || base.nombres !== docente.nombres;
    const n = Object.keys(cambios).length + (cambioIdentidad ? 1 : 0);
    if (n === 0) {
      sileo.info({ title: "Nada que completar", description: "La ficha ya tenía esos datos." });
      return;
    }
    let siguiente: Docente = { ...base, ...cambios };
    if (cambios.dedicacion) siguiente = aplicarReglaDedicacion(siguiente, cambios.dedicacion, reglas);
    onCambio(siguiente);
    sileo.success({
      title: "Datos traídos del directorio",
      description: `${n} ${n === 1 ? "campo completado" : "campos completados"}. Revíselos y guarde.`,
    });
  };

  const directorio = useDirectorio({
    documento: docente.documento,
    asignacionId: asignacionActual?.id,
    activo: !soloLectura,
    autoAplicar: !docente.nombres.trim(),
    alEncontrar: usarFicha,
  });
  const repetido = documentosEnAsignacion.has(docente.documento.trim());
  const anclaDocumento = useRef<HTMLDivElement>(null);
  const campoDocumento = campo("documento", (v) => set("documento", v.replace(/\D/g, "")));

  /* ---------- descargas y actividades (SPEC-020) ---------- */
  /** La fila nueva abre su buscador de rol: es lo primero que hay que elegir. */
  const agregarDescarga = () => {
    if (docente.descargas.length >= limites.maxDescargas) {
      sileo.warning({
        title: "Límite de descargas alcanzado",
        description: `El formato permite hasta ${limites.maxDescargas} descargas directas (R1, R2, R3).`,
      });
      return;
    }
    const nueva = nuevaDescarga();
    set("descargas", [...docente.descargas, nueva]);
    enfocar.current = `rol-${nueva.id}`;
  };
  const agregarActividad = () => {
    if (docente.administrativas.length >= limites.maxAdministrativas) {
      sileo.warning({
        title: "Límite de actividades alcanzado",
        description: `El formato permite hasta ${limites.maxAdministrativas} actividades administrativas (R1, R2, R3).`,
      });
      return;
    }
    const nueva = nuevaAdministrativa();
    set("administrativas", [...docente.administrativas, nueva]);
    enfocar.current = `rol-${nueva.id}`;
  };

  /** Al escribir nombre o código, completa lo vacío con la ficha conocida. */
  const escribirFicha = (curso: Curso, cambio: { nombreCurso: string } | { codigoCurso: string }) => {
    const ficha = buscarFicha(fichasDePrograma(catalogo, curso.nombrePrograma), cambio);
    setCurso(curso.id, { ...cambio, ...(ficha ? completarCurso({ ...curso, ...cambio }, ficha) : {}) });
  };

  const num = (v: string): number | null => (v === "" ? null : Number(v));
  const camposDeDocente: (keyof CamposDocente)[] = [
    "documento", "nombres", "nivelFormacion", "tipoContrato", "dedicacion", "categoria", "sede", "evaluacionDocente",
  ];
  const tieneErrorDeSeccion = (
    seccion: "docente" | "cursos" | "descargas" | "actividades" | "apoyo",
    hallazgosActuales: Hallazgo[]
  ) => {
    const campos = {
      docente: (campo: string) => camposDeDocente.includes(campo as keyof CamposDocente),
      cursos: (campo: string) => campo === "cursos" || campo.startsWith("curso-"),
      descargas: (campo: string) => campo.startsWith("descarga-"),
      actividades: (campo: string) => campo.startsWith("admin-"),
      apoyo: (campo: string) => campo === "totalSemanal",
    }[seccion];
    if (hallazgosActuales.some((h) => h.severidad === "error" && campos(h.campo))) return true;
    return false;
  };
  const guardarSeccion = async (seccion: "docente" | "cursos" | "descargas" | "actividades" | "apoyo") => {
    // trigger activa los mensajes de RHF incluso si el usuario fue directo al
    // botón Guardar; los hallazgos cubren cursos y actividades anidadas.
    const rhfValido = seccion === "docente" ? await trigger(camposDeDocente) : true;
    // No usamos el análisis recibido por props: puede corresponder al render
    // anterior. Aquí se recalcula con el borrador exacto que va a persistirse.
    const totalesActuales = calcularTotales(docente, { roles, reglas });
    const hallazgosActuales = validarDocente(docente, totalesActuales);
    const filasIncompletas = new Set(
      seccion === "cursos"
        ? docente.cursos
            .filter(cursoIncompleto)
            .map((curso) => curso.id)
        : seccion === "descargas"
          ? docente.descargas
              .filter((descarga) => descarga.rolId === null || descarga.horas <= 0)
              .map((descarga) => descarga.id)
          : seccion === "actividades"
            ? docente.administrativas
                .filter((actividad) => actividad.rolId === null || actividad.horas <= 0)
                .map((actividad) => actividad.id)
            : []
    );
    setFilasPendientes(filasIncompletas);
    if (seccion === "cursos") {
      // Un curso plegado con errores no se vería: se abre y se lleva allí.
      const conError = docente.cursos.filter(
        (c, i) => filasIncompletas.has(c.id) || hallazgosActuales.some((h) => h.severidad === "error" && h.campo === `curso-${i}`)
      );
      abrir(conError.map((c) => c.id));
      if (conError[0]) enfocar.current = `curso-nombre-${conError[0].id}`;
    }
    // Guardar persiste el docente entero, no solo la pestaña: con el total
    // por encima del tope no se guarda desde ninguna (SPEC-020). Antes solo
    // lo revisaba la pestaña Apoyo, y Cursos o Descargas guardaban 15 h de 12.
    const { totalSemanal, maxHoras } = totalesActuales;
    if (maxHoras !== null && totalSemanal > maxHoras) {
      sileo.error({
        title: "No se guardó: se superó el máximo de horas",
        description:
          `${totalSemanal} h asignadas sobre un máximo de ${maxHoras} h para ` +
          `${docente.dedicacion.replace(/_/g, " ").toLowerCase()}. Reduzca ${totalSemanal - maxHoras} h ` +
          "en cursos, descargas, actividades o apoyo.",
      });
      return;
    }
    if (!rhfValido || filasIncompletas.size > 0 || tieneErrorDeSeccion(seccion, hallazgosActuales)) {
      sileo.error({ title: "Revise los campos marcados", description: "Hay datos pendientes o inválidos en esta sección." });
      return;
    }
    onGuardar(docente);
    setFilasPendientes(new Set());
    sileo.success({ title: "Cambios guardados" });
  };
  /**
   * El pie de cada pestaña: el botón y, a su lado, cómo va el total del
   * docente contra su tope. Así el bloqueo por exceso no llega por sorpresa.
   */
  const pieGuardar = (etiqueta: string, seccion: "docente" | "cursos" | "descargas" | "actividades" | "apoyo") => {
    const { totalSemanal, maxHoras } = totales;
    const estado =
      maxHoras === null
        ? null
        : totalSemanal > maxHoras
          ? { tono: "text-rose-700", icono: FiAlertCircle, texto: `${totalSemanal} h de ${maxHoras} h · excede por ${totalSemanal - maxHoras} h. Ajuste antes de guardar.` }
          : totalSemanal === maxHoras
            ? { tono: "text-cecar-700", icono: FiCheckCircle, texto: `${totalSemanal} h de ${maxHoras} h · completo` }
            : { tono: "text-[var(--color-texto-suave)]", icono: null, texto: `${totalSemanal} h de ${maxHoras} h · faltan ${maxHoras - totalSemanal} h` };
    return (
      <div className="mt-6 -mx-5 -mb-5 flex flex-wrap items-center justify-between gap-3 rounded-b-xl bg-cecar-50/60 px-5 py-3">
        <p className={`flex items-center gap-1.5 text-sm ${estado?.tono ?? ""}`} aria-live="polite">
          {estado?.icono && <estado.icono className="h-4 w-4 shrink-0" aria-hidden />}
          {estado?.texto}
        </p>
        <Boton onClick={() => void guardarSeccion(seccion)}><FiSave aria-hidden /> {etiqueta}</Boton>
      </div>
    );
  };

  // El resumen de dedicación lo coloca la página, en su propia columna
  // sticky: así sobrevive al ancho que le quita la barra lateral.
  return (
    <div className="min-w-0">
      <fieldset disabled={soloLectura} className="m-0 min-w-0 border-0 p-0 disabled:opacity-75">
      <div className="min-w-0 space-y-6">
        {/* ---------------- Información del docente ---------------- */}
        <div className={pasoActivo === 0 ? "" : "hidden"}>
        <Seccion titulo="Información del docente" descripcion="Datos personales, profesionales y de vinculación">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo
              etiqueta="Número de documento"
              requerido
              error={invalido("documento")}
              ayuda={mensajeDe("documento")}
            >
              <div ref={anclaDocumento}>
                <Entrada
                  inputMode="numeric"
                  autoComplete="off"
                  value={docente.documento}
                  error={invalido("documento")}
                  placeholder="Escriba la cédula: se sugiere del directorio"
                  role="combobox"
                  aria-expanded={directorio.sugerencias.length > 0}
                  aria-controls="sugerencias-cedula"
                  aria-autocomplete="list"
                  aria-activedescendant={directorio.sugerencias.length > 0 ? `sugerencias-cedula-${directorio.resaltada}` : undefined}
                  {...campoDocumento}
                  onBlur={(e) => {
                    void campoDocumento.onBlur(e);
                    directorio.cerrar();
                  }}
                  onFocus={directorio.abrir}
                  onInput={directorio.abrir}
                  onKeyDown={directorio.teclado}
                />
              </div>
              <SugerenciasCedula
                id="sugerencias-cedula"
                anclaRef={anclaDocumento}
                consulta={docente.documento.trim()}
                sugerencias={directorio.sugerencias}
                resaltada={directorio.resaltada}
                onResaltar={directorio.resaltar}
                onElegir={(f) => void directorio.elegir(f)}
              />
              {/* El documento trae los datos del directorio (SPEC-021): sin
                  campo aparte, una línea dice qué encontró. */}
              <p className="mt-1 min-h-4 text-[11px]" aria-live="polite">
                {repetido ? (
                  <span className="text-amber-700">Este docente ya está en la asignación.</span>
                ) : directorio.estado === "buscando" ? (
                  <span className="text-[var(--color-texto-suave)]">Buscando en el directorio…</span>
                ) : directorio.estado === "sugiriendo" && directorio.sugerencias.length > 0 ? (
                  <span className="text-[var(--color-texto-suave)]">Elija de la lista o siga escribiendo.</span>
                ) : directorio.usada ? (
                  <span className="text-cecar-700">Encontrado en el directorio: se cargaron sus datos.</span>
                ) : directorio.estado === "encontrado" && directorio.ficha ? (
                  <span className="text-[var(--color-texto-suave)]">
                    En el directorio: {directorio.ficha.nombres}.{" "}
                    <button type="button" onClick={directorio.usar} className="font-semibold text-cecar-700 underline-offset-2 hover:underline">
                      Usar sus datos
                    </button>
                  </span>
                ) : directorio.estado === "no_encontrado" ? (
                  <span className="text-[var(--color-texto-suave)]">No está en el directorio: complete los datos a mano.</span>
                ) : null}
              </p>
            </Campo>

            <Campo
              etiqueta="Nombres y apellidos"
              requerido
              error={invalido("nombres")}
              ayuda={mensajeDe("nombres")}
              className="sm:col-span-1 lg:col-span-2"
            >
              <Entrada
                value={docente.nombres}
                error={invalido("nombres")}
                placeholder="NOMBRE COMPLETO DEL DOCENTE"
                {...campo("nombres", (v) => set("nombres", v.toUpperCase()))}
              />
            </Campo>

            <Campo
              etiqueta="Nivel de formación"
              requerido
              error={invalido("nivelFormacion")}
              ayuda={mensajeDe("nivelFormacion")}
            >
              <Seleccion
                opciones={NIVELES_FORMACION}
                value={docente.nivelFormacion}
                error={invalido("nivelFormacion")}
                {...campo("nivelFormacion", (v) => set("nivelFormacion", v))}
              />
            </Campo>

            <Campo etiqueta="Categoría MinCiencias">
              <Seleccion
                opciones={CATEGORIAS_MINCIENCIAS}
                value={docente.categoriaMinciencias}
                onChange={(e) => set("categoriaMinciencias", e.target.value)}
              />
            </Campo>

            <Campo
              etiqueta="Evaluación docente"
              error={invalido("evaluacionDocente")}
              ayuda={mensajeDe("evaluacionDocente", "De 0 a 5")}
            >
              <Entrada
                type="number"
                step="0.01"
                min={0}
                max={5}
                value={docente.evaluacionDocente ?? ""}
                error={invalido("evaluacionDocente")}
                placeholder="4.43"
                {...campo("evaluacionDocente", (v) => set("evaluacionDocente", num(v)))}
              />
            </Campo>

            <Campo etiqueta="Perfil profesional" className="sm:col-span-2 lg:col-span-3">
              <textarea
                rows={2}
                className="campo resize-y"
                value={docente.perfilProfesional}
                onChange={(e) => set("perfilProfesional", e.target.value.toUpperCase())}
                placeholder="MAESTRÍA EN…, ESPECIALISTA EN…, INGENIERO DE SISTEMAS"
              />
            </Campo>

            <Campo etiqueta="¿Activo en el sector externo?">
              <Seleccion
                opciones={["SI", "NO"]}
                value={docente.activoSectorExterno}
                onChange={(e) => set("activoSectorExterno", e.target.value as "SI" | "NO" | "")}
              />
            </Campo>

            <Campo etiqueta="Sector donde ejerce" className="lg:col-span-2">
              <Seleccion
                opciones={SECTORES}
                value={docente.sectorEjerce}
                disabled={docente.activoSectorExterno !== "SI"}
                onChange={(e) => set("sectorEjerce", e.target.value)}
                placeholder={
                  docente.activoSectorExterno === "SI" ? "Seleccione…" : "Solo si está activo"
                }
              />
            </Campo>
          </div>

          <hr className="my-5 border-[var(--color-borde)]" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Campo
              etiqueta="Tipo de contrato"
              requerido
              error={invalido("tipoContrato")}
              ayuda={mensajeDe("tipoContrato")}
            >
              <Seleccion
                opciones={Object.keys(CONTRATOS)}
                value={docente.tipoContrato}
                error={invalido("tipoContrato")}
                onChange={(e) =>
                  onCambio({
                    ...docente,
                    tipoContrato: e.target.value,
                    dedicacion: "",
                    categoria: "",
                  })
                }
              />
            </Campo>

            <Campo
              etiqueta="Dedicación"
              requerido
              error={invalido("dedicacion")}
              ayuda={mensajeDe(
                "dedicacion",
                regla ? `Máximo ${regla.maxHoras} h semanales` : undefined
              )}
            >
              <Seleccion
                opciones={dedicaciones}
                value={docente.dedicacion}
                error={invalido("dedicacion")}
                disabled={!docente.tipoContrato}
                placeholder={docente.tipoContrato ? "Seleccione…" : "Elija el contrato"}
                onChange={(e) =>
                  onCambio({
                    ...aplicarReglaDedicacion(docente, e.target.value, reglas),
                    categoria: "",
                  })
                }
              />
            </Campo>

            <Campo
              etiqueta="Categoría"
              requerido
              error={invalido("categoria")}
              ayuda={mensajeDe("categoria")}
            >
              <Seleccion
                opciones={categorias}
                value={docente.categoria}
                error={invalido("categoria")}
                disabled={!docente.dedicacion}
                placeholder={docente.dedicacion ? "Seleccione…" : "Elija la dedicación"}
                onChange={(e) => set("categoria", e.target.value)}
              />
            </Campo>

            <Campo etiqueta="Sede" requerido error={invalido("sede")} ayuda={mensajeDe("sede")}>
              <Seleccion
                opciones={SEDES}
                value={docente.sede}
                error={invalido("sede")}
                {...campo("sede", (v) => set("sede", v))}
              />
            </Campo>
          </div>
          {!soloLectura && pieGuardar("Guardar docente", "docente")}
        </Seccion>
        </div>

        {/* ---------------- Cursos ---------------- */}
        <div className={pasoActivo === 1 ? "" : "hidden"}>
        <Seccion
          titulo="Cursos asignados"
          descripcion={`${docente.cursos.length} de ${limites.maxCursos} · las horas de clase salen de la intensidad horaria`}
          accion={!soloLectura && (
            <div className="flex flex-wrap items-center gap-2">
              {docente.cursos.length > 1 && (
                <Boton
                  variante="fantasma"
                  className="text-xs"
                  onClick={() =>
                    abiertos.size === docente.cursos.length
                      ? setAbiertos(new Set())
                      : abrir(docente.cursos.map((c) => c.id))
                  }
                >
                  {abiertos.size === docente.cursos.length ? "Plegar todos" : "Desplegar todos"}
                </Boton>
              )}
              <Boton variante="secundario" onClick={agregarCurso}>
                <FiPlus aria-hidden /> Agregar curso
              </Boton>
            </div>
          )}
        >
          {/* Sugerencias por programa: el mismo nombre puede ser otro curso
              en otra carrera. */}
          {programasEnUso.map((programa) => {
            const fichas = fichasDePrograma(catalogo, programa);
            return (
              <div key={programa} hidden>
                <datalist id={listaDe(programa, "nombre")}>
                  {fichas.map((f) => (
                    <option
                      key={f.nombreCurso}
                      value={f.nombreCurso}
                      label={[
                        f.codigoCurso && `Cód. ${f.codigoCurso}`,
                        f.semestre !== null && `Sem ${f.semestre}`,
                        f.intensidadHoraria !== null && `${f.intensidadHoraria} h`,
                        f.creditos !== null && `${f.creditos} cr`,
                      ].filter(Boolean).join(" · ")}
                    />
                  ))}
                </datalist>
                <datalist id={listaDe(programa, "codigo")}>
                  {fichas.filter((f) => f.codigoCurso.trim()).map((f) => (
                    <option key={`${f.codigoCurso}-${f.nombreCurso}`} value={f.codigoCurso} label={f.nombreCurso} />
                  ))}
                </datalist>
              </div>
            );
          })}

          <div className="space-y-3">
            {docente.cursos.map((c, i) => {
              const cursoPendiente = filasPendientes.has(c.id) || errores.has(`curso-${i}`);
              const nombreInvalido = cursoPendiente && !c.nombreCurso.trim();
              const jornadaInvalida = cursoPendiente && !c.jornada;
              const intensidadInvalida = cursoPendiente && !c.intensidadHoraria;
              const creditosInvalidos = cursoPendiente && !c.creditos;
              const modalidadInvalida = cursoPendiente && !c.modalidad;
              const incompleto = cursoIncompleto(c);
              const resumen = resumenCurso(c);
              const nombreVisible = c.nombreCurso.trim() || `curso ${i + 1}`;
              return (
              // <details> y no un botón: el fieldset de solo lectura desactiva
              // los botones, y quien revisa también necesita desplegar.
              <details
                key={c.id}
                open={abiertos.has(c.id)}
                onToggle={(e) => alternar(c.id, e.currentTarget.open)}
                className="group rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]/50"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 hover:bg-cecar-50/50 sm:px-5 [&::-webkit-details-marker]:hidden">
                  <FiChevronDown
                    className="h-4 w-4 shrink-0 text-[var(--color-texto-suave)] transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                  <Insignia tono={incompleto ? "ambar" : "verde"}>Curso {i + 1}</Insignia>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--color-texto)]">
                      {c.nombreCurso.trim() || "Curso sin nombre"}
                    </p>
                    {/* El detalle solo hace falta plegado: abierto ya se ven los campos. */}
                    <p className="truncate text-xs text-[var(--color-texto-suave)] group-open:hidden">
                      {incompleto && (
                        <span className="me-1 inline-flex items-center gap-1 text-amber-700">
                          <FiAlertCircle className="h-3.5 w-3.5" aria-hidden /> Faltan datos obligatorios
                          {resumen.length > 0 && " ·"}
                        </span>
                      )}
                      {resumen.join(" · ")}
                    </p>
                  </div>
                  {!soloLectura && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Boton
                        variante="fantasma"
                        className="px-2 py-1 text-xs"
                        title="Duplicar para otro grupo"
                        aria-label={`Duplicar ${nombreVisible} para otro grupo`}
                        onClick={(e) => {
                          // Dentro del <summary>, el clic también plegaría la tarjeta.
                          e.preventDefault();
                          duplicarCurso(c);
                        }}
                      >
                        <FiCopy aria-hidden /> <span className="hidden sm:inline">Duplicar</span>
                      </Boton>
                      {docente.cursos.length > 1 && (
                        <Boton
                          variante="peligro"
                          className="px-2 py-1 text-xs"
                          aria-label={`Quitar ${nombreVisible}`}
                          onClick={(e) => {
                            e.preventDefault();
                            set("cursos", docente.cursos.filter((x) => x.id !== c.id));
                          }}
                        >
                          <FiTrash2 aria-hidden /> <span className="hidden sm:inline">Quitar</span>
                        </Boton>
                      )}
                    </div>
                  )}
                </summary>

                <div className="grid gap-4 border-t border-[var(--color-borde)] p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
                  {/* El curso puede pertenecer a otro programa cuando el
                      docente presta servicio a varias carreras. */}
                  <Campo etiqueta="Programa" className="xl:col-span-3">
                    <Seleccion
                      opciones={PROGRAMAS.map((p) => p.nombre)}
                      value={c.nombrePrograma}
                      onChange={(e) =>
                        setCurso(c.id, {
                          nombrePrograma: e.target.value,
                          codigoPrograma: codigoDePrograma(e.target.value),
                        })
                      }
                    />
                  </Campo>

                  <Campo etiqueta="Código programa">
                    <Entrada
                      value={c.codigoPrograma}
                      onChange={(e) => setCurso(c.id, { codigoPrograma: e.target.value })}
                      placeholder="181"
                    />
                  </Campo>

                  <Campo etiqueta="Código curso">
                    <Entrada
                      value={c.codigoCurso}
                      list={listaDe(c.nombrePrograma, "codigo")}
                      autoComplete="off"
                      onChange={(e) => escribirFicha(c, { codigoCurso: e.target.value })}
                      placeholder="4623"
                    />
                  </Campo>

                  <Campo
                    etiqueta="Nombre del curso"
                    requerido
                    className="lg:col-span-3"
                    ayuda="Escriba o elija un curso ya registrado: se llenan código, pensum, semestre, intensidad y créditos."
                  >
                    <Entrada
                      id={`curso-nombre-${c.id}`}
                      value={c.nombreCurso}
                      error={nombreInvalido}
                      list={listaDe(c.nombrePrograma, "nombre")}
                      autoComplete="off"
                      onChange={(e) => escribirFicha(c, { nombreCurso: e.target.value.toUpperCase() })}
                      placeholder="REDES DE COMPUTADORES I"
                    />
                  </Campo>

                  <Campo etiqueta="Código pensum">
                    <Entrada
                      value={c.codigoPensum}
                      onChange={(e) => setCurso(c.id, { codigoPensum: e.target.value.toUpperCase() })}
                      placeholder="A272"
                    />
                  </Campo>

                  <Campo etiqueta="Semestre">
                    <Seleccion
                      opciones={SEMESTRES}
                      value={c.semestre === null ? "" : String(c.semestre)}
                      onChange={(e) => setCurso(c.id, { semestre: num(e.target.value) })}
                    />
                  </Campo>

                  <Campo etiqueta="Grupo / bloque">
                    <Seleccion
                      id={`curso-grupo-${c.id}`}
                      opciones={GRUPOS}
                      value={c.grupo}
                      onChange={(e) => setCurso(c.id, { grupo: e.target.value })}
                    />
                  </Campo>

                  <Campo etiqueta="Jornada" requerido>
                    <Seleccion
                      opciones={JORNADAS}
                      value={c.jornada}
                      error={jornadaInvalida}
                      onChange={(e) => setCurso(c.id, { jornada: e.target.value })}
                    />
                  </Campo>

                  <Campo etiqueta="Intensidad horaria" requerido ayuda="Horas semanales">
                    <Entrada
                      type="number"
                      min={1}
                      max={8}
                      value={c.intensidadHoraria ?? ""}
                      error={intensidadInvalida}
                      onChange={(e) => setCurso(c.id, { intensidadHoraria: num(e.target.value) })}
                      placeholder="4"
                    />
                  </Campo>

                  <Campo etiqueta="Créditos" requerido>
                    <Entrada
                      type="number"
                      min={1}
                      max={8}
                      value={c.creditos ?? ""}
                      error={creditosInvalidos}
                      onChange={(e) => setCurso(c.id, { creditos: num(e.target.value) })}
                      placeholder="3"
                    />
                  </Campo>

                  <Campo etiqueta="N.° estudiantes">
                    <Entrada
                      type="number"
                      min={0}
                      value={c.estudiantes ?? ""}
                      onChange={(e) => setCurso(c.id, { estudiantes: num(e.target.value) })}
                      placeholder="35"
                    />
                  </Campo>

                  <Campo etiqueta="Modalidad" requerido>
                    <Seleccion
                      opciones={MODALIDADES}
                      value={c.modalidad}
                      error={modalidadInvalida}
                      onChange={(e) => setCurso(c.id, { modalidad: e.target.value })}
                    />
                  </Campo>
                </div>
              </details>
              );
            })}
          </div>
          {/* Con la lista larga, el botón de arriba queda lejos. */}
          {!soloLectura && docente.cursos.length < limites.maxCursos && (
            <button
              type="button"
              onClick={agregarCurso}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-cecar-200 py-3 text-sm font-medium text-cecar-700 transition hover:border-cecar-300 hover:bg-cecar-50"
            >
              <FiPlus aria-hidden /> Agregar curso
            </button>
          )}
          {!soloLectura && pieGuardar("Guardar cursos", "cursos")}
        </Seccion>
        </div>

        {/* ---------------- Descargas y administrativas ---------------- */}
        {/* Una sola columna: los nombres de rol llegan a 96 caracteres y en
            dos columnas el <select> los recortaba. */}
        <div className="grid gap-6">
          <div className={pasoActivo === 2 ? "" : "hidden"}>
          <Seccion
            titulo="Descargas directas"
            descripcion={`${docente.descargas.length} de ${limites.maxDescargas} · ${totales.totalDescargas} h`}
            accion={!soloLectura && docente.descargas.length > 0 && (
              <Boton variante="secundario" onClick={agregarDescarga}>
                <FiPlus aria-hidden /> Agregar
              </Boton>
            )}
          >
            <ListaActividades
              roles={roles}
              opcionesRol={OPCIONES_ROL}
              items={docente.descargas}
              prefijo="R"
              vacio="Sin descargas directas."
              etiquetaAgregar="Agregar descarga"
              onAgregar={soloLectura ? undefined : agregarDescarga}
              maximo={limites.maxDescargas}
              filasPendientes={filasPendientes}
              onCambio={setDescarga}
              onQuitar={(x) =>
                set(
                  "descargas",
                  docente.descargas.filter((d) => d.id !== x.id)
                )
              }
            />
            {!soloLectura && pieGuardar("Guardar descargas", "descargas")}
          </Seccion>
          </div>

          <div className={pasoActivo === 3 ? "" : "hidden"}>
          <Seccion
            titulo="Actividades administrativas"
            descripcion={`${docente.administrativas.length} de ${limites.maxAdministrativas} · ${totales.totalAdministrativas} h`}
            accion={!soloLectura && docente.administrativas.length > 0 && (
              <Boton variante="secundario" onClick={agregarActividad}>
                <FiPlus aria-hidden /> Agregar
              </Boton>
            )}
          >
            <ListaActividades
              roles={roles}
              opcionesRol={OPCIONES_ROL}
              items={docente.administrativas}
              prefijo="R"
              vacio="Sin actividades administrativas."
              etiquetaAgregar="Agregar actividad"
              onAgregar={soloLectura ? undefined : agregarActividad}
              maximo={limites.maxAdministrativas}
              filasPendientes={filasPendientes}
              onCambio={setAdmin}
              onQuitar={(x) =>
                set(
                  "administrativas",
                  docente.administrativas.filter((a) => a.id !== x.id)
                )
              }
            />
            {!soloLectura && pieGuardar("Guardar actividades", "actividades")}
          </Seccion>
          </div>
        </div>

        {/* ---------------- Apoyo académico ---------------- */}
        <div className={pasoActivo === 4 ? "" : "hidden"}>
        <Seccion
          titulo="Horas de apoyo académico"
          descripcion={
            regla
              ? "Se precargan según la dedicación; ajústelas si la asignación lo requiere"
              : "Al elegir una dedicación se aplican los valores institucionales"
          }
          accion={ajustado && (
              <Boton variante="secundario" onClick={restaurarApoyo}>
                <FiRefreshCw aria-hidden /> Restaurar
              </Boton>
            )}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {APOYO.map(({ clave, etiqueta }) => (
              <Campo
                key={clave}
                etiqueta={etiqueta}
                ayuda={regla ? `Institucional: ${regla[clave]} h${docente[clave] !== regla[clave] ? " · ajustado" : ""}` : undefined}
              >
                <Entrada
                  type="number"
                  min={0}
                  value={docente[clave]}
                  onChange={(e) => set(clave, Math.max(0, Number(e.target.value) || 0))}
                />
              </Campo>
            ))}
          </div>
          <p className="mt-3 text-sm text-[var(--color-texto-suave)]">
            Total de apoyo académico:{" "}
            <strong className="text-[var(--color-texto)]">{totales.apoyoAcademico} h</strong>
            {regla && ` · institucional ${regla.preparacion + regla.atencion + regla.comunidades} h`}
          </p>

          <Campo etiqueta="Observaciones" className="mt-4">
            <textarea
              rows={2}
              className="campo resize-y"
              value={docente.observaciones}
              onChange={(e) => set("observaciones", e.target.value)}
              placeholder="Anotaciones sobre la asignación de este docente"
            />
          </Campo>
          {!soloLectura && pieGuardar("Guardar apoyo académico", "apoyo")}
        </Seccion>
        </div>

      </div>
      </fieldset>
    </div>
  );
}

/* -------------------------------------------------------------- */

function ListaActividades<T extends { id: string; rolId: number | null; horas: number }>({
  items,
  prefijo,
  vacio,
  roles,
  opcionesRol,
  filasPendientes,
  onCambio,
  onQuitar,
  onAgregar,
  etiquetaAgregar,
  maximo,
}: {
  items: T[];
  prefijo: string;
  vacio: string;
  /** Roles vigentes, que el administrador puede haber parametrizado. */
  roles: RolDescarga[];
  opcionesRol: OpcionBuscable[];
  filasPendientes: Set<string>;
  onCambio: (id: string, cambios: Partial<T>) => void;
  onQuitar: (item: T) => void;
  /** Sin él (solo lectura) no se ofrece agregar. */
  onAgregar?: () => void;
  etiquetaAgregar: string;
  maximo: number;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--color-borde)] px-4 py-8 text-center">
        <p className="text-sm text-[var(--color-texto-suave)]">{vacio}</p>
        {onAgregar && (
          <Boton variante="secundario" onClick={onAgregar}>
            <FiPlus aria-hidden /> {etiquetaAgregar}
          </Boton>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((x, i) => {
        const rol = roles.find((r) => r.id === x.rolId);
        const filaPendiente = filasPendientes.has(x.id);
        const tono =
          rol?.tipo === "INVESTIGACION" ? "azul" : rol?.tipo === "EXTENSION" ? "ambar" : "verde";
        const nombreFila = `${prefijo}${i + 1}`;
        return (
          // Compacta (SPEC-020): son a lo sumo tres y con el total al pie se
          // leen de un vistazo. La insignia y quitar van arriba para que el
          // rol tenga casi todo el ancho: sus nombres llegan a 96 caracteres.
          <div
            key={x.id}
            className={`rounded-xl border bg-[var(--color-superficie)]/50 p-3 sm:px-4 ${
              filaPendiente ? "border-rose-300" : "border-[var(--color-borde)]"
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <Insignia tono={rol ? tono : "neutro"}>
                {nombreFila}
                {rol && ` · ${ETIQUETA_TIPO[rol.tipo]}`}
              </Insignia>
              <Boton
                variante="peligro"
                className="shrink-0 px-2 py-1 text-xs"
                title={`Quitar ${nombreFila}`}
                aria-label={`Quitar ${nombreFila}`}
                onClick={() => onQuitar(x)}
              >
                <FiTrash2 aria-hidden /> Quitar
              </Boton>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <SelectorBuscable
                id={`rol-${x.id}`}
                opciones={opcionesRol}
                valor={x.rolId === null ? "" : String(x.rolId)}
                error={filaPendiente && x.rolId === null}
                placeholder="Busque el rol: p. ej. «coordinador investigación»"
                onCambio={(v) => onCambio(x.id, { rolId: v === "" ? null : Number(v) } as Partial<T>)}
              />
            </div>

            <Contador
              etiqueta={`horas de ${nombreFila}`}
              valor={x.horas || 0}
              max={20}
              error={filaPendiente && x.horas <= 0}
              onCambio={(v) => onCambio(x.id, { horas: v } as Partial<T>)}
            />
            </div>
          </div>
        );
      })}
      {onAgregar && items.length < maximo && (
        <button
          type="button"
          onClick={onAgregar}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-cecar-200 py-2.5 text-sm font-medium text-cecar-700 transition hover:border-cecar-300 hover:bg-cecar-50"
        >
          <FiPlus aria-hidden /> {etiquetaAgregar}
        </button>
      )}
    </div>
  );
}
