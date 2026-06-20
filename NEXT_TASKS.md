# Karuma ERP — Next Tasks (Phase 2)
> Last updated: 2026-06-20. Reservas 1.0 is complete and deployed.

---

## CRITICAL (before public launch)

### 1. RLS hardening
**File:** `supabase/migrations/004_rls_production.sql` (create new migration)

Replace open dev policies with restrictive ones:
```sql
-- Public anon key (used by /reservas page)
DROP POLICY "dev_open_reservas" ON reservas;
CREATE POLICY "anon_insert_reservas" ON reservas FOR INSERT WITH CHECK (true);
-- No SELECT for anon on reservas (API routes use service role key)

DROP POLICY "dev_open_clientes_reservas" ON clientes_reservas;
CREATE POLICY "anon_insert_clientes" ON clientes_reservas FOR INSERT WITH CHECK (true);

-- mesas and reservas_config: allow anon SELECT (needed for availability check via API)
-- reservas: block anon SELECT (API uses service role)
```

### 2. Auth guard on management pages
`/dashboard/reservas`, `/dashboard/mesa-view`, `/dashboard/clientes`, `/dashboard/config` are currently open to anyone with the URL.

Add middleware or layout check to redirect to `/login` if no valid session.

---

## HIGH (UX improvements)

### 3. Wire `cierres_servicio` into availability engine
**File:** `lib/reservas/disponibilidad.ts` → `calcularSlotsDisponibles()`

Fetch `cierres_servicio` for the requested date. If a record exists for the servicio (or 'todo'), return `[]` slots immediately.

**File:** `app/api/reservas/disponibilidad/route.ts` — add fetch of `cierres_servicio`.

### 4. Supabase Realtime on mesa-view
**File:** `app/dashboard/mesa-view/page.tsx`

Add `supabase.channel().on('postgres_changes', ...)` subscription so the floor plan updates live when staff seats / changes status on a different device.

### 5. Cancellation confirmation dialog
**File:** `app/dashboard/reservas/page.tsx`

Before calling `cambiarEstado(id, "Cancelada")`, show a `<dialog>` or inline confirm prompt. Prevents accidental cancellations.

### 6. Reassign table in management list
**File:** `app/dashboard/reservas/page.tsx`

Add a "Reasignar mesa" action that opens a modal showing all libre tables for that time slot and lets staff manually pick one, then updates `reservas.mesa_ids`.

---

## MEDIUM (features)

### 7. Service close toggle in config page
**File:** `app/dashboard/config/page.tsx`

Add a section to create/delete `cierres_servicio` records for specific dates. E.g. "Cerrar comida el 24 de junio".

### 8. Dashboard sales cards — real data
**File:** `app/dashboard/page.tsx`

Replace mock `€3,240` etc. with real data from Supabase `sales_sync` table (already exists from sales module).

### 9. Post-visit review request
After a reservation is set to `Finalizada`, show a WhatsApp button pre-filled with a Google Review link (from `reservas_config.google_review_link`).

**File:** `app/dashboard/reservas/page.tsx` — add to Finalizada row actions.

### 10. Customer visit history
**File:** `app/dashboard/clientes/page.tsx`

Click a customer → show their reservation history (query `reservas` by `cliente_id`).

---

## LOW (Phase 3)

### 11. Drag-and-drop table layout editor
Route: `/dashboard/layout-editor`

Visual editor to set `pos_x`, `pos_y`, `ancho`, `alto`, `forma` per table. Updates `mesas` in Supabase. Renders layout instead of grid in mesa-view.

### 12. Waiting list
When no table is available, offer to join a waiting list. New table `lista_espera` with phone + party size + slot. Staff can promote from list.

### 13. Email confirmation
On reservation create, send a transactional email via Resend (`resend.com`) with booking details. Add `RESEND_API_KEY` to env.

---

## Technical debt

| Item | File | Notes |
|------|------|-------|
| `dias_max_antelacion` config ignored | `app/reservas/page.tsx` | Hardcoded to 7. Should read from `reservas_config`. |
| `telefono`/`whatsapp` in config ignored | `app/reservas/page.tsx` | Hardcoded constants. Should fetch from `reservas_config`. |
| Walk-in mesa assignment | `app/dashboard/reservas/page.tsx` | Walk-in creates reservation with `mesa_ids: []`. Should call `asignarMesa()`. |
| `no_shows` counter | `app/dashboard/reservas/page.tsx` | Marking NoShow doesn't increment `clientes_reservas.no_shows`. |
| `ultima_visita` not updated | `app/api/reservas/crear/route.ts` | Should set `ultima_visita = fecha` when creating reservation. |
