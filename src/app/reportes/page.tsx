import CuadroResumenVista from "@/components/CuadroResumenVista";

/**
 * Los reportes del coordinador: el cuadro resumen de sus programas. Fuera
 * de /admin porque GuardiaSesion cierra esa zona a quien no es
 * administrador; los datos ya llegan limitados a lo suyo desde el servidor.
 */
export default function ReportesCoordinador() {
  return <CuadroResumenVista deCoordinador />;
}
