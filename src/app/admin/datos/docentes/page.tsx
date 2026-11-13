"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import { Boton } from "@/components/ui";
import { FiArrowLeft, FiCheckCircle, FiUpload, FiUsers } from "@/components/iconos";
import { cargarExcelJS } from "@/lib/exportar-cuadro";
import { hojaDesdeExcelJS } from "@/lib/importar/hoja";
import { ETIQUETA_MOTIVO, filasDelListado, type Descarte, type FilaListado, type Motivo } from "@/lib/directorio";
import { sileo } from "@/lib/toast";

interface Resumen {
  filas: number;
  nuevos: number;
  actualizados: number;
  sinCambios: number;
  motivos: [Motivo, number][];
  descartes: Descarte[];
  aplicado: boolean;
}

/** Conflictos que alguien tiene que resolver; lo demás es basura del listado. */
const CONFLICTOS: Motivo[] = ["cedula_con_varios_codigos", "codigo_repetido", "codigo_en_uso", "sin_nombre"];

/**
 * Cargar el listado institucional de docentes (SPEC-021). Se repite cada
 * semestre: el Excel se lee aquí, el servidor planea y muestra qué haría,
 * y solo al confirmar escribe. Cargarlo dos veces no duplica a nadie, y no
 * se borra a quien no venga.
 */
export default function CargarDocentes() {
  const [archivo, setArchivo] = useState<string | null>(null);
  const [filas, setFilas] = useState<FilaListado[] | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [ocupado, setOcupado] = useState<"leyendo" | "cargando" | null>(null);

  const pedir = async (lista: FilaListado[], confirmar: boolean): Promise<Resumen> => {
    const r = await fetch("/api/docentes/importar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filas: lista, confirmar }),
    });
    const datos = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(datos.mensaje ?? `Error ${r.status}.`);
    return datos as Resumen;
  };

  const subir = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) {
      sileo.error({ title: "Formato no admitido", description: "Guarde el listado como .xlsx y vuelva a subirlo." });
      return;
    }
    setOcupado("leyendo");
    setResumen(null);
    try {
      const ExcelJS = await cargarExcelJS();
      const libro = new ExcelJS.Workbook();
      await libro.xlsx.load(await f.arrayBuffer());
      const leidas = libro.worksheets.map((ws) => filasDelListado(hojaDesdeExcelJS(ws))).find(Boolean) ?? null;
      if (!leidas) throw new Error("No se encontraron columnas de código, identificación y nombre.");
      setArchivo(f.name);
      setFilas(leidas);
      setResumen(await pedir(leidas, false));
    } catch (err) {
      setFilas(null);
      sileo.error({ title: "No se pudo leer el listado", description: (err as Error).message });
    } finally {
      setOcupado(null);
    }
  };

  const confirmar = async () => {
    if (!filas) return;
    setOcupado("cargando");
    try {
      const r = await pedir(filas, true);
      setResumen(r);
      sileo.success({ title: "Listado cargado", description: `${r.nuevos} nuevos y ${r.actualizados} actualizados.` });
    } catch (err) {
      sileo.error({ title: "No se cargó el listado", description: (err as Error).message });
    } finally {
      setOcupado(null);
    }
  };

  const descartados = resumen?.motivos.reduce((s, [, n]) => s + n, 0) ?? 0;
  const conflictos = resumen?.descartes.filter((d) => CONFLICTOS.includes(d.motivo)) ?? [];

  return (
    <main className="px-4 py-6 sm:p-8">
      <Link href="/admin/datos" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--color-texto-suave)] hover:text-cecar-700">
        <FiArrowLeft aria-hidden /> Datos
      </Link>
      <Encabezado
        titulo="Directorio de docentes"
        descripcion="Cargue el listado institucional para que, al registrar un docente, baste con su cédula o su código."
      />

      <section className="tarjeta tarjeta-sombra max-w-3xl p-5">
        <div className="flex items-start gap-3">
          <FiUsers className="mt-0.5 h-5 w-5 shrink-0 text-cecar-700" aria-hidden />
          <div className="text-sm leading-relaxed text-[var(--color-texto-suave)]">
            <p>
              Suba el Excel con las columnas <strong>CODIGO</strong>, <strong>NUM_IDENTIFICACION</strong> y{" "}
              <strong>NOM_LARGO</strong>. Primero verá qué va a pasar; nada se guarda hasta que confirme.
            </p>
            <ul className="mt-2 list-disc space-y-0.5 ps-5">
              <li>Cada docente se identifica por su cédula: cargarlo otra vez no lo duplica.</li>
              <li>No se borra a nadie que no venga en el listado.</li>
              <li>Si el docente ya tiene nombre por una asignación entregada, ese se conserva.</li>
            </ul>
          </div>
        </div>
        <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-cecar-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cecar-700">
          <FiUpload aria-hidden /> {ocupado === "leyendo" ? "Leyendo…" : archivo ? "Subir otro listado" : "Subir listado (.xlsx)"}
          <input type="file" accept=".xlsx" className="sr-only" onChange={(e) => void subir(e)} disabled={ocupado !== null} />
        </label>
      </section>

      {resumen && (
        <section className="tarjeta tarjeta-sombra mt-6 max-w-3xl p-5" aria-live="polite">
          <h2 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">
            {resumen.aplicado ? "Carga aplicada" : "Vista previa"} · {archivo}
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Nuevos", resumen.nuevos],
              ["Se actualizan", resumen.actualizados],
              ["Sin cambios", resumen.sinCambios],
              ["Descartados", descartados],
            ].map(([etiqueta, n]) => (
              <div key={etiqueta} className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]/50 p-3">
                <dt className="text-xs text-[var(--color-texto-suave)]">{etiqueta}</dt>
                <dd className="mt-0.5 text-2xl font-bold text-[var(--color-texto)] tabular-nums">{n}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-[var(--color-texto-suave)]">
            {resumen.filas} filas leídas. «Se actualizan»: reciben su código o un nombre nuevo del listado.
          </p>

          {resumen.motivos.length > 0 && (
            <div className="mt-5">
              <h3 className="etiqueta">Descartados, por motivo</h3>
              <ul className="space-y-1 text-sm">
                {resumen.motivos.map(([m, n]) => (
                  <li key={m} className="flex justify-between gap-3 border-b border-[var(--color-borde)] py-1.5 last:border-0">
                    <span className="text-[var(--color-texto)]">{ETIQUETA_MOTIVO[m]}</span>
                    <span className="font-semibold tabular-nums">{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {conflictos.length > 0 && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-900">Para revisar con Talento Humano</h3>
              <p className="mt-1 text-xs text-amber-800">Fila del Excel y código. Estos docentes no se cargan hasta corregir el listado.</p>
              <ul className="mt-2 max-h-48 space-y-0.5 overflow-auto font-mono text-xs text-amber-900">
                {conflictos.map((d, i) => (
                  <li key={`${d.fila}-${i}`}>
                    fila {d.fila} · {d.codigo || "sin código"} · {ETIQUETA_MOTIVO[d.motivo]}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            {resumen.aplicado ? (
              <p className="flex items-center gap-1.5 text-sm text-cecar-700">
                <FiCheckCircle aria-hidden /> Guardado. Ya se puede buscar a estos docentes por cédula o código.
              </p>
            ) : (
              <Boton onClick={() => void confirmar()} disabled={ocupado !== null || resumen.nuevos + resumen.actualizados === 0}>
                {ocupado === "cargando" ? "Cargando…" : `Cargar ${resumen.nuevos + resumen.actualizados} docentes`}
              </Boton>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
