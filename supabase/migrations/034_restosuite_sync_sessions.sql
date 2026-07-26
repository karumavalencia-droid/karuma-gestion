create table if not exists public.restosuite_sync_sessions (
  location_id text primary key,
  base_url text not null default 'https://bo.eu.restosuite.ai',
  vulcan_token text not null,
  corporation_id text not null,
  brand_id text not null,
  shop_id text not null,
  organization_id text not null,
  organization_type text not null,
  accept_timezone text not null default 'UTC+2',
  language_code text not null default 'zh_CN',
  currency text not null default 'EUR',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists restosuite_sync_sessions_updated_at_idx
  on public.restosuite_sync_sessions (updated_at desc);
