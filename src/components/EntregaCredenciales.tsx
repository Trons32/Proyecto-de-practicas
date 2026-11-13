"use client";

import { useState } from "react";
import { Boton } from "@/components/ui";
import { FaWhatsapp, FiCheck, FiCheckCircle, FiCopy, FiMail, FiSend } from "@/components/iconos";
import { sileo } from "@/lib/toast";

export interface Credenciales {
  id: string;
  email: string;
  nombres: string;
  clave: string;
}

/**
 * `navigator.clipboard` solo existe en contexto seguro (https o localhost).
 * Si la VPS se abre por IP sin certificado, el botón de copiar no puede
 * quedarse sin hacer nada: se recurre a la selección de un textarea.
 */
async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = texto;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function mensaje({ nombres, email, clave }: Credenciales): string {
  return [
    `Hola ${nombres},`,
    "",
    "Se creó tu acceso a Asignación Académica CECAR.",
    "",
    `Ingresa en: ${window.location.origin}/login`,
    `Usuario: ${email}`,
    `Contraseña temporal: ${clave}`,
    "",
    "Al entrar te pedirá cambiar la contraseña.",
  ].join("\n");
}

const OPCION =
  "flex flex-col items-center justify-center gap-1.5 rounded-lg border border-[var(--color-borde)] bg-white px-3 py-3 " +
  "text-xs font-medium text-[var(--color-texto)] transition hover:border-cecar-300 hover:bg-cecar-50 " +
  "focus-visible:ring-2 focus-visible:ring-cecar-500/40 focus-visible:outline-none disabled:opacity-60";

function Dato({ etiqueta, valor, mono = false }: { etiqueta: string; valor: string; mono?: boolean }) {
  const [copiado, setCopiado] = useState(false);
  const alCopiar = async () => {
    if (!(await copiar(valor))) {
      sileo.error({ title: "No se pudo copiar", description: "Seleccione el texto y cópielo a mano." });
      return;
    }
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2000);
  };
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-[var(--color-texto-suave)]">{etiqueta}</dt>
        <dd className={`mt-0.5 break-all text-[var(--color-texto)] ${mono ? "font-mono text-base font-bold tracking-wide" : "text-sm font-semibold"}`}>
          {valor}
        </dd>
      </div>
      <button
        type="button"
        onClick={() => void alCopiar()}
        aria-label={copiado ? `${etiqueta} copiado` : `Copiar ${etiqueta.toLowerCase()}`}
        title={copiado ? "Copiado" : "Copiar"}
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition ${
          copiado
            ? "border-cecar-300 bg-cecar-50 text-cecar-700"
            : "border-[var(--color-borde)] text-[var(--color-texto-suave)] hover:border-cecar-300 hover:text-cecar-700"
        }`}
      >
        {copiado ? <FiCheck className="h-4 w-4" aria-hidden /> : <FiCopy className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
}

/**
 * La entrega de una clave temporal (SPEC-014 §Entrega). Es la única vez que
 * se ve: en la base solo queda el hash. Si se cierra sin entregarla, "Nueva
 * clave" en la tabla genera otra.
 */
export default function EntregaCredenciales({
  credenciales,
  smtp,
  onListo,
}: {
  credenciales: Credenciales;
  /** Hay relay configurado en el servidor. */
  smtp: boolean;
  onListo: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [copiadoTodo, setCopiadoTodo] = useState(false);
  const texto = mensaje(credenciales);
  const asunto = "Acceso a Asignación Académica CECAR";

  const enviarSmtp = async () => {
    setEnviando(true);
    try {
      const r = await fetch("/api/usuarios/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: credenciales.id, clave: credenciales.clave }),
      });
      const datos = (await r.json().catch(() => ({}))) as { mensaje?: string };
      if (!r.ok) throw new Error(datos.mensaje ?? "No fue posible enviar el correo.");
      sileo.success({ title: "Correo enviado", description: datos.mensaje });
    } catch (e) {
      sileo.error({ title: "No se envió el correo", description: (e as Error).message });
    } finally {
      setEnviando(false);
    }
  };

  const copiarTodo = async () => {
    if (!(await copiar(texto))) {
      sileo.error({ title: "No se pudo copiar", description: "Seleccione el texto y cópielo a mano." });
      return;
    }
    setCopiadoTodo(true);
    window.setTimeout(() => setCopiadoTodo(false), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cecar-50 text-cecar-700">
          <FiCheckCircle className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="font-semibold text-[var(--color-texto)]">{credenciales.nombres}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-[var(--color-texto-suave)]">
            Entréguele estos datos. La contraseña es temporal: se le pedirá
            cambiarla al entrar, y no se volverá a mostrar aquí.
          </p>
        </div>
      </div>

      <dl className="divide-y divide-[var(--color-borde)] rounded-xl border border-[var(--color-borde)] bg-cecar-50/40">
        <Dato etiqueta="Correo" valor={credenciales.email} />
        <Dato etiqueta="Contraseña temporal" valor={credenciales.clave} mono />
      </dl>

      <div>
        <p className="mb-2 text-sm font-medium text-[var(--color-texto)]">Enviar por</p>
        <div className={`grid grid-cols-2 gap-2 ${smtp ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
          <a
            className={OPCION}
            href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaWhatsapp className="h-5 w-5 text-emerald-600" aria-hidden />
            WhatsApp
          </a>
          <a
            className={OPCION}
            href={`mailto:${credenciales.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(texto)}`}
          >
            <FiMail className="h-5 w-5 text-cecar-700" aria-hidden />
            Mi correo
          </a>
          {smtp && (
            <button type="button" className={OPCION} onClick={() => void enviarSmtp()} disabled={enviando}>
              <FiSend className="h-5 w-5 text-cecar-700" aria-hidden />
              {enviando ? "Enviando…" : "Correo institucional"}
            </button>
          )}
          <button type="button" className={OPCION} onClick={() => void copiarTodo()}>
            {copiadoTodo ? (
              <FiCheck className="h-5 w-5 text-cecar-700" aria-hidden />
            ) : (
              <FiCopy className="h-5 w-5 text-cecar-700" aria-hidden />
            )}
            {copiadoTodo ? "Copiado" : "Copiar mensaje"}
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-texto-suave)]">
          WhatsApp y «Mi correo» abren su aplicación con el mensaje listo: usted
          elige el contacto y lo envía.
        </p>
      </div>

      <div className="flex justify-end">
        <Boton onClick={onListo}>Listo</Boton>
      </div>
    </div>
  );
}
