import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME } from "../lib/auth/session";
import { middleware } from "../middleware";
import { GET } from "../app/api/recipes/route";

process.env.KARUMA_AUTH_SECRET = "recipes-local-test-only";
async function request(path: string, employee = true, method = "GET") {
  const token = await createSessionToken({ name: "Test", email: "test@example.test", role: employee ? "waiter" : "manager", employeeId: employee ? "test-employee" : null });
  return new NextRequest(`http://localhost${path}`, { method, headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` } });
}

test("Oficina and employees can open both recipe routes", async () => {
  for (const employee of [true, false]) for (const path of ["/recetas", "/recipes"]) {
    const result = await middleware(await request(path, employee));
    assert.equal(result.headers.get("x-middleware-next"), "1");
  }
});

test("employees can only read the recipe API and cannot access unrelated modules", async () => {
  assert.equal((await middleware(await request("/api/recipes"))).headers.get("x-middleware-next"), "1");
  assert.equal((await middleware(await request("/api/recipes", true, "POST"))).status, 403);
  assert.equal((await middleware(await request("/api/recipes/private"))).status, 403);
  assert.equal((await middleware(await request("/api/facturas"))).status, 403);
});

test("unauthenticated recipe requests are rejected", async () => {
  assert.equal((await GET(new NextRequest("http://localhost/api/recipes"))).status, 401);
});

test("published recipes retain complete preparation and errors are distinct from empty results", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://recipes-test.example.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "local-test-only";
  const originalFetch = globalThis.fetch;
  const content = "Preparación de prueba.\n".repeat(100);
  let fail = false;
  globalThis.fetch = async (input) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    assert.equal(url.searchParams.get("active"), "eq.true");
    assert.equal(url.searchParams.get("category"), "eq.recipe");
    assert.equal(url.searchParams.get("select"), "id,title,content,keywords");
    return new Response(JSON.stringify(fail ? { message: "unavailable" } : [{ id: "test", title: "Receta de prueba", content, keywords: [] }]), { status: fail ? 400 : 200, headers: { "content-type": "application/json" } });
  };
  try {
    const result = await GET(await request("/api/recipes"));
    assert.equal(result.status, 200);
    assert.equal(result.headers.get("cache-control"), "no-store");
    assert.equal((await result.json()).recipes[0].content, content);
    fail = true;
    assert.equal((await GET(await request("/api/recipes"))).status, 503);
  } finally { globalThis.fetch = originalFetch; }
});
