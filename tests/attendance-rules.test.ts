import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAttendanceDayRow,
  nextAttendanceAction,
} from "../lib/attendance/rules";
import { attendanceBusinessDate } from "../lib/attendance/time";
import type { AttendanceEvent } from "../lib/attendance/types";

function event(
  employeeId: string,
  type: "in" | "out",
  occurredAt: string,
  requestId = `${employeeId}-${type}-${occurredAt}`,
): AttendanceEvent {
  return {
    id: requestId,
    requestId,
    employeeId,
    employeeName: employeeId,
    type,
    occurredAt,
    receivedAt: occurredAt,
    businessDate: "2026-06-22",
    source: "kiosk",
    offline: false,
    deviceId: "test",
    latitude: null,
    longitude: null,
    locationAccuracy: null,
    distanceFromStore: null,
  };
}

test("the state machine alternates Entrada and Salida", () => {
  assert.equal(nextAttendanceAction([]), "in");
  assert.equal(
    nextAttendanceAction([event("jhoan", "in", "2026-06-22T09:30:00Z")]),
    "out",
  );
  assert.equal(
    nextAttendanceAction([
      event("jhoan", "in", "2026-06-22T09:30:00Z"),
      event("jhoan", "out", "2026-06-22T14:00:00Z"),
    ]),
    "in",
  );
});

test("12:30–13:00 is deducted from actual worked time", () => {
  const row = buildAttendanceDayRow(
    { id: "jhoan", name: "Jhoan", department: "Sala" },
    "2026-06-22",
    [
      event("jhoan", "in", "2026-06-22T10:00:00Z"),
      event("jhoan", "out", "2026-06-22T12:00:00Z"),
    ],
    new Date("2026-06-22T18:00:00Z"),
  );
  assert.equal(row.workedMinutes, 90);
});

test("a split-shift employee is not marked early between lunch and dinner", () => {
  const row = buildAttendanceDayRow(
    { id: "isabel", name: "Isabel", department: "Sala" },
    "2026-06-22",
    [
      event("isabel", "in", "2026-06-22T10:30:00Z"),
      event("isabel", "out", "2026-06-22T14:00:00Z"),
    ],
    new Date("2026-06-22T16:00:00Z"),
  );
  assert.equal(row.anomalies.includes("early"), false);
  assert.equal(row.currentState, "finished");
});

test("rest days are not counted as absences", () => {
  const row = buildAttendanceDayRow(
    { id: "jeferson", name: "Jeferson", department: "Cocina" },
    "2026-06-22",
    [],
    new Date("2026-06-22T22:00:00Z"),
  );
  assert.equal(row.planned, false);
  assert.equal(row.anomalies.includes("absent"), false);
});

test("late arrival is compared with the employee's real schedule", () => {
  const row = buildAttendanceDayRow(
    { id: "jhoan", name: "Jhoan", department: "Sala" },
    "2026-06-22",
    [event("jhoan", "in", "2026-06-22T09:50:00Z")],
    new Date("2026-06-22T10:00:00Z"),
  );
  assert.equal(row.anomalies.includes("late"), true);
});

test("duplicate transition sequences are marked as anomalous", () => {
  const row = buildAttendanceDayRow(
    { id: "jhoan", name: "Jhoan", department: "Sala" },
    "2026-06-22",
    [
      event("jhoan", "in", "2026-06-22T09:30:00Z", "one"),
      event("jhoan", "in", "2026-06-22T09:35:00Z", "two"),
    ],
    new Date("2026-06-22T10:00:00Z"),
  );
  assert.equal(row.anomalies.includes("duplicate"), true);
});

test("events before 04:00 belong to the previous restaurant business day", () => {
  assert.equal(
    attendanceBusinessDate(new Date("2026-06-23T00:30:00Z")),
    "2026-06-22",
  );
});
