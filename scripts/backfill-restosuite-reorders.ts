import { loadEnvConfig } from "@next/env";

function validDate(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function datesBetween(startDate: string, endDate: string): string[] {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return [];

  const dates: string[] = [];
  for (let timestamp = start; timestamp <= end; timestamp += 86_400_000) {
    dates.push(new Date(timestamp).toISOString().slice(0, 10));
  }
  return dates;
}

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const { fetchRestosuiteDishReorders } = await import(
    "../lib/restosuite/reportApi"
  );
  const { replaceDishReorderDays } = await import(
    "../lib/dish-reorders/supabaseRepo"
  );
  const {
    getDefaultLocationId,
    getRestosuiteReportConfig,
  } = await import("../lib/sales-sync/config");

  const [, , startArg, endArg = startArg] = process.argv;
  if (!validDate(startArg) || !validDate(endArg)) {
    throw new Error(
      "Uso: npm run backfill:restosuite-reorders -- YYYY-MM-DD [YYYY-MM-DD]",
    );
  }

  const dates = datesBetween(startArg, endArg);
  if (dates.length === 0 || dates.length > 120) {
    throw new Error("El rango debe contener entre 1 y 120 días");
  }

  const locationId =
    process.env.RESTOSUITE_LOCATION_ID?.trim() || getDefaultLocationId();
  const config = getRestosuiteReportConfig();
  let totalRows = 0;

  for (const [index, date] of dates.entries()) {
    const records = await fetchRestosuiteDishReorders({
      startDate: date,
      endDate: date,
      locationId,
      config,
    });
    const result = await replaceDishReorderDays({
      records,
      locationId,
      businessDates: [date],
    });
    totalRows += records.length;
    console.log(
      `[${index + 1}/${dates.length}] ${date}: ${records.length} platos, ${result.deleted} obsoletos`,
    );
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  console.log(
    `Backfill completado: ${dates.length} días, ${totalRows} filas agregadas`,
  );
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Backfill failed");
  process.exitCode = 1;
});
