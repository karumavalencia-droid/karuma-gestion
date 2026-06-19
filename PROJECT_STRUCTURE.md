# Karuma ERP — Project Structure
> For Codex handover. All paths relative to project root.

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15.1 (App Router) |
| Language | TypeScript 5.7 |
| UI | React 19 + TailwindCSS v3.4 |
| Icons | lucide-react |
| Database | Supabase (Postgres) |
| Auth | Custom bcrypt (lib/auth/) |
| i18n | Custom context (ES + 中文, no library) |
| Deployment | Vercel |

---

## Directory Map

```
karuma-gestion/
├── app/
│   ├── layout.tsx                    # Root layout (font, PWA, Providers)
│   ├── page.tsx                      # Redirects to /dashboard
│   ├── globals.css                   # Tailwind base + scrollbar utility
│   │
│   ├── dashboard/
│   │   ├── page.tsx                  # Home: sales cards + 6 reservation StatCards
│   │   ├── reservas/page.tsx         # Reservation management list
│   │   ├── mesa-view/page.tsx        # Table floor plan (iPad)
│   │   ├── clientes/page.tsx         # Customer base
│   │   └── config/page.tsx           # Reservation settings
│   │
│   ├── reservas/
│   │   ├── layout.tsx                # Standalone layout (white, no sidebar)
│   │   └── page.tsx                  # Public booking wizard
│   │
│   ├── api/
│   │   ├── auth/login/route.ts       # POST login
│   │   ├── auth/accounts/route.ts    # GET accounts
│   │   ├── staff/route.ts            # GET/POST staff
│   │   ├── staff/[id]/route.ts       # PUT/DELETE staff
│   │   ├── reservas/
│   │   │   ├── disponibilidad/route.ts  # GET available slots
│   │   │   └── crear/route.ts           # POST create reservation
│   │
│   ├── staff/page.tsx                # Staff list
│   ├── schedule/page.tsx             # Weekly schedule
│   ├── marketing/page.tsx            # Growth plan
│   ├── delivery/page.tsx             # Delivery metrics
│   ├── kiosk/
│   │   ├── layout.tsx                # Standalone kiosk layout
│   │   └── page.tsx                  # Clock-in tablet
│   ├── login/page.tsx
│   ├── ceo/page.tsx
│   ├── objetivo/page.tsx
│   ├── food-cost/page.tsx
│   ├── recipes/page.tsx
│   ├── ingredients/page.tsx
│   ├── invoices/page.tsx
│   ├── purchases/page.tsx
│   ├── inventory/page.tsx
│   ├── reviews/page.tsx
│   ├── delivery-center/page.tsx
│   ├── facturas/page.tsx
│   ├── personal/page.tsx
│   ├── finanzas/page.tsx
│   ├── profit/page.tsx
│   └── [otros módulos stub]/page.tsx
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx               # ERP sidebar (nav items + active state)
│   │   ├── Header.tsx                # Top bar with language switcher
│   │   ├── SidebarLayout.tsx         # Shell: Sidebar + Header + main
│   │   └── Providers.tsx             # AuthProvider + LanguageProvider + AppShell
│   ├── ui/
│   │   ├── StatCard.tsx              # Metric card (title, value, icon, trend)
│   │   ├── DataTable.tsx             # Generic sortable table
│   │   └── StatusBadge.tsx           # Colored status pill
│   ├── reservas/
│   │   └── ReservasNav.tsx           # Tab bar: Lista / Mesas / Clientes / Config
│   ├── staff/
│   │   └── StaffFormModal.tsx
│   └── pwa/
│       └── PwaRegister.tsx
│
├── lib/
│   ├── i18n.ts                       # Primary translation dictionary (ES + 中文)
│   ├── i18n/
│   │   ├── translations.ts           # Extended translations + ROUTE_NAV_KEY
│   │   └── LanguageProvider.tsx      # React context: locale, setLocale, t()
│   ├── layout/
│   │   └── navigation.ts             # ERP_NAV_ROUTES (sidebar routes source of truth)
│   ├── supabase/
│   │   ├── types.ts                  # Database type definitions (all tables)
│   │   ├── admin.ts                  # Server-side Supabase client (service role)
│   │   └── client.ts                 # Browser Supabase client (anon key)
│   ├── reservas/
│   │   ├── types.ts                  # Mesa, ClienteReserva, Reserva, ReservasConfig, etc.
│   │   ├── disponibilidad.ts         # Slot generation + table assignment engine
│   │   └── dashboard-stats.ts        # Fetches today's reservation KPIs
│   ├── auth/
│   │   ├── AuthProvider.tsx
│   │   ├── accounts.ts
│   │   └── permissions.ts
│   └── [domain helpers]/             # food-cost, delivery, schedule, staff, etc.
│
├── supabase/
│   └── migrations/
│       ├── 001_initial.sql           # roles, users, staff tables
│       ├── 002_staff_batch1.sql      # staff extra fields + seed data
│       └── 003_reservas.sql          # mesas, clientes_reservas, reservas, reservas_config, cierres_servicio
│
├── public/                           # Static assets, PWA icons, manifest
├── tailwind.config.ts                # karuma color palette (red scale)
├── .env.local                        # Supabase credentials (NOT in git)
├── .env.local.example                # Template
└── package.json
```

---

## Key Architectural Patterns

### Navigation (Sidebar)
- `lib/layout/navigation.ts` → `ERP_NAV_ROUTES` is the single source of truth for sidebar items
- `components/layout/Sidebar.tsx` → maps routes to icons via `NAV_ICONS`
- Active state for `/dashboard` is exact-match only (prevents highlight on sub-routes)
- All `/dashboard/reservas`, `/dashboard/mesa-view`, `/dashboard/clientes`, `/dashboard/config` activate the "Reservas" sidebar item

### i18n (ES / 中文)
- `useLanguage()` hook returns `{ locale, setLocale, t }`
- `t("nav.reservas")` → "Reservas" or "预约管理"
- Two sources: `lib/i18n.ts` (primary) and `lib/i18n/translations.ts` (extended). `translate()` checks primary first.
- Default locale: `zh` (Chinese). Stored in `localStorage`.

### Layouts
- All pages get `SidebarLayout` (sidebar + header) via `Providers > AppShell`
- Exceptions excluded in `AppShell`: paths starting with `/kiosk` or `/reservas`
- Dark management pages use `-m-3 sm:-m-4 md:-m-6` negative margin to fill the SidebarLayout's padded main area

### Supabase Clients
- **Browser**: `lib/supabase/client.ts` → `getSupabaseClient()` (anon key, singleton)
- **Server**: `lib/supabase/admin.ts` → `getSupabaseAdmin()` (service role, singleton)
- All tables typed in `lib/supabase/types.ts` → `Database` type
