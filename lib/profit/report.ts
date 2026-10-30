import type { DbGasto, DbGastoCategoria } from "@/lib/supabase/types";

export const COST_CATEGORIES: Record<DbGastoCategoria, string> = {
  proveedores: "Compras de alimentos y bebidas",
  personal: "Salarios y personal",
  seguros_sociales: "Seguridad Social de empresa",
  alquiler: "Alquiler",
  suministros: "Electricidad, agua y gas",
  impuestos: "Impuestos y tasas",
  marketing: "Marketing",
  comisiones: "Comisiones TPV y plataformas",
  otros: "Seguros, gestoría, mantenimiento y otros",
};

export function monthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [year, m] = month.split("-").map(Number);
  if (year < 2000 || year > 2100) return null;
  return { start: `${month}-01`, end: m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, "0")}-01` };
}

export function madridMonth() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  return `${parts.find(p => p.type === "year")!.value}-${parts.find(p => p.type === "month")!.value}`;
}

const cents = (n: number) => Math.round(n * 100);
export function buildProfitReport(month: string, sales: { business_date: string; net_sales: number }[], expenses: DbGasto[]) {
  const revenueCents = sales.reduce((sum, row) => sum + cents(Number(row.net_sales)), 0);
  const categories = Object.entries(COST_CATEGORIES).map(([key, label]) => {
    const rows = expenses.filter(row => row.categoria === key);
    return { key: key as DbGastoCategoria, label, amount: rows.reduce((sum, row) => sum + cents(Number(row.importe)), 0) / 100, records: rows.length };
  });
  const amount = (key: DbGastoCategoria) => categories.find(c => c.key === key)!.amount;
  const costsCents = categories.reduce((sum, row) => sum + cents(row.amount), 0);
  const revenue = revenueCents / 100;
  const result = (revenueCents - costsCents) / 100;
  const missing = categories.filter(c => c.records === 0).map(c => c.label);
  return {
    month, revenue: sales.length ? revenue : null, costs: costsCents / 100,
    result: sales.length && expenses.length ? result : null,
    margin: sales.length && expenses.length && revenue !== 0 ? Math.round(result / revenue * 1000) / 10 : null,
    purchases: amount("proveedores"), labor: Math.round((amount("personal") + amount("seguros_sociales")) * 100) / 100,
    grossResult: sales.length ? (revenueCents - cents(amount("proveedores"))) / 100 : null,
    salesDays: new Set(sales.map(row => row.business_date)).size,
    latestSale: sales.map(row => row.business_date).sort().at(-1) ?? null,
    categories, expenses, missing,
    status: "provisional" as const,
    notes: [
      "Resultado provisional: ventas netas registradas menos gastos registrados. Las categorías sin registros están pendientes, no confirmadas a cero.",
      "Los importes históricos de gastos no identifican el IVA deducible. Revisa su base fiscal antes del cierre contable.",
      "Compras no equivale a consumo: faltan ajustes de inventario, amortizaciones, financiación e impuesto sobre beneficios para obtener un resultado neto contable.",
      "Las facturas y nóminas de Documentos no se suman automáticamente: revisa y registra cada coste una sola vez, incluyendo los ya anotados en Finanzas.",
    ],
  };
}

export type ProfitReport = ReturnType<typeof buildProfitReport> & { generatedAt: string; documentsToReview: number | null };

function csvCell(value: string | number) {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s) && typeof value !== "number") s = `'${s}`;
  return `"${s.replaceAll('"', '""')}"`;
}

export function reportCsv(report: ProfitReport) {
  const rows: (string | number)[][] = [
    ["Karuma · Beneficio", report.month, "PROVISIONAL"],
    ["Actualizado", report.generatedAt],
    ["Ventas netas", report.revenue ?? "Sin datos"],
    ...report.categories.map(c => [c.label, c.amount, c.records ? `${c.records} registros` : "Pendiente"]),
    ["Total costes registrados", report.costs], ["Resultado provisional", report.result ?? "Sin datos"],
    ["Margen %", report.margin ?? "No disponible"],
    ...report.notes.map(note => ["Nota", note]),
    [], ["Fecha", "Categoría", "Concepto", "Importe registrado", "Fuente", "Referencia"],
    ...report.expenses.map(e => [e.fecha, COST_CATEGORIES[e.categoria], e.concepto, Number(e.importe), e.fuente, e.id]),
  ];
  return "\uFEFF" + rows.map(row => row.map(csvCell).join(";")).join("\r\n");
}
