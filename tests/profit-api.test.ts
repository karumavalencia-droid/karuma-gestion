import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { createSessionToken } from "../lib/auth/session";
import { GET } from "../app/api/profit/report/route";

test("report enforces owner access, scopes the ledger, pages costs, and fails on query errors", async () => {
  process.env.KARUMA_AUTH_SECRET = "profit-api-local-test-only";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://profit-test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  const originalFetch = globalThis.fetch;
  const owner = await createSessionToken({ name: "Test", email: "admin@karuma.local", role: "owner", employeeId: null });
  const employee = await createSessionToken({ name: "Test", email: "test@example.invalid", role: "owner", employeeId: "staff-id" });
  const office = await createSessionToken({ name: "Office", email: "office@example.invalid", role: "owner", employeeId: null });
  const request = (month: string, token?: string) => new NextRequest(`http://localhost/api/profit/report?mes=${month}`, {
    headers: token ? { Cookie: `karuma_session=${token}` } : {},
  });
  let costQueries = 0;
  let fail = false;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);
    if (url.pathname.endsWith("/sales_daily")) {
      assert.equal(url.searchParams.get("location_id"), "eq.karuma-valencia");
      assert.deepEqual(url.searchParams.getAll("business_date"), ["gte.2026-10-01", "lt.2026-11-01"]);
      return new Response(JSON.stringify([{ id: "sale", business_date: "2026-10-01", net_sales: 1000 }]), { headers: { "Content-Type": "application/json" } });
    }
    if (url.pathname.endsWith("/gastos")) {
      assert.equal(url.searchParams.get("empresa"), "eq.kosushi");
      costQueries++;
      if (fail) return new Response(JSON.stringify({ message: "Test unavailable" }), { status: 503, headers: { "Content-Type": "application/json" } });
      const offset = Number(url.searchParams.get("offset") ?? headers.get("range")?.split("-")[0] ?? 0);
      const rows = offset ? [{ id: "last", fecha: "2026-10-01", categoria: "alquiler", importe: 50 }] :
        Array.from({ length: 500 }, (_, i) => ({ id: `e-${i}`, fecha: "2026-10-01", categoria: "personal", importe: 1 }));
      return new Response(JSON.stringify(rows), { headers: { "Content-Type": "application/json" } });
    }
    if (url.pathname.endsWith("/documentos")) return new Response(null, { headers: { "Content-Range": "0-0/3" } });
    throw new Error(`Unexpected request: ${url.pathname}`);
  };
  try {
    assert.equal((await GET(request("2026-10"))).status, 401);
    assert.equal((await GET(request("2026-10", employee))).status, 403);
    assert.equal((await GET(request("2026-10", office))).status, 403);
    assert.equal((await GET(request("2026-13", owner))).status, 400);
    const response = await GET(request("2026-10", owner));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    const result = await response.json();
    assert.equal(costQueries, 2);
    assert.equal(result.costs, 550);
    assert.equal(result.result, 450);
    assert.equal(result.expenses.length, 501);
    assert.equal(result.documentsToReview, 3);
    fail = true;
    assert.equal((await GET(request("2026-10", owner))).status, 500);
  } finally { globalThis.fetch = originalFetch; }
});
