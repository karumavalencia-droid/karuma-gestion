import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { POST as LOGIN } from "../app/api/auth/login/route";
import { GET, POST } from "../app/api/attendance/me/route";
import { createSessionToken, SESSION_COOKIE_NAME } from "../lib/auth/session";
import { middleware } from "../middleware";

process.env.KARUMA_AUTH_SECRET = "attendance-mobile-test-secret-2026";
process.env.KARUMA_STORE_LATITUDE = "39.4699";
process.env.KARUMA_STORE_LONGITUDE = "-0.3763";
process.env.KARUMA_ATTENDANCE_RADIUS_METERS = "120";
process.env.KARUMA_ATTENDANCE_MAX_ACCURACY_METERS = "100";

async function employeeCookie() {
  const token = await createSessionToken({
    name: "Jhoan",
    email: "jhoan@karuma.es",
    role: "waiter",
    employeeId: "jhoan",
  });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

test("personal attendance requires an authenticated employee", async () => {
  const response = await GET(
    new NextRequest("http://localhost/api/attendance/me"),
  );
  assert.equal(response.status, 401);
});

test("an employee can log in with the PIN as username and password", async () => {
  const response = await LOGIN(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "1001", password: "1001" }),
    }),
  );
  const payload = (await response.json()) as {
    employeeId?: string | null;
    role?: string;
  };

  assert.equal(response.status, 200);
  assert.equal(payload.employeeId, "jhoan");
  assert.equal(payload.role, "waiter");
  assert.match(response.headers.get("set-cookie") ?? "", /karuma_session=/);
});

test("an employee can punch inside the restaurant and only sees own events", async () => {
  const cookie = await employeeCookie();
  const response = await POST(
    new NextRequest("http://localhost/api/attendance/me", {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        requestId: "mobile-inside-test",
        latitude: 39.46995,
        longitude: -0.3763,
        accuracy: 15,
        deviceId: "test-phone",
      }),
    }),
  );
  const payload = (await response.json()) as {
    event?: { employeeId: string; source: string; latitude: number };
  };

  assert.equal(response.status, 201);
  assert.equal(payload.event?.employeeId, "jhoan");
  assert.equal(payload.event?.source, "mobile");
  assert.equal(payload.event?.latitude, 39.46995);

  const status = await GET(
    new NextRequest("http://localhost/api/attendance/me", {
      headers: { cookie },
    }),
  );
  const statusPayload = (await status.json()) as {
    employee: { id: string };
    events: { employeeId: string }[];
  };
  assert.equal(status.status, 200);
  assert.equal(statusPayload.employee.id, "jhoan");
  assert.ok(
    statusPayload.events.every((event) => event.employeeId === "jhoan"),
  );
});

test("a mobile punch outside the restaurant is rejected", async () => {
  const response = await POST(
    new NextRequest("http://localhost/api/attendance/me", {
      method: "POST",
      headers: {
        cookie: await employeeCookie(),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        requestId: "mobile-outside-test",
        latitude: 39.48,
        longitude: -0.3763,
        accuracy: 10,
      }),
    }),
  );
  const payload = (await response.json()) as { code?: string };
  assert.equal(response.status, 403);
  assert.equal(payload.code, "location_outside");
});

test("an employee account is redirected away from the ERP dashboard", async () => {
  const response = await middleware(
    new NextRequest("http://localhost/dashboard", {
      headers: { cookie: await employeeCookie() },
    }),
  );
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost/my-attendance");
});
