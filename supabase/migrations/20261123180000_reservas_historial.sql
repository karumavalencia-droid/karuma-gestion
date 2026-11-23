-- Historial de cada reserva: quién la creó, la cambió, la canceló o la sentó.
-- Solo añade una tabla nueva; no toca las existentes.
create table if not exists public.reservas_historial (
  id bigint generated always as identity primary key,
  reserva_id uuid not null,
  accion text not null,          -- creada | cambiada | cancelada | estado | mesa
  detalle text,                  -- texto legible: "20:30 → 21:00 · 4 → 5 pers."
  actor text not null,           -- cliente | personal: <nombre> | sistema
  created_at timestamptz not null default now()
);
create index if not exists reservas_historial_reserva_idx on public.reservas_historial (reserva_id, created_at);
alter table public.reservas_historial enable row level security;
-- Sin políticas: solo el servidor (service role) lee y escribe.
