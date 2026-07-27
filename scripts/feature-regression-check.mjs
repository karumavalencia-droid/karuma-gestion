#!/usr/bin/env node
/**
 * Feature Regression Check / 功能回归检查
 * ---------------------------------------------------------------------------
 * Impide que una función existente pierda su acceso en la UI de forma silenciosa
 * (como pasó en el commit b356c68, que podó el menú de 18 a 4 entradas).
 *
 * Falla (exit 1) si:
 *   1. Existe una página `app/**​/page.tsx` que NO está en el menú
 *      (`ERP_NAV_ROUTES`) NI en la lista blanca `INTENTIONALLY_UNLINKED`.
 *      → obliga a decidir conscientemente en cada PR qué hacer con cada página.
 *   2. Una ruta del menú apunta a una página que NO existe.
 *
 * Uso:  node scripts/feature-regression-check.mjs   (o `npm run check:features`)
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP_DIR = join(ROOT, "app");

// --- helpers ---------------------------------------------------------------
const norm = (r) => r.replace(/\/\[[^\]]+\]/g, "/:id"); // [id] -> :id

/** Todas las rutas con page.tsx bajo app/ (ignora route groups "(x)"). */
function collectPageRoutes(dir, base = "") {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const seg = entry.name.startsWith("(") && entry.name.endsWith(")") ? "" : `/${entry.name}`;
      out.push(...collectPageRoutes(full, base + seg));
    } else if (entry.name === "page.tsx") {
      out.push({ route: norm(base || "/"), file: relative(ROOT, full) });
    }
  }
  return out;
}

/** Extrae ERP_NAV_ROUTES del fichero fuente único, sin duplicar la lista. */
function readNavRoutes() {
  const src = readFileSync(join(ROOT, "lib/layout/navigation.ts"), "utf8");
  const m = src.match(/ERP_NAV_ROUTES\s*=\s*\[([\s\S]*?)\]\s*as const/);
  if (!m) throw new Error("No se pudo leer ERP_NAV_ROUTES de lib/layout/navigation.ts");
  return [...m[1].matchAll(/["'`]([^"'`]+)["'`]/g)].map((x) => x[1]);
}

/**
 * Rutas que NO están en el menú principal a propósito.
 * Cada entrada necesita un motivo. Añadir aquí una página nueva es una
 * decisión consciente (revisable en el PR), no un olvido.
 */
const INTENTIONALLY_UNLINKED = {
  // Sistema / público / portal empleado (acceso por login, rol o URL directa)
  "/": "landing / redirect",
  "/login": "página pública de acceso",
  "/kiosk": "acceso desde el pie del sidebar (Modo fichaje)",
  "/my-attendance": "portal empleado (redirección por rol)",
  "/my-schedule": "portal empleado (redirección por rol)",
  "/reservas": "reserva pública (cliente, sin sidebar)",
  "/reservas/gestionar/:id":
    "autogestión del cliente (enlace del email de confirmación, sin sidebar)",

  // Submenús / subnavegación dentro de una página del menú
  "/dashboard/cominport": "submenú Proveedores",
  "/dashboard/jet-extramar": "submenú Proveedores",
  "/dashboard/kankyo": "submenú Proveedores",
  "/dashboard/mesa-view": "subnav Reservas",
  "/dashboard/clientes": "subnav Reservas",
  "/dashboard/config": "subnav Reservas",
  "/dashboard/stock/upload-invoices": "subflujo de Stock",
  "/coach/reports": "subnav Coach",
  "/coach/knowledge": "subnav Coach",
  "/facturas/import": "subflujo de Facturas",
  "/facturas/import-wechat": "subflujo de Facturas",
  "/facturas/init": "setup de Facturas",

  // Detalle / rutas dinámicas
  "/mensajes/:id": "conversación (enlace desde /mensajes)",
  "/mensajes/insights": "analítica del inbox (enlace desde /mensajes)",
  "/staff/:id": "detalle de empleado (enlace desde /staff)",
  "/ceo/change-requests/:id": "detalle de solicitud (enlace desde /ceo)",

  // Panel admin (acceso por enlace/rol admin)
  "/admin/dashboard": "panel admin",
  "/admin/settings": "panel admin",
  "/admin/suppliers": "panel admin proveedores",
  "/admin/suppliers/:id": "detalle proveedor (admin)",
  "/admin/suppliers/analytics": "panel admin proveedores",
  "/admin/suppliers/bi": "panel admin proveedores",
  "/admin/suppliers/bi-custom": "panel admin proveedores",
  "/admin/suppliers/notifications": "panel admin proveedores",

  // ERP-v1 (set inglés paralelo) — nunca estuvo en el menú, se mantiene aislado
  "/inventory": "erp-v1 (set paralelo, no enlazado a propósito)",
  "/recipes": "erp-v1 (set paralelo, no enlazado a propósito)",
  "/purchases": "erp-v1 (set paralelo, no enlazado a propósito)",
  "/invoices": "erp-v1 (set paralelo, no enlazado a propósito)",
  "/sales": "erp-v1 (set paralelo, no enlazado a propósito)",
  "/ingredients": "erp-v1 (set paralelo, no enlazado a propósito)",
  "/settings": "erp-v1 (set paralelo, no enlazado a propósito)",

  // Módulos que solapan con uno más nuevo del menú (decisión 2026-07-15:
  // NO restaurar para no duplicar entradas). Ver FEATURE_AUDIT.md §2.
  "/personal": "solapa con /staff (no restaurado)",
  "/inventario": "solapa con /dashboard/stock (no restaurado)",
  "/compras": "solapa con submenú Proveedores (no restaurado)",
  "/pedidos": "solapa con submenú Proveedores (no restaurado)",
  "/delivery-center": "solapa con /delivery (no restaurado)",

  // Otras páginas huérfanas históricas (pendientes de decisión de producto)
  "/empleados": "huérfana histórica (pendiente decisión)",
  "/leave": "huérfana histórica (pendiente decisión)",
  "/roles": "parte del Identity System (pendiente entrada admin)",
  "/turnos": "huérfana histórica (pendiente decisión)",
  "/produccion": "huérfana histórica (pendiente decisión)",
  "/productos": "huérfana histórica (pendiente decisión)",
  "/shift-log": "huérfana histórica (pendiente decisión)",
};

// --- check -----------------------------------------------------------------
const pages = collectPageRoutes(APP_DIR);
const navRoutes = readNavRoutes();
const pageRouteSet = new Set(pages.map((p) => p.route));
const allowed = new Set(Object.keys(INTENTIONALLY_UNLINKED));

const errors = [];

// 1) Páginas sin acceso (ni menú ni lista blanca)
for (const { route, file } of pages) {
  if (navRoutes.includes(route)) continue;
  if (allowed.has(route)) continue;
  errors.push(
    `Página SIN acceso en el menú: ${route}  (${file})\n` +
    `      → añádela a ERP_NAV_ROUTES (lib/layout/navigation.ts) o documenta\n` +
    `        por qué no va en el menú en INTENTIONALLY_UNLINKED (este script).`,
  );
}

// 2) Rutas de menú que apuntan a una página inexistente
for (const route of navRoutes) {
  if (!pageRouteSet.has(route)) {
    errors.push(
      `Ruta de menú SIN página: ${route}\n` +
      `      → falta app${route}/page.tsx (¿se borró/renombró una página?).`,
    );
  }
}

// --- report ----------------------------------------------------------------
console.log(`Feature Regression Check`);
console.log(`  páginas: ${pages.length} · en menú: ${navRoutes.length} · lista blanca: ${allowed.size}`);

if (errors.length) {
  console.error(`\n❌ ${errors.length} problema(s):\n`);
  for (const e of errors) console.error(`  • ${e}\n`);
  console.error(`Consulta FEATURE_AUDIT.md para el contexto de la regresión.`);
  process.exit(1);
}

console.log(`\n✅ OK — ninguna función perdió su acceso en el menú.`);
