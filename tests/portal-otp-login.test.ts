import assert from "node:assert/strict";
import test from "node:test";

process.env.KARUMA_AUTH_SECRET = "portal-otp-test-secret-2026";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://portal-otp-test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
// Sin credenciales de Gmail, el envío cae en Resend, que es lo que mockeamos.
delete process.env.RESERVAS_GMAIL_USER;
delete process.env.RESERVAS_GMAIL_APP_PASSWORD;
process.env.RESEND_API_KEY = "re_test";
process.env.RESERVAS_EMAIL_FROM = "Karuma <no-reply@karuma-test.dev>";

import { NextRequest } from "next/server";
import { isMobileUserAgent } from "../lib/auth/device";
import { maskEmployeeEmail, normalizeEmployeeEmail } from "../lib/auth/employee-otp";
import { SESSION_COOKIE_NAME } from "../lib/auth/session";
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

test("los correos de relleno se descartan, los de verdad no", () => {
  assert.equal(normalizeEmployeeEmail("Joselin@Gmail.com "), "joselin@gmail.com");
  assert.equal(normalizeEmployeeEmail("carlos@hotmail.es"), "carlos@hotmail.es");
  // Los que genera lib/staff/data.ts y el kiosco: buzones que no existen.
  assert.equal(normalizeEmployeeEmail("alex@karuma.es"), null);
  assert.equal(normalizeEmployeeEmail("carlos@karuma.local"), null);
  // Vacíos y basura.
  assert.equal(normalizeEmployeeEmail(""), null);
  assert.equal(normalizeEmployeeEmail(null), null);
  assert.equal(normalizeEmployeeEmail("sin-arroba"), null);
});

test("la dirección se enseña tapada", () => {
  assert.equal(maskEmployeeEmail("joselin@gmail.com"), "jos•••@gmail.com");
  assert.equal(maskEmployeeEmail("ed@gmail.com"), "e•••@gmail.com");
});

/** PostgREST + Resend simulados. */
function mockBackend(
  staffRows: { email: string | null }[],
  otpSession: Record<string, unknown> | null = null,
  opts: { resendOk?: boolean } = {},
) {
  const calls: { url: URL; method: string; body?: string }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body as string | undefined });

    if (url.hostname === "api.resend.com") {
      return opts.resendOk === false
        ? new Response("dominio no verificado", { status: 403 })
        : new Response(JSON.stringify({ id: "email-1" }), {
            headers: { "content-type": "application/json" },
          });
    }

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

function loginRequest(pin: string, userAgent: string) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": userAgent },
    body: JSON.stringify({ email: pin, password: pin }),
  });
}

test("desde el ordenador el empleado entra solo con el PIN, sin correo", async () => {
  const mock = mockBackend([{ email: "joselin@gmail.com" }]);
  try {
    const response = await POST(loginRequest("1001", MAC));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).employeeId, "carlos");
    assert.ok(response.headers.get("set-cookie")?.includes(SESSION_COOKIE_NAME));
    assert.equal(
      mock.calls.some((c) => c.url.hostname === "api.resend.com"),
      false,
      "no debería haberse mandado ningún correo",
    );
  } finally {
    mock.restore();
  }
});

test("desde el móvil manda el código al correo de la ficha y no crea sesión", async () => {
  const mock = mockBackend([{ email: "joselin@gmail.com" }]);
  try {
    const response = await POST(loginRequest("1001", IPHONE));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.requiresOtp, true);
    assert.equal(body.destinationHint, "jos•••@gmail.com");
    assert.equal(response.headers.get("set-cookie"), null);

    // El correo sale al destino de la FICHA, no a nada que venga en la petición.
    const envio = mock.calls.find((c) => c.url.hostname === "api.resend.com");
    assert.ok(envio, "debería haberse enviado el correo");
    assert.equal(JSON.parse(envio!.body as string).to, "joselin@gmail.com");
  } finally {
    mock.restore();
  }
});

test("un correo de relleno no bloquea: se entra con el PIN", async () => {
  const mock = mockBackend([{ email: "alex@karuma.es" }]);
  try {
    const response = await POST(loginRequest("1001", IPHONE));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.requiresOtp, undefined);
    assert.ok(response.headers.get("set-cookie")?.includes(SESSION_COOKIE_NAME));
    assert.equal(
      mock.calls.some((c) => c.url.hostname === "api.resend.com"),
      false,
      "no se manda correo a un buzón inventado",
    );
  } finally {
    mock.restore();
  }
});

test("si el correo no sale, no se abre sesión y se avisa", async () => {
  const mock = mockBackend([{ email: "joselin@gmail.com" }], null, { resendOk: false });
  try {
    const response = await POST(loginRequest("1001", IPHONE));
    assert.equal(response.status, 502);
    assert.equal(response.headers.get("set-cookie"), null);
  } finally {
    mock.restore();
  }
});

test("un PIN que no existe sigue fallando igual que antes", async () => {
  const mock = mockBackend([]);
  try {
    assert.equal((await POST(loginRequest("9999", IPHONE))).status, 401);
  } finally {
    mock.restore();
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Segundo paso: verificar el código
// ─────────────────────────────────────────────────────────────────────────

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
    phone: "joselin@gmail.com",
    code,
    attempts: 0,
    max_attempts: 3,
    expires_at: new Date(Date.now() + 300_000).toISOString(),
    verified_at: null,
    account_id: null,
  };
}

test("el código correcto junto al PIN abre la sesión del empleado", async () => {
  const mock = mockBackend([{ email: "joselin@gmail.com" }], otpRow("123456"));
  try {
    const response = await VERIFY(verifyRequest("1001", "123456"));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).employeeId, "carlos");
    assert.ok(response.headers.get("set-cookie")?.includes(SESSION_COOKIE_NAME));

    // El código se busca contra el correo de la ficha, no contra otro destino.
    const lookup = mock.calls.find(
      (c) => c.url.pathname.endsWith("/auth_otp_sessions") && c.method === "GET",
    );
    assert.equal(lookup?.url.searchParams.get("phone"), "eq.joselin@gmail.com");
  } finally {
    mock.restore();
  }
});

test("un código equivocado no abre sesión", async () => {
  const mock = mockBackend([{ email: "joselin@gmail.com" }], otpRow("123456"));
  try {
    const response = await VERIFY(verifyRequest("1001", "000000"));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("set-cookie"), null);
  } finally {
    mock.restore();
  }
});

test("un código válido con el PIN de otro no sirve", async () => {
  const mock = mockBackend([{ email: "joselin@gmail.com" }], otpRow("123456"));
  try {
    const response = await VERIFY(verifyRequest("9999", "123456"));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("set-cookie"), null);
  } finally {
    mock.restore();
  }
});

test("un código caducado no abre sesión", async () => {
  const caducado = { ...otpRow("123456"), expires_at: new Date(Date.now() - 1000).toISOString() };
  const mock = mockBackend([{ email: "joselin@gmail.com" }], caducado);
  try {
    const response = await VERIFY(verifyRequest("1001", "123456"));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("set-cookie"), null);
  } finally {
    mock.restore();
  }
});
