import type { TranslationTree } from "@/lib/i18n/translations";

/**
 * ERP 侧边栏路由（唯一来源）
 */
export const ERP_NAV_ROUTES = [
  "/dashboard",
  "/staff",
  "/schedule",
  "/kiosk",
  "/marketing",
  "/delivery",
] as const;

export type ErpNavRoute = (typeof ERP_NAV_ROUTES)[number];

export const ERP_NAV_KEYS: Record<ErpNavRoute, keyof TranslationTree["nav"]> = {
  "/dashboard": "dashboard",
  "/staff": "staff",
  "/schedule": "schedule",
  "/kiosk": "kiosk",
  "/marketing": "marketing",
  "/delivery": "delivery",
};
