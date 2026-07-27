/**
 * Identificador interno por defecto de la ubicación (Karuma Sushi).
 * Se mantiene "karuma-valencia" por compatibilidad con los datos previos
 * (blob JSON y normalize.ts). Configurable con SALES_DEFAULT_LOCATION_ID.
 */
export const FALLBACK_LOCATION_ID = "karuma-valencia";

export function getDefaultLocationId(): string {
  return process.env.SALES_DEFAULT_LOCATION_ID?.trim() || FALLBACK_LOCATION_ID;
}

/** Límite de tamaño para ficheros CSV subidos (2 MB). */
export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;

export const RESTOSUITE_REPORT_SOURCE = "restosuite-internal-report";
export const RESTOSUITE_KDS_REPORT_SOURCE = "restosuite-kds-report";
export const DEFAULT_RESTOSUITE_BASE_URL = "https://bo.eu.restosuite.ai";

export const RESTOSUITE_REQUIRED_ENV = [
  "RESTOSUITE_VULCAN_TOKEN",
  "RESTOSUITE_CORPORATION_ID",
  "RESTOSUITE_BRAND_ID",
  "RESTOSUITE_SHOP_ID",
  "RESTOSUITE_ORGANIZATION_ID",
  "RESTOSUITE_ORGANIZATION_TYPE",
] as const;

export type RestosuiteReportConfig = {
  baseUrl: string;
  token: string;
  corporationId: string;
  brandId: string;
  shopId: string;
  organizationId: string;
  organizationType: string;
  acceptTimezone: string;
  languageCode: string;
  currency: string;
};

function envValue(name: string): string {
  return process.env[name]?.trim() || "";
}

export function getMissingRestosuiteConfig(): string[] {
  return RESTOSUITE_REQUIRED_ENV.filter((name) => !envValue(name));
}

export function getRestosuiteReportConfig(): RestosuiteReportConfig {
  const missing = getMissingRestosuiteConfig();
  if (missing.length > 0) {
    throw new Error(`Falta configuración de RestoSuite: ${missing.join(", ")}`);
  }

  const baseUrl = envValue("RESTOSUITE_BASE_URL") || DEFAULT_RESTOSUITE_BASE_URL;
  const parsedBaseUrl = new URL(baseUrl);
  if (parsedBaseUrl.protocol !== "https:") {
    throw new Error("RESTOSUITE_BASE_URL debe usar HTTPS");
  }

  return {
    baseUrl: parsedBaseUrl.origin,
    token: envValue("RESTOSUITE_VULCAN_TOKEN"),
    corporationId: envValue("RESTOSUITE_CORPORATION_ID"),
    brandId: envValue("RESTOSUITE_BRAND_ID"),
    shopId: envValue("RESTOSUITE_SHOP_ID"),
    organizationId: envValue("RESTOSUITE_ORGANIZATION_ID"),
    organizationType: envValue("RESTOSUITE_ORGANIZATION_TYPE"),
    acceptTimezone: envValue("RESTOSUITE_ACCEPT_TIMEZONE") || "UTC+2",
    languageCode: envValue("RESTOSUITE_LANGUAGE_CODE") || "zh_CN",
    currency: envValue("RESTOSUITE_CURRENCY") || "EUR",
  };
}

export async function resolveRestosuiteReportConfig(
  locationId?: string | null,
): Promise<RestosuiteReportConfig & { source: "env" | "supabase" }> {
  const envMissing = getMissingRestosuiteConfig();
  if (envMissing.length === 0) {
    return { ...getRestosuiteReportConfig(), source: "env" };
  }

  const { readRestosuiteSession } = await import("@/lib/restosuite/session-store");
  const fallbackLocationId = locationId?.trim() || getDefaultLocationId();
  const session = await readRestosuiteSession(fallbackLocationId);
  if (!session) {
    throw new Error(`Falta configuración de RestoSuite: ${envMissing.join(", ")}`);
  }

  return {
    baseUrl: session.base_url || DEFAULT_RESTOSUITE_BASE_URL,
    token: session.vulcan_token,
    corporationId: session.corporation_id,
    brandId: session.brand_id,
    shopId: session.shop_id,
    organizationId: session.organization_id,
    organizationType: session.organization_type,
    acceptTimezone: session.accept_timezone || "UTC+2",
    languageCode: session.language_code || "zh_CN",
    currency: session.currency || "EUR",
    source: "supabase",
  };
}

/** Hay una sesión y los identificadores mínimos para consultar los informes internos. */
export function isPosApiConfigured(): boolean {
  return getMissingRestosuiteConfig().length === 0;
}
