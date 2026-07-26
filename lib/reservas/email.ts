import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

type ReservationConfirmationInput = {
  to: string;
  nombre: string;
  fecha: string;
  hora: string;
  servicio: string;
  personas: number;
  reservaId: string;
  mesaIds: number[];
  telefonoRestaurante?: string | null;
};

type ReservationReviewInput = {
  to: string;
  nombre: string;
  reservaId: string;
  reviewLink: string;
};

type ReservationReminderInput = {
  to: string;
  nombre: string;
  fecha: string;
  hora: string;
  personas: number;
  reservaId: string;
  telefonoRestaurante?: string | null;
};

type EmailSendResult =
  | { sent: true }
  | { sent: false; reason: "missing_config" | "request_failed" | "invalid_recipient"; error?: string };

const RESTAURANT_NAME = "Karuma Sushi & Grill";
const RESTAURANT_ADDRESS = "C/ de Roger de Llòria, 2, Valencia";
const MAPS_URL = "https://maps.google.com/?q=C+de+Roger+de+Ll%C3%B2ria+2+Valencia";
const DEFAULT_GMAIL_USER = "karumavalencia@gmail.com";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatFecha(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildConfirmationEmail(input: ReservationConfirmationInput) {
  const nombre = input.nombre.trim() || "cliente";
  const fecha = formatFecha(input.fecha);
  const servicio = input.servicio === "comida" ? "Comida" : "Cena";
  const mesa = input.mesaIds.length > 0 ? input.mesaIds.join(", ") : "Asignada";
  const phoneLine = input.telefonoRestaurante
    ? `Para cambiar o cancelar la reserva, llámanos al ${input.telefonoRestaurante}.`
    : "Para cambiar o cancelar la reserva, contacta con el restaurante.";

  const subject = `Confirmación de reserva - ${RESTAURANT_NAME}`;
  const text = [
    `Hola ${nombre},`,
    "",
    "Tu reserva está confirmada:",
    `Fecha: ${fecha}`,
    `Hora: ${input.hora}`,
    `Personas: ${input.personas}`,
    `Servicio: ${servicio}`,
    `Mesa: ${mesa}`,
    `Reserva: ${input.reservaId}`,
    "",
    RESTAURANT_NAME,
    RESTAURANT_ADDRESS,
    MAPS_URL,
    "",
    phoneLine,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:560px;margin:0 auto;padding:24px">
      <h1 style="font-size:22px;margin:0 0 8px">${escapeHtml(RESTAURANT_NAME)}</h1>
      <p style="margin:0 0 20px;color:#4b5563">Reserva confirmada</p>
      <p>Hola ${escapeHtml(nombre)},</p>
      <p>Tu reserva está confirmada. Te esperamos en Karuma.</p>
      <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:12px;overflow:hidden;margin:20px 0">
        <tbody>
          <tr><td style="padding:10px 14px;color:#6b7280">Fecha</td><td style="padding:10px 14px;font-weight:700;text-align:right">${escapeHtml(fecha)}</td></tr>
          <tr><td style="padding:10px 14px;color:#6b7280">Hora</td><td style="padding:10px 14px;font-weight:700;text-align:right">${escapeHtml(input.hora)}</td></tr>
          <tr><td style="padding:10px 14px;color:#6b7280">Personas</td><td style="padding:10px 14px;font-weight:700;text-align:right">${input.personas}</td></tr>
          <tr><td style="padding:10px 14px;color:#6b7280">Servicio</td><td style="padding:10px 14px;font-weight:700;text-align:right">${escapeHtml(servicio)}</td></tr>
          <tr><td style="padding:10px 14px;color:#6b7280">Mesa</td><td style="padding:10px 14px;font-weight:700;text-align:right">${escapeHtml(mesa)}</td></tr>
          <tr><td style="padding:10px 14px;color:#6b7280">Reserva</td><td style="padding:10px 14px;font-weight:700;text-align:right">${escapeHtml(input.reservaId)}</td></tr>
        </tbody>
      </table>
      <p style="font-weight:700;margin-bottom:4px">${escapeHtml(RESTAURANT_NAME)}</p>
      <p style="margin:0 0 8px;color:#4b5563">${escapeHtml(RESTAURANT_ADDRESS)}</p>
      <p style="margin:0 0 20px"><a href="${MAPS_URL}" style="color:#b42318">Ver ubicación en Google Maps</a></p>
      <p style="font-size:13px;color:#6b7280">${escapeHtml(phoneLine)}</p>
    </div>
  `;

  return { subject, text, html };
}

function buildReviewEmail(input: ReservationReviewInput) {
  const nombre = input.nombre.trim() || "cliente";
  const subject = `¿Qué tal tu visita a ${RESTAURANT_NAME}?`;
  const text = [
    `Hola ${nombre},`,
    "",
    "¡Mil gracias por visitarnos! Esperamos que disfrutaras de la experiencia en Karuma Sushi & Grill.",
    "",
    "¿Nos cuentas qué tal fue? Valorar tu visita solo te llevará un minuto y a nosotros nos ayuda muchísimo a seguir mejorando y a que más gente nos descubra:",
    input.reviewLink,
    "",
    "¡Esperamos verte pronto de nuevo!",
    "",
    `El equipo de ${RESTAURANT_NAME}`,
  ].join("\n");

  const safeLink = escapeHtml(input.reviewLink);
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:560px;margin:0 auto;padding:24px">
      <h1 style="font-size:22px;margin:0 0 8px">${escapeHtml(RESTAURANT_NAME)}</h1>
      <p style="margin:0 0 20px;color:#4b5563">¿Qué tal tu visita?</p>
      <p>Hola ${escapeHtml(nombre)},</p>
      <p>¡Mil gracias por visitarnos! Esperamos que disfrutaras de la experiencia en Karuma Sushi & Grill.</p>
      <p>¿Nos cuentas qué tal fue? Valorar tu visita solo te llevará un minuto y a nosotros nos ayuda muchísimo a seguir mejorando y a que más gente nos descubra.</p>
      <p style="margin:24px 0">
        <a href="${safeLink}" style="display:inline-block;background:#b42318;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700">
          Valorar mi visita
        </a>
      </p>
      <p>¡Esperamos verte pronto de nuevo!</p>
      <p style="font-size:13px;color:#6b7280">El equipo de ${escapeHtml(RESTAURANT_NAME)}</p>
    </div>
  `;

  return { subject, text, html };
}

function buildReminderEmail(input: ReservationReminderInput) {
  const nombre = input.nombre.trim() || "cliente";
  const fecha = formatFecha(input.fecha);
  const phoneLine = input.telefonoRestaurante
    ? `Si no puedes venir, avísanos o cancela llamando al ${input.telefonoRestaurante}.`
    : "Si no puedes venir, avísanos o cancela contactando con el restaurante.";

  const subject = `Recordatorio: tu reserva de mañana - ${RESTAURANT_NAME}`;
  const text = [
    `Hola ${nombre},`,
    "",
    "Te recordamos tu reserva para mañana:",
    `Fecha: ${fecha}`,
    `Hora: ${input.hora}`,
    `Personas: ${input.personas}`,
    "",
    "¡Te esperamos!",
    "",
    RESTAURANT_NAME,
    RESTAURANT_ADDRESS,
    MAPS_URL,
    "",
    phoneLine,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:560px;margin:0 auto;padding:24px">
      <h1 style="font-size:22px;margin:0 0 8px">${escapeHtml(RESTAURANT_NAME)}</h1>
      <p style="margin:0 0 20px;color:#4b5563">Recordatorio de tu reserva</p>
      <p>Hola ${escapeHtml(nombre)},</p>
      <p>Te recordamos que mañana tienes una reserva con nosotros. Te esperamos en Karuma.</p>
      <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:12px;overflow:hidden;margin:20px 0">
        <tbody>
          <tr><td style="padding:10px 14px;color:#6b7280">Fecha</td><td style="padding:10px 14px;font-weight:700;text-align:right">${escapeHtml(fecha)}</td></tr>
          <tr><td style="padding:10px 14px;color:#6b7280">Hora</td><td style="padding:10px 14px;font-weight:700;text-align:right">${escapeHtml(input.hora)}</td></tr>
          <tr><td style="padding:10px 14px;color:#6b7280">Personas</td><td style="padding:10px 14px;font-weight:700;text-align:right">${input.personas}</td></tr>
        </tbody>
      </table>
      <p style="font-weight:700;margin-bottom:4px">${escapeHtml(RESTAURANT_NAME)}</p>
      <p style="margin:0 0 8px;color:#4b5563">${escapeHtml(RESTAURANT_ADDRESS)}</p>
      <p style="margin:0 0 20px"><a href="${MAPS_URL}" style="color:#b42318">Ver ubicación en Google Maps</a></p>
      <p style="font-size:13px;color:#6b7280">${escapeHtml(phoneLine)}</p>
    </div>
  `;

  return { subject, text, html };
}

type GmailCredentials = {
  installed?: {
    client_id?: string;
    client_secret?: string;
    redirect_uris?: string[];
  };
  web?: {
    client_id?: string;
    client_secret?: string;
    redirect_uris?: string[];
  };
};

type GmailToken = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expiry_date?: number;
  scope?: string;
};

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function resolveGmailFile(envVar: string, fallbackName: string): string {
  return process.env[envVar]?.trim() || path.join(process.cwd(), fallbackName);
}

function encodeBase64Url(input: string): string {
  return Buffer.from(input, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function makeMessageId(reservaId: string): string {
  return `<reservation-confirmation-${reservaId}@karuma.es>`;
}

export function buildReservationConfirmationSendKey(input: {
  email: string;
  fecha: string;
  hora: string;
  servicio: string;
  personas: number;
  telefono: string;
  nombre: string;
}): string {
  const canonical = [
    input.email.trim().toLowerCase(),
    input.fecha,
    input.hora,
    input.servicio,
    String(input.personas),
    input.telefono.trim(),
    input.nombre.trim().toLowerCase(),
  ].join("|");
  return `reservation-confirmation-${createHash("sha256").update(canonical).digest("hex")}`;
}

async function getGmailAccessToken(): Promise<string | null> {
  const credentialsPath = resolveGmailFile("GMAIL_CREDENTIALS_FILE", "credentials.json");
  const tokenPath = resolveGmailFile("GMAIL_TOKEN_FILE", "token.json");
  const credentials = await readJsonFile<GmailCredentials>(credentialsPath);
  const token = await readJsonFile<GmailToken>(tokenPath);
  const client = credentials?.installed ?? credentials?.web;

  if (!client?.client_id || !client.client_secret || !token?.refresh_token) {
    return null;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: client.client_id,
      client_secret: client.client_secret,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json() as { access_token?: string };
  return payload.access_token ?? null;
}

function buildGmailRawMessage(input: {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
  messageId: string;
}): string {
  const boundary = `boundary_${input.messageId.replace(/[<>@]/g, "")}`;
  const headers = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Reply-To: ${input.replyTo}`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    `Message-ID: ${input.messageId}`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  const body = [
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    input.text,
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    input.html,
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return encodeBase64Url(`${headers.join("\r\n")}\r\n\r\n${body}`);
}

async function sendEmailViaResend({
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
  const from = process.env.RESERVAS_EMAIL_FROM?.trim() || process.env.FACTURAS_EMAIL_FROM?.trim();
  const replyTo = process.env.RESERVAS_EMAIL_REPLY_TO?.trim();
  const normalizedTo = to.trim().toLowerCase();

  if (!isValidEmail(normalizedTo)) return { sent: false, reason: "invalid_recipient" };
  if (!apiKey || !from) return { sent: false, reason: "missing_config" };

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

async function sendEmailViaGmail({
  to,
  subject,
  text,
  html,
  messageId,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
  messageId: string;
}): Promise<EmailSendResult> {
  const normalizedTo = to.trim().toLowerCase();
  if (!isValidEmail(normalizedTo)) return { sent: false, reason: "invalid_recipient" };

  const from = process.env.GMAIL_USER?.trim() || DEFAULT_GMAIL_USER;
  const replyTo = process.env.RESERVAS_EMAIL_REPLY_TO?.trim() || from;
  if (!isValidEmail(from) || !isValidEmail(replyTo)) {
    return { sent: false, reason: "missing_config" };
  }

  const accessToken = await getGmailAccessToken();
  if (!accessToken) {
    return { sent: false, reason: "missing_config" };
  }

  const raw = buildGmailRawMessage({
    from,
    to: normalizedTo,
    replyTo,
    subject,
    text,
    html,
    messageId,
  });

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => "");
    return { sent: false, reason: "request_failed", error };
  }

  return { sent: true };
}

export async function sendReservationConfirmationEmail(
  input: ReservationConfirmationInput,
): Promise<EmailSendResult> {
  const email = buildConfirmationEmail(input);

  if (process.env.RESEND_API_KEY?.trim()) {
    return sendEmailViaResend({
      to: input.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
      idempotencyKey: `reservation-confirmation-${input.reservaId}`,
    });
  }

  return sendEmailViaGmail({
    to: input.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
    messageId: makeMessageId(input.reservaId),
  });
}

export async function sendReservationReviewEmail(
  input: ReservationReviewInput,
): Promise<EmailSendResult> {
  if (!input.reviewLink.trim()) return { sent: false, reason: "missing_config" };
  const email = buildReviewEmail(input);
  return sendEmailViaResend({
    to: input.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
    idempotencyKey: `reservation-review-${input.reservaId}`,
  });
}

export async function sendReservationReminderEmail(
  input: ReservationReminderInput,
): Promise<EmailSendResult> {
  const email = buildReminderEmail(input);
  // La clave de idempotencia evita duplicados si el cron se reintenta el mismo dia.
  return sendEmailViaResend({
    to: input.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
    idempotencyKey: `reservation-reminder-${input.reservaId}`,
  });
}
