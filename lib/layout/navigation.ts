import type { TranslationTree } from "@/lib/i18n/translations";

/**
 * Rutas del sidebar ERP (fuente única).
 *
 * ⚠️ Cada ruta aquí DEBE tener una página en `app/<ruta>/page.tsx`, un icono en
 * `NAV_ICONS` (components/layout/Sidebar.tsx) y una clave en `ERP_NAV_KEYS`.
 * El check `npm run check:features` verifica que no se pierdan entradas de menú.
 */
export const ERP_NAV_ROUTES = [
  "/dashboard",
  "/ceo",
  "/ai-gerente",
  "/datos",
  "/objetivo",
  "/profit",
  "/finanzas",
  "/documento",
  "/attendance",
  "/staff",
  "/schedule",
  "/marketing",
  "/mensajes",
  "/reviews",
  "/delivery",
  "/facturas",
  "/food-cost",
  "/recetas",
  "/cocina",
  "/dashboard/reservas",
  "/announcements",
  "/coach",
  "/dashboard/stock",
  "/configuracion",
] as const;

export type ErpNavRoute = (typeof ERP_NAV_ROUTES)[number];

export const ERP_NAV_KEYS: Record<ErpNavRoute, keyof TranslationTree["nav"]> = {
  "/dashboard": "dashboard",
  "/ceo": "ceo",
  "/ai-gerente": "aiGerente",
  "/datos": "datos",
  "/objetivo": "objetivo100k",
  "/profit": "beneficio",
  "/finanzas": "finanzas",
  "/documento": "documento",
  "/attendance": "attendance",
  "/staff": "staff",
  "/schedule": "schedule",
  "/marketing": "marketing",
  "/mensajes": "mensajes",
  "/reviews": "reviews",
  "/delivery": "delivery",
  "/facturas": "facturas",
  "/food-cost": "foodCost",
  "/recetas": "recetas",
  "/cocina": "cocina",
  "/dashboard/reservas": "reservas",
  "/announcements": "anuncios",
  "/coach": "coach",
  "/dashboard/stock": "stock",
  "/configuracion": "configuracion",
};
