import nodemailer from "nodemailer";

/**
 * Envío de correo transaccional de Karuma.
 *
 * Extraído de lib/reservas/email.ts para que lo compartan las reservas y el
 * código de verificación del portal del empleado. Mismos proveedores y
 * mismas variables de entorno de siempre: Gmail SMTP si está configurado
 * (RESERVAS_GMAIL_USER + RESERVAS_GMAIL_APP_PASSWORD) y, si no, Resend
 * (RESEND_API_KEY + RESERVAS_EMAIL_FROM / FACTURAS_EMAIL_FROM).
 */

export type EmailSendResult =
  | { sent: true }
  | { sent: false; reason: "missing_config" | "request_failed" | "invalid_recipient"; error?: string };

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * "karuma@gmail.com" -> "kar•••@gmail.com". Para enseñar a dónde ha ido un
 * código sin escribir la dirección entera en pantalla.
 */
export function maskEmail(email: string): string {
  const corte = email.lastIndexOf("@");
  if (corte <= 0) return email;
  const usuario = email.slice(0, corte);
  const dominio = email.slice(corte);
  const visible = usuario.slice(0, Math.min(3, Math.max(1, usuario.length - 1)));
  return `${visible}•••${dominio}`;
}

export async function sendEmailViaResend({
  to,
  subject,
  text,
  html,
  idempotencyKey,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
}): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  // Reuse the verified sender already configured for invoice emails when a
  // reservation-specific sender has not been added in Vercel yet.
  const from = process.env.RESERVAS_EMAIL_FROM?.trim()
    || process.env.FACTURAS_EMAIL_FROM?.trim();
  const replyTo = process.env.RESERVAS_EMAIL_REPLY_TO;
  const normalizedTo = to.trim().toLowerCase();

  if (!isValidEmail(normalizedTo)) return { sent: false, reason: "invalid_recipient" };
  if (!apiKey || !from) {
    const missing = [
      !apiKey ? "RESEND_API_KEY" : null,
      !from ? "RESERVAS_EMAIL_FROM/FACTURAS_EMAIL_FROM" : null,
    ].filter(Boolean).join(", ");
    return { sent: false, reason: "missing_config", error: `Falta configurar: ${missing}` };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: normalizedTo,
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => "");
    return { sent: false, reason: "request_failed", error };
  }

  return { sent: true };
}

export async function sendEmailViaGmailSmtp({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<EmailSendResult> {
  const user = process.env.RESERVAS_GMAIL_USER?.trim();
  const appPassword = process.env.RESERVAS_GMAIL_APP_PASSWORD?.trim();
  const replyTo = process.env.RESERVAS_EMAIL_REPLY_TO?.trim() || user;
  const normalizedTo = to.trim().toLowerCase();

  if (!isValidEmail(normalizedTo)) return { sent: false, reason: "invalid_recipient" };
  if (!user || !appPassword) return { sent: false, reason: "missing_config" };

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass: appPassword },
  });

  try {
    await transporter.sendMail({
      from: `Karuma Sushi & Grill <${user}>`,
      to: normalizedTo,
      replyTo: replyTo || user,
      subject,
      text,
      html,
    });
  } catch (error) {
    return {
      sent: false,
      reason: "request_failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return { sent: true };
}

/** Gmail SMTP is usable only when both required credentials are present. */
export function gmailConfigurado(): boolean {
  return Boolean(
    process.env.RESERVAS_GMAIL_USER?.trim() &&
      process.env.RESERVAS_GMAIL_APP_PASSWORD?.trim(),
  );
}

/**
 * Manda un correo por el proveedor que esté configurado. Mismo orden de
 * preferencia que las reservas: Gmail SMTP primero, Resend de reserva.
 */
export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
}): Promise<EmailSendResult> {
  if (gmailConfigurado()) {
    return sendEmailViaGmailSmtp({
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  }

  return sendEmailViaResend({
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    idempotencyKey: input.idempotencyKey,
  });
}
