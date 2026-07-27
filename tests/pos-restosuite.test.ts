import { test } from "node:test";
import assert from "node:assert/strict";

import {
  RestosuiteApiError,
  RestosuiteAuthError,
  fetchDailySales,
  reportRowToRecord,
  type RestosuiteConfig,
} from "../lib/pos/restosuite-client";

const config: RestosuiteConfig = {
  baseUrl: "https://bo.example.test",
  token: "test-token",
  shopId: "300401626",
  corporationId: "210003986",
  brandId: "brand-1",
  organizationId: "org-1",
  organizationType: "7",
  currency: "EUR",
  timezone: "Europe/Madrid",
  languageCode: "en_US",
  locationId: "karuma-valencia",
};

/** Fila con la forma real que devuelve /api/report/data/queryData. */
function row(values: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(values).map(([field, value]) => [field, { value, displayValue: value }]),
  );
}

const SYNCED_AT = "2026-07-28T04:15:00.000Z";

test("mapea una fila del informe a un registro de sales_daily", () => {
  const record = reportRowToRecord(
    row({
      D_businessDate: "2026-07-25",
      M_Order_COUNT_Orders: "71",
      M_Order_SUM_guests: "182",
      M_Order_SUM_netSales: "4622.15",
      M_Order_SUM_totalGrossSales: "4622.15",
      M_Order_AVG_netSalesByGuest: "25.40",
    }),
    config,
    SYNCED_AT,
  );

  assert.ok(record);
  assert.equal(record.date, "2026-07-25");
  assert.equal(record.netSales, 4622.15);
  assert.equal(record.grossSales, 4622.15);
  assert.equal(record.customers, 182);
  assert.equal(record.orders, 71);
  assert.equal(record.averageTicket, 25.4);
  assert.equal(record.source, "restosuite-api");
  assert.equal(record.locationId, "karuma-valencia");
  assert.equal(record.externalId, "restosuite:300401626:2026-07-25");
  assert.equal(record.syncedAt, SYNCED_AT);
});

test("el informe de resumen no desglosa bebida ni formas de pago: van a 0", () => {
  const record = reportRowToRecord(
    row({ D_businessDate: "2026-07-23", M_Order_SUM_netSales: "4349.95" }),
    config,
    SYNCED_AT,
  );

  assert.ok(record);
  assert.equal(record.drinkSales, 0);
  assert.equal(record.deliverySales, 0);
  assert.equal(record.cashSales, 0);
  assert.equal(record.cardSales, 0);
});

test("gross cae a net cuando RestoSuite no lo devuelve", () => {
  const record = reportRowToRecord(
    row({ D_businessDate: "2026-07-27", M_Order_SUM_netSales: "3982.45" }),
    config,
    SYNCED_AT,
  );

  assert.ok(record);
  assert.equal(record.grossSales, 3982.45);
});

test("el ticket medio se deriva si el informe lo devuelve a 0", () => {
  const record = reportRowToRecord(
    row({
      D_businessDate: "2026-07-22",
      M_Order_SUM_netSales: "2656.85",
      M_Order_SUM_guests: "125",
      M_Order_AVG_netSalesByGuest: "0",
    }),
    config,
    SYNCED_AT,
  );

  assert.ok(record);
  assert.equal(record.averageTicket, 2656.85 / 125);
});

test("una fila sin fecha válida se descarta en vez de guardarse", () => {
  assert.equal(reportRowToRecord(row({ M_Order_SUM_netSales: "100" }), config, SYNCED_AT), null);
  assert.equal(
    reportRowToRecord(row({ D_businessDate: "25/07/2026" }), config, SYNCED_AT),
    null,
  );
});

test("rechaza fechas mal formadas y rangos invertidos sin llamar a la API", async () => {
  await assert.rejects(
    () => fetchDailySales("28-07-2026", "2026-07-28", config),
    RestosuiteApiError,
  );
  await assert.rejects(
    () => fetchDailySales("2026-07-28", "2026-07-21", config),
    RestosuiteApiError,
  );
});

/** Sustituye globalThis.fetch durante una comprobación y lo restaura después. */
async function withFetch(
  handler: () => Response | Promise<Response>,
  run: () => Promise<void>,
): Promise<void> {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => handler()) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("un error de RestoSuite con HTTP 200 no se toma por bueno", async () => {
  await withFetch(
    () => jsonResponse({ code: "UNI-00-0100", msg: "系统错误: " }),
    async () => {
      await assert.rejects(
        () => fetchDailySales("2026-07-27", "2026-07-27", config),
        RestosuiteApiError,
      );
    },
  );
});

test("el token caducado se distingue del resto de fallos", async () => {
  await withFetch(
    () => jsonResponse({ code: "403", msg: "授权错误" }),
    async () => {
      await assert.rejects(
        () => fetchDailySales("2026-07-27", "2026-07-27", config),
        RestosuiteAuthError,
      );
    },
  );

  await withFetch(
    () => jsonResponse({ error: "forbidden" }, 403),
    async () => {
      await assert.rejects(
        () => fetchDailySales("2026-07-27", "2026-07-27", config),
        RestosuiteAuthError,
      );
    },
  );
});

test("devuelve los días ordenados por fecha", async () => {
  await withFetch(
    () =>
      jsonResponse({
        code: "000",
        msg: "ok",
        data: {
          rows: [
            row({ D_businessDate: "2026-07-27", M_Order_SUM_netSales: "3982.45" }),
            row({ D_businessDate: "2026-07-21", M_Order_SUM_netSales: "4221.96" }),
            row({ D_businessDate: "2026-07-25", M_Order_SUM_netSales: "4622.15" }),
          ],
        },
      }),
    async () => {
      const records = await fetchDailySales("2026-07-21", "2026-07-27", config);
      assert.deepEqual(
        records.map((record) => record.date),
        ["2026-07-21", "2026-07-25", "2026-07-27"],
      );
    },
  );
});

test("un rango sin ventas devuelve una lista vacía, no filas a cero", async () => {
  await withFetch(
    () => jsonResponse({ code: "000", msg: "ok", data: { rows: [] } }),
    async () => {
      assert.deepEqual(await fetchDailySales("2026-07-28", "2026-07-28", config), []);
    },
  );
});
