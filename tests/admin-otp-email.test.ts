import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";

const PASSWORD = "clave-de-prueba-2026";

process.env.KARUMA_AUTH_SECRET = "admin-otp-test-secret-2026";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://admin-otp-test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
process.env.KARUMA_ADMIN_USERNAME = "karuma";
process.env.KARUMA_ADMIN_PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 10);
process.env.KARUMA_ADMIN_EMAIL = "jefe@karuma-test.dev";
process.env.KARUMA_ADMIN_PHONE = "+34600000000";
// Sin credenciales de Gmail el correo sale por Resend, que es lo que mockeamos.
delete process.env.RESERVAS_GMAIL_USER;
delete process.env.RESERVAS_GMAIL_APP_PASSWORD;
process.env.RESEND_API_KEY = "re_test";
process.env.RESERVAS_EMAIL_FROM = "Karuma <no-reply@karuma-test.dev>";
// SMS de respaldo: proveedor Twilio simulado.
process.env.SMS_PROVIDER = "twilio";
process.env.TWILIO_ACCOUNT_SID = "AC_test";
process.env.TWILIO_AUTH_TOKEN = "token_test";
process.env.TWILIO_FROM = "+34700000000";

import { NextRequest } from "next/server";
import { getAdminEmail, maskAdminEmail } from "../lib/auth/server-accounts";
import { SESSION_COOKIE_NAME } from "../lib/auth/session";
import { POST } from "../app/api/auth/login/route";
import { POST as VERIFY } from "../app/api/auth/login/admin/verify/route";

/** PostgREST + Resend + Twilio simulados. */
function mockBackend(
  otpSession: Record<string, unknown> | null = null,
  opts: { resendOk?: boolean; twilioOk?: boolean } = {},
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

    if (url.hostname === "api.twilio.com") {
      return opts.twilioOk === false
        ? new Response(JSON.stringify({ message: "número no válido" }), { status: 400 })
        : new Response(JSON.stringify({ sid: "SM1", status: "queued" }), {
            headers: { "content-type": "application/json" },
          });
    }

    let payload: unknown = [];
    if (url.pathname.endsWith("/auth_otp_sessions")) {
      payload = method === "GET" ? otpSession : { id: "otp-1" };
    }
    return new Response(JSON.stringify(payload), {
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

function loginRequest(username: string, password: string) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: username, password }),
  });
}

function verifyRequest(code: string, channel?: string) {
  return new NextRequest("http://localhost/api/auth/login/admin/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: "karuma",
      password: PASSWORD,
      code,
      ...(channel ? { channel } : {}),
    }),
  });
}

function otpRow(code: string, destino = "jefe@karuma-test.dev") {
  return {
    id: "otp-1",
    phone: destino,
    code,
    attempts: 0,
    max_attempts: 3,
    expires_at: new Date(Date.now() + 300_000).toISOString(),
    verified_at: null,
    account_id: null,
  };
}

test("el correo del admin se lee del entorno y se enseña tapado", () => {
  assert.equal(getAdminEmail(), "jefe@karuma-test.dev");
  assert.equal(maskAdminEmail("jefe@karuma-test.dev"), "jef•••@karuma-test.dev");
});

test("la contraseña correcta manda el código al CORREO, no por SMS", async () => {
  const mock = mockBackend();
  try {
    const response = await POST(loginRequest("karuma", PASSWORD));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.requiresOtp, true);
    assert.equal(body.channel, "email");
    assert.equal(body.destinationHint, "jef•••@karuma-test.dev");
    assert.equal(response.headers.get("set-cookie"), null, "aún no hay sesión");

    const envio = mock.calls.find((c) => c.url.hostname === "api.resend.com");
    assert.ok(envio, "debería haberse enviado el correo");
    assert.equal(JSON.parse(envio!.body as string).to, "jefe@karuma-test.dev");
    assert.equal(
      mock.calls.some((c) => c.url.hostname === "api.twilio.com"),
      false,
      "no debería gastarse un SMS",
    );
  } finally {
    mock.restore();
  }
});

test("si el correo no sale, el SMS sigue de respaldo", async () => {
  const mock = mockBackend(null, { resendOk: false });
  try {
    const response = await POST(loginRequest("karuma", PASSWORD));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.channel, "sms");
    assert.equal(body.destinationHint, "+34•••••000");
    assert.ok(mock.calls.some((c) => c.url.hostname === "api.twilio.com"));
  } finally {
    mock.restore();
  }
});

test("si no sale ni el correo ni el SMS, no se entra", async () => {
  const mock = mockBackend(null, { resendOk: false, twilioOk: false });
  try {
    const response = await POST(loginRequest("karuma", PASSWORD));
    assert.equal(response.status, 502);
    assert.equal(response.headers.get("set-cookie"), null);
  } finally {
    mock.restore();
  }
});

test("una contraseña equivocada no manda ningún código", async () => {
  const mock = mockBackend();
  try {
    const response = await POST(loginRequest("karuma", "no-es-la-clave"));
    assert.notEqual(response.status, 200);
    assert.equal(
      mock.calls.some(
        (c) => c.url.hostname === "api.resend.com" || c.url.hostname === "api.twilio.com",
      ),
      false,
    );
  } finally {
    mock.restore();
  }
});

test("el código del correo abre la sesión de admin", async () => {
  const mock = mockBackend(otpRow("123456"));
  try {
    const response = await VERIFY(verifyRequest("123456", "email"));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).role, "owner");
    assert.ok(response.headers.get("set-cookie")?.includes(SESSION_COOKIE_NAME));

    // El código se busca contra el correo del admin, no contra otro destino.
    const lookup = mock.calls.find(
      (c) => c.url.pathname.endsWith("/auth_otp_sessions") && c.method === "GET",
    );
    assert.equal(lookup?.url.searchParams.get("phone"), "eq.jefe@karuma-test.dev");
  } finally {
    mock.restore();
  }
});

test("sin canal (app antigua) se busca igualmente contra el correo", async () => {
  const mock = mockBackend(otpRow("123456"));
  try {
    const response = await VERIFY(verifyRequest("123456"));
    assert.equal(response.status, 200);
  } finally {
    mock.restore();
  }
});

test("si el código llegó por SMS, se verifica contra el teléfono", async () => {
  const mock = mockBackend(otpRow("123456", "+34600000000"));
  try {
    const response = await VERIFY(verifyRequest("123456", "sms"));
    assert.equal(response.status, 200);
    const lookup = mock.calls.find(
      (c) => c.url.pathname.endsWith("/auth_otp_sessions") && c.method === "GET",
    );
    assert.equal(lookup?.url.searchParams.get("phone"), "eq.+34600000000");
  } finally {
    mock.restore();
  }
});

test("un código equivocado no abre sesión", async () => {
  const mock = mockBackend(otpRow("123456"));
  try {
    const response = await VERIFY(verifyRequest("000000", "email"));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("set-cookie"), null);
  } finally {
    mock.restore();
  }
});

test("un código caducado no abre sesión", async () => {
  const caducado = { ...otpRow("123456"), expires_at: new Date(Date.now() - 1000).toISOString() };
  const mock = mockBackend(caducado);
  try {
    const response = await VERIFY(verifyRequest("123456", "email"));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("set-cookie"), null);
  } finally {
    mock.restore();
  }
});

test("el código correcto con la contraseña equivocada no abre sesión", async () => {
  const mock = mockBackend(otpRow("123456"));
  try {
    const request = new NextRequest("http://localhost/api/auth/login/admin/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "karuma", password: "otra", code: "123456" }),
    });
    const response = await VERIFY(request);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("set-cookie"), null);
  } finally {
    mock.restore();
  }
});
