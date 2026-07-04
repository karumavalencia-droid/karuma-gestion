import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET } from "../app/api/schedule/me/route";
import { createSessionToken, SESSION_COOKIE_NAME } from "../lib/auth/session";
import { middleware } from "../middleware";

process.env.KARUMA_AUTH_SECRET = "schedule-me-test-secret-2026";

async function sessionCookie(employeeId: string | null, name = "Test") {
  const token = await createSessionToken({
    name,
    email: `${name.toLowerCase()}@karuma.es`,
    role: employeeId ? "waiter" : "owner",
    employeeId,
  });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function scheduleRequest(cookie?: string) {
  return new NextRequest("http://localhost/api/schedule/me", {
    headers: cookie ? { cookie } : {},
  });
}

type SchedulePayload = {
  employee: { id: string };
  days: {
    date: string;
    weekday: string;
    isToday: boolean;
    descanso: boolean;
    turnos: { servicio: string; inicio: string; fin: string }[];
  }[];
};

test("the schedule requires an authenticated session", async () => {
  const response = await GET(scheduleRequest());
  assert.equal(response.status, 401);
});

test("an admin account without employee link cannot read the employee schedule", async () => {
  const response = await GET(scheduleRequest(await sessionCookie(null, "Admin")));
  assert.equal(response.status, 403);
});

test("an employee receives their own week, Monday first", async () => {
  const response = await GET(
    scheduleRequest(await sessionCookie("carlos", "Jhoan")),
  );
  const payload = (await response.json()) as SchedulePayload;

  assert.equal(response.status, 200);
  assert.equal(payload.employee.id, "carlos");
  assert.equal(payload.days.length, 7);
  assert.equal(payload.days[0].weekday, "Lunes");
  assert.equal(payload.days.filter((day) => day.isToday).length, 1);
  // Jhoan descansa los jueves
  assert.equal(payload.days[3].descanso, true);
  assert.deepEqual(payload.days[0].turnos, [
    { servicio: "Comida", inicio: "11:30", fin: "16:00" },
  ]);
});

test("two different employees only see their own schedule", async () => {
  const carlosResponse = await GET(
    scheduleRequest(await sessionCookie("carlos", "Jhoan")),
  );
  const isabelResponse = await GET(
    scheduleRequest(await sessionCookie("isabel", "Isabel")),
  );
  const carlos = (await carlosResponse.json()) as SchedulePayload;
  const isabel = (await isabelResponse.json()) as SchedulePayload;

  assert.equal(carlos.employee.id, "carlos");
  assert.equal(isabel.employee.id, "isabel");
  // Las semanas son distintas: Isabel trabaja el jueves partido, Jhoan descansa;
  // Isabel descansa el domingo, Jhoan trabaja.
  assert.equal(carlos.days[3].descanso, true);
  assert.equal(isabel.days[3].descanso, false);
  assert.equal(isabel.days[3].turnos.length, 2);
  assert.equal(isabel.days[6].descanso, true);
  assert.equal(carlos.days[6].descanso, false);
});

test("the middleware lets an employee reach the portal pages and APIs", async () => {
  const cookie = await sessionCookie("carlos", "Jhoan");

  for (const path of ["/my-schedule", "/my-attendance", "/api/schedule/me"]) {
    const response = await middleware(
      new NextRequest(`http://localhost${path}`, { headers: { cookie } }),
    );
    assert.equal(response.status, 200, `employee should reach ${path}`);
  }
});

test("the middleware still blocks an employee from the rest of the ERP", async () => {
  const cookie = await sessionCookie("carlos", "Jhoan");

  const page = await middleware(
    new NextRequest("http://localhost/schedule", { headers: { cookie } }),
  );
  assert.equal(page.status, 307);
  assert.equal(page.headers.get("location"), "http://localhost/my-attendance");

  const api = await middleware(
    new NextRequest("http://localhost/api/staff", { headers: { cookie } }),
  );
  assert.equal(api.status, 403);
});

test("the middleware redirects an admin away from the employee portal", async () => {
  const response = await middleware(
    new NextRequest("http://localhost/my-schedule", {
      headers: { cookie: await sessionCookie(null, "Admin") },
    }),
  );
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost/dashboard");
});
