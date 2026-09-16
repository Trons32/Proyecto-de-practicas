import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import { Boton } from "@/components/ui";
import { FiAlertCircle, FiArrowLeft } from "@/components/iconos";

/** Pantalla para un id de asignación o docente que ya no existe. */
export default function NoEncontrada({
  titulo = "Asignación no encontrada",
  mensaje = "La asignación que busca no existe o fue eliminada.",
}: {
  titulo?: string;
  mensaje?: string;
}) {
  return (
    <main className="px-4 py-6 sm:p-8">
      <Encabezado titulo={titulo} />
      <section className="tarjeta tarjeta-sombra p-10 text-center">
        <FiAlertCircle className="mx-auto h-10 w-10 text-[var(--color-texto-suave)]/40" aria-hidden />
        <p className="mx-auto mt-3 max-w-md text-sm text-[var(--color-texto-suave)]">{mensaje}</p>
        <Link href="/" className="mt-5 inline-block">
          <Boton>
            <FiArrowLeft aria-hidden /> Volver al inicio
          </Boton>
        </Link>
      </section>
    </main>
  );
}
