import type { RegistroRestosuite } from "@/lib/types";
import type { DailySalesRecord } from "./types";

type UnknownRecord = Record<string, unknown>;

/**
 * Mapea un RegistroRestosuite (forma del parser CSV y del localStorage antiguo)
 * a DailySalesRecord (forma unificada de sales_daily). El CSV solo trae el
 * resumen diario; los campos no presentes (gross/cash/card/delivery) quedan a 0.
 */
export function registroToDailySales(
  registro: RegistroRestosuite,
  options: { locationId: string; source: string; syncedAt: string },
): DailySalesRecord {
  const netSales = Math.round(registro.ventas * 100) / 100;
  return {
    date: registro.fecha,
    grossSales: netSales,
    netSales,
    customers: Math.max(0, Math.round(registro.clientes || 0)),
    orders: Math.max(0, Math.round(registro.facturas || 0)),
    averageTicket: Math.round((registro.ticketMedio || 0) * 100) / 100,
    drinkSales: Math.round((registro.ventasBebida || 0) * 100) / 100,
    deliverySales: 0,
    cashSales: 0,
    cardSales: 0,
    source: options.source,
    locationId: options.locationId,
    externalId: null,
    notes: registro.observaciones || "",
    syncedAt: options.syncedAt,
  };
}

const DATE_KEYS = ["date", "fecha", "businessDate", "business_date", "day", "dia"];
const NET_SALES_KEYS = [
  "netSales",
  "net_sales",
  "ventas",
  "sales",
  "revenue",
  "totalSales",
  "total_sales",
  "total",
  "importe",
];
const GROSS_SALES_KEYS = ["grossSales", "gross_sales", "ventasBrutas", "ventas_brutas"];
const CUSTOMER_KEYS = ["customers", "clientes", "guests", "covers", "comensales", "pax"];
const ORDER_KEYS = ["orders", "facturas", "tickets", "checks", "billCount", "bill_count"];
const TICKET_KEYS = [
  "averageTicket",
  "average_ticket",
  "ticketMedio",
  "ticket_medio",
  "averageSpend",
  "average_spend",
];
const DRINK_KEYS = ["drinkSales", "drink_sales", "ventasBebida", "ventas_bebida", "beverages"];
const DELIVERY_KEYS = ["deliverySales", "delivery_sales", "ventasDelivery", "ventas_delivery"];
const CASH_KEYS = ["cashSales", "cash_sales", "efectivo"];
const CARD_KEYS = ["cardSales", "card_sales", "tarjeta"];
const EXTERNAL_ID_KEYS = ["id", "externalId", "external_id", "reportId", "report_id"];

function asObject(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function pick(record: UnknownRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;

  let normalized = value.replace(/[€$£\s]/g, "").trim();
  if (!normalized) return 0;

  if (normalized.includes(",") && normalized.includes(".")) {
    normalized =
      normalized.lastIndexOf(",") > normalized.lastIndexOf(".")
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized.replace(/,/g, "");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseDate(value: unknown, fallbackDate: string): string | null {
  if (typeof value !== "string" || !value.trim()) return fallbackDate || null;
  const raw = value.trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);

  const dmy = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function candidateRows(payload: unknown): UnknownRecord[] {
  if (Array.isArray(payload)) {
    return payload.map(asObject).filter((row): row is UnknownRecord => row !== null);
  }

  const object = asObject(payload);
  if (!object) return [];

  for (const key of ["data", "records", "results", "sales", "days", "items"]) {
    if (Array.isArray(object[key])) {
      return (object[key] as unknown[])
        .map(asObject)
        .filter((row): row is UnknownRecord => row !== null);
    }
  }

  return [object];
}

export function normalizeSalesPayload(
  payload: unknown,
  options: {
    fallbackDate: string;
    source?: string;
    locationId?: string;
  },
): DailySalesRecord[] {
  const source = options.source || "pos";
  const locationId = options.locationId || "karuma-valencia";
  const syncedAt = new Date().toISOString();

  return candidateRows(payload)
    .map((row): DailySalesRecord | null => {
      const date = parseDate(pick(row, DATE_KEYS), options.fallbackDate);
      const netSales = roundMoney(parseNumber(pick(row, NET_SALES_KEYS)));
      if (!date || netSales <= 0) return null;

      const grossSales = roundMoney(parseNumber(pick(row, GROSS_SALES_KEYS)) || netSales);
      const customers = Math.max(0, Math.round(parseNumber(pick(row, CUSTOMER_KEYS))));
      const orders = Math.max(0, Math.round(parseNumber(pick(row, ORDER_KEYS))));
      const suppliedAverage = roundMoney(parseNumber(pick(row, TICKET_KEYS)));
      const averageTicket =
        suppliedAverage > 0
          ? suppliedAverage
          : roundMoney(customers > 0 ? netSales / customers : orders > 0 ? netSales / orders : 0);
      const externalIdValue = pick(row, EXTERNAL_ID_KEYS);

      return {
        date,
        grossSales,
        netSales,
        customers,
        orders,
        averageTicket,
        drinkSales: roundMoney(parseNumber(pick(row, DRINK_KEYS))),
        deliverySales: roundMoney(parseNumber(pick(row, DELIVERY_KEYS))),
        cashSales: roundMoney(parseNumber(pick(row, CASH_KEYS))),
        cardSales: roundMoney(parseNumber(pick(row, CARD_KEYS))),
        source,
        locationId,
        externalId:
          typeof externalIdValue === "string" || typeof externalIdValue === "number"
            ? String(externalIdValue)
            : null,
        notes: typeof row.notes === "string" ? row.notes : "",
        syncedAt,
      };
    })
    .filter((record): record is DailySalesRecord => record !== null);
}
