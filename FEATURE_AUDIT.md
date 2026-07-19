# Karuma ERP — Feature Audit / 功能审计报告

> Generado: 2026-07-15 · Rama: `feat/identity-system-v1`
> Objetivo: inventariar **todo** lo que existe (páginas, menú, APIs, tablas, migraciones)
> y detectar funciones que **existen pero perdieron su entrada en el menú**.

---

## 0. Resumen ejecutivo / 结论摘要

| Métrica | Valor |
|---|---|
| Páginas (`app/**/page.tsx`) | **67** |
| API Routes (`app/api/**/route.ts`) | **84** |
| Tablas de BD (migraciones) | **49** |
| Migraciones SQL | **35** (`001`–`032` + 3 sueltas) |
| Entradas en el menú (Sidebar) | **12** principales + 2 (proveedores) + 1 (fichaje) |
| **Páginas huérfanas (sin entrada de menú ni enlace)** | **30** |
| **Módulos que PERDIERON su entrada de menú** | **15** |

### Causa raíz de la regresión (confirmada por git)

- **2026-06-07 · `0802c73` "Facturas Center"** → el Sidebar tenía **18 módulos**.
- **2026-06-09 · `b356c68` "Restore Karuma ERP schedule kiosk and marketing"** →
  introdujo `lib/layout/navigation.ts` y **redujo el menú a 4 rutas**
  (`/dashboard`, `/staff`, `/schedule`, `/marketing`).
- Desde entonces el menú creció hasta 12, pero **15 módulos originales nunca
  fueron re-añadidos**, aunque **su código, componentes y traducciones siguen intactos**.

> **Nada fue sobre-escrito ni borrado.** Los paneles siguen en `components/*`
> (332–951 líneas cada uno) y las claves i18n (`nav.ceo`, `nav.datos`, …) siguen
> presentes. Solo se podó el array `ERP_NAV_ROUTES`. La restauración es de bajo riesgo.

---

## 1. Menú actual (fuente: `lib/layout/navigation.ts` + `components/layout/Sidebar.tsx`)

**Principal (12):** `/dashboard` · `/attendance` · `/staff` · `/schedule` · `/marketing`
· `/delivery` · `/facturas` · `/recetas` · `/dashboard/reservas` · `/announcements`
· `/coach` · `/dashboard/stock`

**Submenú Proveedores:** `/dashboard/cominport` · `/dashboard/jet-extramar`
**Pie:** `/kiosk` (Modo fichaje)
**Subnav Reservas (dentro de la página):** `/dashboard/mesa-view` · `/dashboard/clientes` · `/dashboard/config`
**Subnav Coach:** `/coach/reports` · `/coach/knowledge`

---

## 2. 🔴 Módulos con función completa pero SIN entrada de menú (Missing Features)

Estos 15 estaban en el menú de 18 entradas (`0802c73`) y lo perdieron en `b356c68`.
Todos tienen página + panel real. `restaurar` = re-añadir a `ERP_NAV_ROUTES`.

| Ruta | Panel (líneas) | i18n existe | ¿Solapa con módulo actual? |
|---|---|---|---|
| `/ceo` | `CeoPanel` (332) | ✅ `nav.ceo` | Parcial (CEO Morning Brief nuevo, sin ruta propia) |
| `/ai-gerente` | `AiGerentePanel` (365) | ✅ `nav.aiGerente` | No — único |
| `/datos` | `DatosPanel` (400) | ✅ `nav.datos` | No — único |
| `/objetivo` | `ObjetivoPanel` (754) | ✅ `nav.objetivo100k` | No — único |
| `/profit` | `ProfitPanel` (620) | ✅ `nav.beneficio` | No — único |
| `/finanzas` | página (92) | ✅ `nav.finanzas` | No — único |
| `/reviews` | `ReviewsPanel` (845) | ✅ `nav.reviews` | No — único (Google Reviews) |
| `/food-cost` | `FoodCostErpPanel` (92) | ✅ `nav.foodCost` | No — único |
| `/cocina` | página (158) | ✅ `nav.cocina` | No — único |
| `/configuracion` | página (138) | ✅ `nav.configuracion` | Parcial (`/settings` erp-v1) |
| `/personal` | `PersonalPanel` (762) | ✅ `nav.personal` | **Sí** → `/staff` (actual) |
| `/inventario` | `InventarioPanel` (951) | ✅ `nav.inventario` | **Sí** → `/dashboard/stock` (actual) |
| `/compras` | `ComprasPanel` (856) | ✅ `nav.compras` | **Sí** → submenú Proveedores |
| `/pedidos` | página (90) | ✅ `nav.pedidos` | **Sí** → submenú Proveedores |
| `/delivery-center` | `DeliveryCenterPanel` (700) | ✅ `nav.deliveryCenter` | **Sí** → `/delivery` (actual) |

**Recomendación:** restaurar los 10 sin solape directo; decidir caso por caso los 5
que solapan (para no duplicar entradas con los módulos nuevos que los sustituyeron).

---

## 3. 🟡 ERP-v1 (inglés) — set paralelo, nunca estuvo en el menú

Segunda generación en `components/erp-v1/*`. Páginas finas (61–369 líneas).
No es una regresión — nunca tuvo entrada. Probable experimento/duplicado del set español.

`/inventory` · `/recipes` · `/purchases` · `/invoices` · `/sales` · `/ingredients` · `/settings`

---

## 4. 🟡 Otras páginas huérfanas (misc / admin / rol)

| Ruta | Líneas | Nota |
|---|---|---|
| `/shift-log` | 418 | Registro de traspaso de turno — función real, sin entrada |
| `/leave` | 103 | Gestión de ausencias |
| `/roles` | 46 | Roles (parte del Identity System) |
| `/turnos` | 71 | Turnos |
| `/empleados` | 74 | Empleados (¿duplicado de `/staff`?) |
| `/produccion` | 71 | Producción |
| `/productos` | 57 | Productos |
| `/admin/settings` | — | Panel admin, solo por enlace |

---

## 5. Tablas de base de datos (49)

`announcement_reads` · `announcements` · `api_call_logs` · `api_keys` · `app_config`
· `app_users` · `attendance_credentials` · `attendance_events` · `auth_accounts`
· `auth_login_logs` · `auth_otp_sessions` · `auth_sessions` · `ceo_morning_briefs`
· `cierres_servicio` · `clientes_reservas` · `coach_conversations` · `coach_incident_reports`
· `coach_knowledge_entries` · `coach_messages` · `facturas` · `horario_semanal`
· `integration_logs` · `lista_espera` · `mesas` · `notification_log`
· `notification_preferences` · `purchase_order_approvals` · `purchase_orders`
· `reservas` · `reservas_config` · `role_permissions` · `roles` · `sales_daily`
· `sales_import_log` · `staff` · `supplier_auto_orders` · `supplier_invoice_items`
· `supplier_product_alerts` · `supplier_product_audit` · `supplier_product_prices`
· `supplier_products` · `supplier_recommendations` · `supplier_spending_summary`
· `suppliers` · `turnos` · `user_activity_log` · `user_notifications`
· `user_supplier_assignments` · `users` · `webhooks`

> ⚠️ Migraciones que la memoria del proyecto marca como **pendientes de aplicar
> manualmente** en Supabase (dashboard SQL editor): `028_ceo_morning_briefs.sql`,
> `032_facturas.sql`. Verificar antes de asumir que `/ceo` y `/facturas` tienen datos.

---

## 6. Prevención — Feature Regression Check

Ver `scripts/feature-regression-check.mjs` + `npm run check:features`
+ GitHub Action `.github/workflows/feature-check.yml`.

La comprobación falla si:
1. Existe una página `app/**/page.tsx` que **no** está ni en el menú ni en la
   lista blanca explícita `intentionallyUnlinked` → obliga a decidir en cada PR.
2. Una ruta del menú (`ERP_NAV_ROUTES`) apunta a una página que **no existe**.

Así, un commit que añada una función nueva y de paso deje una vieja fuera del menú
**no puede pasar CI sin una decisión consciente**.
