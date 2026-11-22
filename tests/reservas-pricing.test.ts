import assert from "node:assert/strict";
import { test } from "node:test";
import { precioBuffet, CHILD_PRICE } from "../lib/reservas/pricing";

test("effective date, weekdays, Friday dinner and weekends", () => {
  for (const [date, time, expected] of [
    ["2026-11-22", "19:00", "24,90 €"],
    ["2026-11-23", "13:00", "19,90 €"],
    ["2026-11-23", "19:00", "24,90 €"],
    ["2026-11-26", "22:00", "24,90 €"],
    ["2026-11-27", "15:30", "19,90 €"],
    ["2026-11-27", "19:00", "26,50 €"],
    ["2026-11-28", "13:00", "26,50 €"],
    ["2026-11-29", "19:00", "26,50 €"],
  ]) assert.equal(precioBuffet(date, time), expected, date + " " + time);
  assert.equal(CHILD_PRICE, "12,50 €");
});

test("holidays override weekday discounts", () => {
  for (const date of ["2026-12-08", "2026-12-25", "2027-01-22", "2027-03-29", "2027-04-05"]) {
    assert.equal(precioBuffet(date, "13:00"), "26,50 €");
    assert.equal(precioBuffet(date, "19:00"), "26,50 €");
  }
  assert.equal(precioBuffet("2026-12-07", "13:00"), "19,90 €");
});

test("invalid or unconfigured dates do not receive guessed discounts", () => {
  for (const [date, time] of [["", ""], ["2026-11-31", "19:00"], ["2026-11-23", "25:00"], ["2028-01-03", "13:00"]]) {
    assert.equal(precioBuffet(date, time), "Consultar");
  }
});
