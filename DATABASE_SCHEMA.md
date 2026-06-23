# Karuma ERP — Database Schema
> Supabase project: `aiwbdjeuvcvkuyoxgomr.supabase.co`
> Migration: `supabase/migrations/003_reservas.sql`

---

## Tables — Reservations Module

### `mesas` (21 rows seeded)
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | Auto-increment |
| numero | INTEGER UNIQUE | Table number shown to staff (1–21) |
| capacidad | INTEGER | 2 or 4 (see layout below) |
| zona | TEXT | 'Interior', 'Terraza', 'Privado' |
| combinable | BOOLEAN | Can be joined with adjacent tables |
| activa | BOOLEAN | false = hidden from all logic |
| pos_x, pos_y | INTEGER | Future drag-and-drop layout editor |
| ancho, alto | INTEGER | Future layout editor dimensions |
| forma | TEXT | 'rect' — future: 'round' |

**Table layout (capacity):**
- 2-person: 1, 2, 3, 4
- 4-person: 5–16
- 6-person: 17, 18, 19
- 8-person: 20, 21

**Assignment rules (enforced in `lib/reservas/disponibilidad.ts`):**
- 1–2 guests → smallest available table (2-person first)
- 3–4 guests → smallest table ≥ 3 capacity (effectively 4-person)
- 5+ guests → online booking blocked; combinable tables used for manual/walk-in

---

### `clientes_reservas`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| nombre | TEXT NOT NULL | |
| telefono | TEXT UNIQUE NOT NULL | Used as upsert key |
| email | TEXT | Optional |
| visitas | INTEGER | Auto-incremented on each reservation |
| no_shows | INTEGER | Incremented when staff marks NoShow |
| vip | BOOLEAN | Set manually in `/dashboard/clientes` |
| bloqueado | BOOLEAN | Blocked customers can't book online |
| notas | TEXT | Internal staff notes |
| ultima_visita | DATE | Updated manually or via trigger |
| created_at, updated_at | TIMESTAMPTZ | |

---

### `reservas`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| cliente_id | UUID FK → clientes_reservas | ON DELETE SET NULL |
| fecha | DATE NOT NULL | |
| hora_inicio | TIME NOT NULL | e.g. '20:30' |
| duracion_min | INTEGER | 90 (1–2p) or 120 (3–4p) |
| servicio | TEXT | 'comida' or 'cena' |
| personas | INTEGER | |
| mesa_ids | INTEGER[] | Array of mesa.numero values |
| estado | TEXT | Confirmada / Sentado / Finalizada / Cancelada / NoShow / WalkIn |
| notas | TEXT | Customer-entered or staff notes |
| origen | TEXT | 'online' / 'telefono' / 'walkin' / 'manual' |
| review_email_sent_at | TIMESTAMPTZ | Set after post-visit Google review email is sent |
| created_at, updated_at | TIMESTAMPTZ | updated_at via trigger |

**Indexes:** `idx_reservas_fecha`, `idx_reservas_cliente`, `idx_reservas_review_email_pending`

---

### `reservas_config` (single row, id=1)
| Column | Default | Notes |
|--------|---------|-------|
| reservas_online_activas | true | Master switch for /reservas page |
| max_personas_online | 4 | Max guests allowed via online booking |
| intervalo_min | 15 | Time slot interval in minutes |
| turno_gap_min | 30 | Minimum gap between two reservations on the same table |
| duracion_1_2_min | 90 | Duration for 1–2 guests |
| duracion_3_4_min | 120 | Duration for 3–4 guests |
| dias_max_antelacion | 30 | (UI overrides with 7-day constant) |
| capacidad_online_pct | 70 | % of total capacity reserved for online |
| comida_inicio / comida_fin | 13:00 / 15:00 | Lunch service window |
| cena_inicio / cena_fin | 20:00 / 22:00 | Dinner service window |
| telefono | — | Restaurant phone (shown in UI) |
| whatsapp | — | WhatsApp number |
| google_review_link | — | Used by post-visit review request emails |

---

### `cierres_servicio`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| fecha | DATE NOT NULL | |
| servicio | TEXT | 'comida', 'cena', or 'todo' |
| motivo | TEXT | Optional staff note |
| UNIQUE (fecha, servicio) | | Prevents duplicate closures |

> **Not yet wired into availability engine.** Phase 2: check this table in `calcularSlotsDisponibles()` before returning slots.

---

## RLS Status
All 5 tables have RLS **enabled** with **open dev policies** (`FOR ALL USING (true)`).

**TODO before production:**
- Public anon key: allow only `SELECT mesas`, `SELECT reservas_config`, `INSERT clientes_reservas`, `INSERT reservas`
- Service role key (used by API routes): full access — keep as-is
- Staff auth: add `auth.uid()` check for management pages (currently unprotected)

---

## Key Relationships
```
clientes_reservas (1) ──< reservas (many)
mesas.id ──< reservas.mesa_ids[]   (denormalized array, not FK)
reservas_config (singleton row, id=1)
cierres_servicio (standalone, not yet joined)
```

---

## TypeScript Types
Defined in `lib/supabase/types.ts` (Database generic) and `lib/reservas/types.ts` (domain interfaces).

```ts
// Domain interfaces (lib/reservas/types.ts)
interface Mesa { id, numero, capacidad, zona, combinable, activa, ... }
interface ClienteReserva { id, nombre, telefono, email, visitas, ... }
interface Reserva { id, cliente_id, fecha, hora_inicio, duracion_min, ... }
interface ReservasConfig { reservas_online_activas, max_personas_online, ... }
type EstadoReserva = "Confirmada" | "Sentado" | "Finalizada" | "Cancelada" | "NoShow" | "WalkIn"
type Servicio = "comida" | "cena"
```
