import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReservasPage from "../app/reservas/page";
import { isValidOnlinePartySize, MAX_ONLINE_PARTY_SIZE } from "../lib/reservas/config";

test("online reservations accept exactly integer party sizes 1–6", () => {
  assert.equal(MAX_ONLINE_PARTY_SIZE, 6);
  for (const size of [1, 2, 3, 4, 5, 6]) {
    assert.equal(isValidOnlinePartySize(size), true);
  }
  for (const size of [-1, 0, 1.5, 6.5, 7, 20, NaN, Infinity]) {
    assert.equal(isValidOnlinePartySize(size), false);
  }
});

test("public page renders all six party choices and sends larger groups to phone/WhatsApp", () => {
  const html = renderToStaticMarkup(createElement(ReservasPage));
  const choices = [...html.matchAll(/<button\b[^>]*>(.*?)<\/button>/gs)]
    .map((match) => match[1].replace(/<[^>]+>/g, "").trim())
    .filter((label) => /^\d+personas?$/.test(label));
  assert.deepEqual(choices, ["1persona", "2personas", "3personas", "4personas", "5personas", "6personas"]);
  assert.match(html, /hasta 6 personas online/);
  assert.match(html, /¿Sois más de 6\?/);
  assert.match(html, /href="tel:\+\d+"/);
  assert.match(html, /href="https:\/\/wa\.me\/\d+"/);
});
