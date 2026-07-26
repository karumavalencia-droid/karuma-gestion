import { test } from "node:test";
import assert from "node:assert/strict";

import { debeAvisar, textoAviso } from "../lib/inbox/avisos";

const base = {
  anterior: 2,
  actual: 3,
  visible: false,
  permiso: "granted",
  preferencia: true,
};

test("avisa cuando entra un mensaje nuevo con la pestaña de fondo", () => {
  assert.equal(debeAvisar(base), true);
});

test("no avisa si el contador no sube", () => {
  assert.equal(debeAvisar({ ...base, actual: 2 }), false);
  // Bajar significa que alguien ha contestado: eso no es un aviso.
  assert.equal(debeAvisar({ ...base, actual: 1 }), false);
});

test("no avisa en la primera lectura", () => {
  // Al abrir la app el número ya se ve en la campana; avisar sería ruido.
  assert.equal(debeAvisar({ ...base, anterior: null, actual: 5 }), false);
});

test("no avisa si estás mirando la pestaña", () => {
  assert.equal(debeAvisar({ ...base, visible: true }), false);
});

test("no avisa sin permiso del navegador", () => {
  assert.equal(debeAvisar({ ...base, permiso: "default" }), false);
  assert.equal(debeAvisar({ ...base, permiso: "denied" }), false);
});

test("no avisa si el usuario ha desactivado los avisos", () => {
  assert.equal(debeAvisar({ ...base, preferencia: false }), false);
});

test("un salto grande de golpe sigue siendo un solo aviso", () => {
  assert.equal(debeAvisar({ ...base, anterior: 0, actual: 7 }), true);
});

test("el texto distingue singular de plural", () => {
  assert.equal(textoAviso(1, 0).titulo, "Mensaje nuevo de un cliente");
  assert.equal(textoAviso(3, 0).titulo, "3 mensajes nuevos de clientes");
});

test("el texto avisa de los prioritarios cuando los hay", () => {
  assert.match(textoAviso(2, 1).cuerpo, /1 necesita atención prioritaria/);
  assert.match(textoAviso(3, 2).cuerpo, /2 necesitan atención prioritaria/);
  assert.match(textoAviso(2, 0).cuerpo, /Sin responder/);
});
