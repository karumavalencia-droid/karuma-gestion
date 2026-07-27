import { test } from "node:test";
import assert from "node:assert/strict";

import {
  clasificarPorReglas,
  detectarIdioma,
  estadoSla,
  fundirAnalisis,
  maxPrioridad,
  normalizar,
} from "../lib/inbox/rules";

test("normalizar quita acentos y mayúsculas", () => {
  assert.equal(normalizar("ALERGÍA"), "alergia");
  assert.equal(normalizar("Cumpleaños"), "cumpleanos");
});

test("maxPrioridad se queda con la más alta", () => {
  assert.equal(maxPrioridad("normal", "urgente"), "urgente");
  assert.equal(maxPrioridad("alta", "baja"), "alta");
  assert.equal(maxPrioridad("baja", "baja"), "baja");
});

test("una alergia es urgente aunque esté escrita con acento", () => {
  const r = clasificarPorReglas("Hola, mi hijo tiene alergía a los frutos secos");
  assert.equal(r.priority, "urgente");
  assert.ok(r.intents.includes("alergia"));
});

test("una petición de reserva es prioridad alta", () => {
  const r = clasificarPorReglas("¿Tenéis mesa para el sábado?");
  assert.equal(r.priority, "alta");
  assert.ok(r.intents.includes("reserva"));
});

test("gana la regla más grave cuando el mensaje toca varias", () => {
  const r = clasificarPorReglas("Quiero reservar mesa para un grupo, uno es celiaco");
  assert.equal(r.priority, "urgente"); // alergia > grupo > reserva
  assert.ok(r.intents.includes("alergia"));
  assert.ok(r.intents.includes("reserva"));
  assert.ok(r.intents.includes("grupo"));
});

test("una reseña de 1 estrella es queja urgente aunque el texto sea neutro", () => {
  const r = clasificarPorReglas("Estuvimos el domingo", 1);
  assert.equal(r.priority, "urgente");
  assert.equal(r.isComplaint, true);
  assert.ok(r.intents.includes("queja"));
});

test("las estrellas se traducen a sentimiento", () => {
  assert.equal(clasificarPorReglas("x", 5).sentiment, 1);
  assert.equal(clasificarPorReglas("x", 3).sentiment, 0);
  assert.equal(clasificarPorReglas("x", 1).sentiment, -1);
});

test("una reseña de 3 estrellas sube a alta pero no es queja", () => {
  const r = clasificarPorReglas("Correcto sin más", 3);
  assert.equal(r.priority, "alta");
  assert.equal(r.isComplaint, false);
});

test("un mensaje sin palabras clave queda como 'otro' y normal", () => {
  const r = clasificarPorReglas("Buenas");
  assert.deepEqual(r.intents, ["otro"]);
  assert.equal(r.priority, "normal");
});

test("detección de idioma de respaldo", () => {
  assert.equal(detectarIdioma("你们几点营业？"), "zh");
  assert.equal(detectarIdioma("Hello, do you have a table for two?"), "en");
  assert.equal(detectarIdioma("Bonjour, je voudrais reserver"), "fr");
  assert.equal(detectarIdioma("Hola, quiero reservar"), "es");
  assert.equal(detectarIdioma("..."), "es"); // sin señales → español
});

test("la IA puede subir la prioridad pero nunca bajarla", () => {
  const reglas = clasificarPorReglas("Tengo alergia al marisco"); // urgente
  const bajada = fundirAnalisis(reglas, { priority: "baja" });
  assert.equal(bajada.priority, "urgente");

  const neutro = clasificarPorReglas("Buenas"); // normal
  const subida = fundirAnalisis(neutro, { priority: "urgente" });
  assert.equal(subida.priority, "urgente");
});

test("fundir análisis conserva la queja detectada por reglas", () => {
  const reglas = clasificarPorReglas("Servicio pesimo");
  const fundido = fundirAnalisis(reglas, { isComplaint: false });
  assert.equal(fundido.isComplaint, true);
});

test("fundir análisis une intenciones sin duplicar", () => {
  const reglas = clasificarPorReglas("¿Tenéis mesa?");
  const fundido = fundirAnalisis(reglas, { intents: ["reserva", "horario"] });
  assert.equal(fundido.intents.filter((i) => i === "reserva").length, 1);
  assert.ok(fundido.intents.includes("horario"));
});

test("semáforo del SLA a 30 y 60 minutos", () => {
  const base = new Date("2026-07-26T12:00:00Z");
  const ahora = (min: number) => base.getTime() + min * 60000;
  const iso = base.toISOString();

  assert.equal(estadoSla(iso, ahora(10)), "ok");
  assert.equal(estadoSla(iso, ahora(30)), "aviso");
  assert.equal(estadoSla(iso, ahora(45)), "aviso");
  assert.equal(estadoSla(iso, ahora(60)), "urgente");
  assert.equal(estadoSla(iso, ahora(120)), "urgente");
  assert.equal(estadoSla(null, ahora(120)), "ok");
});
