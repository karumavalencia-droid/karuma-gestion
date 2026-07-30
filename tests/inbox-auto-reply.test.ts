import { test } from "node:test";
import assert from "node:assert/strict";

import {
  AJUSTES_AUTO_REPLY_POR_DEFECTO,
  decidir,
  explicarResultado,
  type AjustesAutoReply,
  type EntradaAutoReply,
} from "../lib/inbox/auto-reply";

/** Ajustes de prueba: Google permitido, a partir de 4 estrellas. */
const AJUSTES: AjustesAutoReply = {
  activa: true,
  minEstrellas: 4,
  plataformas: ["google"],
};

/** Una reseña de 5 estrellas sin nada raro: el caso que sí debe publicarse. */
function base(patch: Partial<EntradaAutoReply> = {}): EntradaAutoReply {
  return {
    platform: "google",
    kind: "review",
    rating: 5,
    isComplaint: false,
    sentiment: 0.8,
    priority: "normal",
    intents: ["elogio"],
    borrador: "Muchas gracias por tu visita y por tus palabras. Te esperamos pronto.",
    ...patch,
  };
}

test("una reseña buena y limpia es apta", () => {
  const d = decidir(base(), AJUSTES);
  assert.equal(d.apta, true);
  assert.equal(d.motivo, "apta");
});

test("solo se publican solas las plataformas permitidas", () => {
  assert.equal(decidir(base({ platform: "instagram" }), AJUSTES).motivo, "plataforma_no_permitida");
  // Sin plataformas configuradas no se publica nada, aunque esté activada.
  const sinPlataformas = { ...AJUSTES, plataformas: [] };
  assert.equal(decidir(base(), sinPlataformas).apta, false);
});

test("un mensaje directo nunca se contesta solo, por buena que sea la nota", () => {
  for (const kind of ["dm", "comment", "mention", "story_reply", "question"] as const) {
    const d = decidir(base({ kind }), AJUSTES);
    assert.equal(d.apta, false, `${kind} no debería ser apto`);
    assert.equal(d.motivo, "no_es_resena");
  }
});

test("sin borrador, o con uno demasiado largo, no se publica", () => {
  assert.equal(decidir(base({ borrador: null }), AJUSTES).motivo, "sin_borrador");
  assert.equal(decidir(base({ borrador: "   " }), AJUSTES).motivo, "sin_borrador");
  assert.equal(decidir(base({ borrador: "a".repeat(601) }), AJUSTES).motivo, "borrador_largo");
});

test("las estrellas mandan", () => {
  assert.equal(decidir(base({ rating: null }), AJUSTES).motivo, "sin_estrellas");
  assert.equal(decidir(base({ rating: 3 }), AJUSTES).motivo, "pocas_estrellas");
  assert.equal(decidir(base({ rating: 1 }), AJUSTES).motivo, "pocas_estrellas");
  assert.equal(decidir(base({ rating: 4 }), AJUSTES).apta, true, "el mínimo cuenta");

  // Subir el listón a 5 deja fuera las de 4.
  const soloCinco = { ...AJUSTES, minEstrellas: 5 };
  assert.equal(decidir(base({ rating: 4 }), soloCinco).motivo, "pocas_estrellas");
});

test("cinco estrellas con una queja dentro va a revisión", () => {
  const d = decidir(base({ rating: 5, isComplaint: true }), AJUSTES);
  assert.equal(d.apta, false);
  assert.equal(d.motivo, "queja");
});

test("tono negativo, prioridad alta y alergias van siempre a una persona", () => {
  assert.equal(decidir(base({ sentiment: -0.2 }), AJUSTES).motivo, "sentimiento_negativo");
  assert.equal(decidir(base({ priority: "alta" }), AJUSTES).motivo, "prioridad_alta");
  assert.equal(decidir(base({ priority: "urgente" }), AJUSTES).motivo, "prioridad_alta");
  assert.equal(decidir(base({ intents: ["alergia"] }), AJUSTES).motivo, "tema_delicado");
  assert.equal(decidir(base({ intents: ["elogio", "queja"] }), AJUSTES).motivo, "tema_delicado");
});

test("un borrador que afirma precios, horas o teléfonos no sale solo", () => {
  const conDatos = [
    "Gracias. El buffet cuesta 24,90 € por persona.",
    "Gracias. Abrimos todos los días a las 13:00.",
    "Gracias. Llámanos al +34 676 706 776 para cualquier cosa.",
    "Gracias, son 19.90 EUR por persona.",
  ];
  for (const borrador of conDatos) {
    const d = decidir(base({ borrador }), AJUSTES);
    assert.equal(d.apta, false, `debería frenarse: ${borrador}`);
    assert.equal(d.motivo, "borrador_con_datos");
  }
});

test("no confunde texto normal con datos inventados", () => {
  const limpios = [
    "Muchas gracias por tus 5 estrellas. Te esperamos pronto.",
    "Gracias por la reseña. Puedes reservar en nuestra web cuando quieras.",
    "Thank you very much for your visit. We hope to see you again soon.",
    "感谢您的光临,期待再次见到您。",
  ];
  for (const borrador of limpios) {
    assert.equal(decidir(base({ borrador }), AJUSTES).apta, true, `no debería frenarse: ${borrador}`);
  }
});

test("decidir() ignora si la función está activada — es lo que permite el simulacro", () => {
  const apagada: AjustesAutoReply = { ...AJUSTES, activa: false };
  const encendida: AjustesAutoReply = { ...AJUSTES, activa: true };

  assert.deepEqual(decidir(base(), apagada), decidir(base(), encendida));
  assert.deepEqual(
    decidir(base({ rating: 1 }), apagada),
    decidir(base({ rating: 1 }), encendida),
  );
});

test("por defecto no se publica nada solo", () => {
  const d = decidir(base(), AJUSTES_AUTO_REPLY_POR_DEFECTO);
  assert.equal(AJUSTES_AUTO_REPLY_POR_DEFECTO.activa, false);
  assert.equal(d.apta, false, "sin plataformas configuradas no hay publicación automática");
});

test("explicarResultado da un texto legible para cada estado", () => {
  assert.match(explicarResultado("enviada", "apta"), /^Publicada autom/);
  assert.match(explicarResultado("simulada", "apta"), /^Se habría publicado sola/);
  assert.match(explicarResultado("revisar", "queja"), /^A revisar/);
  assert.match(explicarResultado("revisar", "envio_fallido"), /no se pudo publicar/i);
  // Un motivo desconocido no debe romper la interfaz.
  assert.match(explicarResultado("revisar", "motivo_futuro"), /motivo_futuro/);
});
