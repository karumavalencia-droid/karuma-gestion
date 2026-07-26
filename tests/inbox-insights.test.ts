import { test } from "node:test";
import assert from "node:assert/strict";

import {
  contar,
  contarMenciones,
  metricasRespuesta,
  porDia,
  repartoSentimiento,
  type FilaHilo,
  type FilaMensaje,
} from "../lib/inbox/insights";

const hilo = (parcial: Partial<FilaHilo> = {}): FilaHilo => ({
  platform: "manual",
  language: "es",
  intents: [],
  is_complaint: false,
  rating: null,
  sentiment: null,
  first_inbound_at: null,
  replied_at: null,
  replied: false,
  status: "nuevo",
  ...parcial,
});

const mensaje = (parcial: Partial<FilaMensaje> = {}): FilaMensaje => ({
  direction: "in",
  body: "",
  sent_at: null,
  received_at: "2026-07-20T10:00:00.000Z",
  ...parcial,
});

test("porDia rellena con cero los días sin mensajes", () => {
  const dias = porDia(
    [mensaje({ sent_at: "2026-07-20T10:00:00.000Z" })],
    new Date("2026-07-19T00:00:00.000Z"),
    new Date("2026-07-21T23:59:59.000Z"),
  );
  assert.deepEqual(dias, [
    { fecha: "2026-07-19", entrantes: 0 },
    { fecha: "2026-07-20", entrantes: 1 },
    { fecha: "2026-07-21", entrantes: 0 },
  ]);
});

test("porDia ignora los mensajes salientes", () => {
  const dias = porDia(
    [
      mensaje({ direction: "in", sent_at: "2026-07-20T10:00:00.000Z" }),
      mensaje({ direction: "out", sent_at: "2026-07-20T11:00:00.000Z" }),
    ],
    new Date("2026-07-20T00:00:00.000Z"),
    new Date("2026-07-20T23:59:59.000Z"),
  );
  assert.deepEqual(dias, [{ fecha: "2026-07-20", entrantes: 1 }]);
});

test("porDia cae a received_at cuando no hay sent_at", () => {
  const dias = porDia(
    [mensaje({ sent_at: null, received_at: "2026-07-20T10:00:00.000Z" })],
    new Date("2026-07-20T00:00:00.000Z"),
    new Date("2026-07-20T23:59:59.000Z"),
  );
  assert.equal(dias[0].entrantes, 1);
});

test("contar ordena por frecuencia y desempata alfabéticamente", () => {
  assert.deepEqual(contar(["b", "a", "b", "c", "a", "b"]), [
    { clave: "b", n: 3 },
    { clave: "a", n: 2 },
    { clave: "c", n: 1 },
  ]);
});

test("contar descarta nulos y respeta el tope", () => {
  assert.deepEqual(contar([null, undefined, "a", ""], 1), [{ clave: "a", n: 1 }]);
});

test("la mediana de respuesta no se deja arrastrar por un caso extremo", () => {
  const base = "2026-07-20T10:00:00.000Z";
  const conRespuesta = (min: number) =>
    hilo({
      replied: true,
      first_inbound_at: base,
      replied_at: new Date(new Date(base).getTime() + min * 60000).toISOString(),
    });

  // Cuatro respuestas rápidas y una olvidada dos días.
  const m = metricasRespuesta([
    conRespuesta(5),
    conRespuesta(10),
    conRespuesta(15),
    conRespuesta(20),
    conRespuesta(2880),
  ]);

  assert.equal(m.muestra, 5);
  assert.equal(m.medianaMin, 15);
  assert.ok(m.mediaMin! > 500, "la media sí se dispara: por eso la principal es la mediana");
  assert.equal(m.dentro30, 4);
  assert.equal(m.dentro60, 4);
});

test("metricasRespuesta ignora hilos sin responder o con datos incoherentes", () => {
  const m = metricasRespuesta([
    hilo(),
    hilo({ replied: true, first_inbound_at: null, replied_at: "2026-07-20T10:00:00.000Z" }),
    hilo({
      replied: true,
      first_inbound_at: "2026-07-20T10:00:00.000Z",
      replied_at: "2026-07-20T09:00:00.000Z", // respuesta antes de la pregunta
    }),
  ]);
  assert.equal(m.muestra, 0);
  assert.equal(m.medianaMin, null);
});

test("mediana con muestra par es el promedio de los dos centrales", () => {
  const base = "2026-07-20T10:00:00.000Z";
  const conRespuesta = (min: number) =>
    hilo({
      replied: true,
      first_inbound_at: base,
      replied_at: new Date(new Date(base).getTime() + min * 60000).toISOString(),
    });
  assert.equal(metricasRespuesta([conRespuesta(10), conRespuesta(20)]).medianaMin, 15);
});

test("contarMenciones exige palabra completa y no distingue acentos", () => {
  const textos = [
    "El salmón estaba perfecto",
    "SALMON otra vez, muy bueno",
    "Nos atendió Alexandrina",
  ];
  const r = contarMenciones(textos, ["Salmón", "Alex"]);
  assert.deepEqual(r, [{ clave: "Salmón", n: 2 }]);
});

test("contarMenciones cuenta un mensaje una sola vez por término", () => {
  const r = contarMenciones(["atún, atún y más atún"], ["atún"]);
  assert.deepEqual(r, [{ clave: "atún", n: 1 }]);
});

test("contarMenciones descarta términos de menos de 3 caracteres", () => {
  assert.deepEqual(contarMenciones(["te y ju"], ["te", "ju"]), []);
});

test("contarMenciones con catálogo vacío devuelve lista vacía", () => {
  assert.deepEqual(contarMenciones(["lo que sea"], []), []);
});

test("reparto de sentimiento por umbrales", () => {
  const r = repartoSentimiento([
    hilo({ sentiment: 1 }),
    hilo({ sentiment: 0.5 }),
    hilo({ sentiment: 0 }),
    hilo({ sentiment: -0.1 }),
    hilo({ sentiment: -1 }),
    hilo({ sentiment: null }),
  ]);
  assert.equal(r.positivos, 2);
  assert.equal(r.neutros, 2);
  assert.equal(r.negativos, 1);
  assert.equal(r.medio, 0.08);
});

test("sentimiento sin datos no inventa un cero", () => {
  assert.equal(repartoSentimiento([hilo()]).medio, null);
});
