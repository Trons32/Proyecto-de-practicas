"use client";

import { useEffect, useMemo, useRef } from "react";
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
import { Hallazgo, Totales } from "@/lib/calculo";
import { REGLAS, type CamposDocente } from "@/lib/esquema-docente";
import { Campo, Entrada, Seleccion, Seccion, Boton, Insignia } from "./ui";
import { sileo } from "@/lib/toast";
import { FiPlus, FiTrash2, FiAlertCircle, FiAlertTriangle, FiRefreshCw } from "./iconos";

const ETIQUETA_TIPO = {
  DOCENCIA: "Docencia",
  INVESTIGACION: "Investigación",
  EXTENSION: "Extensión",
} as const;

/** El tipo no va en el texto de la opción: lo muestra la insignia de al lado. */
// Se construye dentro del componente: los roles son parametrizables.

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
}: {
  docente: Docente;
  totales: Totales;
  hallazgos: Hallazgo[];
  programaPorDefecto: string;
  onCambio: (d: Docente) => void;
}) {
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

  const OPCIONES_ROL = useMemo(
    () => roles.map((r) => ({ valor: String(r.id), texto: r.nombre })),
    [roles]
  );

  const regla = reglas[docente.dedicacion];

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
  const setDescarga = (id: string, cambios: Partial<Descarga>) =>
    set(
      "descargas",
      docente.descargas.map((x) => (x.id === id ? { ...x, ...cambios } : x))
    );
  const setAdmin = (id: string, cambios: Partial<Administrativa>) =>
    set(
      "administrativas",
      docente.administrativas.map((x) => (x.id === id ? { ...x, ...cambios } : x))
    );
  const setCurso = (id: string, cambios: Partial<Curso>) =>
    set(
      "cursos",
      docente.cursos.map((x) => (x.id === id ? { ...x, ...cambios } : x))
    );

  const num = (v: string): number | null => (v === "" ? null : Number(v));

  // El resumen de dedicación lo coloca la página, en su propia columna
  // sticky: así sobrevive al ancho que le quita la barra lateral.
  return (
    <div className="min-w-0">
      <div className="min-w-0 space-y-6">
        {/* ---------------- Información del docente ---------------- */}
        <Seccion
          titulo="Información del docente"
          descripcion="Datos personales, profesionales y de vinculación"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo
              etiqueta="Número de documento"
              requerido
              error={invalido("documento")}
              ayuda={mensajeDe("documento")}
            >
              <Entrada
                inputMode="numeric"
                value={docente.documento}
                error={invalido("documento")}
                placeholder="1003262180"
                {...campo("documento", (v) => set("documento", v.replace(/\D/g, "")))}
              />
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
        </Seccion>

        {/* ---------------- Cursos ---------------- */}
        <Seccion
          titulo="Cursos asignados"
          descripcion={`${docente.cursos.length} de ${limites.maxCursos} · las horas de clase salen de la intensidad horaria`}
          accion={
            <Boton
              variante="secundario"
              onClick={() => {
                if (docente.cursos.length >= limites.maxCursos) {
                  sileo.warning({
                    title: "Límite de cursos alcanzado",
                    description: `El formato permite hasta ${limites.maxCursos} cursos por docente.`,
                  });
                  return;
                }
                set("cursos", [
                  ...docente.cursos,
                  {
                    ...nuevoCurso(),
                    nombrePrograma: programaPorDefecto,
                    codigoPrograma: codigoDePrograma(programaPorDefecto),
                  },
                ]);
              }}
            >
              <FiPlus aria-hidden /> Agregar curso
            </Boton>
          }
        >
          <div className="space-y-4">
            {docente.cursos.map((c, i) => (
              <div
                key={c.id}
                className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]/50 p-4 sm:p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <Insignia tono="verde">Curso {i + 1}</Insignia>
                  {docente.cursos.length > 1 && (
                    <Boton
                      variante="peligro"
                      className="px-2 py-1 text-xs"
                      onClick={() =>
                        set(
                          "cursos",
                          docente.cursos.filter((x) => x.id !== c.id)
                        )
                      }
                    >
                      <FiTrash2 aria-hidden /> Quitar
                    </Boton>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                      onChange={(e) => setCurso(c.id, { codigoCurso: e.target.value })}
                      placeholder="4623"
                    />
                  </Campo>

                  <Campo etiqueta="Nombre del curso" requerido className="lg:col-span-3">
                    <Entrada
                      value={c.nombreCurso}
                      error={errores.has(`curso-${i}`)}
                      onChange={(e) => setCurso(c.id, { nombreCurso: e.target.value.toUpperCase() })}
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
                      opciones={GRUPOS}
                      value={c.grupo}
                      onChange={(e) => setCurso(c.id, { grupo: e.target.value })}
                    />
                  </Campo>

                  <Campo etiqueta="Jornada" requerido>
                    <Seleccion
                      opciones={JORNADAS}
                      value={c.jornada}
                      onChange={(e) => setCurso(c.id, { jornada: e.target.value })}
                    />
                  </Campo>

                  <Campo etiqueta="Intensidad horaria" requerido ayuda="Horas semanales">
                    <Entrada
                      type="number"
                      min={1}
                      max={8}
                      value={c.intensidadHoraria ?? ""}
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
                      onChange={(e) => setCurso(c.id, { modalidad: e.target.value })}
                    />
                  </Campo>
                </div>
              </div>
            ))}
          </div>
        </Seccion>

        {/* ---------------- Descargas y administrativas ---------------- */}
        {/* Una sola columna: los nombres de rol llegan a 96 caracteres y en
            dos columnas el <select> los recortaba. */}
        <div className="grid gap-6">
          <Seccion
            titulo="Descargas directas"
            descripcion={`${docente.descargas.length} de ${limites.maxDescargas}`}
            accion={
              <Boton
                variante="secundario"
                onClick={() => {
                  if (docente.descargas.length >= limites.maxDescargas) {
                    sileo.warning({
                      title: "Límite de descargas alcanzado",
                      description: `El formato permite hasta ${limites.maxDescargas} descargas directas (R1, R2, R3).`,
                    });
                    return;
                  }
                  set("descargas", [...docente.descargas, nuevaDescarga()]);
                }}
              >
                <FiPlus aria-hidden /> Agregar
              </Boton>
            }
          >
            <ListaActividades
              roles={roles}
              opcionesRol={OPCIONES_ROL}
              items={docente.descargas}
              prefijo="R"
              vacio="Sin descargas directas."
              onCambio={setDescarga}
              onQuitar={(x) =>
                set(
                  "descargas",
                  docente.descargas.filter((d) => d.id !== x.id)
                )
              }
            />
          </Seccion>

          <Seccion
            titulo="Actividades administrativas"
            descripcion={`${docente.administrativas.length} de ${limites.maxAdministrativas}`}
            accion={
              <Boton
                variante="secundario"
                onClick={() => {
                  if (docente.administrativas.length >= limites.maxAdministrativas) {
                    sileo.warning({
                      title: "Límite de actividades alcanzado",
                      description: `El formato permite hasta ${limites.maxAdministrativas} actividades administrativas (R1, R2, R3).`,
                    });
                    return;
                  }
                  set("administrativas", [...docente.administrativas, nuevaAdministrativa()]);
                }}
              >
                <FiPlus aria-hidden /> Agregar
              </Boton>
            }
          >
            <ListaActividades
              roles={roles}
              opcionesRol={OPCIONES_ROL}
              items={docente.administrativas}
              prefijo="R"
              vacio="Sin actividades administrativas."
              onCambio={setAdmin}
              onQuitar={(x) =>
                set(
                  "administrativas",
                  docente.administrativas.filter((a) => a.id !== x.id)
                )
              }
            />
          </Seccion>
        </div>

        {/* ---------------- Apoyo académico ---------------- */}
        <Seccion
          titulo="Horas de apoyo académico"
          descripcion={
            regla
              ? "Se precargan según la dedicación; ajústelas si la asignación lo requiere"
              : "Al elegir una dedicación se aplican los valores institucionales"
          }
          accion={
            ajustado && (
              <Boton variante="secundario" onClick={restaurarApoyo}>
                <FiRefreshCw aria-hidden /> Restaurar
              </Boton>
            )
          }
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {APOYO.map(({ clave, etiqueta }) => (
              <Campo
                key={clave}
                etiqueta={etiqueta}
                ayuda={
                  regla && docente[clave] !== regla[clave]
                    ? `Institucional: ${regla[clave]} h`
                    : undefined
                }
              >
                <Entrada
                  type="number"
                  min={0}
                  value={docente[clave]}
                  onChange={(e) => set(clave, Number(e.target.value) || 0)}
                />
              </Campo>
            ))}
          </div>

          <Campo etiqueta="Observaciones" className="mt-4">
            <textarea
              rows={2}
              className="campo resize-y"
              value={docente.observaciones}
              onChange={(e) => set("observaciones", e.target.value)}
              placeholder="Anotaciones sobre la asignación de este docente"
            />
          </Campo>
        </Seccion>

        {/* ---------------- Validaciones ---------------- */}
        {hallazgos.length > 0 && (
          <Seccion titulo="Revisión" descripcion="Puntos por verificar antes de guardar">
            <ul className="space-y-2">
              {hallazgos.map((h, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  {h.severidad === "error" ? (
                    <FiAlertCircle className="mt-0.5 shrink-0 text-rose-500" aria-hidden />
                  ) : (
                    <FiAlertTriangle className="mt-0.5 shrink-0 text-amber-500" aria-hidden />
                  )}
                  <span
                    className={
                      h.severidad === "error" ? "text-rose-700" : "text-[var(--color-texto-suave)]"
                    }
                  >
                    {h.mensaje}
                  </span>
                </li>
              ))}
            </ul>
          </Seccion>
        )}
      </div>
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
  onCambio,
  onQuitar,
}: {
  items: T[];
  prefijo: string;
  vacio: string;
  /** Roles vigentes, que el administrador puede haber parametrizado. */
  roles: RolDescarga[];
  opcionesRol: { valor: string; texto: string }[];
  onCambio: (id: string, cambios: Partial<T>) => void;
  onQuitar: (item: T) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--color-borde)] px-4 py-6 text-center text-sm text-[var(--color-texto-suave)]">
        {vacio}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((x, i) => {
        const rol = roles.find((r) => r.id === x.rolId);
        const tono =
          rol?.tipo === "INVESTIGACION" ? "azul" : rol?.tipo === "EXTENSION" ? "ambar" : "verde";
        return (
          <div
            key={x.id}
            className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]/50 p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Insignia>
                  {prefijo}
                  {i + 1}
                </Insignia>
                {rol && <Insignia tono={tono}>{ETIQUETA_TIPO[rol.tipo]}</Insignia>}
              </div>
              <Boton
                variante="peligro"
                className="shrink-0 px-2 py-1 text-xs"
                onClick={() => onQuitar(x)}
              >
                <FiTrash2 aria-hidden /> Quitar
              </Boton>
            </div>

            {/* El rol ocupa su propia fila: sus nombres llegan a 96 caracteres. */}
            <div className="space-y-3">
              <Campo etiqueta="Rol">
                <Seleccion
                  className="w-full"
                  opciones={opcionesRol}
                  value={x.rolId === null ? "" : String(x.rolId)}
                  title={rol?.nombre}
                  onChange={(e) =>
                    onCambio(x.id, {
                      rolId: e.target.value === "" ? null : Number(e.target.value),
                    } as Partial<T>)
                  }
                />
              </Campo>

              <Campo etiqueta="Horas semanales" className="max-w-[10rem]">
                <Entrada
                  type="number"
                  min={0}
                  max={20}
                  value={x.horas || ""}
                  onChange={(e) => onCambio(x.id, { horas: Number(e.target.value) || 0 } as Partial<T>)}
                  placeholder="0"
                />
              </Campo>
            </div>
          </div>
        );
      })}
    </div>
  );
}
