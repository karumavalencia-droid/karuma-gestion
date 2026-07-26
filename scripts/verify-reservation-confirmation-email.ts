import { loadEnvConfig } from "@next/env";
import { randomUUID } from "crypto";
import nodemailer from "nodemailer";

loadEnvConfig(process.cwd());

type Args = {
  baseUrl: string;
  email: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  service: "comida" | "cena";
  people: number;
  reservationIdempotencyKey: string;
};

function readArg(name: string, fallback?: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  if (!arg) return fallback;
  return arg.slice(prefix.length).trim();
}

function requiredArg(name: string, fallback?: string): string {
  const value = readArg(name, fallback);
  if (!value) {
    throw new Error(`Missing required argument --${name}`);
  }
  return value;
}

function parseArgs(): Args {
  const baseUrl = requiredArg("base-url", process.env.RESERVAS_VERIFY_BASE_URL || "http://localhost:3000");
  const email = requiredArg("email");
  const name = requiredArg("name", "Verificacion Reserva");
  const phone = requiredArg("phone", "+34600000000");
  const date = requiredArg("date");
  const time = requiredArg("time");
  const service = (requiredArg("service", "cena") as "comida" | "cena");
  const people = Number(requiredArg("people", "2"));
  const reservationIdempotencyKey =
    readArg("idempotency-key") || `verify-reservation-${randomUUID()}`;

  if (!/^https?:\/\//.test(baseUrl)) {
    throw new Error("--base-url must start with http:// or https://");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("--email must be a valid email address");
  }
  if (!Number.isFinite(people) || people < 1) {
    throw new Error("--people must be a positive number");
  }
  if (service !== "comida" && service !== "cena") {
    throw new Error("--service must be comida or cena");
  }

  return { baseUrl, email, name, phone, date, time, service, people, reservationIdempotencyKey };
}

async function postReservation(args: Args) {
  const response = await fetch(`${args.baseUrl.replace(/\/$/, "")}/api/reservas/crear`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre: args.name,
      telefono: args.phone,
      email: args.email,
      personas: args.people,
      fecha: args.date,
      hora: args.time,
      servicio: args.service,
      origen: "online",
      idempotencyKey: args.reservationIdempotencyKey,
    }),
  });

  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

async function verifySmtp() {
  const user = process.env.RESERVAS_GMAIL_USER?.trim();
  const appPassword = process.env.RESERVAS_GMAIL_APP_PASSWORD?.trim();
  const replyTo = process.env.RESERVAS_EMAIL_REPLY_TO?.trim() || user || "";

  if (!user || !appPassword) {
    return { ok: false, error: "Missing RESERVAS_GMAIL_USER or RESERVAS_GMAIL_APP_PASSWORD" };
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass: appPassword },
  });

  try {
    await transporter.verify();
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return { ok: true, user, replyTo };
}

async function main() {
  const args = parseArgs();

  console.log("SMTP verify:");
  const smtp = await verifySmtp();
  console.log(JSON.stringify(smtp, null, 2));
  console.log("");

  console.log("First request:");
  const first = await postReservation(args);
  console.log(JSON.stringify(first, null, 2));

  console.log("");
  console.log("Retry request:");
  const second = await postReservation(args);
  console.log(JSON.stringify(second, null, 2));

  console.log("");
  console.log("Checkpoints:");
  console.log(`- Gmail SMTP env present: ${Boolean(process.env.RESERVAS_GMAIL_USER && process.env.RESERVAS_GMAIL_APP_PASSWORD)}`);
  console.log(`- reply-to should be: ${process.env.RESERVAS_EMAIL_REPLY_TO?.trim() || process.env.RESERVAS_GMAIL_USER?.trim() || "(defaults to Gmail user)"}`);
  console.log(`- same idempotency key used twice: ${args.reservationIdempotencyKey}`);
  console.log("- Confirm in the mailbox that only the first request arrives.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
