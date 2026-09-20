import assert from "node:assert/strict";
import test from "node:test";

process.env.KARUMA_AUTH_SECRET = "portal-correo-test-secret-2026";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://portal-correo-test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

import { NextRequest } from "next/server";
import { GET, POST } from "../app/api/portal/correo/route";
import { createSessionToken, SESSION_COOKIE_NAME } from "../lib/auth/session";
import { esCorreoUtilizable, normalizeStaffEmail } from "../lib/staff/correo";
import { middleware } from "../middleware";

const STAFF_ID = "11111111-2222-3333-4444-555555555555";

async function sessionCookie(employeeId: string | null, name = "Jhoan") {
  const token = await createSessionToken({
    name,
    email: `${name.toLowerCase()}@karuma.es`,
    role: employeeId ? "waiter" : "owner",
    employeeId,
  });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

/**
 * PostgREST simulado. `staffRows` es lo que devuelve la búsqueda de la ficha,
 * `emailRow` la fila con el correo actual y `duplicado` si otra ficha ya usa
 * esa dirección.
 */
function mockDb(
  opts: {
    staffRows?: { id: string }[];
    emailActual?: string | null;
    duplicado?: boolean;
    fallaUpdate?: boolean;
  } = {},
) {
  const calls: { url: URL; method: string; body?: string }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body as string | undefined });

    if (url.pathname.endsWith("/staff")) {
      if (method === "PATCH") {
        return opts.fallaUpdate
          ? new Response(JSON.stringify({ message: "boom" }), { status: 500 })
          : new Response(JSON.stringify([]), {
              headers: { "content-type": "application/json" },
            });
      }
      // Buscar duplicados: la consulta lleva un filtro ilike sobre email.
      if (url.searchParams.get("email")?.startsWith("ilike.")) {
        return new Response(JSON.stringify(opts.duplicado ? [{ id: "otra" }] : []), {
          headers: { "content-type": "application/json" },
        });
      }
      // Leer el correo de la ficha ya resuelta.
      if (url.searchParams.get("select") === "email") {
        return new Response(JSON.stringify({ email: opts.emailActual ?? null }), {
          headers: { "content-type": "application/json" },
        });
      }
      // Resolver la ficha a partir del nombre de la sesión.
      return new Response(JSON.stringify(opts.staffRows ?? [{ id: STAFF_ID }]), {
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify([]), {
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

function peticion(method: "GET" | "POST", cookie?: string, email?: string) {
  return new NextRequest("http://localhost/api/portal/correo", {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(method === "POST" ? { "content-type": "application/json" } : {}),
    },
    ...(method === "POST" ? { body: JSON.stringify({ email }) } : {}),
  });
}

test("los correos de relleno cuentan como 'sin correo'", () => {
  assert.equal(normalizeStaffEmail(" Joselin@Gmail.com "), "joselin@gmail.com");
  assert.equal(esCorreoUtilizable("carlos@hotmail.es"), true);
  // Los que inventa lib/staff/data.ts y el kiosco.
  assert.equal(normalizeStaffEmail("alex@karuma.es"), null);
  assert.equal(normalizeStaffEmail("carlos@karuma.local"), null);
  assert.equal(normalizeStaffEmail("sin-arroba"), null);
  assert.equal(normalizeStaffEmail(""), null);
  assert.equal(normalizeStaffEmail(null), null);
});

test("sin sesión no se contesta nada", async () => {
  const mock = mockDb();
  try {
    assert.equal((await GET(peticion("GET"))).status, 401);
    assert.equal((await POST(peticion("POST", undefined, "a@b.com"))).status, 401);
  } finally {
    mock.restore();
  }
});

test("a la ficha con correo de relleno se le pide uno de verdad", async () => {
  const mock = mockDb({ emailActual: "jhoan@karuma.es" });
  try {
    const response = await GET(peticion("GET", await sessionCookie("carlos")));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { pendiente: true, email: null });
  } finally {
    mock.restore();
  }
});

test("quien ya tiene correo real no ve nada", async () => {
  const mock = mockDb({ emailActual: "Joselin@Gmail.com" });
  try {
    const response = await GET(peticion("GET", await sessionCookie("carlos")));
    assert.deepEqual(await response.json(), {
      pendiente: false,
      email: "joselin@gmail.com",
    });
  } finally {
    mock.restore();
  }
});

test("una cuenta de oficina no tiene ficha que rellenar", async () => {
  const mock = mockDb();
  try {
    const response = await GET(peticion("GET", await sessionCookie(null, "Oficina")));
    assert.equal((await response.json()).pendiente, false);
  } finally {
    mock.restore();
  }
});

test("sin ficha en staff NO se bloquea el portal", async () => {
  const mock = mockDb({ staffRows: [] });
  try {
    const response = await GET(peticion("GET", await sessionCookie("carlos")));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).pendiente, false);
  } finally {
    mock.restore();
  }
});

test("guardar el correo lo escribe en SU ficha, no en otra", async () => {
  const mock = mockDb({ emailActual: null });
  try {
    const response = await POST(
      peticion("POST", await sessionCookie("carlos"), " Joselin@Gmail.com "),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, email: "joselin@gmail.com" });

    const update = mock.calls.find((c) => c.method === "PATCH");
    assert.ok(update, "debería haberse guardado");
    assert.equal(JSON.parse(update!.body as string).email, "joselin@gmail.com");
    assert.equal(update!.url.searchParams.get("id"), `eq.${STAFF_ID}`);
  } finally {
    mock.restore();
  }
});

test("un correo mal escrito no se guarda", async () => {
  const mock = mockDb();
  try {
    for (const malo of ["", "sin-arroba", "alex@karuma.es"]) {
      const response = await POST(peticion("POST", await sessionCookie("carlos"), malo));
      assert.equal(response.status, 400);
    }
    assert.equal(mock.calls.some((c) => c.method === "PATCH"), false);
  } finally {
    mock.restore();
  }
});

test("no se puede usar el correo que ya tiene otra persona", async () => {
  const mock = mockDb({ duplicado: true });
  try {
    const response = await POST(
      peticion("POST", await sessionCookie("carlos"), "joselin@gmail.com"),
    );
    assert.equal(response.status, 409);
    assert.equal(mock.calls.some((c) => c.method === "PATCH"), false);
  } finally {
    mock.restore();
  }
});

test("si la base de datos falla al guardar, se avisa y no se miente", async () => {
  const mock = mockDb({ fallaUpdate: true });
  try {
    const response = await POST(
      peticion("POST", await sessionCookie("carlos"), "joselin@gmail.com"),
    );
    assert.equal(response.status, 503);
  } finally {
    mock.restore();
  }
});

test("el middleware deja pasar /api/portal/correo a una cuenta de empleado", async () => {
  const request = new NextRequest("http://localhost/api/portal/correo", {
    headers: { cookie: await sessionCookie("carlos") },
  });
  const response = await middleware(request);
  assert.notEqual(response.status, 403);
});
