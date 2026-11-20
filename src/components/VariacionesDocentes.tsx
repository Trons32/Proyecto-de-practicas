"use client";

import { useState } from "react";
import type { Variacion } from "@/lib/tipos";
import { legible } from "@/lib/resumen";
import { MOTIVOS, motivoDe, textoMotivo, variacionesPendientes, type TipoVariacion } from "@/lib/variaciones";
import { Boton, Entrada, Insignia, Seleccion } from "./ui";
import { FiAlertCircle, FiPlus, FiTrash2, FiX } from "./iconos";

const COLUMNAS: { tipo: TipoVariacion; titulo: string; ayuda: string; color: string; vacio: (hay: boolean, previo: string) => string }[] = [
  {
    tipo: "saliente",
    titulo: "Salen",
    ayuda: "Estaban y ya no están",
    color: "bg-rose-500",
    vacio: (hay, previo) => (hay ? `Todos los docentes de ${previo} siguen.` : "Ninguno registrado."),
  },
  {
    tipo: "nuevo",
    titulo: "Llegan",
    ayuda: "No estaban el periodo anterior",
    color: "bg-cecar-500",
    vacio: (hay) => (hay ? "No llega ningún docente nuevo." : "Se calcula cuando exista la asignación anterior."),
  },
  {
    tipo: "cambio",
    titulo: "Cambian",
    ayuda: "Siguen, con otra dedicación o rol",
    color: "bg-sky-500",
    vacio: (hay) => (hay ? "Nadie cambió de dedicación ni de rol." : "Se calcula cuando exista la asignación anterior."),
  },
];

/**
 * Docentes que salen, llegan y cambian (SPEC-027, SPEC-028): las tablas
 * DOCENTES SALIENTES y DOCENTES NUEVOS del formato, más lo que la hoja
 * VARIACIONES dice de los que siguen. La lista la arma el sistema; el
 * coordinador elige el motivo y, si quiere, deja una observación.
 */
export default function VariacionesDocentes({
  filas,
  periodoAnterior,
  hayAnterior,
  editable,
  dedicaciones,
  onGuardar,
}: {
  filas: Variacion[];
  periodoAnterior: string;
  hayAnterior: boolean;
  editable: boolean;
  dedicaciones: string[];
  onGuardar: (filas: Variacion[]) => void;
}) {
  const pendientes = new Set(variacionesPendientes(filas).map((v) => v.id));
  const salientes = filas.filter((v) => v.tipo === "saliente");
  const cambiar = (id: string, cambios: Partial<Variacion>) =>
    onGuardar(filas.map((v) => (v.id === id ? { ...v, ...cambios } : v)));

  return (
    <section className="tarjeta tarjeta-sombra mt-8 overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-borde)] bg-cecar-50/60 px-5 py-4">
        <div>
          <h3 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">Variaciones de docentes</h3>
          <p className="mt-0.5 text-xs text-[var(--color-texto-suave)]">
            {hayAnterior
              ? `Comparado con la asignación ${periodoAnterior} de este programa`
              : `No hay asignación ${periodoAnterior} de este programa para comparar`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {COLUMNAS.map((c) => (
            <Insignia key={c.tipo} tono="neutro">
              {filas.filter((v) => v.tipo === c.tipo).length} {c.titulo.toLowerCase()}
            </Insignia>
          ))}
          {editable && pendientes.size > 0 && (
            <Insignia tono="ambar">
              <FiAlertCircle aria-hidden /> {pendientes.size} sin motivo
            </Insignia>
          )}
        </div>
      </header>

      {!hayAnterior && (
        <p className="border-b border-[var(--color-borde)] bg-sky-50 px-5 py-3 text-sm text-sky-900">
          Sin la asignación anterior no se puede saber quién salió. Si algún docente deja el programa, agréguelo a mano.
        </p>
      )}

      <div className="grid divide-y divide-[var(--color-borde)] xl:grid-cols-3 xl:divide-x xl:divide-y-0">
        {COLUMNAS.map((c) => {
          const propias = filas.filter((v) => v.tipo === c.tipo);
          return (
            <div key={c.tipo} className="p-5">
              <div className="mb-3 flex items-baseline gap-2">
                <span className={`h-2.5 w-2.5 shrink-0 self-center rounded-full ${c.color}`} aria-hidden />
                <h4 className="text-sm font-bold text-[var(--color-texto)]">{c.titulo}</h4>
                <span className="text-xs text-[var(--color-texto-suave)]">{c.ayuda}</span>
              </div>
              {propias.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--color-borde)] px-4 py-6 text-center text-sm text-[var(--color-texto-suave)]">
                  {c.vacio(hayAnterior, periodoAnterior)}
                </p>
              ) : (
                <ul className="space-y-3">
                  {propias.map((v) => (
                    <Tarjeta key={v.id} v={v} alerta={editable && pendientes.has(v.id)}>
                      {editable ? (
                        <Edicion v={v} salientes={salientes} onCambio={(x) => cambiar(v.id, x)} />
                      ) : (
                        <Lectura v={v} />
                      )}
                      {editable && v.manual && (
                        <button
                          type="button"
                          onClick={() => onGuardar(filas.filter((x) => x.id !== v.id))}
                          aria-label={`Quitar a ${v.nombres}`}
                          title="Quitar"
                          className="absolute top-2 right-2 rounded-lg p-1.5 text-[var(--color-texto-suave)] hover:bg-rose-50 hover:text-rose-600"
                        >
                          <FiTrash2 className="h-4 w-4" aria-hidden />
                        </button>
                      )}
                    </Tarjeta>
                  ))}
                </ul>
              )}
              {editable && c.tipo === "saliente" && (
                <AgregarSaliente dedicaciones={dedicaciones} onAgregar={(nuevo) => onGuardar([...filas, nuevo])} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Tarjeta({ v, alerta, children }: { v: Variacion; alerta: boolean; children: React.ReactNode }) {
  return (
    <li className={`relative rounded-xl border p-3 ${alerta ? "border-amber-300 bg-amber-50/50" : "border-[var(--color-borde)] bg-white"}`}>
      <p className="pe-8 text-sm font-semibold text-[var(--color-texto)]">{v.nombres || "Docente sin nombre"}</p>
      <p className="text-xs text-[var(--color-texto-suave)]">
        {v.dedicacion ? legible(v.dedicacion) : "Sin dedicación"}
        {v.documento && ` · ${v.documento}`}
        {v.manual && " · agregado a mano"}
      </p>
      {v.detalle && <p className="mt-1 text-xs font-medium text-sky-800">{v.detalle}</p>}
      <div className="mt-2">{children}</div>
    </li>
  );
}

function Edicion({ v, salientes, onCambio }: { v: Variacion; salientes: Variacion[]; onCambio: (x: Partial<Variacion>) => void }) {
  const motivo = motivoDe(v);
  return (
    <div className="space-y-2">
      <Seleccion
        aria-label={`Motivo de ${v.nombres}`}
        opciones={MOTIVOS[v.tipo].map((m) => ({ valor: m.codigo, texto: m.texto }))}
        placeholder={v.tipo === "nuevo" ? "Motivo (opcional)…" : "Elija el motivo…"}
        value={motivo}
        onChange={(e) => onCambio({ motivo: e.target.value || undefined })}
      />
      {v.tipo === "nuevo" && salientes.length > 0 && (
        <Seleccion
          aria-label={`A quién reemplaza ${v.nombres}`}
          opciones={salientes.map((s) => ({ valor: s.nombres, texto: `Reemplaza a ${s.nombres}` }))}
          placeholder="No reemplaza a nadie"
          value={v.reemplazaA ?? ""}
          onChange={(e) =>
            onCambio({
              reemplazaA: e.target.value || undefined,
              ...(e.target.value && !motivo ? { motivo: "REEMPLAZO" } : {}),
            })
          }
        />
      )}
      <Nota
        key={`${v.id}:${v.nota}`}
        valor={v.nota}
        placeholder={motivo === "OTRO" ? "¿Cuál? (obligatorio)" : "Observación (opcional)"}
        etiqueta={`Observación de ${v.nombres}`}
        onGuardar={(nota) => onCambio({ nota })}
      />
    </div>
  );
}

function Lectura({ v }: { v: Variacion }) {
  const motivo = motivoDe(v);
  return (
    <div className="space-y-0.5 text-sm">
      <p className={motivo ? "text-[var(--color-texto)]" : "text-[var(--color-texto-suave)] italic"}>
        {motivo ? textoMotivo(v.tipo, motivo) : "Sin motivo"}
      </p>
      {v.reemplazaA && <p className="text-xs text-[var(--color-texto-suave)]">Reemplaza a {v.reemplazaA}</p>}
      {v.nota.trim() && <p className="text-xs text-[var(--color-texto-suave)]">{v.nota}</p>}
    </div>
  );
}

/** Se guarda al salir del campo: escribir no dispara un guardado por tecla. */
function Nota({ valor, placeholder, etiqueta, onGuardar }: { valor: string; placeholder: string; etiqueta: string; onGuardar: (v: string) => void }) {
  const [texto, setTexto] = useState(valor);
  return (
    <Entrada
      aria-label={etiqueta}
      placeholder={placeholder}
      value={texto}
      maxLength={300}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => {
        if (texto.trim() !== valor.trim()) onGuardar(texto.trim());
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

function AgregarSaliente({ dedicaciones, onAgregar }: { dedicaciones: string[]; onAgregar: (v: Variacion) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [nombres, setNombres] = useState("");
  const [dedicacion, setDedicacion] = useState("");
  const cerrar = () => {
    setAbierto(false);
    setNombres("");
    setDedicacion("");
  };

  if (!abierto) {
    return (
      <Boton variante="fantasma" className="mt-3" onClick={() => setAbierto(true)}>
        <FiPlus aria-hidden /> Agregar docente que sale
      </Boton>
    );
  }
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-dashed border-cecar-300 p-3">
      <Entrada
        placeholder="Nombre del docente"
        aria-label="Nombre del docente que sale"
        value={nombres}
        onChange={(e) => setNombres(e.target.value.toUpperCase())}
        autoFocus
      />
      <Seleccion aria-label="Dedicación" opciones={dedicaciones} placeholder="Dedicación…" value={dedicacion} onChange={(e) => setDedicacion(e.target.value)} />
      <div className="flex gap-2">
        <Boton variante="secundario" onClick={cerrar}>
          <FiX aria-hidden /> Cancelar
        </Boton>
        <Boton
          disabled={!nombres.trim()}
          onClick={() => {
            onAgregar({ id: crypto.randomUUID(), tipo: "saliente", documento: "", nombres: nombres.trim(), dedicacion, nota: "", manual: true });
            cerrar();
          }}
        >
          <FiPlus aria-hidden /> Agregar
        </Boton>
      </div>
    </div>
  );
}
