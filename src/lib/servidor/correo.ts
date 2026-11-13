/** Envío SMTP de credenciales (SPEC-014). La configuración vive en variables
 * de entorno para poder usar el relay institucional sin exponer su secreto.
 * Desde SPEC-014 §Entrega el envío lo pide el administrador; no es automático. */
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
 * Con Aldea (SPEC-018) no hay clave que entregar: el aviso solo dice que ya
 * puede entrar con su usuario de la universidad.
 */
export async function avisarAcceso(destinatario: string, nombres: string): Promise<void> {
  const smtp = configuracion();
  const transporte = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, auth: smtp.auth });
  await transporte.sendMail({
    from: smtp.from,
    to: destinatario,
    subject: "Acceso habilitado · Asignación Académica CECAR",
    text: `Hola ${nombres},

Se habilitó tu acceso a Asignación Académica CECAR.

Ingresa con tu usuario y contraseña de Aldea.

CECAR`,
  });
}

/** Si hay relay configurado: sin él, la pantalla no ofrece el envío por SMTP. */
export const smtpConfigurado = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_DESDE);
