# Inbox — Mensajes y Reseñas (diseño técnico)

Bandeja única para todo lo que escribe un cliente: DMs, comentarios y menciones de
Instagram, reseñas de Google y de Tripadvisor. Un solo modelo de datos, un solo
inbox, IA que clasifica y propone respuesta, y ningún mensaje sin contestar.

Estado: **diseño, sin implementar**. Verificado contra la documentación oficial de
Meta, Google y Tripadvisor el 2026-07-26.

---

## 0. Lo que hay que saber antes de empezar

Tres cosas cambian el alcance real del proyecto. Ninguna es un problema de código.

### 0.1 Las tres plataformas no están al mismo nivel

| Plataforma | Entrada | Responder desde el ERP | Trámite previo |
|---|---|---|---|
| **Instagram** | Webhook en tiempo real (`messages`, `comments`, `mentions`) | Sí | App de Meta + App Review + verificación de empresa |
| **Google** | Pub/Sub push (`NEW_REVIEW`) o polling | Sí (`reviews.updateReply`) | Formulario de acceso a la API, aprobación manual de Google |
| **Tripadvisor** | Polling | **No** | Alta en el Content API |

**Tripadvisor es el caso malo y conviene decidirlo ahora.** El Content API público
devuelve datos de la ficha y **como mucho las 5 reseñas más recientes**, y **no
expone ningún endpoint para que el propietario responda**. La respuesta seguirá
siendo manual en el Owner Center. Hacer scraping de la web no es una alternativa:
incumple sus condiciones y se rompe sola.

Traducción práctica: la fase 3 no puede ser "Tripadvisor como Instagram". Será
*"traer las últimas 5 reseñas, clasificarlas, redactar la respuesta con IA y abrir
Tripadvisor con un clic para pegarla"*. Eso sí aporta valor; prometer más sería
mentir.

### 0.2 Los trámites son el camino crítico, no el código

- **Meta**: la app necesita `instagram_business_basic`, `instagram_business_manage_messages`
  e `instagram_business_manage_comments`. Todos pasan por **App Review**, y la cuenta
  de Instagram debe ser profesional (Business/Creator). Ya hay experiencia con esto
  en el proyecto: el WhatsApp de reservas lleva desde julio esperando plantillas
  (ver `RESERVAS_INTEGRACIONES.md`).
- **Google**: hay que rellenar el formulario de *Basic API Access* con el número de
  proyecto de Google Cloud. Requisitos: perfil de empresa **verificado y activo desde
  hace 60+ días** y web asociada. Hasta que aprueben, la cuota es **0 QPM** — la API
  responde, pero no deja hacer nada.

**Ambos se pueden empezar hoy y en paralelo al desarrollo.** Es lo primero que hay
que mover.

### 0.3 El estilo "negro y oro" no existe en el código

La petición dice *mantener el estilo negro y oro y soportar modo oscuro*. Lo que hay
hoy en `tailwind.config.ts` es:

- paleta única `karuma` = **rojo** (`#dc2626` y variantes), sobre fondo blanco/gris claro;
- **no hay `darkMode` configurado**, así que hoy la app no tiene modo oscuro en ninguna pantalla.

Hacer el Inbox en negro y oro con modo oscuro lo dejaría descolgado del resto del
ERP. Son dos trabajos distintos y conviene no mezclarlos:

1. **Inbox** con el estilo actual (`Card`, `PageHeader`, rojo Karuma, mobile first).
2. **Retema global** a negro/oro + modo oscuro, como tarea aparte que toca todas las
   pantallas a la vez.

Este documento asume (1). Si la decisión es al revés, hay que hacer (2) **antes**,
no a la vez.

---

## 1. Arquitectura

```
  Instagram ──webhook──┐
  Google ─────Pub/Sub──┤
  Tripadvisor ─cron────┤
                       ▼
             /api/webhooks/*  ── verifica firma ── guarda evento crudo
                       │
                       ▼
              lib/inbox/ingest.ts          ← ÚNICO punto de entrada
                       │
        ┌──────────────┼───────────────┐
        ▼              ▼               ▼
   adapter.normalize   upsert       reglas (prioridad,
   (por plataforma)    thread+msg    palabras clave)
                       │
                       ▼  after()  ← fuera de la respuesta al webhook
                  lib/inbox/ai.ts
                  (idioma, sentimiento, intenciones, borrador)
                       │
                       ▼
                   Supabase
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
  /mensajes (Inbox)            Realtime → campana del header
  /mensajes/insights
```

### Principios

1. **Un solo modelo.** Instagram, Google y Tripadvisor no tienen tablas propias.
   Añadir Facebook, WhatsApp, TikTok, Email, Booking o TheFork = un adaptador nuevo
   y un valor más en un enum. Cero migraciones de estructura.
2. **Un solo punto de entrada.** Todo lo que entra pasa por `ingest.ts`. Las reglas,
   la deduplicación y la IA se escriben una vez.
3. **La ingesta nunca depende de la IA.** Si falta `OPENAI_API_KEY` o la llamada
   falla, el mensaje entra igual, clasificado por reglas. Es el mismo criterio que
   ya sigue `lib/ceo/brief-ai.ts`.
4. **La IA nunca envía sola.** Redacta; una persona aprueba y envía.
5. **Nada de crons de minutos.** El plan Hobby de Vercel avisa en su propio panel de
   que los crons tienen una **ventana flexible de 1 hora**. Por eso lo urgente entra
   por webhook/push, y los avisos de retraso (30/60 min) se calculan **en el
   cliente** a partir de `first_inbound_at`, sin ningún proceso periódico.

### Adaptadores

```ts
// lib/inbox/adapters/types.ts
export interface PlatformAdapter {
  platform: InboxPlatform;
  /** Si la plataforma permite responder por API (Tripadvisor: false). */
  canReply: boolean;
  /** Evento crudo del webhook/poll → items normalizados. */
  normalize(raw: unknown): NormalizedItem[];
  /** Envía la respuesta. Solo si canReply. */
  reply?(thread: InboxThread, texto: string): Promise<{ externalId?: string }>;
  /** Descarga histórico o sondeo periódico. */
  fetchSince?(desde: Date): Promise<NormalizedItem[]>;
  /** Enlace a la conversación en la plataforma original. */
  permalink(thread: InboxThread): string;
}
```

`lib/inbox/adapters/index.ts` es un registro `Record<InboxPlatform, PlatformAdapter>`.
El resto del sistema no sabe qué plataforma está tratando.

### Ficheros

```
app/mensajes/page.tsx                       Inbox
app/mensajes/[id]/page.tsx                  conversación
app/mensajes/insights/page.tsx              analítica
app/api/inbox/threads/route.ts              listado + filtros
app/api/inbox/threads/[id]/route.ts         detalle / PATCH estado
app/api/inbox/threads/[id]/reply/route.ts   enviar respuesta
app/api/inbox/threads/[id]/ai/route.ts      (re)generar borrador
app/api/inbox/unread/route.ts               contadores para la campana
app/api/inbox/insights/route.ts             agregados
app/api/inbox/connect/[platform]/route.ts   OAuth de alta de cuenta
app/api/webhooks/instagram/route.ts         GET verify + POST eventos
app/api/webhooks/google/route.ts            Pub/Sub push
app/api/cron/inbox-tripadvisor/route.ts     sondeo diario
lib/inbox/types.ts  ingest.ts  rules.ts  ai.ts  crypto.ts
lib/inbox/adapters/{types,index,instagram,google,tripadvisor}.ts
components/inbox/{ThreadList,ThreadItem,ThreadView,ReplyBox,AiSuggestion,Filters,PlatformBadge}.tsx
supabase/migrations/038_inbox.sql
```

---

## 2. Base de datos

Migración `038_inbox.sql`. Se aplica **a mano desde el SQL Editor de Supabase**
(el proyecto no tiene connection string; ver `reference_supabase_migrations_dashboard`).

### Enums

```sql
create type inbox_platform as enum (
  'instagram','google','tripadvisor',
  -- previstos, sin adaptador todavía:
  'facebook','whatsapp','tiktok','email','booking','thefork'
);
create type inbox_kind      as enum ('dm','comment','mention','story_reply','review','question');
create type inbox_direction as enum ('in','out');
create type inbox_status    as enum ('nuevo','en_curso','respondido','cerrado','ignorado');
create type inbox_priority  as enum ('baja','normal','alta','urgente');
```

### `inbox_accounts` — cuentas conectadas

```sql
create table inbox_accounts (
  id                  uuid primary key default gen_random_uuid(),
  platform            inbox_platform not null,
  external_account_id text not null,            -- IG user id / GBP location id
  display_name        text,
  access_token_enc    text,                     -- AES-256-GCM, nunca en claro
  refresh_token_enc   text,
  token_expires_at    timestamptz,
  meta                jsonb not null default '{}'::jsonb,
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (platform, external_account_id)
);
```

### `inbox_threads` — la unidad de trabajo

Una conversación de DM, un comentario con sus respuestas, o una reseña. Es lo que se
ve como fila en el Inbox.

```sql
create table inbox_threads (
  id                 uuid primary key default gen_random_uuid(),
  account_id         uuid references inbox_accounts(id) on delete set null,
  platform           inbox_platform not null,   -- desnormalizado: filtros rápidos
  kind               inbox_kind not null,
  external_thread_id text not null,

  customer_external_id text,
  customer_name        text,
  customer_username    text,
  customer_avatar_url  text,

  language     text,                        -- 'es' | 'en' | 'zh' | 'fr' | …
  rating       smallint,                    -- solo reseñas (1-5)
  sentiment    numeric(3,2),                -- -1.00 … 1.00
  intents      text[] not null default '{}',-- reserva, precio, horario, queja, alergia…
  is_complaint boolean not null default false,

  status   inbox_status   not null default 'nuevo',
  priority inbox_priority not null default 'normal',
  unread   boolean not null default true,

  first_inbound_at timestamptz,             -- base del SLA 30/60 min
  last_inbound_at  timestamptz,
  last_message_at  timestamptz,
  replied          boolean not null default false,
  replied_at       timestamptz,
  replied_by       uuid,
  assigned_to      uuid,

  permalink  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, external_thread_id)
);

create index inbox_threads_bandeja_idx  on inbox_threads (status, last_message_at desc);
create index inbox_threads_plataforma_idx on inbox_threads (platform, last_message_at desc);
create index inbox_threads_pendientes_idx on inbox_threads (priority, first_inbound_at)
  where status in ('nuevo','en_curso');
create index inbox_threads_intents_idx on inbox_threads using gin (intents);
```

### `inbox_messages` — cada mensaje

```sql
create table inbox_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references inbox_threads(id) on delete cascade,
  platform    inbox_platform not null,
  direction   inbox_direction not null,
  external_id text,
  author_name     text,
  author_username text,
  body        text,
  attachments jsonb not null default '[]'::jsonb,
  raw         jsonb,                        -- payload original, para depurar
  sent_at     timestamptz,                  -- hora de la plataforma
  received_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (platform, external_id)            -- idempotencia de webhooks
);
create index inbox_messages_thread_idx on inbox_messages (thread_id, sent_at);
```

`unique (platform, external_id)` es lo que hace que un webhook reenviado por Meta no
duplique nada: el `insert … on conflict do nothing` no hace daño.

### `inbox_ai_suggestions` — borradores

```sql
create table inbox_ai_suggestions (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references inbox_threads(id) on delete cascade,
  message_id uuid references inbox_messages(id) on delete set null,
  model      text not null,
  language   text,
  reply_text text not null,
  analysis   jsonb not null default '{}'::jsonb,
  used       boolean not null default false,  -- alimenta la métrica "uso de IA"
  created_at timestamptz not null default now()
);
```

Tabla aparte y no columna en `inbox_threads` para poder regenerar el borrador sin
perder el anterior, y para medir cuántas veces se usa tal cual.

### `inbox_webhook_events` — traza cruda

```sql
create table inbox_webhook_events (
  id           uuid primary key default gen_random_uuid(),
  platform     inbox_platform not null,
  signature_ok boolean not null,
  payload      jsonb not null,
  processed_at timestamptz,
  error        text,
  received_at  timestamptz not null default now()
);
create index inbox_webhook_events_recientes_idx on inbox_webhook_events (received_at desc);
```

Sirve para reprocesar sin pedirle nada a Meta y para depurar. **Se purga a los 30
días** (contiene datos personales).

### `inbox_settings` — una sola fila

```sql
create table inbox_settings (
  id                 boolean primary key default true check (id),
  horario            jsonb not null default '{"comida":["13:00","15:00"],"cena":["19:30","22:00"]}'::jsonb,
  sla_aviso_min      integer not null default 30,
  sla_urgente_min    integer not null default 60,
  palabras_prioridad text[] not null default
    array['reserva','mesa','cumpleaños','grupo','alergia','urgente','precio'],
  ia_activa          boolean not null default true,
  updated_at         timestamptz not null default now()
);
```

### RLS

```sql
alter table inbox_accounts        enable row level security;
alter table inbox_threads         enable row level security;
alter table inbox_messages        enable row level security;
alter table inbox_ai_suggestions  enable row level security;
alter table inbox_webhook_events  enable row level security;
alter table inbox_settings        enable row level security;
-- Sin políticas: nadie entra con la clave anónima.
-- El acceso va por service role desde las rutas de API, que ya validan sesión y rol.
```

`inbox_accounts` guarda tokens: **ninguna ruta de API devuelve nunca sus columnas
`*_enc`**, ni siquiera al owner.

---

## 3. API interna

Todas bajo sesión y rol (`owner` o `manager`), salvo los webhooks.

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/inbox/threads` | Listado. Filtros: `status`, `platform`, `priority`, `unread`, `q`, `cursor`, `limit`. Paginación por cursor sobre `last_message_at`. |
| `GET` | `/api/inbox/threads/[id]` | Hilo + mensajes + último borrador de IA. Marca `unread=false`. |
| `PATCH` | `/api/inbox/threads/[id]` | `status`, `priority`, `assigned_to`, `unread`. |
| `POST` | `/api/inbox/threads/[id]/reply` | Envía por el adaptador. Inserta el mensaje `out`, marca `replied`. Si `canReply=false` (Tripadvisor) → `409` con el `permalink`. |
| `POST` | `/api/inbox/threads/[id]/ai` | Regenera el borrador a mano. |
| `GET` | `/api/inbox/unread` | `{ total, porPlataforma: { instagram: 5, google: 2, tripadvisor: 1 } }`. Es lo que pinta la campana. |
| `GET` | `/api/inbox/insights` | Agregados por rango de fechas. |
| `GET/POST` | `/api/inbox/connect/[platform]` | Inicio y callback del OAuth. Solo `owner`. |

Respuestas de error con el mismo formato que el resto del ERP: `{ error: string }` y
código HTTP coherente (`401` sin sesión, `403` sin rol, `503` sin configurar).

---

## 4. Webhooks e ingesta

### Instagram

```
GET  /api/webhooks/instagram   → verificación: devuelve hub.challenge si hub.verify_token coincide
POST /api/webhooks/instagram   → eventos
```

Campos suscritos: `messages`, `comments`, `mentions`, `message_reactions`.
Con Instagram Login, **las menciones llegan dentro de la notificación de `comments`**.
Las respuestas a stories llegan por el webhook `messages`; el payload trae la
referencia a la story — el mapeo exacto se confirma con el primer evento real, no de
memoria.

Meta firma todos los eventos con **SHA256** en la cabecera `X-Hub-Signature-256`.
El handler:

1. Lee el cuerpo **en crudo** (`await request.text()`), no `json()` — la firma se
   calcula sobre los bytes exactos.
2. `crypto.timingSafeEqual` contra el HMAC del `META_APP_SECRET`. Si no cuadra: log,
   `signature_ok=false`, y `200` igualmente (no dar pistas a quien sondea).
3. Guarda el evento crudo.
4. **Responde `200` inmediatamente.** Meta reintenta y acaba desuscribiendo si se
   tarda.
5. El trabajo pesado (normalizar, upsert, reglas, IA) va en `after()` de
   `next/server`, ya disponible en Next 15.5.

```ts
import { after } from "next/server";
// …
after(async () => { await ingest(platform, payload); });
return NextResponse.json({ ok: true });
```

### Google

Dos caminos, y conviene empezar por el simple:

- **Sondeo** (fase 2, por defecto): cron diario que llama a
  `accounts.locations.reviews.list`. Con la ventana de 1 h del plan Hobby, una reseña
  puede tardar en aparecer — aceptable para reseñas, que no son urgentes.
- **Pub/Sub push** (mejora): crear un topic en Cloud Pub/Sub, dar permiso de publicar
  a `mybusiness-api-pubsub@system.gserviceaccount.com`, y llamar a
  `accounts.updateNotificationSetting`. Llegan `NEW_REVIEW` y `UPDATED_REVIEW` al
  instante. Añade una dependencia de Google Cloud; se hace cuando el resto funcione.

Responder: `PUT accounts/{a}/locations/{l}/reviews/{r}/reply`.

### Tripadvisor

Cron diario `/api/cron/inbox-tripadvisor`. Trae las **5 reseñas más recientes** del
Content API y las mete por el mismo `ingest.ts`. `canReply=false`: la UI muestra el
borrador de IA con un botón *Copiar y abrir Tripadvisor*.

Hay que respetar los **requisitos de atribución** del Content API al mostrar
contenido de Tripadvisor.

### `ingest.ts`

```
verificar → guardar crudo → adapter.normalize → por cada item:
  upsert thread   (on conflict (platform, external_thread_id))
  insert message  (on conflict (platform, external_id) do nothing)
  si el mensaje es nuevo y entrante:
      reglas → prioridad, intenciones por palabra clave
      marcar unread, actualizar first/last_inbound_at
      after() → IA → inbox_ai_suggestions + enriquecer thread
```

Idempotente de principio a fin: reenviar el mismo evento no crea nada.

---

## 5. Seguridad

| Riesgo | Medida |
|---|---|
| Webhook falsificado | HMAC SHA256 sobre el cuerpo crudo + `timingSafeEqual`. Sin firma válida, no se ingesta. |
| Pub/Sub falsificado | Verificar el JWT OIDC que Google adjunta (`aud` = la URL del endpoint). |
| Webhooks bloqueados por el middleware | `/api/webhooks/` a `PUBLIC_PATHS` — igual que `/api/cron/`. La autenticación es la firma, no la sesión. |
| Tokens de plataforma | AES-256-GCM con `INBOX_TOKEN_KEY`. Nunca salen por ninguna API ni se escriben en logs. |
| Acceso al módulo | `/mensajes` y `/api/inbox` solo `owner` y `manager`; nunca cuentas de empleado. Mismo mecanismo que `/finanzas` y `/documentos` en `middleware.ts`. |
| Datos personales de clientes | Los mensajes son datos personales (RGPD): purga de `inbox_webhook_events` a 30 días, retención acordada para hilos cerrados, y prohibido volcar cuerpos de mensaje en logs. |
| Inyección desde el contenido | Lo que escribe un cliente es **dato, no instrucción**. El prompt lleva el mensaje delimitado y la IA solo redacta; enviar siempre lo decide una persona. |
| Abuso del endpoint | Límite de tamaño de payload y descarte temprano de eventos de cuentas desconocidas. |

Restricción de Meta a tener presente en la UI: la mensajería de Instagram tiene una
**ventana de 24 h** para responder en texto libre a un usuario. Pasada esa ventana el
envío falla. La ficha del hilo debe mostrar el tiempo restante, y `reply` devolver un
error claro en vez de un fallo genérico.

---

## 6. Flujo de IA

Una sola llamada por mensaje entrante, con salida estructurada:

```ts
{
  language: "es" | "en" | "zh" | "fr" | string,
  sentiment: number,          // -1 … 1
  is_complaint: boolean,
  intents: string[],          // reserva | precio | horario | queja | alergia | elogio | otro
  priority: "baja"|"normal"|"alta"|"urgente",
  reply: string               // borrador en el idioma del cliente
}
```

- Modelo: `gpt-4.1-mini` vía Responses API, el mismo que ya usan Coach y el parte del
  CEO (`OPENAI_MODEL` lo sobreescribe).
- **Las reglas van primero.** Palabras clave (`alergia`, `urgente`, `grupo`,
  `cumpleaños`, `reserva`, `mesa`, `precio`) y reseñas de 1-2 estrellas suben la
  prioridad **sin** llamar a la IA. Son deterministas, gratis y no fallan. `alergia`
  es la de mayor prioridad: es seguridad alimentaria.
- **La IA solo puede subir la prioridad, nunca bajarla.**
- Sin `OPENAI_API_KEY` o si la llamada falla: el hilo entra clasificado por reglas y
  sin borrador. Nunca bloquea la ingesta.

Reglas del prompt (tono Karuma, alineado con lo que ya hace el resto del ERP):

- Responder **en el idioma del cliente** (es/en/zh/fr; si no se reconoce, español).
- Sin emojis. Tono cercano y profesional, breve.
- **Prohibido inventar**: precios, disponibilidad, horarios o platos que no estén en
  el contexto que se le pasa.
- Ante una queja: reconocer, no discutir, ofrecer solución y llevar la conversación a
  un canal privado.
- Ante una petición de reserva: enlazar a `/reservas`, no confirmar mesa por chat.
- Firmar como Karuma, nunca en primera persona de un empleado.

---

## 7. Interfaz

### Inbox `/mensajes`

Mobile first. Lista ordenada por `last_message_at desc`, mezclando plataformas.
Cada fila: logo de plataforma · avatar · usuario · hora relativa · extracto ·
estrellas si es reseña · indicadores de prioridad, borrador de IA listo y no leído.

Filtros (chips, igual que los de `/documentos`): Todos · No respondidos · Prioritarios ·
Instagram · Google · Tripadvisor.

**Semáforo de retraso**, calculado en el cliente desde `first_inbound_at` y solo
dentro del horario de atención: <30 min normal · **30-60 min ámbar** · **>60 min rojo**.
Sin cron, sin trabajo de servidor.

### Conversación `/mensajes/[id]`

Hilo completo, ficha del cliente, análisis de IA (idioma, sentimiento, intenciones),
borrador editable, y acciones: **Enviar** · **Regenerar** · **Abrir en la plataforma** ·
**Marcar como hecho**. En Tripadvisor, *Enviar* se sustituye por *Copiar y abrir*.

### Campana del header

`components/layout/Header.tsx` ya tiene el icono; hoy el punto rojo es decorativo. Se
conecta a `/api/inbox/unread` y se abre un desplegable con el desglose
(Instagram 5 · Google 2 · Tripadvisor 1) que lleva al Inbox filtrado. Actualización
por **Supabase Realtime** sobre `inbox_threads` (ya se usa `supabase-js`), con
refresco cada 60 s como respaldo.

### Insights `/mensajes/insights`

Mensajes por día · reparto por plataforma · **tiempo medio de primera respuesta**
(`replied_at - first_inbound_at`) · % de borradores de IA usados tal cual · intenciones
más frecuentes · platos más mencionados (cruzando con el catálogo de productos) ·
empleados más elogiados (cruzando con `staff`) · idiomas.

El "país del cliente" se etiqueta explícitamente como **estimación por idioma**. Un
cliente que escribe en inglés no es necesariamente inglés, y presentarlo como dato
duro sería engañoso.

### Qué pasa con `/reviews`

`app/reviews/page.tsx` es hoy una pantalla con **reseñas inventadas en el código**
(`REVIEWS_SEED`). El Inbox la sustituye. Al cerrar la fase 2 hay que borrarla y
redirigir `/reviews` → `/mensajes`, actualizando `ERP_NAV_ROUTES` y
`npm run check:features`. Dejar datos falsos conviviendo con datos reales es
exactamente el problema que ya se corrigió una vez en el dashboard.

---

## 8. Fases y puntos de revisión

Cada fase termina con code review antes de seguir.

| Fase | Entrega | Revisión |
|---|---|---|
| **0 — Cimientos** | Migración 038, tipos, `ingest.ts`, reglas, capa de IA, registro de adaptadores, un adaptador `manual` para poder probar todo **sin ninguna aprobación externa**. | Modelo de datos e idempotencia |
| **1 — Instagram** | OAuth, webhook firmado, DMs/comentarios/menciones, envío, Inbox y conversación, campana. | Seguridad del webhook y ventana de 24 h |
| **2 — Google** | OAuth, sondeo, respuesta por API, retirada de `/reviews`. Pub/Sub si se quiere. | Cuotas y manejo de errores |
| **3 — Tripadvisor** | Sondeo de las 5 reseñas, borrador + copiar y abrir, atribución. | Expectativas y límites |
| **4 — Insights y avisos** | Página de analítica, notificaciones web, semáforo de SLA. | Rendimiento de las consultas |

La fase 0 es deliberadamente independiente de Meta y de Google: permite tener el
Inbox funcionando y probado mientras los trámites avanzan.

---

## 9. Variables de entorno

```bash
# Meta / Instagram
META_APP_ID=
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=       # cadena a elegir, se pega en el panel de Meta
INSTAGRAM_ACCOUNT_ID=

# Google Business Profile
GBP_CLIENT_ID=
GBP_CLIENT_SECRET=
GBP_ACCOUNT_ID=
GBP_LOCATION_ID=

# Tripadvisor
TRIPADVISOR_API_KEY=
TRIPADVISOR_LOCATION_ID=

# Inbox
INBOX_TOKEN_KEY=                 # 32 bytes en base64, cifrado de tokens
INBOX_ENABLED=1                  # interruptor general del módulo

# Ya existentes
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

Recordatorio operativo: **Vercel congela las variables en el build**, así que después
de añadirlas hay que volver a desplegar.

---

## 10. Resumen de lo que no depende del código

| Tarea | Quién | Bloquea |
|---|---|---|
| Cuenta de Instagram profesional + app de Meta + App Review | Karuma | Fase 1 completa |
| Formulario de *Basic API Access* de Google Business Profile | Karuma | Fase 2 completa |
| Alta en el Tripadvisor Content API | Karuma | Fase 3 |
| Decidir estilo: actual (rojo) o retema global negro/oro + modo oscuro | Karuma | Toda la UI |
| Aplicar `038_inbox.sql` en el SQL Editor de Supabase | Karuma | Fase 0 |

Las tres primeras se pueden iniciar hoy y avanzan solas mientras se programa la fase 0.
