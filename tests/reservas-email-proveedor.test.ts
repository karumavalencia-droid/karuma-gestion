import { afterEach, test } from "node:test";
import assert from "node:assert/strict";

import {
  gmailConfigurado,
  sendReservationConfirmationEmail,
} from "../lib/reservas/email";

const originalFetch = globalThis.fetch;

const limpiar = () => {
  delete process.env.RESERVAS_GMAIL_USER;
  delete process.env.RESERVAS_GMAIL_APP_PASSWORD;
  delete process.env.RESEND_API_KEY;
  delete process.env.RESERVAS_EMAIL_FROM;
  globalThis.fetch = originalFetch;
};

afterEach(limpiar);

test("sin variables de Gmail no se considera configurado", () => {
  limpiar();
  assert.equal(gmailConfigurado(), false);
});

test("con solo una de las dos, tampoco", () => {
  limpiar();
  process.env.RESERVAS_GMAIL_USER = "reservas@karuma.es";
  assert.equal(gmailConfigurado(), false);

  limpiar();
  process.env.RESERVAS_GMAIL_APP_PASSWORD = "abcdefghijklmnop";
  assert.equal(gmailConfigurado(), false);
});

test("con las dos, se usa Gmail", () => {
  process.env.RESERVAS_GMAIL_USER = "reservas@karuma.es";
  process.env.RESERVAS_GMAIL_APP_PASSWORD = "abcdefghijklmnop";
  assert.equal(gmailConfigurado(), true);
});

test("una variable en blanco no cuenta como configurada", () => {
  process.env.RESERVAS_GMAIL_USER = "   ";
  process.env.RESERVAS_GMAIL_APP_PASSWORD = "abcdefghijklmnop";
  assert.equal(gmailConfigurado(), false);
});

test("sin Gmail configurado, la confirmación se envía por Resend", async () => {
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.RESERVAS_EMAIL_FROM = "Karuma Sushi <reservas@send.karuma.es>";

  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response('{"id":"email_test"}', { status: 200 });
  }) as typeof fetch;

  const result = await sendReservationConfirmationEmail({
    to: "cliente@example.com",
    nombre: "Cliente",
    fecha: "2026-08-20",
    hora: "21:00",
    servicio: "cena",
    personas: 2,
    reservaId: "reserva-test-123",
    mesaIds: [1],
  });

  assert.deepEqual(result, { sent: true });
  assert.equal(requestUrl, "https://api.resend.com/emails");
  assert.equal(
    (requestInit?.headers as Record<string, string>)["Idempotency-Key"],
    "reservation-confirmation-reserva-test-123",
  );
});
