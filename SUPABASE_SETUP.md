# Karuma ERP — Supabase Setup
> Project: `aiwbdjeuvcvkuyoxgomr.supabase.co`
> Region: eu-west-1 (Ireland)

---

## Credentials

**IMPORTANT: Never commit these to git. Already in `.gitignore`.**

Store in `.env.local` (local) and Vercel environment variables (production):

```
NEXT_PUBLIC_SUPABASE_URL=https://aiwbdjeuvcvkuyoxgomr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get keys from: Supabase Dashboard → Project Settings → API → Project API keys

---

## Two Supabase Clients

### Browser client (anon key)
**File:** `lib/supabase/client.ts`
```ts
import { createBrowserClient } from "@supabase/ssr";
export function getSupabaseClient() { ... }
```
Used in: all `"use client"` pages (management pages, mesa-view, etc.)
Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Server/admin client (service role key)
**File:** `lib/supabase/admin.ts`
```ts
import { createClient } from "@supabase/supabase-js";
export function getSupabaseAdmin() { ... }
```
Used in: all API routes (`/api/reservas/*`)
Key: `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS, full access

---

## Tables in Production (all created by 003_reservas.sql)

| Table | Rows | Purpose |
|-------|------|---------|
| `mesas` | 21 | Restaurant tables |
| `clientes_reservas` | grows | Customer registry |
| `reservas` | grows | Reservations |
| `reservas_config` | 1 | System settings |
| `cierres_servicio` | 0 | Service closures |

---

## Running Migrations

Migrations are in `supabase/migrations/`. They are run **manually** in the Supabase SQL Editor — this project does not use the Supabase CLI.

**Steps:**
1. Go to [supabase.com](https://supabase.com) → Project → SQL Editor
2. Open `supabase/migrations/003_reservas.sql`
3. Paste the full contents and click Run
4. Verify tables appear in Table Editor

**If you get `policy already exists` error:** The migration was already run. Safe to ignore or run individual `CREATE TABLE IF NOT EXISTS` statements only.

---

## Vercel Environment Variables

Go to: vercel.com → karuma-gestion project → Settings → Environment Variables

Add these for **Production** + **Preview** + **Development**:

| Key | Value | Visibility |
|-----|-------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://aiwbdjeuvcvkuyoxgomr.supabase.co` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (anon key) | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (service role) | Secret |

After adding → Redeploy from Vercel dashboard (Deployments → ... → Redeploy).

---

## RLS Status
**Current: open dev policies** (all tables allow everything).

All tables have RLS enabled. The `dev_open_*` policies allow full access to both anon and service role keys.

**TODO before production:** See `NEXT_TASKS.md` item #1 for hardened RLS migration.

---

## Key Config to Update in Supabase

After running migration, update `reservas_config` (row id=1) in the Table Editor or SQL Editor:

```sql
UPDATE reservas_config SET
  telefono   = '+34 676 70 67 76',
  whatsapp   = '+34 676 70 67 76',
  comida_fin = '15:30',
  cena_fin   = '23:00'
WHERE id = 1;
```

These values are also hardcoded in `app/reservas/page.tsx` constants — future improvement is to fetch them from the DB.
