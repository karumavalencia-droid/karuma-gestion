import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReservasPage from "../app/reservas/page";
import { isValidOnlinePartySize, MAX_ONLINE_PARTY_SIZE } from "../lib/reservas/config";

test("online reservations accept exactly integer party sizes 1–12", () => {
  assert.equal(MAX_ONLINE_PARTY_SIZE, 12);
  for (const size of [1, 2, 3, 4, 5, 6, 7, 10, 12]) {
    assert.equal(isValidOnlinePartySize(size), true);
  }
  for (const size of [-1, 0, 1.5, 6.5, 13, 20, NaN, Infinity]) {
    assert.equal(isValidOnlinePartySize(size), false);
  }
});

test("public page says up to 12 guests online and sends larger groups to phone/WhatsApp", () => {
  const html = renderToStaticMarkup(createElement(ReservasPage));
  assert.match(html, /hasta 12 personas online/);
  assert.match(html, /¿Sois más de 12\?/);
  assert.match(html, /href="tel:\+\d+"/);
  assert.match(html, /href="https:\/\/wa\.me\/\d+"/);
});
