-- ════════════════════════════════════════════════════════════════════════════
-- 039 — Inbox: respuesta automática
--
-- Deja que la IA publique sola las respuestas a las reseñas buenas y reserve
-- para una persona las que tienen riesgo (quejas, pocas estrellas, alergias).
--
-- La política se evalúa SIEMPRE, esté activada o no. Con `auto_reply_activa`
-- en false la decisión se guarda como 'simulada': permite ver durante unas
-- semanas qué habría publicado el sistema antes de dejarle publicar de verdad.
--
-- Por defecto viene DESACTIVADA a propósito. Activarla es una decisión del
-- propietario, no un efecto secundario de aplicar la migración.
--
-- Idempotente: se puede ejecutar más de una vez sin romper nada.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Ajustes ────────────────────────────────────────────────────────────────

alter table inbox_settings
  add column if not exists auto_reply_activa boolean not null default false,
  add column if not exists auto_reply_min_estrellas smallint not null default 4,
  -- Plataformas donde se permite publicar solo. Vacío = ninguna, que es lo que
  -- corresponde hoy: el adaptador de Google todavía no existe.
  add column if not exists auto_reply_plataformas text[] not null default '{}';

do $$ begin
  alter table inbox_settings
    add constraint inbox_settings_min_estrellas_valido
    check (auto_reply_min_estrellas between 1 and 5);
exception when duplicate_object then null;
end $$;

comment on column inbox_settings.auto_reply_activa is
  'false = modo simulacro: se decide y se registra, pero no se publica nada.';
comment on column inbox_settings.auto_reply_min_estrellas is
  'Estrellas mínimas para publicar sin revisión humana. Por debajo, a revisar.';

-- ─── Rastro de cada decisión ────────────────────────────────────────────────
-- Sin esto no hay forma de auditar por qué una reseña se publicó sola ni de
-- enseñar el simulacro antes de activar nada.

alter table inbox_ai_suggestions
  add column if not exists auto_decision text,
  add column if not exists auto_motivo text,
  add column if not exists auto_enviada_at timestamptz;

do $$ begin
  alter table inbox_ai_suggestions
    add constraint inbox_ai_suggestions_auto_decision_valida
    check (auto_decision is null or auto_decision in ('enviada', 'simulada', 'revisar'));
exception when duplicate_object then null;
end $$;

comment on column inbox_ai_suggestions.auto_decision is
  'enviada = publicada sola · simulada = habría pasado, pero está desactivada · revisar = necesita persona';
comment on column inbox_ai_suggestions.auto_motivo is
  'Código del motivo de la decisión. Ver MOTIVOS en lib/inbox/auto-reply.ts';

-- Para la pantalla de simulacro: "enséñame lo que habrías publicado".
create index if not exists idx_inbox_ai_suggestions_auto_decision
  on inbox_ai_suggestions (auto_decision, created_at desc);
