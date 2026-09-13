"use client";

import { useMemo } from "react";
import {
  ROLES,
  CONTRATOS,
  NIVELES_FORMACION,
  CATEGORIAS_MINCIENCIAS,
  SECTORES,
  SEDES,
  JORNADAS,
  MODALIDADES,
  REGLAS_DEDICACION,
  MAX_DESCARGAS,
  MAX_ADMINISTRATIVAS,
  MAX_CURSOS,
} from "@/lib/catalogos";
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
import { Campo, Entrada, Seleccion, Seccion, Boton, Insignia } from "./ui";
import ResumenHoras from "./ResumenHoras";

const OPCIONES_ROL = ROLES.map((r) => ({
  valor: String(r.id),
  texto: `${r.nombre}  ·  ${r.tipo === "INVESTIGACION" ? "Investigación" : r.tipo === "EXTENSION" ? "Extensión" : "Docencia"}`,
}));

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

  const errores = useMemo(() => {
    const m = new Set<string>();
    hallazgos.filter((h) => h.severidad === "error").forEach((h) => m.add(h.campo));
    return m;
  }, [hallazgos]);

  const dedicaciones = docente.tipoContrato ? Object.keys(CONTRATOS[docente.tipoContrato] ?? {}) : [];
  const categorias =
    docente.tipoContrato && docente.dedicacion
      ? (CONTRATOS[docente.tipoContrato]?.[docente.dedicacion] ?? [])
      : [];

  const regla = REGLAS_DEDICACION[docente.dedicacion];
  const apoyoBloqueado = Boolean(regla);

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

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem] xl:grid-cols-[1fr_22rem]">
      <div className="min-w-0 space-y-6">
        {/* ---------------- Información del docente ---------------- */}
        <Seccion
          titulo="Información del docente"
          descripcion="Datos personales, profesionales y de vinculación"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo etiqueta="Número de documento" requerido error={errores.has("documento")}>
              <Entrada
                inputMode="numeric"
                value={docente.documento}
                error={errores.has("documento")}
                onChange={(e) => set("documento", e.target.value.replace(/\D/g, ""))}
                placeholder="1003262180"
              />
            </Campo>

            <Campo
              etiqueta="Nombres y apellidos"
              requerido
              error={errores.has("nombres")}
              className="sm:col-span-1 lg:col-span-2"
            >
              <Entrada
                value={docente.nombres}
                error={errores.has("nombres")}
                onChange={(e) => set("nombres", e.target.value.toUpperCase())}
                placeholder="NOMBRE COMPLETO DEL DOCENTE"
              />
            </Campo>

            <Campo etiqueta="Nivel de formación" requerido error={errores.has("nivelFormacion")}>
              <Seleccion
                opciones={NIVELES_FORMACION}
                value={docente.nivelFormacion}
                error={errores.has("nivelFormacion")}
                onChange={(e) => set("nivelFormacion", e.target.value)}
              />
            </Campo>

            <Campo etiqueta="Categoría MinCiencias">
              <Seleccion
                opciones={CATEGORIAS_MINCIENCIAS}
                value={docente.categoriaMinciencias}
                onChange={(e) => set("categoriaMinciencias", e.target.value)}
              />
            </Campo>

            <Campo etiqueta="Evaluación docente" error={errores.has("evaluacionDocente")} ayuda="De 0 a 5">
              <Entrada
                type="number"
                step="0.01"
                min={0}
                max={5}
                value={docente.evaluacionDocente ?? ""}
                error={errores.has("evaluacionDocente")}
                onChange={(e) => set("evaluacionDocente", num(e.target.value))}
                placeholder="4.43"
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
            <Campo etiqueta="Tipo de contrato" requerido error={errores.has("tipoContrato")}>
              <Seleccion
                opciones={Object.keys(CONTRATOS)}
                value={docente.tipoContrato}
                error={errores.has("tipoContrato")}
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
              error={errores.has("dedicacion")}
              ayuda={regla ? `Máximo ${regla.maxHoras} h semanales` : undefined}
            >
              <Seleccion
                opciones={dedicaciones}
                value={docente.dedicacion}
                error={errores.has("dedicacion")}
                disabled={!docente.tipoContrato}
                placeholder={docente.tipoContrato ? "Seleccione…" : "Elija el contrato"}
                onChange={(e) =>
                  onCambio({ ...aplicarReglaDedicacion(docente, e.target.value), categoria: "" })
                }
              />
            </Campo>

            <Campo etiqueta="Categoría" requerido error={errores.has("categoria")}>
              <Seleccion
                opciones={categorias}
                value={docente.categoria}
                error={errores.has("categoria")}
                disabled={!docente.dedicacion}
                placeholder={docente.dedicacion ? "Seleccione…" : "Elija la dedicación"}
                onChange={(e) => set("categoria", e.target.value)}
              />
            </Campo>

            <Campo etiqueta="Sede" requerido error={errores.has("sede")}>
              <Seleccion
                opciones={SEDES}
                value={docente.sede}
                error={errores.has("sede")}
                onChange={(e) => set("sede", e.target.value)}
              />
            </Campo>
          </div>
        </Seccion>

        {/* ---------------- Cursos ---------------- */}
        <Seccion
          titulo="Cursos asignados"
          descripcion={`${docente.cursos.length} de ${MAX_CURSOS} · las horas de clase salen de la intensidad horaria`}
          accion={
            <Boton
              variante="secundario"
              disabled={docente.cursos.length >= MAX_CURSOS}
              onClick={() =>
                set("cursos", [
                  ...docente.cursos,
                  { ...nuevoCurso(), nombrePrograma: programaPorDefecto },
                ])
              }
            >
              + Agregar curso
            </Boton>
          }
        >
          <div className="space-y-3">
            {docente.cursos.map((c, i) => (
              <div
                key={c.id}
                className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)]/50 p-4"
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
                      Quitar
                    </Boton>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                    <Entrada
                      type="number"
                      min={1}
                      max={12}
                      value={c.semestre ?? ""}
                      onChange={(e) => setCurso(c.id, { semestre: num(e.target.value) })}
                      placeholder="6"
                    />
                  </Campo>

                  <Campo etiqueta="Grupo / bloque">
                    <Entrada
                      value={c.grupo}
                      onChange={(e) => setCurso(c.id, { grupo: e.target.value })}
                      placeholder="1"
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
        <div className="grid gap-6 xl:grid-cols-2">
          <Seccion
            titulo="Descargas directas"
            descripcion={`${docente.descargas.length} de ${MAX_DESCARGAS}`}
            accion={
              <Boton
                variante="secundario"
                disabled={docente.descargas.length >= MAX_DESCARGAS}
                onClick={() => set("descargas", [...docente.descargas, nuevaDescarga()])}
              >
                + Agregar
              </Boton>
            }
          >
            <ListaActividades
              items={docente.descargas}
              prefijo="R"
              vacio="Sin descargas directas."
              onCambio={setDescarga}
              onQuitar={(id) =>
                set(
                  "descargas",
                  docente.descargas.filter((x) => x.id !== id)
                )
              }
            />
          </Seccion>

          <Seccion
            titulo="Actividades administrativas"
            descripcion={`${docente.administrativas.length} de ${MAX_ADMINISTRATIVAS}`}
            accion={
              <Boton
                variante="secundario"
                disabled={docente.administrativas.length >= MAX_ADMINISTRATIVAS}
                onClick={() =>
                  set("administrativas", [...docente.administrativas, nuevaAdministrativa()])
                }
              >
                + Agregar
              </Boton>
            }
          >
            <ListaActividades
              items={docente.administrativas}
              prefijo="R"
              vacio="Sin actividades administrativas."
              onCambio={setAdmin}
              onQuitar={(id) =>
                set(
                  "administrativas",
                  docente.administrativas.filter((x) => x.id !== id)
                )
              }
            />
          </Seccion>
        </div>

        {/* ---------------- Apoyo académico ---------------- */}
        <Seccion
          titulo="Horas de apoyo académico"
          descripcion={
            apoyoBloqueado
              ? "Definidas por la dedicación del docente según el formato institucional"
              : "Seleccione una dedicación para aplicar los valores institucionales"
          }
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo etiqueta="Preparación de clases">
              <Entrada
                type="number"
                min={0}
                value={docente.preparacion}
                disabled={apoyoBloqueado}
                onChange={(e) => set("preparacion", Number(e.target.value) || 0)}
              />
            </Campo>
            <Campo etiqueta="Atención a estudiantes">
              <Entrada
                type="number"
                min={0}
                value={docente.atencion}
                disabled={apoyoBloqueado}
                onChange={(e) => set("atencion", Number(e.target.value) || 0)}
              />
            </Campo>
            <Campo etiqueta="Comunidades académicas">
              <Entrada
                type="number"
                min={0}
                value={docente.comunidades}
                disabled={apoyoBloqueado}
                onChange={(e) => set("comunidades", Number(e.target.value) || 0)}
              />
            </Campo>
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
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      h.severidad === "error" ? "bg-rose-500" : "bg-amber-500"
                    }`}
                  />
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

      <aside className="no-imprimir">
        <ResumenHoras t={totales} />
      </aside>
    </div>
  );
}

/* -------------------------------------------------------------- */

function ListaActividades<T extends { id: string; rolId: number | null; horas: number }>({
  items,
  prefijo,
  vacio,
  onCambio,
  onQuitar,
}: {
  items: T[];
  prefijo: string;
  vacio: string;
  onCambio: (id: string, cambios: Partial<T>) => void;
  onQuitar: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--color-borde)] px-4 py-6 text-center text-sm text-[var(--color-texto-suave)]">
        {vacio}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((x, i) => {
        const rol = ROLES.find((r) => r.id === x.rolId);
        const tono =
          rol?.tipo === "INVESTIGACION" ? "azul" : rol?.tipo === "EXTENSION" ? "ambar" : "verde";
        return (
          <div
            key={x.id}
            className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)]/50 p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Insignia>
                  {prefijo}
                  {i + 1}
                </Insignia>
                {rol && (
                  <Insignia tono={tono}>
                    {rol.tipo === "INVESTIGACION"
                      ? "Investigación"
                      : rol.tipo === "EXTENSION"
                        ? "Extensión"
                        : "Docencia"}
                  </Insignia>
                )}
              </div>
              <Boton variante="peligro" className="px-2 py-1 text-xs" onClick={() => onQuitar(x.id)}>
                Quitar
              </Boton>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
              <Campo etiqueta="Rol">
                <Seleccion
                  opciones={OPCIONES_ROL}
                  value={x.rolId === null ? "" : String(x.rolId)}
                  onChange={(e) =>
                    onCambio(x.id, {
                      rolId: e.target.value === "" ? null : Number(e.target.value),
                    } as Partial<T>)
                  }
                />
              </Campo>
              <Campo etiqueta="Horas">
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
