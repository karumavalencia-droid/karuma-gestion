import { test } from "node:test";
import assert from "node:assert/strict";
import { buildProfitReport, monthRange, reportCsv } from "../lib/profit/report";
import type { DbGasto } from "../lib/supabase/types";
import { computeMetrics } from "../lib/profit/helpers";

const expense = (importe: number, categoria: DbGasto["categoria"] = "alquiler"): DbGasto => ({ id: "test", fecha: "2026-10-01", importe, categoria, concepto: "=1+1", empresa: "kosushi", fuente: "manual", notas: null, created_at: "", updated_at: "" });
test("legacy calculators do not hide expenses when sales are zero", () => {
  const result = computeMetrics({ id: "test", mes: "2026-10", ventas: 0, compras: 100, personal: 200, alquiler: 300, suministros: 0, gestoria: 0, otros: 0 });
  assert.equal(result.totalCostes, 600); assert.equal(result.beneficioNeto, -600);
  assert.ok(Object.values(result).every(Number.isFinite));
});
test("zero reported sales retain real losses; absent sales remain unknown", () => {
  const r = buildProfitReport("2026-10", [{ business_date: "2026-10-01", net_sales: 0 }], [expense(3200)]);
  assert.equal(r.result, -3200); assert.equal(r.margin, null);
  assert.equal(buildProfitReport("2026-10", [], [expense(3200)]).result, null);
  assert.equal(buildProfitReport("2026-10", [{ business_date: "2026-10-01", net_sales: 1000 }], []).result, null);
});
test("costs include employer social security, preserve cents and flag missing categories", () => {
  const r = buildProfitReport("2026-10", [{ business_date: "2026-10-01", net_sales: 100 }], [expense(0.1, "personal"), expense(0.2, "seguros_sociales")]);
  assert.equal(r.labor, 0.3); assert.equal(r.costs, 0.3); assert.equal(r.result, 99.7);
  assert.ok(r.missing.includes("Alquiler")); assert.equal(r.status, "provisional");
});
test("invalid months rejected and December rolls over", () => {
  assert.equal(monthRange("2026-00"), null); assert.equal(monthRange("2026-13"), null);
  assert.deepEqual(monthRange("2026-12"), { start: "2026-12-01", end: "2027-01-01" });
});
test("export includes caveats and escapes spreadsheet formulas", () => {
  const csv = reportCsv({ ...buildProfitReport("2026-10", [], [expense(10)]), generatedAt: "2026-10-30", documentsToReview: 0 });
  assert.ok(csv.includes("PROVISIONAL")); assert.ok(csv.includes("'=1+1"));
  assert.ok(csv.includes("IVA deducible"));
});
