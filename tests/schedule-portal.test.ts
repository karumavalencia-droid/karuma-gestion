import assert from "node:assert/strict";
import test from "node:test";
import {
  allTurnoRowsFromMock,
  getEmployeeWeek,
  turnoRowsFromMock,
} from "../lib/schedule/portal";

test("a rest day in the template becomes a Descanso row", () => {
  const rows = turnoRowsFromMock("carlos");
  assert.ok(rows);
  // Jhoan descansa el jueves (dia 4)
  const thursday = rows!.filter((row) => row.dia === 4);
  assert.equal(thursday.length, 1);
  assert.equal(thursday[0].servicio, "Descanso");
  assert.equal(thursday[0].hora_inicio ?? null, null);
});

test("a split shift produces Comida and Cena rows classified by start time", () => {
  const rows = turnoRowsFromMock("isabel");
  assert.ok(rows);
  // Isabel lunes (dia 1): 12:30-16:00 + 19:30-22:30
  const monday = rows!.filter((row) => row.dia === 1);
  assert.deepEqual(
    monday.map((row) => [row.servicio, row.hora_inicio, row.hora_fin]).sort(),
    [
      ["Cena", "19:30", "22:30"],
      ["Comida", "12:30", "16:00"],
    ],
  );
});

test("an afternoon-spanning segment counts as Comida", () => {
  // Sebastian Gomez trabaja 13:00-19:00 + 20:00-22:00
  const rows = turnoRowsFromMock("sebastian-gomez");
  assert.ok(rows);
  const monday = rows!.filter((row) => row.dia === 1);
  assert.deepEqual(
    monday.map((row) => [row.servicio, row.hora_inicio]).sort(),
    [
      ["Cena", "20:00"],
      ["Comida", "13:00"],
    ],
  );
});

test("the full seed covers every employee and every weekday", () => {
  const rows = allTurnoRowsFromMock();
  const employees = new Set(rows.map((row) => row.employee_key));
  assert.equal(employees.size, 14);
  for (const key of employees) {
    const days = new Set(
      rows.filter((row) => row.employee_key === key).map((row) => row.dia),
    );
    assert.equal(days.size, 7, `employee ${key} is missing weekdays`);
  }
});

test("an unknown employee gets no template rows", () => {
  assert.equal(turnoRowsFromMock("nadie"), null);
});

test("getEmployeeWeek falls back to the local template without Supabase", async () => {
  const week = await getEmployeeWeek("carlos");
  assert.equal(week.source, "plantilla");
  assert.equal(week.days.length, 7);
  assert.equal(week.days[4].descanso, true);
  assert.equal(week.days[1].descanso, false);
  assert.deepEqual(week.days[1].turnos, [
    { servicio: "Comida", inicio: "11:30", fin: "16:00" },
  ]);
});
