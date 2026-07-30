/**
 * Cliente de lectura del backoffice de RestoSuite (bo.eu.restosuite.ai).
 *
 * IMPORTANTE — qué API es esta:
 * RestoSuite NO ofrece hoy exportación programada por email ni informes por
 * suscripción (comprobado sobre el paquete de idiomas del backoffice y sobre
 * /vulcan/resource/queryMenuResourceListV3: la única exportación es manual,
 * botón "Export" -> "Export History"). Lo que sí existe es el endpoint JSON que
 * consume su propio backoffice: POST /api/report/data/queryData.
 *
 * Este módulo habla con ese endpoint interno. Implicaciones asumidas:
 *   - RestoSuite no garantiza compatibilidad hacia atrás; si cambia el contrato
 *     fallará con 4xx o con `code != "000"`, nunca en silencio.
 *   - La sesión se autentica con un `vulcan-Token` (JWT) que caduca. Cuando
 *     caduca, `fetchDailySales` lanza RestosuiteAuthError para que el cron lo
 *     reporte de forma explícita en vez de escribir ceros.
 *
 * Vía oficial pendiente: RestoSuite tiene una plataforma de desarrolladores con
 * OpenAPI y autorización por tienda (Basic Services -> Developer Management).
 * Cuando haya credenciales OpenAPI, sustituir buildHeaders() y el endpoint; el
 * resto del flujo (mapeo a DailySalesRecord + upsert) no cambia.
 */
import { getDefaultLocationId } from "@/lib/sales-sync/config";
import type { DailySalesRecord } from "@/lib/sales-sync/types";

const DEFAULT_BASE_URL = "https://bo.eu.restosuite.ai";
const QUERY_DATA_PATH = "/api/report/data/queryData";

/** Informe "Sales Summary Report" del módulo Data Insights. */
const SALES_SUMMARY_REPORT_ID = "888001";

/** D_orderStatus = 20 -> pedidos cerrados. Es el filtro por defecto del backoffice. */
const ORDER_STATUS_CLOSED = "20";

/** Respuesta correcta de la API interna. Ojo: los errores también devuelven HTTP 200. */
const OK_CODE = "000";

const REQUEST_TIMEOUT_MS = 20_000;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Campos del informe que necesitamos, en el orden en que los pide el backoffice. */
const SELECT_FIELDS = [
  "D_businessDate",
  "M_Order_COUNT_Orders",
  "M_Order_SUM_guests",
  "M_Order_SUM_netSales",
  "M_Order_SUM_totalGrossSales",
  "M_Order_AVG_netSalesByGuest",
] as const;

export type RestosuiteConfig = {
  baseUrl: string;
  token: string;
  shopId: string;
  corporationId: string;
  brandId: string;
  organizationId: string;
  organizationType: string;
  currency: string;
  timezone: string;
  languageCode: string;
  /** location_id con el que se guarda en `sales_daily` (no es el shopId de RestoSuite). */
  locationId: string;
};

/** El token ha caducado o no tiene permisos: hay que renovarlo a mano. */
export class RestosuiteAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RestosuiteAuthError";
  }
}

/** Cualquier otro fallo hablando con RestoSuite. */
export class RestosuiteApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RestosuiteApiError";
  }
}

function readEnv(name: string): string {
  return process.env[name]?.trim() || "";
}

/**
 * Devuelve la configuración si están TODAS las variables obligatorias.
 * Si falta alguna devuelve null: el cron responde "no configurado" y no hace
 * ninguna petición externa.
 */
export function getRestosuiteConfig(): RestosuiteConfig | null {
  const token = readEnv("RESTOSUITE_TOKEN");
  const shopId = readEnv("RESTOSUITE_SHOP_ID");
  const corporationId = readEnv("RESTOSUITE_CORPORATION_ID");
  const brandId = readEnv("RESTOSUITE_BRAND_ID");
  const organizationId = readEnv("RESTOSUITE_ORG_ID");
  const organizationType = readEnv("RESTOSUITE_ORG_TYPE");

  if (!token || !shopId || !corporationId || !brandId || !organizationId || !organizationType) {
    return null;
  }

  return {
    baseUrl: readEnv("RESTOSUITE_BO_URL") || DEFAULT_BASE_URL,
    token,
    shopId,
    corporationId,
    brandId,
    organizationId,
    organizationType,
    currency: readEnv("RESTOSUITE_CURRENCY") || "EUR",
    timezone: readEnv("RESTOSUITE_TIMEZONE") || "Europe/Madrid",
    languageCode: readEnv("RESTOSUITE_LANGUAGE_CODE") || "en_US",
    locationId: getDefaultLocationId(),
  };
}

export function isRestosuiteConfigured(): boolean {
  return getRestosuiteConfig() !== null;
}

function buildHeaders(config: RestosuiteConfig): Headers {
  // El backoffice manda estas cabeceras en cada llamada a /api/report/*.
  // Sin Shop-Id + Corporation-Id la API responde 403; sin las de organización
  // responde 200 con code "UNI-00-0100" (error de sistema).
  return new Headers({
    "Content-Type": "application/json",
    Accept: "application/json",
    "vulcan-Token": config.token,
    "Shop-Id": config.shopId,
    "Corporation-Id": config.corporationId,
    "Brand-Id": config.brandId,
    "Organization-Id": config.organizationId,
    "Organization-Type": config.organizationType,
    "Language-Code": config.languageCode,
    "Accept-Timezone": config.timezone,
  });
}

function buildQueryBody(config: RestosuiteConfig, startDate: string, endDate: string) {
  return {
    metricsByDimQryV2: [],
    reportId: SALES_SUMMARY_REPORT_ID,
    selectFields: [...SELECT_FIELDS],
    aggFilters: [],
    proportionProperty: { enable: false },
    dimAdditionalStrategy: [],
    filters: [
      { fieldName: "D_businessDate", filterType: "RANGE", filterValue: [startDate, endDate] },
      { fieldName: "D_orderStatus", filterType: "IN", filterValue: [ORDER_STATUS_CLOSED] },
      { fieldName: "D_currency", filterType: "EQ", filterValue: [config.currency] },
      { fieldName: "D_shopId", filterType: "IN", filterValue: [config.shopId] },
    ],
    // Un día por fila: 400 cubre de sobra cualquier rango que pidamos.
    page: { pageNo: 1, pageSize: 400 },
    orderBy: [],
  };
}

type ReportCell = { value?: string | number | null };
type ReportRow = Record<string, ReportCell | undefined>;

function cellText(row: ReportRow, field: string): string {
  const value = row[field]?.value;
  return value == null ? "" : String(value);
}

function cellNumber(row: ReportRow, field: string): number {
  const parsed = Number(cellText(row, field));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Convierte una fila del informe en el registro que espera `sales_daily`.
 * El informe de resumen no desglosa bebida/delivery/efectivo/tarjeta: esos
 * campos van a 0 en vez de inventarse un reparto.
 */
export function reportRowToRecord(
  row: ReportRow,
  config: Pick<RestosuiteConfig, "locationId" | "shopId">,
  syncedAt: string,
): DailySalesRecord | null {
  const date = cellText(row, "D_businessDate");
  if (!DATE_PATTERN.test(date)) return null;

  const netSales = cellNumber(row, "M_Order_SUM_netSales");
  const grossSales = cellNumber(row, "M_Order_SUM_totalGrossSales") || netSales;
  const customers = cellNumber(row, "M_Order_SUM_guests");
  const orders = cellNumber(row, "M_Order_COUNT_Orders");
  const reportedTicket = cellNumber(row, "M_Order_AVG_netSalesByGuest");

  return {
    date,
    grossSales,
    netSales,
    customers,
    orders,
    // RestoSuite ya calcula el ticket medio por comensal; si viniera a 0 lo
    // derivamos para no perder el dato.
    averageTicket: reportedTicket || (customers > 0 ? netSales / customers : 0),
    drinkSales: 0,
    deliverySales: 0,
    cashSales: 0,
    cardSales: 0,
    source: "restosuite-api",
    locationId: config.locationId,
    externalId: `restosuite:${config.shopId}:${date}`,
    notes: "",
    syncedAt,
  };
}

/**
 * Lee las ventas diarias de RestoSuite entre dos fechas (ambas incluidas).
 * Los días sin ventas no vienen en la respuesta: no se inventan filas a 0.
 */
export async function fetchDailySales(
  startDate: string,
  endDate: string,
  configOverride?: RestosuiteConfig,
): Promise<DailySalesRecord[]> {
  if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) {
    throw new RestosuiteApiError("Fechas no válidas: se espera YYYY-MM-DD");
  }
  if (startDate > endDate) {
    throw new RestosuiteApiError("El rango de fechas está invertido");
  }

  const config = configOverride ?? getRestosuiteConfig();
  if (!config) {
    throw new RestosuiteApiError("RestoSuite no está configurado");
  }

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${QUERY_DATA_PATH}`, {
      method: "POST",
      headers: buildHeaders(config),
      body: JSON.stringify(buildQueryBody(config, startDate, endDate)),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new RestosuiteApiError(`No se pudo contactar con RestoSuite: ${detail}`);
  }

  if (response.status === 401 || response.status === 403) {
    throw new RestosuiteAuthError(
      `RestoSuite rechazó el token (HTTP ${response.status}). Renueva RESTOSUITE_TOKEN.`,
    );
  }
  if (!response.ok) {
    throw new RestosuiteApiError(`RestoSuite respondió HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    code?: string;
    msg?: string;
    data?: { rows?: ReportRow[] };
  };

  // La API devuelve HTTP 200 incluso cuando falla: el estado real está en `code`.
  if (payload.code !== OK_CODE) {
    const detail = payload.msg?.trim() || "sin detalle";
    if (payload.code === "403") {
      throw new RestosuiteAuthError(`RestoSuite rechazó el token: ${detail}`);
    }
    throw new RestosuiteApiError(`RestoSuite devolvió code=${payload.code}: ${detail}`);
  }

  const syncedAt = new Date().toISOString();
  return (payload.data?.rows ?? [])
    .map((row) => reportRowToRecord(row, config, syncedAt))
    .filter((record): record is DailySalesRecord => record !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}
