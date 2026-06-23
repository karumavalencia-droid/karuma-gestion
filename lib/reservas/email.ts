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

type EmailSendResult =
  | { sent: true }
  | { sent: false; reason: "missing_config" | "request_failed" | "invalid_recipient"; error?: string };

const RESTAURANT_NAME = "Karuma Sushi & Grill";
const RESTAURANT_ADDRESS = "C/ de Roger de Lloria, 2, Valencia";
const MAPS_URL = "https://maps.google.com/?q=C+de+Roger+de+Ll%C3%B2ria+2+Valencia";

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
    ? `Para cambiar o cancelar la reserva, llamanos al ${input.telefonoRestaurante}.`
    : "Para cambiar o cancelar la reserva, contacta con el restaurante.";

  const subject = `Confirmacion de reserva - ${RESTAURANT_NAME}`;
  const text = [
    `Hola ${nombre},`,
    "",
    "Tu reserva esta confirmada:",
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
      <p>Tu reserva esta confirmada. Te esperamos en Karuma.</p>
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
      <p style="margin:0 0 20px"><a href="${MAPS_URL}" style="color:#b42318">Ver ubicacion en Google Maps</a></p>
      <p style="font-size:13px;color:#6b7280">${escapeHtml(phoneLine)}</p>
    </div>
  `;

  return { subject, text, html };
}

function buildReviewEmail(input: ReservationReviewInput) {
  const nombre = input.nombre.trim() || "cliente";
  const subject = `Gracias por visitar ${RESTAURANT_NAME}`;
  const text = [
    `Hola ${nombre},`,
    "",
    "Gracias por visitar Karuma Sushi & Grill.",
    "Si disfrutaste la experiencia, nos ayudaria mucho que dejaras una resena en Google:",
    input.reviewLink,
    "",
    "Tu opinion ayuda a que mas clientes nos encuentren y tambien nos ayuda a mejorar.",
    "",
    RESTAURANT_NAME,
  ].join("\n");

  const safeLink = escapeHtml(input.reviewLink);
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:560px;margin:0 auto;padding:24px">
      <h1 style="font-size:22px;margin:0 0 8px">${escapeHtml(RESTAURANT_NAME)}</h1>
      <p style="margin:0 0 20px;color:#4b5563">Gracias por visitarnos</p>
      <p>Hola ${escapeHtml(nombre)},</p>
      <p>Gracias por visitar Karuma Sushi & Grill.</p>
      <p>Si disfrutaste la experiencia, nos ayudaria mucho que dejaras una resena en Google.</p>
      <p style="margin:24px 0">
        <a href="${safeLink}" style="display:inline-block;background:#b42318;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700">
          Dejar una resena
        </a>
      </p>
      <p style="font-size:13px;color:#6b7280">Tu opinion ayuda a que mas clientes nos encuentren y tambien nos ayuda a mejorar.</p>
    </div>
  `;

  return { subject, text, html };
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
  const from = process.env.RESERVAS_EMAIL_FROM;
  const replyTo = process.env.RESERVAS_EMAIL_REPLY_TO;
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

export async function sendReservationConfirmationEmail(
  input: ReservationConfirmationInput,
): Promise<EmailSendResult> {
  const email = buildConfirmationEmail(input);
  return sendEmailViaResend({
    to: input.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
    idempotencyKey: `reservation-confirmation-${input.reservaId}`,
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
