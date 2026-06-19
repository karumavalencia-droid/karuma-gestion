# Karuma ERP — Project Status
> Handover document for Codex. Current date: 2026-06-20. Active branch: `feat/reservas`.

## Overview
Karuma ERP is an internal management system for **Karuma Sushi & Grill** (Valencia, Spain). It is a Next.js 15 App Router application deployed on Vercel, backed by Supabase (Postgres + Realtime).

A full **Reservations Module** has just been built and is locally verified working. It has NOT been merged to `main` yet and has NOT been deployed to Vercel.

---

## Completed Features

### Core ERP (pre-existing, on `main`)
- `/dashboard` — Home with sales KPI cards (static mock data)
- `/staff` — Staff management with Supabase CRUD
- `/schedule` — Weekly schedule viewer
- `/marketing` — Growth plan (static content)
- `/delivery` — Delivery growth metrics
- `/kiosk` — Staff clock-in/clock-out tablet kiosk (PIN-based)
- `/login` — Email + bcrypt login
- `/ceo` — CEO dashboard
- `/objetivo` — Monthly 100K revenue goal tracker
- `/food-cost`, `/recipes`, `/ingredients` — Food cost center
- `/invoices`, `/purchases`, `/inventory` — Back-office ops
- `/reviews` — Google Reviews AI reply assistant
- `/delivery-center` — Delivery analytics
- `/facturas`, `/personal`, `/finanzas`, `/profit` — Finance modules

### Reservations Module (built on `feat/reservas`, verified locally)
- ✅ `/reservas` — Public white-background booking wizard (5 steps: guests → date → service → time → personal data → confirmation). No sidebar.
- ✅ `/dashboard/reservas` — Internal reservation management list (dark theme, ERP sidebar)
- ✅ `/dashboard/mesa-view` — Table floor plan for iPad (dark theme)
- ✅ `/dashboard/clientes` — Customer base with VIP/blacklist toggles (dark theme)
- ✅ `/dashboard/config` — Reservation settings panel (dark theme)
- ✅ `ReservasNav` tab bar linking all 4 management pages
- ✅ Sidebar item "Reservas" pointing to `/dashboard/reservas` (active on all 4 sub-pages)
- ✅ Dashboard home: 6 live StatCards for reservations (fetches from Supabase)
- ✅ `GET /api/reservas/disponibilidad` — Computes available time slots
- ✅ `POST /api/reservas/crear` — Creates reservation + upserts customer by phone
- ✅ Availability engine: respects 70% online capacity, duration by party size, interval, overlap detection
- ✅ Auto table assignment: smallest fitting table, combinable tables by zone as fallback
- ✅ Walk-in modal in management list
- ✅ Status transitions: Confirmada → Sentado → Finalizada / NoShow / Cancelada / WalkIn
- ✅ Supabase migration `003_reservas.sql` executed successfully in production
- ✅ `.env.local` configured with real Supabase credentials

## Pending / Not Started
- ❌ Merge `feat/reservas` → `main` (needs git push + PR)
- ❌ Vercel environment variables not yet set (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- ❌ Vercel redeploy after env vars
- ❌ `/dashboard/layout-editor` — Visual drag-and-drop table layout editor (Phase 2)
- ❌ Google Review request button on completed reservations
- ❌ Supabase Realtime subscriptions (currently polling on page load only)
- ❌ RLS hardening (currently open dev policies — must tighten before production)
- ❌ Staff authentication for management pages
- ❌ Cancellation confirmation dialog (currently cancels immediately on click)
- ❌ Reassign table action in management list
- ❌ Email/SMS confirmation to customer
- ❌ Dashboard stat cards for sales (still static mock data)

---

## Current Branch State
```
Branch: feat/reservas
TypeScript: 0 errors (npx tsc --noEmit passes clean)
Build: passes (npm run build)
Dev server: running on localhost:3000
/reservas: verified working in browser (200 OK)
```
