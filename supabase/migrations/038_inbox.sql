-- ════════════════════════════════════════════════════════════════════════════
-- 038 — Inbox: Mensajes y Reseñas
--
-- Bandeja única para DMs, comentarios y menciones de Instagram, reseñas de
-- Google y de Tripadvisor. Un solo modelo para todas las plataformas: añadir
-- Facebook, WhatsApp, TikTok, Email, Booking o TheFork es un valor más en el
-- enum y un adaptador nuevo, sin tocar la estructura.
--
-- Diseño completo: INBOX_DISENO.md
-- Idempotente: se puede ejecutar más de una vez sin romper nada.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Enums ──────────────────────────────────────────────────────────────────

do $$ begin
  create type inbox_platform as enum (
    'instagram','google','tripadvisor',
    -- previstos, todavía sin adaptador
    'facebook','whatsapp','tiktok','email','booking','thefork',
    -- solo para pruebas internas; no corresponde a ninguna plataforma real
    'manual'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type inbox_kind as enum ('dm','comment','mention','story_reply','review','question');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inbox_direction as enum ('in','out');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inbox_status as enum ('nuevo','en_curso','respondido','cerrado','ignorado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inbox_priority as enum ('baja','normal','alta','urgente');
exception when duplicate_object then null; end $$;

-- ─── Cuentas conectadas ─────────────────────────────────────────────────────
-- Guarda tokens: ninguna ruta de API devuelve nunca las columnas *_enc.

create table if not exists inbox_accounts (
  id                  uuid primary key default gen_random_uuid(),
  platform            inbox_platform not null,
  external_account_id text not null,
  display_name        text,
  access_token_enc    text,
  refresh_token_enc   text,
  token_expires_at    timestamptz,
  meta                jsonb not null default '{}'::jsonb,
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (platform, external_account_id)
);

-- ─── Hilos: la unidad de trabajo de la bandeja ──────────────────────────────
-- Una conversación de DM, un comentario con sus respuestas, o una reseña.

create table if not exists inbox_threads (
  id                 uuid primary key default gen_random_uuid(),
  account_id         uuid references inbox_accounts(id) on delete set null,
  platform           inbox_platform not null,
  kind               inbox_kind not null,
  external_thread_id text not null,

  customer_external_id text,
  customer_name        text,
  customer_username    text,
  customer_avatar_url  text,

  language     text,
  rating       smallint check (rating is null or rating between 1 and 5),
  sentiment    numeric(3,2) check (sentiment is null or sentiment between -1 and 1),
  intents      text[] not null default '{}',
  is_complaint boolean not null default false,

  status   inbox_status   not null default 'nuevo',
  priority inbox_priority not null default 'normal',
  unread   boolean not null default true,

  first_inbound_at timestamptz,
  last_inbound_at  timestamptz,
  last_message_at  timestamptz,
  replied          boolean not null default false,
  replied_at       timestamptz,
  replied_by       text,
  assigned_to      text,

  permalink  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, external_thread_id)
);

create index if not exists inbox_threads_bandeja_idx
  on inbox_threads (status, last_message_at desc);
create index if not exists inbox_threads_plataforma_idx
  on inbox_threads (platform, last_message_at desc);
create index if not exists inbox_threads_pendientes_idx
  on inbox_threads (priority, first_inbound_at)
  where status in ('nuevo','en_curso');
create index if not exists inbox_threads_intents_idx
  on inbox_threads using gin (intents);

-- ─── Mensajes ───────────────────────────────────────────────────────────────
-- unique (platform, external_id) es lo que hace idempotentes los webhooks:
-- si Meta reenvía un evento, el insert no duplica nada.

create table if not exists inbox_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references inbox_threads(id) on delete cascade,
  platform    inbox_platform not null,
  direction   inbox_direction not null,
  external_id text,
  author_name     text,
  author_username text,
  body        text,
  attachments jsonb not null default '[]'::jsonb,
  raw         jsonb,
  sent_at     timestamptz,
  received_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- Índice único parcial: los mensajes salientes propios pueden no traer id
-- externo hasta que la plataforma lo confirma.
create unique index if not exists inbox_messages_externo_idx
  on inbox_messages (platform, external_id)
  where external_id is not null;

create index if not exists inbox_messages_thread_idx
  on inbox_messages (thread_id, sent_at);

-- ─── Borradores de IA ───────────────────────────────────────────────────────
-- Tabla aparte y no columna en el hilo: permite regenerar sin perder el
-- anterior y medir cuántos borradores se envían tal cual.

create table if not exists inbox_ai_suggestions (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references inbox_threads(id) on delete cascade,
  message_id uuid references inbox_messages(id) on delete set null,
  model      text not null,
  language   text,
  reply_text text not null,
  analysis   jsonb not null default '{}'::jsonb,
  used       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists inbox_ai_suggestions_thread_idx
  on inbox_ai_suggestions (thread_id, created_at desc);

-- ─── Traza cruda de webhooks ────────────────────────────────────────────────
-- Para reprocesar sin pedir nada a la plataforma y para depurar.
-- Contiene datos personales: purgar a los 30 días.

create table if not exists inbox_webhook_events (
  id           uuid primary key default gen_random_uuid(),
  platform     inbox_platform not null,
  signature_ok boolean not null,
  payload      jsonb not null,
  processed_at timestamptz,
  error        text,
  received_at  timestamptz not null default now()
);

create index if not exists inbox_webhook_events_recientes_idx
  on inbox_webhook_events (received_at desc);

-- ─── Ajustes (una sola fila) ────────────────────────────────────────────────

create table if not exists inbox_settings (
  id                 boolean primary key default true check (id),
  horario            jsonb not null default
    '{"comida":["13:00","15:00"],"cena":["19:30","22:00"]}'::jsonb,
  sla_aviso_min      integer not null default 30,
  sla_urgente_min    integer not null default 60,
  palabras_prioridad text[] not null default
    array['reserva','mesa','cumpleanos','grupo','alergia','urgente','precio'],
  ia_activa          boolean not null default true,
  updated_at         timestamptz not null default now()
);

insert into inbox_settings (id) values (true) on conflict (id) do nothing;

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- Sin políticas a propósito: con la clave anónima no entra nadie. El acceso va
-- por service role desde las rutas de API, que ya validan sesión y rol.

alter table inbox_accounts       enable row level security;
alter table inbox_threads        enable row level security;
alter table inbox_messages       enable row level security;
alter table inbox_ai_suggestions enable row level security;
alter table inbox_webhook_events enable row level security;
alter table inbox_settings       enable row level security;
