import type { SileoOptions } from "sileo";

/** Evento que despierta al Toaster la primera vez que se pide un toast. */
export const TOAST_REQUEST_EVENT = "cecar:toast-requested";

let sileoModulePromise: Promise<typeof import("sileo")> | null = null;

function loadSileo() {
  sileoModulePromise ??= import("sileo");
  return sileoModulePromise;
}

type Metodo = "success" | "error" | "warning" | "info";

/**
 * Sileo se carga bajo demanda: hasta que no se dispara el primer toast
 * no entra al bundle ni se monta el Toaster.
 */
function show(metodo: Metodo, options: SileoOptions): void {
  if (typeof window !== "undefined") {
    document.documentElement.dataset.cecarToastRequested = "true";
    window.dispatchEvent(new Event(TOAST_REQUEST_EVENT));
  }

  void loadSileo()
    .then(({ sileo: cargado }) => cargado[metodo](options))
    .catch((error) => console.error("No se pudo mostrar la notificación:", error));
}

export const sileo = {
  success: (options: SileoOptions) => show("success", options),
  error: (options: SileoOptions) => show("error", options),
  warning: (options: SileoOptions) => show("warning", options),
  info: (options: SileoOptions) => show("info", options),
};
