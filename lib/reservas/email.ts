import {
  escapeHtml,
  gmailConfigurado,
  sendEmailViaGmailSmtp,
  sendEmailViaResend,
  type EmailSendResult,
} from "@/lib/email/send";
import { precioBuffet } from "@/lib/reservas/precio";
import { enlaceGestionReserva, LIMITE_CAMBIO_CLIENTE_MIN } from "@/lib/reservas/cliente-token";

// Se re-exporta porque las rutas de reservas y sus tests lo importan de aquí.
export { gmailConfigurado };

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
  /** Párrafo destacado opcional (p. ej. aviso de precio) que va antes del resumen. */
  aviso?: string | null;
  /** Asunto alternativo; por defecto "Confirmación de reserva - Karuma Sushi & Grill". */
  asunto?: string | null;
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

type ReservationConfirmationSendOptions = {
  idempotencyKey?: string;
};

const RESTAURANT_NAME = "Karuma Sushi & Grill";
const RESTAURANT_ADDRESS = "C/ de Roger de Llòria, 2, Valencia";
const MAPS_URL = "https://maps.google.com/?q=C+de+Roger+de+Ll%C3%B2ria+2+Valencia";

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
  const gestion = enlaceGestionReserva(input.reservaId);
  const horasLimite = LIMITE_CAMBIO_CLIENTE_MIN / 60;
  const phoneLine = input.telefonoRestaurante
    ? `Puedes cambiar o cancelar tu reserva tú mismo hasta ${horasLimite} horas antes. Después, llámanos al ${input.telefonoRestaurante}.`
    : `Puedes cambiar o cancelar tu reserva tú mismo hasta ${horasLimite} horas antes.`;

  const precio = precioBuffet(input.fecha, input.hora);
  const aviso = input.aviso?.trim() || "";
  const subject = input.asunto?.trim() || `Confirmación de reserva - ${RESTAURANT_NAME}`;
  const text = [
    `Hola ${nombre},`,
    "",
    ...(aviso ? [aviso, ""] : []),
    "Tu reserva está confirmada:",
    `Fecha: ${fecha}`,
    `Hora: ${input.hora}`,
    `Personas: ${input.personas}`,
    `Servicio: ${servicio}`,
    `Mesa: ${mesa}`,
    `Precio buffet: ${precio} / persona (bebidas no incluidas)`,
    `Reserva: ${input.reservaId}`,
    "",
    RESTAURANT_NAME,
    RESTAURANT_ADDRESS,
    MAPS_URL,
    "",
    `Cambiar o cancelar: ${gestion}`,
    phoneLine,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:560px;margin:0 auto;padding:24px">
      <h1 style="font-size:22px;margin:0 0 8px">${escapeHtml(RESTAURANT_NAME)}</h1>
      <p style="margin:0 0 20px;color:#4b5563">Reserva confirmada</p>
      <p>Hola ${escapeHtml(nombre)},</p>
      ${aviso ? `<p style="background:#fef3c7;border-left:4px solid #b42318;padding:12px 14px;border-radius:8px;font-weight:600">${escapeHtml(aviso)}</p>` : ""}
      <p>Tu reserva está confirmada. Te esperamos en Karuma.</p>
      <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:12px;overflow:hidden;margin:20px 0">
        <tbody>
          <tr><td style="padding:10px 14px;color:#6b7280">Fecha</td><td style="padding:10px 14px;font-weight:700;text-align:right">${escapeHtml(fecha)}</td></tr>
          <tr><td style="padding:10px 14px;color:#6b7280">Hora</td><td style="padding:10px 14px;font-weight:700;text-align:right">${escapeHtml(input.hora)}</td></tr>
          <tr><td style="padding:10px 14px;color:#6b7280">Personas</td><td style="padding:10px 14px;font-weight:700;text-align:right">${input.personas}</td></tr>
          <tr><td style="padding:10px 14px;color:#6b7280">Servicio</td><td style="padding:10px 14px;font-weight:700;text-align:right">${escapeHtml(servicio)}</td></tr>
          <tr><td style="padding:10px 14px;color:#6b7280">Mesa</td><td style="padding:10px 14px;font-weight:700;text-align:right">${escapeHtml(mesa)}</td></tr>
          <tr><td style="padding:10px 14px;color:#6b7280">Precio buffet</td><td style="padding:10px 14px;font-weight:700;text-align:right">${escapeHtml(precio)} / persona</td></tr>
          <tr><td style="padding:10px 14px;color:#6b7280">Reserva</td><td style="padding:10px 14px;font-weight:700;text-align:right">${escapeHtml(input.reservaId)}</td></tr>
        </tbody>
      </table>
      <p style="font-weight:700;margin-bottom:4px">${escapeHtml(RESTAURANT_NAME)}</p>
      <p style="margin:0 0 8px;color:#4b5563">${escapeHtml(RESTAURANT_ADDRESS)}</p>
      <p style="margin:0 0 20px"><a href="${MAPS_URL}" style="color:#b42318">Ver ubicación en Google Maps</a></p>
      <p style="margin:24px 0 8px">
        <a href="${escapeHtml(gestion)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700">Cambiar o cancelar mi reserva</a>
      </p>
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
  const gestion = enlaceGestionReserva(input.reservaId);
  const phoneLine = input.telefonoRestaurante
    ? `Si no puedes venir, cancela o cambia la hora aquí: ${gestion} (o llámanos al ${input.telefonoRestaurante}).`
    : `Si no puedes venir, cancela o cambia la hora aquí: ${gestion}`;

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
      <p style="margin:24px 0 8px">
        <a href="${escapeHtml(gestion)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700">Cambiar o cancelar</a>
      </p>
      <p style="font-size:13px;color:#6b7280">${escapeHtml(phoneLine)}</p>
    </div>
  `;

  return { subject, text, html };
}

export async function sendReservationConfirmationEmail(
  input: ReservationConfirmationInput,
  options: ReservationConfirmationSendOptions = {},
): Promise<EmailSendResult> {
  const email = buildConfirmationEmail(input);

  if (gmailConfigurado()) {
    return sendEmailViaGmailSmtp({
      to: input.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
  }

  return sendEmailViaResend({
    to: input.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
    idempotencyKey: options.idempotencyKey?.trim()
      || `reservation-confirmation-${input.reservaId}`,
  });
}

export function reservationConfirmationResendKey(
  reservaId: string,
  now = Date.now(),
): string {
  const fiveMinuteBucket = Math.floor(now / (5 * 60 * 1000));
  return `reservation-confirmation-resend-${reservaId}-${fiveMinuteBucket}`;
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
