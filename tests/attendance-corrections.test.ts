import assert from "node:assert/strict";
import test from "node:test";
import {
  createAttendanceCorrection,
  listAttendanceCorrections,
  reviewAttendanceCorrection,
} from "../lib/attendance/repository";

test("attendance correction requests are auditable through approval", async () => {
  const correction = await createAttendanceCorrection({
    employeeId: "correction-test",
    employeeName: "Test employee",
    type: "in",
    occurredAt: "2026-06-22T09:30:00.000Z",
    businessDate: "2026-06-22",
    reason: "La tablet estaba sin conexión",
  });

  assert.equal(correction.status, "pending");
  assert.equal(
    (await listAttendanceCorrections({ status: "pending" })).some(
      (row) => row.id === correction.id,
    ),
    true,
  );

  const reviewed = await reviewAttendanceCorrection({
    id: correction.id,
    status: "approved",
    reviewedBy: "Manager test",
    reviewNote: "Confirmado con el equipo",
    appliedEventId: "event-test",
  });
  assert.equal(reviewed?.status, "approved");
  assert.equal(reviewed?.reviewedBy, "Manager test");
  assert.equal(reviewed?.appliedEventId, "event-test");
  assert.equal(
    (await listAttendanceCorrections({ status: "pending" })).some(
      (row) => row.id === correction.id,
    ),
    false,
  );
});
