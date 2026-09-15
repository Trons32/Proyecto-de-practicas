import type { Metadata } from "next";
import "./globals.css";
import DeferredToaster from "@/components/DeferredToaster";

export const metadata: Metadata = {
  title: "Asignación Académica · CECAR",
  description:
    "Sistema de asignación académica de pregrado — Corporación Universitaria del Caribe",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <DeferredToaster />
      </body>
    </html>
  );
}
