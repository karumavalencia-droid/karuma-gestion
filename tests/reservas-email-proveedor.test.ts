import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import { gmailConfigurado } from "../lib/reservas/email";

const limpiar = () => {
  delete process.env.RESERVAS_GMAIL_USER;
  delete process.env.RESERVAS_GMAIL_APP_PASSWORD;
};

afterEach(limpiar);

test("sin variables de Gmail no se considera configurado", () => {
  limpiar();
  assert.equal(gmailConfigurado(), false);
});

test("con solo una de las dos, tampoco", () => {
  // Es justo el estado que había en producción: media configuración es igual
  // que ninguna, y antes eso cortaba el envío en seco.
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
