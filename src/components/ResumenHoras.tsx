"use client";

import { Totales, formatoPct } from "@/lib/calculo";

const BARRAS = [
  { clave: "docencia", etiqueta: "Docencia", tipo: "DOCENCIA", color: "bg-cecar-600" },
  { clave: "investigacion", etiqueta: "Investigación", tipo: "INVESTIGACION", color: "bg-sky-600" },
  {
    clave: "extension",
    etiqueta: "Extensión y P. Social",
    tipo: "EXTENSION",
    color: "bg-amber-500",
  },
] as const;

/** Una línea del detalle: de dónde salen las horas de una categoría. */
function Linea({ texto, horas }: { texto: string; horas: number }) {
  return (
    <li className="flex items-baseline justify-between gap-2">
      <span className="min-w-0 truncate text-[11px] text-[var(--color-texto-suave)]" title={texto}>
        {texto}
      </span>
      <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[var(--color-texto)]">
        {horas} h
      </span>
    </li>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: number | string }) {
  return (
    <div className="rounded-lg bg-black/[0.03] px-3 py-2">
      <dt className="text-[10px] font-semibold tracking-wide text-[var(--color-texto-suave)] uppercase">
        {etiqueta}
      </dt>
      <dd className="mt-0.5 text-lg font-bold tabular-nums text-[var(--color-texto)]">{valor}</dd>
    </div>
  );
}

export default function ResumenHoras({ t }: { t: Totales }) {
  const excede = t.maxHoras !== null && t.totalSemanal > t.maxHoras;
  const incompleto = t.maxHoras !== null && t.totalSemanal > 0 && t.totalSemanal < t.maxHoras;
  const completo = t.maxHoras !== null && t.totalSemanal === t.maxHoras;

  const tono = excede
    ? { anillo: "ring-rose-300", texto: "text-rose-700", fondo: "bg-rose-50" }
    : completo
      ? { anillo: "ring-cecar-300", texto: "text-cecar-700", fondo: "bg-cecar-50" }
      : incompleto
        ? { anillo: "ring-amber-300", texto: "text-amber-700", fondo: "bg-amber-50" }
        : { anillo: "ring-black/10", texto: "text-[var(--color-texto-suave)]", fondo: "bg-black/[0.03]" };

  const valores = {
    docencia: t.docencia,
    investigacion: t.investigacion,
    extension: t.extension,
  };
  const pct = {
    docencia: t.pctDocencia,
    investigacion: t.pctInvestigacion,
    extension: t.pctExtension,
  };

  return (
    <div className="tarjeta tarjeta-sombra overflow-hidden xl:sticky xl:top-6">
      <header className="border-b border-[var(--color-borde)] bg-cecar-50/60 px-5 py-3.5">
        <h3 className="text-sm font-bold tracking-wide text-cecar-800 uppercase">
          Dedicación semanal
        </h3>
        <p className="mt-0.5 text-xs text-[var(--color-texto-suave)]">Se recalcula automáticamente</p>
      </header>

      {/* Por debajo de xl el resumen va a lo ancho bajo el formulario: sus
          tres bloques se reparten en línea en vez de quedar altísimos. */}
      <div className="resumen-cuerpo p-5">
        {/* Total semanal */}
        <div className={`rounded-xl px-4 py-3 ring-1 ring-inset ${tono.fondo} ${tono.anillo}`}>
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-semibold tracking-wide text-[var(--color-texto-suave)] uppercase">
              Total semanal
            </span>
            {t.maxHoras !== null && (
              <span className={`text-[11px] font-semibold ${tono.texto}`}>
                {excede
                  ? `Excede por ${t.totalSemanal - t.maxHoras} h`
                  : completo
                    ? "Completo"
                    : `Faltan ${t.maxHoras - t.totalSemanal} h`}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={`text-3xl font-bold tabular-nums ${tono.texto}`}>{t.totalSemanal}</span>
            <span className="text-sm text-[var(--color-texto-suave)]">
              / {t.maxHoras ?? "—"} horas
            </span>
          </div>
        </div>

        {/* Distribución, con el detalle de lo que suma en cada categoría */}
        <div className="space-y-3.5">
          {BARRAS.map((b) => {
            const v = valores[b.clave];
            const p = pct[b.clave];
            const actividades = t.actividades.filter((a) => a.tipo === b.tipo);
            // La docencia suma además las clases y el apoyo académico.
            const fijas =
              b.clave === "docencia"
                ? [
                    { texto: "Horas de clase", horas: t.horasClase },
                    { texto: "Apoyo académico", horas: t.apoyoAcademico },
                  ].filter((x) => x.horas > 0)
                : [];

            return (
              <div key={b.clave}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--color-texto)]">{b.etiqueta}</span>
                  <span className="tabular-nums text-[var(--color-texto-suave)]">
                    <strong className="text-[var(--color-texto)]">{v}</strong> h ·{" "}
                    {formatoPct(p)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${b.color}`}
                    style={{ width: `${Math.min(p * 100, 100)}%` }}
                  />
                </div>

                {(fijas.length > 0 || actividades.length > 0) && (
                  <ul className="mt-1.5 space-y-0.5 border-l-2 border-black/[0.07] pl-2.5">
                    {fijas.map((f) => (
                      <Linea key={f.texto} texto={f.texto} horas={f.horas} />
                    ))}
                    {actividades.map((a, i) => (
                      <Linea key={`${a.rol}-${i}`} texto={a.rol} horas={a.horas} />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Desglose */}
        <dl className="grid grid-cols-2 gap-2 max-xl:md:grid-cols-3">
          <Dato etiqueta="Horas de clase" valor={t.horasClase} />
          <Dato etiqueta="Apoyo académico" valor={t.apoyoAcademico} />
          <Dato etiqueta="Descargas" valor={t.totalDescargas} />
          <Dato etiqueta="Administrativas" valor={t.totalAdministrativas} />
          <Dato etiqueta="Estudiantes" valor={t.totalEstudiantes} />
          <Dato etiqueta="Cursos distintos" valor={t.cursosDiferentes} />
        </dl>
      </div>
    </div>
  );
}
