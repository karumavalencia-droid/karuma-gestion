import type { TranslationTree } from "@/lib/i18n/translations";

/**
 * Rutas del sidebar ERP (fuente única).
 */
export const ERP_NAV_ROUTES = ["/dashboard", "/attendance", "/staff", "/schedule", "/marketing", "/delivery", "/facturas", "/recetas", "/dashboard/reservas", "/announcements", "/coach", "/dashboard/stock"] as const;

export type ErpNavRoute = (typeof ERP_NAV_ROUTES)[number];

export const ERP_NAV_KEYS: Record<ErpNavRoute, keyof TranslationTree["nav"]> = {
  "/dashboard": "dashboard",
  "/attendance": "attendance",
  "/staff": "staff",
  "/schedule": "schedule",
  "/recetas": "recetas",
  "/marketing": "marketing",
  "/delivery": "delivery",
  "/facturas": "facturas",
  "/dashboard/reservas": "reservas",
  "/announcements": "anuncios",
  "/coach": "coach",
  "/dashboard/stock": "stock",
};
