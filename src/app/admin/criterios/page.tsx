"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import Modal from "@/components/Modal";
import ModalConfirmacion from "@/components/ModalConfirmacion";
import { Bloques } from "@/components/CriteriosBloques";
import EditorBloque, { bloqueVacio, NOMBRE_BLOQUE } from "@/components/EditorBloque";
import { Boton, Campo, Entrada, Insignia, Seccion, Seleccion } from "@/components/ui";
import { FiArrowDown, FiArrowLeft, FiArrowUp, FiEdit3, FiPlus, FiSend, FiTrash2 } from "@/components/iconos";
import { MODALIDADES, type Bloque, type Modalidad, type SeccionCriterios } from "@/lib/criterios";
import { nombreModalidad, revisarContenido, seccionesCambiadas } from "@/lib/criterios-versiones";
import { fechaHoraLegible } from "@/lib/convocatoria";
import { periodosAsignables } from "@/lib/tipos";
import { sileo } from "@/lib/toast";
import { descartarBorradorCriterios, guardarBorradorCriterios, publicarCriterios, useCriterios } from "@/lib/usar-criterios";

/**
 * El editor de los criterios (SPEC-025). Se trabaja sobre el borrador del
 * periodo: cada cambio se guarda en la base al aceptarlo, pero nadie más lo
 * ve hasta que se publica con un motivo. Lo publicado no se toca.
 */
export default function EditorCriterios() {
  const router = useRouter();
  const { publicadas, borradores, error, recargar } = useCriterios();
  const [periodo, setPeriodo] = useState("");
  const [editando, setEditando] = useState<{ indice: number; seccion: SeccionCriterios } | null>(null);
  const [porEliminar, setPorEliminar] = useState<number | null>(null);
  const [publicando, setPublicando] = useState(false);
  const [descartando, setDescartando] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const periodos = useMemo(() => {
    const todos = new Set([
      ...periodosAsignables(),
      ...(publicadas ?? []).map((v) => v.periodo),
      ...borradores.map((v) => v.periodo),
    ]);
    return [...todos].sort().reverse();
  }, [publicadas, borradores]);

  if (error || !publicadas) {
    return (
      <main className="px-4 py-6 sm:p-8">
        <Encabezado titulo="Editar criterios" descripcion={error ?? "Cargando…"} />
      </main>
    );
  }

  const elegido = periodo || borradores[0]?.periodo || publicadas[0].periodo;
  const borrador = borradores.find((v) => v.periodo === elegido) ?? null;
  // La base de un borrador nuevo: lo último publicado del periodo o, si no
  // hay, lo último publicado de todos (el semestre anterior).
  const base = publicadas.find((v) => v.periodo === elegido) ?? publicadas[0];
  const cambios = borrador ? seccionesCambiadas(base.contenido, borrador.contenido) : [];

  const guardar = async (contenido: SeccionCriterios[], exito: string) => {
    const problema = revisarContenido(contenido);
    if (problema) {
      sileo.error({ title: "No se guardó", description: problema });
      return false;
    }
    setOcupado(true);
    try {
      await guardarBorradorCriterios(elegido, contenido);
      await recargar();
      sileo.success({ title: exito, description: `Borrador de ${elegido}. Nadie más lo ve hasta que lo publique.` });
      return true;
    } catch (e) {
      sileo.error({ title: "No se guardó", description: (e as Error).message });
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const contenido = borrador?.contenido ?? [];
  const mover = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= contenido.length) return;
    const nuevo = [...contenido];
    [nuevo[i], nuevo[j]] = [nuevo[j], nuevo[i]];
    void guardar(nuevo, "Orden guardado");
  };

  const publicar = async (motivo: string) => {
    setOcupado(true);
    try {
      const { numero } = await publicarCriterios(elegido, motivo);
      await recargar();
      setPublicando(false);
      sileo.success({ title: `Versión ${numero} publicada`, description: `Criterios de ${elegido}: ya los ven los coordinadores.` });
    } catch (e) {
      sileo.error({ title: "No se publicó", description: (e as Error).message });
    } finally {
      setOcupado(false);
    }
  };

  const descartar = async () => {
    setDescartando(false);
    try {
      await descartarBorradorCriterios(elegido);
      await recargar();
      sileo.success({ title: "Borrador descartado" });
    } catch (e) {
      sileo.error({ title: "No se descartó", description: (e as Error).message });
    }
  };

  return (
    <main className="px-4 py-6 sm:p-8">
      <Encabezado
        titulo="Editar criterios"
        descripcion="Los cambios se guardan en un borrador del periodo. Los coordinadores ven los criterios cuando se publican."
        volver={
          <button
            type="button"
            onClick={() => router.push("/criterios")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-texto-suave)] transition hover:text-cecar-700"
          >
            <FiArrowLeft aria-hidden /> Volver a los criterios
          </button>
        }
      >
        {borrador && (
          <>
            <Boton variante="peligro" onClick={() => setDescartando(true)} disabled={ocupado}>
              <FiTrash2 aria-hidden /> Descartar borrador
            </Boton>
            <Boton onClick={() => setPublicando(true)} disabled={ocupado || cambios.length === 0}>
              <FiSend aria-hidden /> Publicar
            </Boton>
          </>
        )}
      </Encabezado>

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="w-48">
          <label className="etiqueta">Periodo</label>
          <Seleccion opciones={periodos} placeholder="" value={elegido} onChange={(e) => setPeriodo(e.target.value)} />
        </div>
        {borrador ? (
          <p className="text-sm text-[var(--color-texto-suave)]">
            Borrador guardado el {fechaHoraLegible(borrador.actualizado)} por {borrador.actualizadoPor}
            {" · "}
            {cambios.length === 0
              ? "sin cambios frente a lo publicado"
              : `${cambios.length} ${cambios.length === 1 ? "sección cambiada" : "secciones cambiadas"}`}
          </p>
        ) : (
          <Boton
            disabled={ocupado}
            onClick={() => void guardar(structuredClone(base.contenido), "Borrador creado")}
          >
            <FiEdit3 aria-hidden /> Crear borrador desde {base.numero === 0 ? `el documento ${base.periodo}` : `${base.periodo} v${base.numero}`}
          </Boton>
        )}
      </div>

      {borrador && (
        <div className="space-y-6">
          {contenido.map((s, i) => (
            <Seccion
              key={s.id}
              titulo={s.numero ? `${s.numero} · ${s.titulo}` : s.titulo}
              descripcion={nombreModalidad(s.modalidad)}
              accion={
                <div className="flex gap-1">
                  <Boton variante="fantasma" aria-label="Subir" onClick={() => mover(i, -1)} disabled={ocupado || i === 0}>
                    <FiArrowUp aria-hidden />
                  </Boton>
                  <Boton
                    variante="fantasma"
                    aria-label="Bajar"
                    onClick={() => mover(i, 1)}
                    disabled={ocupado || i === contenido.length - 1}
                  >
                    <FiArrowDown aria-hidden />
                  </Boton>
                  <Boton variante="fantasma" aria-label="Eliminar sección" onClick={() => setPorEliminar(i)} disabled={ocupado}>
                    <FiTrash2 aria-hidden />
                  </Boton>
                  <Boton variante="secundario" onClick={() => setEditando({ indice: i, seccion: structuredClone(s) })}>
                    <FiEdit3 aria-hidden /> Editar
                  </Boton>
                </div>
              }
            >
              <Bloques bloques={s.bloques} />
            </Seccion>
          ))}
          <Boton
            variante="secundario"
            onClick={() =>
              setEditando({
                indice: contenido.length,
                seccion: { id: crypto.randomUUID(), modalidad: "general", numero: "", titulo: "", bloques: [] },
              })
            }
          >
            <FiPlus aria-hidden /> Agregar sección
          </Boton>
        </div>
      )}

      {editando && (
        <ModalSeccion
          seccion={editando.seccion}
          nueva={editando.indice === contenido.length}
          ocupado={ocupado}
          onCerrar={() => setEditando(null)}
          onGuardar={async (s) => {
            const nuevo = [...contenido];
            nuevo[editando.indice] = s;
            if (await guardar(nuevo, "Sección guardada")) setEditando(null);
          }}
        />
      )}

      <ModalConfirmacion
        abierto={porEliminar !== null}
        onCerrar={() => setPorEliminar(null)}
        onConfirmar={() => {
          const i = porEliminar;
          setPorEliminar(null);
          if (i !== null) void guardar(contenido.filter((_, j) => j !== i), "Sección eliminada del borrador");
        }}
        titulo="Eliminar sección"
        mensaje="Se quita del borrador. Lo publicado no cambia hasta que publique."
        detalle={porEliminar !== null ? contenido[porEliminar]?.titulo : undefined}
        etiquetaConfirmar="Eliminar"
        peligro
      />

      <ModalConfirmacion
        abierto={descartando}
        onCerrar={() => setDescartando(false)}
        onConfirmar={descartar}
        titulo="Descartar borrador"
        mensaje="Se pierden los cambios sin publicar de este periodo. Lo publicado no cambia."
        detalle={elegido}
        etiquetaConfirmar="Descartar"
        peligro
      />

      <ModalPublicar
        abierto={publicando}
        periodo={elegido}
        cambios={cambios.map((c) => `${c.titulo} (${c.tipo})`)}
        ocupado={ocupado}
        onCerrar={() => setPublicando(false)}
        onConfirmar={publicar}
      />
    </main>
  );
}

function ModalSeccion({
  seccion,
  nueva,
  ocupado,
  onCerrar,
  onGuardar,
}: {
  seccion: SeccionCriterios;
  nueva: boolean;
  ocupado: boolean;
  onCerrar: () => void;
  onGuardar: (s: SeccionCriterios) => void;
}) {
  const [s, setS] = useState(seccion);
  const [tipoNuevo, setTipoNuevo] = useState<Bloque["tipo"]>("parrafo");
  const bloque = (i: number, b: Bloque) => setS({ ...s, bloques: s.bloques.map((x, j) => (j === i ? b : x)) });
  const mover = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= s.bloques.length) return;
    const bloques = [...s.bloques];
    [bloques[i], bloques[j]] = [bloques[j], bloques[i]];
    setS({ ...s, bloques });
  };

  return (
    <Modal abierto onCerrar={onCerrar} titulo={nueva ? "Nueva sección" : "Editar sección"} tamano="xl">
      <div className="grid gap-4 sm:grid-cols-[6rem_1fr_12rem]">
        <Campo etiqueta="Número">
          <Entrada value={s.numero} onChange={(e) => setS({ ...s, numero: e.target.value })} />
        </Campo>
        <Campo etiqueta="Título" requerido>
          <Entrada value={s.titulo} onChange={(e) => setS({ ...s, titulo: e.target.value })} data-foco-inicial />
        </Campo>
        <Campo etiqueta="Modalidad" requerido>
          <Seleccion
            opciones={MODALIDADES}
            placeholder=""
            value={s.modalidad}
            onChange={(e) => setS({ ...s, modalidad: e.target.value as Modalidad })}
          />
        </Campo>
      </div>

      <div className="mt-6 space-y-5">
        {s.bloques.map((b, i) => (
          <div key={i} className="rounded-xl border border-[var(--color-borde)] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <Insignia>{NOMBRE_BLOQUE[b.tipo]}</Insignia>
              <div className="flex gap-1">
                <Boton variante="fantasma" aria-label="Subir bloque" onClick={() => mover(i, -1)} disabled={i === 0}>
                  <FiArrowUp aria-hidden />
                </Boton>
                <Boton variante="fantasma" aria-label="Bajar bloque" onClick={() => mover(i, 1)} disabled={i === s.bloques.length - 1}>
                  <FiArrowDown aria-hidden />
                </Boton>
                <Boton
                  variante="fantasma"
                  aria-label="Quitar bloque"
                  onClick={() => setS({ ...s, bloques: s.bloques.filter((_, j) => j !== i) })}
                >
                  <FiTrash2 aria-hidden />
                </Boton>
              </div>
            </div>
            <EditorBloque b={b} onChange={(x) => bloque(i, x)} />
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div className="w-40">
          <Seleccion
            aria-label="Tipo de bloque"
            opciones={Object.entries(NOMBRE_BLOQUE).map(([valor, texto]) => ({ valor, texto }))}
            placeholder=""
            value={tipoNuevo}
            onChange={(e) => setTipoNuevo(e.target.value as Bloque["tipo"])}
          />
        </div>
        <Boton variante="secundario" onClick={() => setS({ ...s, bloques: [...s.bloques, bloqueVacio(tipoNuevo)] })}>
          <FiPlus aria-hidden /> Agregar bloque
        </Boton>
      </div>

      <div className="mt-6 flex gap-3">
        <Boton variante="secundario" className="flex-1" onClick={onCerrar}>
          Cancelar
        </Boton>
        <Boton className="flex-1" onClick={() => onGuardar(s)} disabled={ocupado}>
          Guardar en el borrador
        </Boton>
      </div>
    </Modal>
  );
}

function ModalPublicar({
  abierto,
  periodo,
  cambios,
  ocupado,
  onCerrar,
  onConfirmar,
}: {
  abierto: boolean;
  periodo: string;
  cambios: string[];
  ocupado: boolean;
  onCerrar: () => void;
  onConfirmar: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const confirmar = () => {
    if (!motivo.trim()) {
      sileo.error({ title: "Falta el motivo", description: "Diga por qué cambian los criterios (acta, acuerdo…)." });
      return;
    }
    onConfirmar(motivo.trim());
    setMotivo("");
  };
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={`Publicar criterios de ${periodo}`} tamano="lg">
      <p className="mb-3 text-sm text-[var(--color-texto-suave)]">
        Pasa a ser la versión vigente y la ven los coordinadores. Después no se edita: corregirla es publicar otra.
      </p>
      {cambios.length > 0 && (
        <ul className="mb-4 list-disc space-y-1 ps-5 text-sm text-[var(--color-texto)]">
          {cambios.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}
      <Campo etiqueta="Motivo" requerido ayuda="Queda en el historial de los criterios, a su nombre.">
        <textarea
          className="campo min-h-24 resize-y"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej.: Acuerdo 012 del Consejo Académico: se ajusta la tabla de tutores virtuales."
          data-foco-inicial
        />
      </Campo>
      <div className="mt-6 flex gap-3">
        <Boton variante="secundario" className="flex-1" onClick={onCerrar}>
          Cancelar
        </Boton>
        <Boton className="flex-1" onClick={confirmar} disabled={ocupado}>
          Publicar
        </Boton>
      </div>
    </Modal>
  );
}
