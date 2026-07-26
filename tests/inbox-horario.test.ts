import { test } from "node:test";
import assert from "node:assert/strict";

import {
  aMinutos,
  dentroDeHorario,
  enHorarioAhora,
  horaLocal,
  HORARIO_POR_DEFECTO,
} from "../lib/inbox/horario";

test("aMinutos convierte y rechaza basura", () => {
  assert.equal(aMinutos("00:00"), 0);
  assert.equal(aMinutos("13:45"), 825);
  assert.equal(aMinutos("23:59"), 1439);
  assert.equal(aMinutos("24:00"), null);
  assert.equal(aMinutos("13:60"), null);
  assert.equal(aMinutos("mediodía"), null);
  assert.equal(aMinutos(""), null);
});

test("el horario del restaurante: dentro en servicio, fuera el resto", () => {
  const dentro = (h: string) => dentroDeHorario(HORARIO_POR_DEFECTO, h);

  assert.equal(dentro("13:00"), true, "el inicio cuenta");
  assert.equal(dentro("14:30"), true);
  assert.equal(dentro("19:30"), true);
  assert.equal(dentro("21:59"), true);

  assert.equal(dentro("12:59"), false);
  assert.equal(dentro("15:00"), false, "el final NO cuenta: el turno ya ha acabado");
  assert.equal(dentro("17:00"), false, "entre turnos");
  assert.equal(dentro("22:00"), false);
  assert.equal(dentro("04:00"), false, "de madrugada nadie va a atender");
});

test("un tramo que cruza la medianoche también funciona", () => {
  const nocturno = { cena: ["23:00", "01:00"] as [string, string] };
  assert.equal(dentroDeHorario(nocturno, "23:30"), true);
  assert.equal(dentroDeHorario(nocturno, "00:30"), true);
  assert.equal(dentroDeHorario(nocturno, "02:00"), false);
  assert.equal(dentroDeHorario(nocturno, "22:00"), false);
});

test("un horario vacío o corrupto no deja pasar nada", () => {
  assert.equal(dentroDeHorario({}, "14:00"), false);
  assert.equal(dentroDeHorario({ x: ["", ""] as [string, string] }, "14:00"), false);
  assert.equal(
    dentroDeHorario({ x: ["nope", "15:00"] as [string, string] }, "14:00"),
    false,
  );
});

test("la hora se lee en la zona del restaurante, no en UTC", () => {
  // En julio Madrid va en CEST (UTC+2): las 12:00 UTC son las 14:00 allí.
  const julio = new Date("2026-07-26T12:00:00Z");
  assert.equal(horaLocal(julio), "14:00");
  assert.equal(enHorarioAhora(HORARIO_POR_DEFECTO, julio), true);

  // En enero es CET (UTC+1): las 12:00 UTC son las 13:00.
  const enero = new Date("2026-01-15T12:00:00Z");
  assert.equal(horaLocal(enero), "13:00");
  assert.equal(enHorarioAhora(HORARIO_POR_DEFECTO, enero), true);

  // Y el caso que motiva todo esto: 23:00 UTC en julio es la 01:00 de Madrid.
  const madrugada = new Date("2026-07-26T23:00:00Z");
  assert.equal(horaLocal(madrugada), "01:00");
  assert.equal(enHorarioAhora(HORARIO_POR_DEFECTO, madrugada), false);
});
