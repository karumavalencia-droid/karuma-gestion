# Karuma ERP — Project Status
> Updated: 2026-06-20. Branch: `main` (feat/reservas merged).

## Overview
Karuma ERP is an internal management system for **Karuma Sushi & Grill** (Valencia, Spain). Next.js 15 App Router, Vercel, Supabase (Postgres).

---

## Completed Features

### Core ERP
- `/dashboard` — Home with sales KPIs + live reservation stats (Supabase)
- `/staff` — Staff management (Supabase CRUD)
- `/schedule` — Weekly schedule viewer
- `/marketing` — Growth plan (static)
- `/delivery` — Delivery growth metrics
- `/kiosk` — Staff clock-in/out tablet kiosk (PIN-based)

### Reservations Module (Reservas 1.0 — on main, deployed)
- ✅ `/reservas` — Public booking wizard: Karuma branding, 5 steps, 7-day window, 30-min min notice, past slots hidden, elegant slot cards, correct menus (no Sushi Burger), phone +34 676 70 67 76, success page with address + assigned mesa
- ✅ `/dashboard/reservas` — Management list: reservations by date/service, status transitions, Walk-In modal, Nueva Reserva manual modal (with slot picker + auto table assignment)
- ✅ `/dashboard/mesa-view` — CoverManager-style floor plan: dark grid, stats row, touch-friendly cards, color by status, detail panel with actions
- ✅ `/dashboard/clientes` — Customer base with VIP/blacklist toggles
- ✅ `/dashboard/config` — Reservation settings panel
- ✅ `GET /api/reservas/disponibilidad` — Availability API with past/min-notice filtering
- ✅ `POST /api/reservas/crear` — Creates reservation, supports origen=manual, returns mesaIds
- ✅ Auto table assignment (smallest-fit-first, combinable fallback, online capacity %)
- ✅ Supabase migration `003_reservas.sql` — 5 tables seeded in production
- ✅ Dashboard StatCards for today's reservations (live from Supabase)

---

## Pending (Phase 2)
- ❌ RLS hardening — currently open dev policies (TODO before public launch)
- ❌ Staff auth guard on management pages
- ❌ Supabase Realtime (currently load-on-mount only, no live updates)
- ❌ Cancellation confirmation dialog (currently cancels on click)
- ❌ Reassign table action in management list
- ❌ Drag-and-drop table layout editor (`/dashboard/layout-editor`)
- ❌ Dashboard sales cards: still static mock data (needs RestaurantSuite or POS integration)

---

## Environment
```
Supabase project: aiwbdjeuvcvkuyoxgomr.supabase.co
.env.local: configured locally (not committed)
Vercel: auto-deploys from main
TypeScript: 0 errors
Build: clean
```
