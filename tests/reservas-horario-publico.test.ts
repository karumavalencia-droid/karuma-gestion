import test from "node:test";
import assert from "node:assert/strict";
import { reservaDentroDeHorario } from "../lib/reservas/horario-publico";
import type { ReservasConfig } from "../lib/reservas/types";

const config = {
  comida_inicio: "13:00:00",
  comida_fin: "15:30:00",
  cena_inicio: "19:00:00",
  cena_fin: "22:00:00",
} as ReservasConfig;

test("lunch ends at 17:00 and last seating depends on party duration", () => {
  assert.equal(reservaDentroDeHorario("15:30", "comida", 90, config), true);
  assert.equal(reservaDentroDeHorario("15:45", "comida", 90, config), false);
  assert.equal(reservaDentroDeHorario("15:30", "comida", 120, config), false);
  assert.equal(reservaDentroDeHorario("15:00", "comida", 120, config), true);
  assert.equal(reservaDentroDeHorario("14:30", "comida", 150, config), true);
});

test("dinner starts at 19:00 and existing last pass stays at 22:00", () => {
  assert.equal(reservaDentroDeHorario("18:45", "cena", 90, config), false);
  assert.equal(reservaDentroDeHorario("19:00", "cena", 90, config), true);
  assert.equal(reservaDentroDeHorario("22:00", "cena", 90, config), true);
  assert.equal(reservaDentroDeHorario("22:00", "cena", 120, config), true);
  assert.equal(reservaDentroDeHorario("22:00", "cena", 150, config), true);
  assert.equal(reservaDentroDeHorario("22:15", "cena", 90, config), false);
});
