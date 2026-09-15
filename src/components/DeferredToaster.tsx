"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { TOAST_REQUEST_EVENT } from "@/lib/toast";

const Toaster = dynamic(() => import("sileo").then((m) => m.Toaster), { ssr: false });

export default function DeferredToaster() {
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const mostrar = () => setListo(true);

    if (document.documentElement.dataset.cecarToastRequested === "true") {
      mostrar();
      return;
    }

    window.addEventListener(TOAST_REQUEST_EVENT, mostrar, { once: true });
    return () => window.removeEventListener(TOAST_REQUEST_EVENT, mostrar);
  }, []);

  if (!listo) return null;

  return (
    <Toaster
      position="bottom-right"
      theme="light"
      options={{ roundness: 12, duration: 4000 }}
    />
  );
}
