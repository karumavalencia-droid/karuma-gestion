import assert from "node:assert/strict";
import test from "node:test";

process.env.KARUMA_AUTH_SECRET = "portal-otp-test-secret-2026";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://portal-otp-test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
process.env.SMS_PROVIDER = "mock";

import { isMobileUserAgent } from "../lib/auth/device";
import { normalizeEmployeePhone } from "../lib/auth/employee-otp";
import { SESSION_COOKIE_NAME } from "../lib/auth/session";
import { NextRequest } from "next/server";
import { POST } from "../app/api/auth/login/route";
import { POST as VERIFY } from "../app/api/auth/login/employee/verify/route";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const IPAD =
  "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/604.1";
const ANDROID_TABLET =
  "Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const ANDROID_PHONE =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

test("solo los móviles disparan el código; tablet y ordenador no", () => {
  assert.equal(isMobileUserAgent(IPHONE), true);
  assert.equal(isMobileUserAgent(ANDROID_PHONE), true);
  assert.equal(isMobileUserAgent(MAC), false);
  assert.equal(isMobileUserAgent(IPAD), false);
  assert.equal(isMobileUserAgent(ANDROID_TABLET), false);
  assert.equal(isMobileUserAgent(null), false);
});

test("los teléfonos de las fichas se normalizan a E.164", () => {
  // Formatos que hay hoy en la tabla staff.
  assert.equal(normalizeEmployeePhone("623237898"), "+34623237898");
  assert.equal(normalizeEmployeePhone("+34 671 234 534"), "+34671234534");
  assert.equal(normalizeEmployeePhone("+17866543263"), "+17866543263");
  assert.equal(normalizeEmployeePhone("0034623237898"), "+34623237898");
  assert.equal(normalizeEmployeePhone("34623237898"), "+34623237898");
  // Lo que no sirve para un SMS se descarta en vez de mandarlo mal.
  assert.equal(normalizeEmployeePhone(""), null);
  assert.equal(normalizeEmployeePhone(null), null);
  assert.equal(normalizeEmployeePhone("963 000 000"), null); // fijo
  assert.equal(normalizeEmployeePhone("12345"), null);
});

/** Respuestas de PostgREST para la ficha de staff que se consulte. */
function mockSupabase(staffRows: { phone: string | null }[]) {
  const calls: URL[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push(url);
    let payload: unknown = [];
    if (url.pathname.endsWith("/staff")) payload = staffRows;
    if (url.pathname.endsWith("/auth_otp_sessions")) payload = { id: "otp-1" };
    return new Response(JSON.stringify(payload), {
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

function loginRequest(pin: string, userAgent: string) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": userAgent },
    body: JSON.stringify({ email: pin, password: pin }),
  });
}

test("desde el ordenador el empleado entra solo con el PIN, sin SMS", async () => {
  const mock = mockSupabase([{ phone: "623237898" }]);
  try {
    const response = await POST(loginRequest("1001", MAC));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.employeeId, "carlos");
    assert.ok(response.headers.get("set-cookie")?.includes(SESSION_COOKIE_NAME));
    assert.equal(
      mock.calls.some((u) => u.pathname.endsWith("/auth_otp_sessions")),
      false,
      "no debería haberse generado ningún OTP",
    );
  } finally {
    mock.restore();
  }
});

test("desde el móvil pide código y no crea sesión todavía", async () => {
  const mock = mockSupabase([{ phone: "623237898" }]);
  try {
    const response = await POST(loginRequest("1001", IPHONE));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.requiresOtp, true);
    // Solo se enseña el número enmascarado, nunca entero.
    assert.equal(body.phoneHint, "+34•••••898");
    assert.equal(response.headers.get("set-cookie"), null);

    // El OTP se guardó contra el teléfono de la FICHA, no contra nada que
    // haya podido escribir quien envía la petición.
    const otpCall = mock.calls.find((u) => u.pathname.endsWith("/auth_otp_sessions"));
    assert.ok(otpCall, "debería haberse creado una sesión OTP");
  } finally {
    mock.restore();
  }
});

test("si la ficha no tiene móvil, el empleado sigue pudiendo fichar con el PIN", async () => {
  const mock = mockSupabase([{ phone: null }]);
  try {
    const response = await POST(loginRequest("1001", IPHONE));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.requiresOtp, undefined);
    assert.equal(body.employeeId, "carlos");
    assert.ok(response.headers.get("set-cookie")?.includes(SESSION_COOKIE_NAME));
  } finally {
    mock.restore();
  }
});

test("un PIN que no existe sigue fallando igual que antes", async () => {
  const mock = mockSupabase([]);
  try {
    const response = await POST(loginRequest("9999", IPHONE));
    assert.equal(response.status, 401);
  } finally {
    mock.restore();
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Segundo paso: verificar el código
// ─────────────────────────────────────────────────────────────────────────

/** Como mockSupabase, pero además sirve la sesión OTP guardada. */
function mockSupabaseWithOtp(
  staffRows: { phone: string | null }[],
  otpSession: Record<string, unknown> | null,
) {
  const calls: { url: URL; method: string; body?: string }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body as string | undefined });
    let payload: unknown = [];
    if (url.pathname.endsWith("/staff")) payload = staffRows;
    if (url.pathname.endsWith("/auth_otp_sessions")) {
      payload = method === "GET" ? otpSession : { id: "otp-1" };
    }
    return new Response(JSON.stringify(payload), {
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

function verifyRequest(pin: string, code: string) {
  return new NextRequest("http://localhost/api/auth/login/employee/verify", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": IPHONE },
    body: JSON.stringify({ pin, code }),
  });
}

function otpRow(code: string) {
  return {
    id: "otp-1",
    phone: "+34623237898",
    code,
    attempts: 0,
    max_attempts: 3,
    expires_at: new Date(Date.now() + 300_000).toISOString(),
    verified_at: null,
    account_id: null,
  };
}

test("el código correcto junto al PIN abre la sesión del empleado", async () => {
  const mock = mockSupabaseWithOtp([{ phone: "623237898" }], otpRow("123456"));
  try {
    const response = await VERIFY(verifyRequest("1001", "123456"));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.employeeId, "carlos");
    assert.ok(response.headers.get("set-cookie")?.includes(SESSION_COOKIE_NAME));

    // El código se busca contra el teléfono de la ficha, no contra otro.
    const lookup = mock.calls.find(
      (c) => c.url.pathname.endsWith("/auth_otp_sessions") && c.method === "GET",
    );
    assert.equal(lookup?.url.searchParams.get("phone"), "eq.+34623237898");
  } finally {
    mock.restore();
  }
});

test("un código equivocado no abre sesión", async () => {
  const mock = mockSupabaseWithOtp([{ phone: "623237898" }], otpRow("123456"));
  try {
    const response = await VERIFY(verifyRequest("1001", "000000"));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("set-cookie"), null);
  } finally {
    mock.restore();
  }
});

test("un código válido con un PIN de otro no sirve", async () => {
  const mock = mockSupabaseWithOtp([{ phone: "623237898" }], otpRow("123456"));
  try {
    const response = await VERIFY(verifyRequest("9999", "123456"));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("set-cookie"), null);
  } finally {
    mock.restore();
  }
});

test("un código caducado no abre sesión", async () => {
  const expired = { ...otpRow("123456"), expires_at: new Date(Date.now() - 1000).toISOString() };
  const mock = mockSupabaseWithOtp([{ phone: "623237898" }], expired);
  try {
    const response = await VERIFY(verifyRequest("1001", "123456"));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("set-cookie"), null);
  } finally {
    mock.restore();
  }
});
