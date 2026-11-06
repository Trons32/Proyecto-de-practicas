"use client";

import { use } from "react";
import DetalleRegistro from "@/components/DetalleRegistro";

export default function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DetalleRegistro id={id} clase="observacion" />;
}
