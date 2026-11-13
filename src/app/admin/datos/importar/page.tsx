"use client";

import { useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import Modal from "@/components/Modal";
import { Boton, Campo, Casilla, Entrada, Insignia, Seccion, Seleccion } from "@/components/ui";
import { FiAlertTriangle, FiArrowLeft, FiCheckCircle, FiUpload } from "@/components/iconos";
import { PROGRAMAS } from "@/lib/catalogos";
import { cargarExcelJS } from "@/lib/exportar-cuadro";
import { recargarDatos } from "@/lib/datos/recargar";
import {
  armarDocentes,
  asignacionImportada,
  programaDe,
  programaDeLosCursos,
  yaImportada,
  type Armado,
  type Decisiones,
  type Pendiente,
} from "@/lib/importar/armar";
import { CAMPOS_UNICOS, type CampoId } from "@/lib/importar/campos";
import { hojaDesdeExcelJS, type Hoja } from "@/lib/importar/hoja";
import { leerHoja, type LecturaHoja, type Mapeo } from "@/lib/importar/leer";
import { huella as huellaDe } from "@/lib/importar/texto";
import { useAsignacionStore } from "@/lib/stores/asignacion-store";
import { useConfigStore } from "@/lib/stores/config-store";
import { useSesionStore } from "@/lib/stores/sesion-store";
import { esImportada, periodoActual } from "@/lib/tipos";
import { sileo } from "@/lib/toast";
import { useConfiguracion } from "@/lib/usar-configuracion";

/**
 * Importar asignaciones de periodos anteriores desde Excel (SPEC-017).
 *
 * No hay ejemplos de los formatos viejos, así que nada se da por sentado:
 * el lector propone (hoja, columnas, periodo, programa, roles) y el
 * administrador confirma o corrige. Solo se importa lo que no tiene dudas
 * pendientes, y cada hoja se guarda por separado: una que falla no tumba
 * a las demás.
 */

type EstadoHoja = "lista" | "importando" | "importada" | "error";

interface HojaCargada {
  id: string;
  archivo: string;
  huella: string;
  hoja: Hoja;
  lectura: LecturaHoja;
  incluir: boolean;
  periodo: string;
  programa: string;
  reemplazar: boolean;
  estado: EstadoHoja;
  mensaje?: string;
}

const PERIODO_VALIDO = /^[12]\d{3}-[12]$/;
const OPCIONES_PROGRAMA = PROGRAMAS.map((p) => p.nombre);

export default function ImportarPeriodos() {
  const asignaciones = useAsignacionStore((s) => s.asignaciones);
  const hidratadoA = useAsignacionStore((s) => s.hidratado);
  const hidratadoC = useConfigStore((s) => s.hidratado);
  const usuario = useSesionStore((s) => s.sesion?.usuario ?? null);
  const config = useConfiguracion();

  const [hojas, setHojas] = useState<HojaCargada[]>([]);
  const [decisiones, setDecisiones] = useState<Decisiones>({});
  const [leyendo, setLeyendo] = useState(false);
  const [importando, setImportando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);

  const cambiar = (id: string, cambios: Partial<HojaCargada>) =>
    setHojas((hs) => hs.map((h) => (h.id === id ? { ...h, ...cambios } : h)));

  // ---- Leer los archivos ----
  const subir = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivos = [...(e.target.files ?? [])];
    e.target.value = "";
    if (!archivos.length) return;
    setLeyendo(true);
    const nuevas: HojaCargada[] = [];
    const errores: string[] = [];
    try {
      const ExcelJS = await cargarExcelJS();
      for (const archivo of archivos) {
        if (!/\.xlsx$/i.test(archivo.name)) {
          errores.push(`${archivo.name}: solo se leen archivos .xlsx. Si es .xls, ábralo en Excel y guárdelo como .xlsx.`);
          continue;
        }
        try {
          const bytes = new Uint8Array(await archivo.arrayBuffer());
          const libro = new ExcelJS.Workbook();
          await libro.xlsx.load(bytes.buffer);
          const h = huellaDe(bytes);
          for (const ws of libro.worksheets) {
            if (ws.state && ws.state !== "visible") continue; // hojas ocultas: listas y auxiliares
            const hoja = hojaDesdeExcelJS(ws);
            const lectura = leerHoja(hoja, { archivo: archivo.name });
            const programa = programaDe(lectura.programa, hoja.nombre, programaDeLosCursos(lectura), archivo.name).programa ?? "";
            nuevas.push({
              id: `${h}:${hoja.nombre}`,
              archivo: archivo.name,
              huella: h,
              hoja,
              lectura,
              incluir: !lectura.descarte,
              periodo: lectura.periodo ?? "",
              programa,
              reemplazar: false,
              estado: "lista",
            });
          }
        } catch (err) {
          console.error(err);
          errores.push(`${archivo.name}: no se pudo abrir. ¿Está dañado o protegido con contraseña?`);
        }
      }
    } finally {
      setLeyendo(false);
    }
    setHojas((hs) => [...hs, ...nuevas.filter((n) => !hs.some((h) => h.id === n.id))]);
    if (errores.length) sileo.error({ title: "Algunos archivos no se leyeron", description: errores.join(" ") });
    else if (nuevas.length) sileo.success({ title: `${nuevas.length} hojas leídas`, description: "Revise cada una antes de importar." });
  };

  // ---- Lo que se deriva de cada hoja ----
  const armados = useMemo(() => {
    const m = new Map<string, Armado>();
    for (const h of hojas) {
      if (!h.lectura.descarte) m.set(h.id, armarDocentes(h.lectura, decisiones, config, h.programa));
    }
    return m;
  }, [hojas, decisiones, config]);

  const incluidas = hojas.filter((h) => h.incluir && !h.lectura.descarte && h.estado !== "importada");

  const pendientes = useMemo(() => {
    const m = new Map<string, Pendiente>();
    for (const h of incluidas) {
      for (const p of armados.get(h.id)?.pendientes ?? []) {
        const ya = m.get(p.clave);
        m.set(p.clave, ya ? { ...ya, veces: ya.veces + p.veces } : p);
      }
    }
    return [...m.values()];
  }, [incluidas, armados]);

  const problemasDe = (h: HojaCargada): { bloquean: string[]; avisos: string[] } => {
    const bloquean: string[] = [];
    const avisos: string[] = [];
    if (!PERIODO_VALIDO.test(h.periodo)) bloquean.push("Indique el periodo (AAAA-1 o AAAA-2).");
    else if (h.periodo >= periodoActual()) avisos.push(`${h.periodo} no es un periodo anterior: ¿seguro que es histórico?`);
    if (!h.programa) bloquean.push("Elija el programa del catálogo.");
    const armado = armados.get(h.id);
    if (armado && !armado.docentes.length) bloquean.push("No hay docentes que importar.");
    if (armado?.pendientes.length) bloquean.push(`${armado.pendientes.length} valores por decidir abajo.`);
    const existentes = asignaciones.filter((a) => a.periodo === h.periodo && a.programa === h.programa);
    if (existentes.some((a) => !esImportada(a))) {
      bloquean.push("Ese programa ya tiene una asignación de ese periodo hecha en el sistema; no se reemplaza.");
    } else if (existentes.length && !h.reemplazar) {
      bloquean.push("Ya hay una importada de ese programa y periodo: marque «Reemplazar» si esta es la buena.");
    }
    const origen = { archivo: h.archivo, hoja: h.hoja.nombre, huella: h.huella };
    if (existentes.some((a) => yaImportada(a, origen))) avisos.push("Esta misma hoja de este archivo ya se importó antes.");
    const repetida = incluidas.filter((o) => o.periodo === h.periodo && o.programa === h.programa).length > 1;
    if (h.programa && repetida) bloquean.push("Otra hoja de esta carga es del mismo programa y periodo: deje solo una.");
    return { bloquean, avisos };
  };

  const listas = incluidas.filter((h) => problemasDe(h).bloquean.length === 0);

  // ---- Importar, hoja por hoja ----
  const importar = async () => {
    if (!usuario) return;
    setImportando(true);
    let bien = 0;
    for (const h of listas) {
      const armado = armados.get(h.id);
      if (!armado) continue;
      cambiar(h.id, { estado: "importando", mensaje: undefined });
      const a = asignacionImportada(
        { periodo: h.periodo, programa: h.programa, docentes: armado.docentes },
        { archivo: h.archivo, hoja: h.hoja.nombre, huella: h.huella },
        usuario.nombres
      );
      const anterior = asignaciones.find((x) => x.periodo === h.periodo && x.programa === h.programa && esImportada(x));
      try {
        const r = await fetch("/api/importar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ asignacion: a, reemplazar: h.reemplazar ? anterior?.id : undefined }),
        });
        if (r.ok) {
          bien++;
          cambiar(h.id, { estado: "importada" });
        } else {
          const { mensaje } = (await r.json().catch(() => ({}))) as { mensaje?: string };
          cambiar(h.id, { estado: "error", mensaje: mensaje ?? `El servidor respondió ${r.status}.` });
        }
      } catch {
        cambiar(h.id, { estado: "error", mensaje: "Sin conexión con el servidor." });
      }
    }
    await recargarDatos();
    setImportando(false);
    if (bien) sileo.success({ title: `${bien} asignaciones importadas`, description: "Ya cuentan en el comparativo." });
  };

  if (!hidratadoA || !hidratadoC) {
    return (
      <main className="px-4 py-6 sm:p-8">
        <Encabezado titulo="Importar periodos anteriores" descripcion="Cargando…" />
      </main>
    );
  }

  const hojaEditada = hojas.find((h) => h.id === editando) ?? null;

  return (
    <main className="px-4 py-6 sm:p-8">
      <Encabezado
        titulo="Importar periodos anteriores"
        descripcion="Asignaciones en Excel de periodos que no se hicieron en el sistema, para completar el comparativo"
        volver={
          <Link href="/admin/datos" className="inline-flex items-center gap-1 text-sm text-cecar-700 hover:underline">
            <FiArrowLeft aria-hidden /> Respaldo de datos
          </Link>
        }
      />

      <div className="space-y-6">
        {/* 1 · Subir */}
        <Seccion
          titulo="1 · Archivos"
          descripcion="Uno o varios .xlsx. Cada hoja se lee por separado: un archivo con varios programas en distintas hojas da una asignación por hoja."
        >
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-cecar-200 bg-cecar-50/40 px-6 py-8 text-center hover:border-cecar-400">
            <FiUpload className="h-6 w-6 text-cecar-600" aria-hidden />
            <span className="text-sm font-semibold text-cecar-800">
              {leyendo ? "Leyendo…" : "Elegir archivos de Excel"}
            </span>
            <span className="text-xs text-[var(--color-texto-suave)]">
              Se leen en este navegador; al servidor solo llega lo que usted confirme.
            </span>
            <input type="file" accept=".xlsx" multiple className="sr-only" onChange={subir} disabled={leyendo} />
          </label>
        </Seccion>

        {hojas.length > 0 && (
          <>
            {/* 2 · Hojas */}
            <Seccion
              titulo="2 · Hojas leídas"
              descripcion="Confirme el periodo y el programa de cada hoja. Si una columna se leyó mal, o la hoja no se reconoció, use «Columnas»."
            >
              <ul className="divide-y divide-[var(--color-borde)]">
                {hojas.map((h) => (
                  <FilaHoja
                    key={h.id}
                    h={h}
                    armado={armados.get(h.id)}
                    problemas={h.incluir && !h.lectura.descarte ? problemasDe(h) : { bloquean: [], avisos: [] }}
                    existeImportada={asignaciones.some((a) => a.periodo === h.periodo && a.programa === h.programa && esImportada(a))}
                    onCambiar={(c) => cambiar(h.id, c)}
                    onColumnas={() => setEditando(h.id)}
                    onQuitar={() => setHojas((hs) => hs.filter((x) => x.id !== h.id))}
                  />
                ))}
              </ul>
            </Seccion>

            {/* 3 · Resolver */}
            {pendientes.length > 0 && (
              <Seccion
                titulo="3 · Valores por decidir"
                descripcion="Textos del Excel que no coinciden sin duda con el catálogo. Lo que decida vale para todas las hojas de esta carga."
                accion={
                  pendientes.some((p) => p.sugerencia) && (
                    <Boton
                      variante="secundario"
                      onClick={() =>
                        setDecisiones((d) => ({
                          ...d,
                          ...Object.fromEntries(pendientes.filter((p) => p.sugerencia).map((p) => [p.clave, p.sugerencia])),
                        }))
                      }
                    >
                      Usar las sugerencias
                    </Boton>
                  )
                }
              >
                <ul className="space-y-3">
                  {pendientes.map((p) => (
                    <li key={p.clave} className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <div className="min-w-0 text-sm">
                        <Insignia tono="ambar">{p.tipo === "rol" ? "Rol" : p.tipo === "dedicacion" ? "Dedicación" : "Contrato"}</Insignia>{" "}
                        <span className="font-medium text-[var(--color-texto)]">«{p.valor}»</span>
                        <span className="text-xs text-[var(--color-texto-suave)]"> · {p.veces} vez{p.veces === 1 ? "" : "es"}</span>
                      </div>
                      <Seleccion
                        aria-label={`Qué es «${p.valor}»`}
                        placeholder={p.sugerencia ? `Sugerido: ${p.opciones.find(([v]) => v === p.sugerencia)?.[1] ?? p.sugerencia}` : "Elija…"}
                        opciones={[
                          { valor: "__ninguno", texto: p.tipo === "rol" ? "Ignorar (las horas quedan sin rol)" : "Dejar vacío" },
                          ...p.opciones.map(([valor, texto]) => ({ valor, texto })),
                        ]}
                        value=""
                        onChange={(e) =>
                          e.target.value &&
                          setDecisiones((d) => ({ ...d, [p.clave]: e.target.value === "__ninguno" ? null : e.target.value }))
                        }
                      />
                    </li>
                  ))}
                </ul>
              </Seccion>
            )}

            {/* 4 · Revisar */}
            <Seccion
              titulo="4 · Revisión"
              descripcion="Cada docente recalculado con el motor y comparado con lo que el propio Excel decía. Una diferencia no impide importar, pero dice que algo se leyó distinto."
            >
              <div className="space-y-4">
                {incluidas.map((h) => (
                  <RevisionHoja key={h.id} h={h} armado={armados.get(h.id)} />
                ))}
                {!incluidas.length && <p className="text-sm text-[var(--color-texto-suave)]">No hay hojas incluidas.</p>}
              </div>
            </Seccion>

            <div className="tarjeta tarjeta-sombra flex flex-wrap items-center justify-between gap-4 p-5">
              <p className="text-sm text-[var(--color-texto-suave)]">
                {listas.length} de {incluidas.length} hojas listas para importar
                {pendientes.length > 0 && ` · ${pendientes.length} valores por decidir`}.
              </p>
              <Boton onClick={importar} disabled={!listas.length || importando || !usuario}>
                <FiUpload aria-hidden /> {importando ? "Importando…" : `Importar ${listas.length} asignaciones`}
              </Boton>
            </div>
          </>
        )}
      </div>

      {hojaEditada && (
        <EditorColumnas
          h={hojaEditada}
          onCerrar={() => setEditando(null)}
          onAplicar={(lectura) => {
            cambiar(hojaEditada.id, { lectura, incluir: !lectura.descarte, periodo: hojaEditada.periodo || lectura.periodo || "" });
            setEditando(null);
          }}
        />
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */

function FilaHoja({
  h,
  armado,
  problemas,
  existeImportada,
  onCambiar,
  onColumnas,
  onQuitar,
}: {
  h: HojaCargada;
  armado?: Armado;
  problemas: { bloquean: string[]; avisos: string[] };
  existeImportada: boolean;
  onCambiar: (c: Partial<HojaCargada>) => void;
  onColumnas: () => void;
  onQuitar: () => void;
}) {
  const bloqueada = h.estado === "importada" || h.estado === "importando";
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--color-texto)]">
            {h.hoja.nombre} <span className="font-normal text-[var(--color-texto-suave)]">· {h.archivo}</span>
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-texto-suave)]">
            {h.lectura.descarte
              ? h.lectura.descarte
              : `Encabezado en la fila ${h.lectura.filaEncabezado} · ${Object.keys(h.lectura.mapeo).length} campos reconocidos · ${armado?.docentes.length ?? 0} docentes`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <EstadoInsignia h={h} />
          <Boton variante="secundario" onClick={onColumnas} disabled={bloqueada}>
            Columnas
          </Boton>
          <Boton variante="fantasma" onClick={onQuitar} disabled={bloqueada}>
            Quitar
          </Boton>
        </div>
      </div>

      {!h.lectura.descarte && (
        <div className="mt-3 grid gap-3 sm:grid-cols-[auto_8rem_minmax(0,1fr)] sm:items-end">
          <Casilla etiqueta="Importar" checked={h.incluir} disabled={bloqueada} onChange={(e) => onCambiar({ incluir: e.target.checked })} className="pb-2" />
          <Campo etiqueta="Periodo" requerido>
            <Entrada
              value={h.periodo}
              placeholder="2023-2"
              disabled={bloqueada}
              error={h.incluir && !PERIODO_VALIDO.test(h.periodo)}
              onChange={(e) => onCambiar({ periodo: e.target.value.trim() })}
            />
          </Campo>
          <Campo etiqueta="Programa" requerido>
            <Seleccion
              opciones={OPCIONES_PROGRAMA}
              value={h.programa}
              disabled={bloqueada}
              error={h.incluir && !h.programa}
              onChange={(e) => onCambiar({ programa: e.target.value })}
            />
          </Campo>
          {h.lectura.programa && (
            <p className="text-[11px] text-[var(--color-texto-suave)] sm:col-span-3">El Excel dice: «{h.lectura.programa}»</p>
          )}
        </div>
      )}

      {h.incluir && existeImportada && (
        <Casilla
          className="mt-2"
          etiqueta="Reemplazar la importada que ya existe para este programa y periodo"
          checked={h.reemplazar}
          disabled={bloqueada}
          onChange={(e) => onCambiar({ reemplazar: e.target.checked })}
        />
      )}
      {h.estado !== "importada" && <Mensajes problemas={problemas} />}
      {h.mensaje && <p className="mt-2 text-xs text-rose-600">{h.mensaje}</p>}
    </li>
  );
}

function EstadoInsignia({ h }: { h: HojaCargada }) {
  if (h.estado === "importada") return <Insignia tono="verde"><FiCheckCircle aria-hidden /> Importada</Insignia>;
  if (h.estado === "importando") return <Insignia tono="azul">Importando…</Insignia>;
  if (h.estado === "error") return <Insignia tono="rojo">Error</Insignia>;
  if (h.lectura.descarte) return <Insignia tono="neutro">No reconocida</Insignia>;
  return null;
}

function Mensajes({ problemas }: { problemas: { bloquean: string[]; avisos: string[] } }) {
  if (!problemas.bloquean.length && !problemas.avisos.length) return null;
  return (
    <ul className="mt-2 space-y-1 text-xs">
      {problemas.bloquean.map((m) => (
        <li key={m} className="flex items-start gap-1.5 text-rose-700">
          <FiAlertTriangle className="mt-0.5 shrink-0" aria-hidden /> {m}
        </li>
      ))}
      {problemas.avisos.map((m) => (
        <li key={m} className="flex items-start gap-1.5 text-amber-700">
          <FiAlertTriangle className="mt-0.5 shrink-0" aria-hidden /> {m}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */

function RevisionHoja({ h, armado }: { h: HojaCargada; armado?: Armado }) {
  if (!armado) return null;
  const conDif = armado.revision.filter((r) => r.diferencias.length).length;
  const conAvisos = armado.revision.filter((r) => r.avisos.length).length;
  return (
    <details className="rounded-lg border border-[var(--color-borde)]" open={conDif > 0}>
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-3 text-sm">
        <span className="font-semibold text-[var(--color-texto)]">
          {h.programa || "Sin programa"} · {h.periodo || "sin periodo"}
        </span>
        <span className="text-xs text-[var(--color-texto-suave)]">{h.hoja.nombre}</span>
        <span className="ms-auto flex gap-1.5">
          <Insignia tono="neutro">{armado.docentes.length} docentes</Insignia>
          {conDif > 0 ? <Insignia tono="rojo">{conDif} no cuadran</Insignia> : <Insignia tono="verde">Cuadra con el Excel</Insignia>}
          {conAvisos > 0 && <Insignia tono="ambar">{conAvisos} con avisos</Insignia>}
        </span>
      </summary>
      {armado.avisos.length > 0 && (
        <ul className="px-4 pb-2 text-xs text-[var(--color-texto-suave)]">
          {armado.avisos.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
      <div className="overflow-x-auto border-t border-[var(--color-borde)]">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="bg-cecar-50 text-[11px] font-semibold tracking-wide text-cecar-800 uppercase">
              <Th>Fila</Th>
              <Th>Docente</Th>
              <Th>Dedicación</Th>
              <Th derecha>Cursos</Th>
              <Th derecha>Total h</Th>
              <Th>Diferencias y avisos</Th>
            </tr>
          </thead>
          <tbody>
            {armado.revision.map((r) => (
              <tr key={r.fila} className="border-t border-[var(--color-borde)] align-top">
                <td className="px-3 py-2 tabular-nums text-[var(--color-texto-suave)]">{r.fila}</td>
                <td className="px-3 py-2 text-[var(--color-texto)]">{r.nombre}</td>
                <td className="px-3 py-2 text-xs">{r.dedicacion ? r.dedicacion.replace(/_/g, " ") : "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.cursos}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.totalSemanal}</td>
                <td className="px-3 py-2 text-xs">
                  {r.diferencias.map((d) => (
                    <p key={d.medida} className="text-rose-700">
                      {d.medida}: Excel {d.excel}, sistema {d.sistema}
                    </p>
                  ))}
                  {r.avisos.map((a) => (
                    <p key={a} className="text-amber-700">
                      {a}
                    </p>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

const Th = ({ children, derecha }: { children: ReactNode; derecha?: boolean }) => (
  <th scope="col" className={`px-3 py-2.5 ${derecha ? "text-right" : "text-left"}`}>
    {children}
  </th>
);

/* ------------------------------------------------------------------ */

/**
 * Corregir la lectura a mano: la fila del encabezado y qué campo es cada
 * columna. Es la salida cuando un formato viejo titula distinto de lo que
 * el diccionario conoce.
 */
function EditorColumnas({ h, onCerrar, onAplicar }: { h: HojaCargada; onCerrar: () => void; onAplicar: (l: LecturaHoja) => void }) {
  const [fila, setFila] = useState(String(h.lectura.filaEncabezado || ""));
  const [lectura, setLectura] = useState(h.lectura);
  const campoDe = useMemo(() => {
    const m = new Map<number, CampoId>();
    for (const [id, cols] of Object.entries(lectura.mapeo)) for (const c of cols ?? []) m.set(c, id as CampoId);
    return m;
  }, [lectura]);

  const releer = (opciones: { filaEncabezado?: number; mapeo?: Mapeo }) =>
    setLectura(leerHoja(h.hoja, { archivo: h.archivo, ...opciones }));

  const asignar = (col: number, id: CampoId | "") => {
    const mapeo: Mapeo = {};
    for (const [k, cols] of Object.entries(lectura.mapeo)) {
      const resto = (cols ?? []).filter((c) => c !== col);
      if (resto.length) mapeo[k as CampoId] = resto;
    }
    if (id) {
      const def = CAMPOS_UNICOS.find((c) => c.id === id);
      mapeo[id] = def?.varias ? [...(mapeo[id] ?? []), col].sort((a, b) => a - b) : [col];
    }
    releer({ filaEncabezado: lectura.filaEncabezado, mapeo });
  };

  return (
    <Modal abierto onCerrar={onCerrar} titulo={`Columnas · ${h.hoja.nombre}`} tamano="xl">
      <div className="space-y-4">
        <div className="flex items-end gap-2">
          <Campo etiqueta="Fila de los títulos" className="w-40">
            <Entrada type="number" min={1} value={fila} onChange={(e) => setFila(e.target.value)} />
          </Campo>
          <Boton variante="secundario" onClick={() => Number(fila) > 0 && releer({ filaEncabezado: Number(fila) })}>
            Leer desde esa fila
          </Boton>
        </div>
        <p className="text-xs text-[var(--color-texto-suave)]">
          {lectura.descarte ?? `${lectura.docentes.length} docentes leídos con este mapeo.`} Los roles y sus horas admiten varias
          columnas (Rol 1, Rol 2…), que se emparejan en orden.
        </p>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto pe-1">
          {lectura.columnas.map((c) => (
            <div key={c.col} className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_16rem]">
              <span className="truncate text-sm text-[var(--color-texto)]" title={c.titulo}>
                <span className="me-2 text-xs tabular-nums text-[var(--color-texto-suave)]">#{c.col}</span>
                {c.titulo}
              </span>
              <Seleccion
                aria-label={`Campo de la columna ${c.titulo}`}
                placeholder="— No se usa —"
                opciones={CAMPOS_UNICOS.map((d) => ({ valor: d.id, texto: d.etiqueta }))}
                value={campoDe.get(c.col) ?? ""}
                onChange={(e) => asignar(c.col, e.target.value as CampoId | "")}
              />
            </div>
          ))}
          {!lectura.columnas.length && (
            <p className="text-sm text-[var(--color-texto-suave)]">Indique la fila donde están los títulos de las columnas.</p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={() => onAplicar(lectura)}>Usar esta lectura</Boton>
        </div>
      </div>
    </Modal>
  );
}
