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

## Tables in Production

| Table | Rows | Purpose |
|-------|------|---------|
| `mesas` | 21 | Restaurant tables |
| `clientes_reservas` | grows | Customer registry |
| `reservas` | grows | Reservations |
| `reservas_config` | 1 | System settings |
| `cierres_servicio` | 0 | Service closures |
| `attendance_events` | grows | Employee Entrada / Salida records |
| `attendance_credentials` | 13 | Server-side employee PIN hashes |

---

## Running Migrations

Migrations are in `supabase/migrations/`. They are run **manually** in the Supabase SQL Editor — this project does not use the Supabase CLI.

**Steps:**
1. Go to [supabase.com](https://supabase.com) → Project → SQL Editor
2. Open `supabase/migrations/003_reservas.sql`
3. Paste the full contents and click Run
4. Run later migrations in order, including `supabase/migrations/008_reservation_review_emails.sql` and `supabase/migrations/009_turno_gap_min.sql`
5. Verify tables appear in Table Editor

For the attendance system, run `supabase/migrations/006_attendance.sql` after
the existing staff migrations. It creates the cloud event log, PIN credential
table, indexes, and service-role-only RLS policies. Populate `attendance_credentials`
privately with bcrypt hashes, or configure the server-only
`KARUMA_ATTENDANCE_PINS` environment secret. If neither is configured, the app
uses the built-in staff PIN list.

Then run `supabase/migrations/007_employee_mobile_attendance.sql`. This links a
login account to one employee and adds the location evidence used by mobile
attendance.

The mobile geofence has a built-in default for `Carrer de Roger de Llòria 2`
(`39.4690812, -0.3751925`). You can override it with server-only environment
variables:

| Key | Example | Purpose |
|-----|---------|---------|
| `KARUMA_STORE_LATITUDE` | `39.4690812` | Restaurant map pin latitude |
| `KARUMA_STORE_LONGITUDE` | `-0.3751925` | Restaurant map pin longitude |
| `KARUMA_ATTENDANCE_RADIUS_METERS` | `150` | Maximum distance from the restaurant |
| `KARUMA_ATTENDANCE_MAX_ACCURACY_METERS` | `100` | Reject weak GPS readings |

Do not guess the coordinates from the written address. Copy the exact entrance
pin from Google Maps, because the repository currently contains historical
references to more than one address.

Employees can log in with their 4-digit PIN as both username and password.
The shared tablet kiosk uses the same PINs. To also mirror those employee
accounts into the `users` table, run:

```bash
npm run setup:employee-accounts
```

If `KARUMA_ATTENDANCE_PINS` is configured, the script uses that map. Otherwise
it uses the built-in staff PINs.

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
| `RESEND_API_KEY` | `re_...` | Secret |
| `RESERVAS_EMAIL_FROM` | `Karuma Sushi & Grill <reservas@your-domain.com>` | Secret |
| `RESERVAS_EMAIL_REPLY_TO` | `reservas@your-domain.com` | Secret |

After adding → Redeploy from Vercel dashboard (Deployments → ... → Redeploy).

Reservation confirmation emails are sent from `/api/reservas/crear` after the reservation is saved. Review request emails are sent from `/api/cron/reservas-review-emails`. Both use the Resend variables above. If the Resend variables are missing, the reservation still succeeds and the API returns `emailSent: false`.

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
  google_review_link = 'https://g.page/r/YOUR_GOOGLE_REVIEW_ID/review',
  turno_gap_min = 30,
  comida_fin = '15:30',
  cena_fin   = '23:00'
WHERE id = 1;
```

These values are also hardcoded in `app/reservas/page.tsx` constants — future improvement is to fetch them from the DB.

`google_review_link` is required by `/api/cron/reservas-review-emails`, which sends the post-visit review request to finished reservations that have an email and no `review_email_sent_at`.
