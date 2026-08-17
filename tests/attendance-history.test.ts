import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET } from "../app/api/attendance/me/history/route";
import { createSessionToken, SESSION_COOKIE_NAME } from "../lib/auth/session";

process.env.KARUMA_AUTH_SECRET = "attendance-history-test-secret-2026";

test("attendance history requires an employee session", async () => {
  const response = await GET(new NextRequest("http://localhost/api/attendance/me/history"));
  assert.equal(response.status, 401);
});

test("attendance history returns a bounded calendar with summary counts", async () => {
  const token = await createSessionToken({
    name: "Jhoan",
    email: "carlos@karuma.es",
    role: "waiter",
    employeeId: "carlos",
  });
  const response = await GET(
    new NextRequest("http://localhost/api/attendance/me/history?days=10", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
    }),
  );
  const payload = (await response.json()) as {
    days?: { date: string; status: string }[];
    summary?: { present: number; missing: number; off: number };
  };
  assert.equal(response.status, 200);
  assert.equal(payload.days?.length, 10);
  assert.ok(payload.days?.every((day) => ["present", "missing", "off"].includes(day.status)));
  assert.equal(
    (payload.summary?.present ?? 0) +
      (payload.summary?.missing ?? 0) +
      (payload.summary?.off ?? 0),
    10,
  );
});
