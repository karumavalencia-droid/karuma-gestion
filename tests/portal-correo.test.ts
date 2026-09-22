import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

process.env.KARUMA_AUTH_SECRET = "portal-correo-test-secret-2026";
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

import { validateEmployeePassword } from "../lib/auth/employee-account";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "../lib/auth/session";
import { normalizeStaffEmail } from "../lib/staff/correo";
import { middleware } from "../middleware";

async function employeeCookie(authMethod: "legacy_pin" | "password", sessionVersion = 1) {
  const token = await createSessionToken({
    name: "Jhoan",
    email: authMethod === "password" ? "jhoan@gmail.com" : "jhoan@karuma.es",
    role: "waiter",
    employeeId: "jhoan",
    authMethod,
    sessionVersion,
  });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

test("solo se aceptan correos personales utilizables", () => {
  assert.equal(normalizeStaffEmail(" Persona@Gmail.com "), "persona@gmail.com");
  assert.equal(normalizeStaffEmail("jhoan@karuma.es"), null);
  assert.equal(normalizeStaffEmail("jhoan@karuma.local"), null);
  assert.equal(normalizeStaffEmail("sin-arroba"), null);
});

test("la contraseña exige longitud, letra y número", () => {
  assert.match(validateEmployeePassword("12345678") ?? "", /letra/);
  assert.match(validateEmployeePassword("abcdefgh") ?? "", /número/);
  assert.match(validateEmployeePassword("Abc123") ?? "", /8 caracteres/);
  assert.equal(validateEmployeePassword("Karuma2026"), null);
});

test("la sesión guarda método y versión de credenciales", async () => {
  const token = (await employeeCookie("password", 7)).split("=")[1];
  const user = await verifySessionToken(token);
  assert.equal(user?.authMethod, "password");
  assert.equal(user?.sessionVersion, 7);
});

test("el PIN antiguo puede abrir activación y fichaje", async () => {
  const cookie = await employeeCookie("legacy_pin");
  for (const path of ["/api/portal/correo", "/api/portal/correo/verificar", "/api/attendance/me"]) {
    const response = await middleware(new NextRequest(`http://localhost${path}`, { headers: { cookie } }));
    assert.notEqual(response.status, 403, path);
  }
});

test("el PIN antiguo no puede abrir ni descargar nóminas", async () => {
  const cookie = await employeeCookie("legacy_pin");
  for (const path of ["/my-payroll", "/api/nominas", "/api/nominas/11111111-1111-4111-8111-111111111111/download"]) {
    const response = await middleware(new NextRequest(`http://localhost${path}`, { headers: { cookie } }));
    assert.ok(response.status === 307 || response.status === 403, path);
  }
});

test("la sesión con contraseña sí puede solicitar su nómina", async () => {
  const response = await middleware(new NextRequest("http://localhost/api/nominas", {
    headers: { cookie: await employeeCookie("password", 2) },
  }));
  assert.notEqual(response.status, 403);
});
