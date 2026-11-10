/** Envío SMTP de credenciales (SPEC-014). La configuración vive en variables
 * de entorno para poder usar el relay institucional sin exponer su secreto. */
import nodemailer from "nodemailer";

function configuracion() {
  const host = process.env.SMTP_HOST;
  const desde = process.env.SMTP_DESDE;
  if (!host || !desde) throw new Error("El correo institucional no está configurado.");
  const puerto = Number(process.env.SMTP_PUERTO ?? 587);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) throw new Error("SMTP_PUERTO no es válido.");
  return {
    host,
    port: puerto,
    secure: process.env.SMTP_SEGURO === "1" || puerto === 465,
    auth: process.env.SMTP_USUARIO ? { user: process.env.SMTP_USUARIO, pass: process.env.SMTP_CLAVE ?? "" } : undefined,
    from: desde,
  };
}

export async function enviarCredenciales(destinatario: string, nombres: string, clave: string): Promise<void> {
  const smtp = configuracion();
  const transporte = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, auth: smtp.auth });
  await transporte.sendMail({
    from: smtp.from,
    to: destinatario,
    subject: "Credenciales de acceso · Asignación Académica CECAR",
    text: `Hola ${nombres},\n\nSe creó tu acceso a Asignación Académica CECAR.\n\nUsuario: ${destinatario}\nContraseña temporal: ${clave}\n\nIngresa en la plataforma y conserva esta información de forma segura.\n\nCECAR`,
  });
}

/**
 * Durante una prueba sin relay, el administrador recibe la clave una sola vez
 * en pantalla. Nunca se permite en producción: allí una clave expuesta en una
 * respuesta HTTP sería peor que dejar el alta pendiente de SMTP.
 */
export async function entregarCredenciales(destinatario: string, nombres: string, clave: string): Promise<"smtp" | "prueba"> {
  if (process.env.CREDENCIALES_ENTREGA === "prueba") {
    if (process.env.NODE_ENV === "production" && process.env.PERMITIR_CREDENCIALES_PRUEBA !== "1") {
      throw new Error("La entrega de pruebas requiere PERMITIR_CREDENCIALES_PRUEBA=1 en producción.");
    }
    return "prueba";
  }
  await enviarCredenciales(destinatario, nombres, clave);
  return "smtp";
}
