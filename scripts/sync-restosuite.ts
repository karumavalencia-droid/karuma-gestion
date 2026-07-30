/**
 * Carga de ventas de RestoSuite a `sales_daily` desde la máquina local.
 *
 * Sirve para la carga inicial del histórico sin depender de que el cron esté
 * desplegado: lee las mismas variables que el cron desde .env.local y escribe
 * con la service-role key de Supabase.
 *
 *   npm run sync:restosuite -- --days=92
 *   npm run sync:restosuite -- --start=2026-01-01 --end=2026-03-31
 *   npm run sync:restosuite -- --days=7 --dry-run
 *
 * Es idempotente: repetir el mismo rango actualiza las filas, no las duplica.
 */
import { loadEnvConfig } from "@next/env";
// Ambos módulos leen process.env dentro de sus funciones, no al importarse,
// así que basta con cargar el entorno antes de llamarlas.
import { fetchDailySales, getRestosuiteConfig } from "../lib/pos/restosuite-client";
import { upsertDailySales } from "../lib/sales-sync/supabaseRepo";

loadEnvConfig(process.cwd());

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 92;

function arg(name: string): string | undefined {
  const match = process.argv.find((value) => value.startsWith(`--${name}=`));
  return match?.split("=")[1];
}

function dateInMadrid(daysFromToday: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function shiftDate(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function resolveRange(): { startDate: string; endDate: string } {
  const start = arg("start");
  const end = arg("end");
  if (start || end) {
    if (!start || !end || !DATE_PATTERN.test(start) || !DATE_PATTERN.test(end)) {
      throw new Error("Se requieren --start=YYYY-MM-DD y --end=YYYY-MM-DD");
    }
    if (start > end) throw new Error("El rango de fechas está invertido");
    return { startDate: start, endDate: end };
  }

  const days = Number(arg("days") ?? "1");
  if (!Number.isInteger(days) || days < 1 || days > MAX_RANGE_DAYS) {
    throw new Error(`--days debe ser un entero entre 1 y ${MAX_RANGE_DAYS}`);
  }
  const yesterday = dateInMadrid(-1);
  return { startDate: shiftDate(yesterday, -(days - 1)), endDate: yesterday };
}

const euro = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

async function main() {
  const config = getRestosuiteConfig();
  if (!config) {
    throw new Error(
      "Faltan variables de RestoSuite en .env.local: RESTOSUITE_TOKEN, RESTOSUITE_SHOP_ID, " +
        "RESTOSUITE_CORPORATION_ID, RESTOSUITE_BRAND_ID, RESTOSUITE_ORG_ID, RESTOSUITE_ORG_TYPE",
    );
  }

  const { startDate, endDate } = resolveRange();
  const dryRun = process.argv.includes("--dry-run");

  console.log(`RestoSuite -> sales_daily  ${startDate} .. ${endDate}${dryRun ? "  (dry-run)" : ""}`);

  const records = await fetchDailySales(startDate, endDate, config);
  if (records.length === 0) {
    console.log("RestoSuite no devolvió ventas para ese rango.");
    return;
  }

  for (const record of records) {
    console.log(
      `  ${record.date}  ${euro(record.netSales).padStart(11)}  ` +
        `${String(record.customers).padStart(4)} comensales  ` +
        `${String(record.orders).padStart(4)} tickets`,
    );
  }
  const total = records.reduce((sum, record) => sum + record.netSales, 0);
  console.log(`  ${records.length} días · total neto ${euro(total)}`);

  if (dryRun) {
    console.log("dry-run: no se ha escrito nada.");
    return;
  }

  const result = await upsertDailySales(records);
  console.log(`Guardado en sales_daily: ${result.inserted} nuevos, ${result.updated} actualizados.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
