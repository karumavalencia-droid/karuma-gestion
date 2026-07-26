import { test } from "node:test";
import assert from "node:assert/strict";

import { manualAdapter } from "../lib/inbox/adapters/manual";
import { getAdapter, plataformasDisponibles } from "../lib/inbox/adapters";
import { cifrar, descifrar } from "../lib/inbox/crypto";

test("el registro solo expone adaptadores implementados", () => {
  assert.deepEqual(plataformasDisponibles(), ["manual"]);
  assert.equal(getAdapter("manual")?.platform, "manual");
  // Fase 1-3 todavía sin implementar: el registro lo dice en vez de fingir.
  assert.equal(getAdapter("instagram"), null);
  assert.equal(getAdapter("tripadvisor"), null);
});

test("normalizar descarta mensajes sin texto", () => {
  assert.deepEqual(manualAdapter.normalize({}), []);
  assert.deepEqual(manualAdapter.normalize({ body: "   " }), []);
});

test("normalizar produce un item entrante con los campos esperados", () => {
  const [item] = manualAdapter.normalize({
    body: "¿Tenéis mesa el sábado?",
    customerName: "Ana",
    customerUsername: "ana_v",
    sentAt: "2026-07-26T12:00:00.000Z",
  });

  assert.equal(item.platform, "manual");
  assert.equal(item.direction, "in");
  assert.equal(item.kind, "dm");
  assert.equal(item.customerName, "Ana");
  assert.equal(item.body, "¿Tenéis mesa el sábado?");
  assert.equal(item.sentAt, "2026-07-26T12:00:00.000Z");
  assert.ok(item.externalThreadId);
  assert.ok(item.externalMessageId);
});

test("el mismo mensaje genera los mismos ids: reenviarlo es idempotente", () => {
  const entrada = {
    body: "Hola",
    customerName: "Ana",
    sentAt: "2026-07-26T12:00:00.000Z",
  };
  const [a] = manualAdapter.normalize(entrada);
  const [b] = manualAdapter.normalize(entrada);

  assert.equal(a.externalThreadId, b.externalThreadId);
  assert.equal(a.externalMessageId, b.externalMessageId);
});

test("mensajes distintos no colisionan", () => {
  const [a] = manualAdapter.normalize({ body: "Hola", sentAt: "2026-07-26T12:00:00.000Z" });
  const [b] = manualAdapter.normalize({ body: "Adiós", sentAt: "2026-07-26T12:00:00.000Z" });
  assert.notEqual(a.externalMessageId, b.externalMessageId);
});

test("un threadId explícito agrupa varios mensajes en el mismo hilo", () => {
  const [a] = manualAdapter.normalize({ threadId: "t1", body: "Uno", sentAt: "2026-07-26T12:00:00.000Z" });
  const [b] = manualAdapter.normalize({ threadId: "t1", body: "Dos", sentAt: "2026-07-26T12:01:00.000Z" });

  assert.equal(a.externalThreadId, "t1");
  assert.equal(b.externalThreadId, "t1");
  assert.notEqual(a.externalMessageId, b.externalMessageId);
});

test("solo se aceptan tipos conocidos y valoraciones de 1 a 5", () => {
  assert.equal(manualAdapter.normalize({ body: "x", kind: "inventado" })[0].kind, "dm");
  assert.equal(manualAdapter.normalize({ body: "x", kind: "review" })[0].kind, "review");
  assert.equal(manualAdapter.normalize({ body: "x", rating: 9 })[0].rating, null);
  assert.equal(manualAdapter.normalize({ body: "x", rating: 0 })[0].rating, null);
  assert.equal(manualAdapter.normalize({ body: "x", rating: 4 })[0].rating, 4);
});

test("los tokens se cifran y descifran de ida y vuelta", () => {
  process.env.INBOX_TOKEN_KEY = Buffer.alloc(32, 7).toString("base64");
  const token = "EAAG...token-de-prueba";
  const cifrado = cifrar(token);

  assert.notEqual(cifrado, token);
  assert.equal(cifrado.split(".").length, 3);
  assert.equal(descifrar(cifrado), token);
});

test("cifrar dos veces el mismo token da resultados distintos (IV aleatorio)", () => {
  process.env.INBOX_TOKEN_KEY = Buffer.alloc(32, 7).toString("base64");
  assert.notEqual(cifrar("mismo"), cifrar("mismo"));
});

test("un token manipulado no se puede descifrar", () => {
  process.env.INBOX_TOKEN_KEY = Buffer.alloc(32, 7).toString("base64");
  const cifrado = cifrar("token");
  const [iv, tag, datos] = cifrado.split(".");
  const manipulado = [iv, tag, Buffer.from("otracosa").toString("base64url")].join(".");

  assert.throws(() => descifrar(manipulado));
  assert.throws(() => descifrar(datos));
});

test("una clave de tamaño incorrecto se rechaza", () => {
  process.env.INBOX_TOKEN_KEY = Buffer.alloc(16, 1).toString("base64");
  assert.throws(() => cifrar("x"), /32 bytes/);
});
