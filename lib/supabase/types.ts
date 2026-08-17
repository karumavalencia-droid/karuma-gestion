export type DbRole = {
  id: string;
  name_zh: string;
  created_at: string;
};

export type DbUser = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role_id: string;
  employee_key: string | null;
  created_at: string;
};

export type DbStaff = {
  id: string;
  name: string;
  department: string | null;
  position: string;
  role_id: string;
  phone: string | null;
  email: string | null;
  hire_date: string | null;
  contract_type: string | null;
  weekly_hours: number | null;
  hourly_rate: number;
  status: string;
  fixed_rest_day_1: string | null;
  fixed_rest_day_2: string | null;
  fixed_shift: string | null;
  created_at: string;
  updated_at: string;
};

export type DbStaffInsert = {
  id?: string;
  name: string;
  department?: string | null;
  position: string;
  role_id: string;
  phone?: string | null;
  email?: string | null;
  hire_date?: string | null;
  contract_type?: string | null;
  weekly_hours?: number | null;
  hourly_rate?: number;
  status?: string;
  fixed_rest_day_1?: string | null;
  fixed_rest_day_2?: string | null;
  fixed_shift?: string | null;
};

export type DbStaffUpdate = Partial<DbStaffInsert>;

export type DbUserInsert = {
  id?: string;
  email: string;
  password_hash: string;
  name: string;
  role_id: string;
  employee_key?: string | null;
};

export type DbAttendanceCredential = {
  employee_key: string;
  pin_hash: string;
  active: boolean;
  updated_at: string;
};

export type DbAttendanceEvent = {
  id: string;
  request_id: string;
  employee_key: string;
  employee_name: string;
  event_type: "in" | "out";
  occurred_at: string;
  received_at: string;
  business_date: string;
  source: "kiosk" | "mobile" | "admin";
  offline: boolean;
  device_id: string | null;
  latitude: number | null;
  longitude: number | null;
  location_accuracy: number | null;
  distance_from_store: number | null;
  created_at: string;
};

export type DbAttendanceEventInsert = {
  id?: string;
  request_id: string;
  employee_key: string;
  employee_name: string;
  event_type: "in" | "out";
  occurred_at: string;
  received_at?: string;
  business_date: string;
  source?: "kiosk" | "mobile" | "admin";
  offline?: boolean;
  device_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_accuracy?: number | null;
  distance_from_store?: number | null;
};

export type DbAttendanceCorrection = {
  id: string;
  employee_key: string;
  employee_name: string;
  event_type: "in" | "out";
  occurred_at: string;
  business_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  applied_event_id: string | null;
  created_at: string;
};

export type DbAttendanceCorrectionInsert = {
  id?: string;
  employee_key: string;
  employee_name: string;
  event_type: "in" | "out";
  occurred_at: string;
  business_date: string;
  reason: string;
  status?: "pending" | "approved" | "rejected";
};

export type TurnoServicio = "Comida" | "Cena" | "Descanso";

export type DbTurno = {
  id: string;
  employee_key: string;
  dia: number;
  servicio: TurnoServicio;
  hora_inicio: string | null;
  hora_fin: string | null;
  updated_at: string;
};

export type DbTurnoInsert = {
  id?: string;
  employee_key: string;
  dia: number;
  servicio: TurnoServicio;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  updated_at?: string;
};

// ── Reservas types ──────────────────────────────────────────────────────────

export type DbMesa = {
  id: number;
  numero: number;
  capacidad: number;
  zona: string | null;
  combinable: boolean;
  activa: boolean;
  pos_x: number | null;
  pos_y: number | null;
  adjacent_mesa_ids: number[];
  ancho: number | null;
  alto: number | null;
  forma: string | null;
};

export type DbClienteReserva = {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
  visitas: number;
  no_shows: number;
  vip: boolean;
  bloqueado: boolean;
  notas: string | null;
  ultima_visita: string | null;
  created_at: string;
  updated_at: string;
};

export type DbReserva = {
  id: string;
  cliente_id: string | null;
  fecha: string;
  hora_inicio: string;
  duracion_min: number;
  servicio: "comida" | "cena";
  personas: number;
  mesa_ids: number[];
  estado: "Confirmada" | "Sentado" | "Finalizada" | "Cancelada" | "NoShow" | "WalkIn";
  seated_at: string | null;
  notas: string | null;
  origen: "online" | "telefono" | "walkin" | "manual";
  confirmation_email_sent_at: string | null;
  confirmation_email_send_key: string | null;
  review_email_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbReservasConfig = {
  id: number;
  reservas_online_activas: boolean;
  max_personas_online: number;
  intervalo_min: number;
  turno_gap_min: number;
  duracion_1_2_min: number;
  duracion_3_4_min: number;
  duracion_5_6_min: number;
  dias_max_antelacion: number;
  capacidad_online_pct: number;
  comida_inicio: string;
  comida_fin: string;
  cena_inicio: string;
  cena_fin: string;
  telefono: string | null;
  whatsapp: string | null;
  google_review_link: string | null;
};

export type DbCierreServicio = {
  id: number;
  fecha: string;
  servicio: "comida" | "cena" | "todo" | null;
  motivo: string | null;
  created_at: string;
};

export type DbListaEspera = {
  id: string;
  fecha: string;
  servicio: "comida" | "cena";
  nombre: string;
  telefono: string;
  personas: number;
  notas: string | null;
  origen: "online" | "staff";
  estado: "esperando" | "sentado" | "cancelado";
  created_at: string;
};

export type DbListaEsperaInsert = {
  id?: string;
  fecha: string;
  servicio: "comida" | "cena";
  nombre: string;
  telefono: string;
  personas: number;
  notas?: string | null;
  origen?: "online" | "staff";
  estado?: "esperando" | "sentado" | "cancelado";
  created_at?: string;
};

export type DbAnnouncement = {
  id: string;
  employee_key: string;
  employee_name: string;
  department: string;
  title: string;
  description: string;
  priority: "low" | "normal" | "high";
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export type DbAnnouncementInsert = {
  id?: string;
  employee_key: string;
  employee_name: string;
  department: string;
  title: string;
  description: string;
  priority?: "low" | "normal" | "high";
  completed?: boolean;
};

export type DbAnnouncementUpdate = Partial<Omit<DbAnnouncementInsert, "id" | "employee_key" | "employee_name" | "department">>;

export type DbAnnouncementRead = {
  announcement_id: string;
  employee_key: string;
  read_at: string;
};

export type DbInventoryItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_quantity: number;
  minimum_quantity: number;
  unit_cost: number;
  supplier_name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type DbInventoryMovement = {
  id: string;
  item_id: string;
  movement_type: "entrada" | "salida" | "ajuste";
  quantity: number;
  note: string;
  created_by: string | null;
  created_at: string;
};

// ── Ventas diarias (026_sales.sql) ───────────────────────────────────────────

export type DbSalesDaily = {
  id: string;
  location_id: string;
  business_date: string;
  gross_sales: number | null;
  net_sales: number;
  customers: number | null;
  orders: number | null;
  average_ticket: number | null;
  drink_sales: number | null;
  delivery_sales: number | null;
  cash_sales: number | null;
  card_sales: number | null;
  source: string;
  external_id: string | null;
  notes: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbSalesDailyInsert = {
  id?: string;
  location_id: string;
  business_date: string;
  gross_sales?: number | null;
  net_sales?: number;
  customers?: number | null;
  orders?: number | null;
  average_ticket?: number | null;
  drink_sales?: number | null;
  delivery_sales?: number | null;
  cash_sales?: number | null;
  card_sales?: number | null;
  source?: string;
  external_id?: string | null;
  notes?: string | null;
  synced_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type DbSalesImportLog = {
  id: string;
  source: string;
  file_name: string | null;
  total_rows: number;
  inserted_rows: number;
  updated_rows: number;
  skipped_rows: number;
  status: string;
  error_message: string | null;
  created_at: string;
};

export type DbSalesImportLogInsert = {
  id?: string;
  source: string;
  file_name?: string | null;
  total_rows?: number;
  inserted_rows?: number;
  updated_rows?: number;
  skipped_rows?: number;
  status: string;
  error_message?: string | null;
  created_at?: string;
};

export type DbDishReorderDaily = {
  id: string;
  location_id: string;
  business_date: string;
  item_id: string;
  item_name: string;
  category: string | null;
  orders_with_item: number;
  reordered_orders: number;
  reorder_events: number;
  total_qty: number;
  reorder_qty: number;
  gap_minutes_sum: number;
  gap_samples: number;
  covered_orders: number;
  kds_rows: number;
  source: string;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbDishReorderDailyInsert = Omit<DbDishReorderDaily, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type DbRestosuiteSyncSession = {
  location_id: string;
  base_url: string;
  vulcan_token: string;
  corporation_id: string;
  brand_id: string;
  shop_id: string;
  organization_id: string;
  organization_type: string;
  accept_timezone: string;
  language_code: string;
  currency: string;
  updated_at: string;
  created_at: string;
};

export type DbRestosuiteSyncSessionInsert = Omit<DbRestosuiteSyncSession, "created_at" | "updated_at" | "base_url" | "accept_timezone" | "language_code" | "currency"> & {
  base_url?: string;
  accept_timezone?: string;
  language_code?: string;
  currency?: string;
  created_at?: string;
  updated_at?: string;
};

export type DbRestosuiteSyncSessionUpdate = Partial<DbRestosuiteSyncSessionInsert>;

export type DbCeoConversation = {
  id: string;
  user_email: string;
  user_name: string;
  role: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type DbCeoConversationInsert = {
  id?: string;
  user_email: string;
  user_name: string;
  role: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
};

export type DbCeoMessage = {
  id: string;
  conversation_id: string;
  sender: "user" | "assistant" | "tool" | "system";
  content: string;
  created_at: string;
};

export type DbCeoMessageInsert = {
  id?: string;
  conversation_id: string;
  sender: "user" | "assistant" | "tool" | "system";
  content: string;
  created_at?: string;
};

export type DbCeoAction = {
  id: string;
  conversation_id: string;
  label: string;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
  updated_at: string;
};

export type DbCeoActionInsert = {
  id?: string;
  conversation_id: string;
  label: string;
  status?: "pending" | "confirmed" | "cancelled";
  created_at?: string;
  updated_at?: string;
};

export type DbCeoDraft = {
  id: string;
  conversation_id: string;
  draft_type: "purchase_note" | "staff_message" | "review_reply" | "ops_note";
  title: string;
  content: string;
  status: "draft" | "reviewed" | "archived";
  created_at: string;
  updated_at: string;
};

export type DbCeoDraftInsert = {
  id?: string;
  conversation_id: string;
  draft_type: "purchase_note" | "staff_message" | "review_reply" | "ops_note";
  title: string;
  content: string;
  status?: "draft" | "reviewed" | "archived";
  created_at?: string;
  updated_at?: string;
};

// ── Identity System v1.0 ───────────────────────────────────────────────────

export type DbAuthAccount = {
  id: string;
  auth_user_id: string;
  phone: string | null;
  display_name: string;
  role_id: string;
  status: 'active' | 'disabled' | 'suspended';
  password_changed_at: string | null;
  last_login_at: string | null;
  last_login_ip: string | null;
  mfa_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type DbAuthAccountInsert = {
  auth_user_id: string;
  phone?: string | null;
  display_name: string;
  role_id?: string;
  status?: 'active' | 'disabled' | 'suspended';
  mfa_enabled?: boolean;
};

export type DbAuthAccountUpdate = Partial<Omit<DbAuthAccount, "id" | "auth_user_id" | "created_at" | "updated_at">>;

export type DbAuthOtpSession = {
  id: string;
  phone: string;
  code: string;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  verified_at: string | null;
  account_id: string | null;
  created_at: string;
};

export type DbAuthOtpSessionInsert = {
  phone: string;
  code: string;
  attempts?: number;
  max_attempts?: number;
  expires_at: string;
  verified_at?: string | null;
  account_id?: string | null;
};

export type DbAuthLoginLog = {
  id: string;
  account_id: string | null;
  login_method: 'password' | 'otp' | 'google' | 'apple';
  status: 'success' | 'failed';
  ip_address: string | null;
  user_agent: string | null;
  device_info: Record<string, unknown> | null;
  failure_reason: string | null;
  created_at: string;
};

export type DbAuthLoginLogInsert = {
  account_id?: string | null;
  login_method: 'password' | 'otp' | 'google' | 'apple';
  status: 'success' | 'failed';
  ip_address?: string | null;
  user_agent?: string | null;
  device_info?: Record<string, unknown> | null;
  failure_reason?: string | null;
};

export type DbAuthSession = {
  id: string;
  account_id: string;
  device_id: string;
  device_name: string | null;
  device_type: 'mobile' | 'desktop' | 'tablet' | null;
  browser_name: string | null;
  browser_version: string | null;
  os: string | null;
  ip_address: string | null;
  last_active_at: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

export type DbAuthSessionInsert = {
  account_id: string;
  device_id: string;
  device_name?: string | null;
  device_type?: 'mobile' | 'desktop' | 'tablet' | null;
  browser_name?: string | null;
  browser_version?: string | null;
  os?: string | null;
  ip_address?: string | null;
  last_active_at?: string;
  expires_at: string;
  revoked_at?: string | null;
};

export type DbAppConfig = {
  id: number;
  permissions_enabled: boolean;
  otp_max_attempts: number;
  otp_validity_minutes: number;
  session_duration_days: number;
  owner_phone: string | null;
  updated_at: string;
};

export type DbAppConfigInsert = Partial<Omit<DbAppConfig, 'id' | 'updated_at'>>;

// ── CEO Morning Brief ────────────────────────────────────────────────────────

export type DbCeoMorningBrief = {
  id: string;
  brief_date: string;
  data: unknown;
  text: string;
  generated_at: string;
  created_at: string;
};

export type DbCeoMorningBriefInsert = {
  brief_date: string;
  data: unknown;
  text: string;
  generated_at: string;
};

// ── Database ─────────────────────────────────────────────────────────────────

import type {
  DbCoachConversation,
  DbCoachConversationInsert,
  DbCoachIncidentReport,
  DbCoachIncidentReportInsert,
  DbCoachKnowledgeEntry,
  DbCoachKnowledgeEntryInsert,
  DbCoachMessage,
  DbCoachMessageInsert,
} from "../coach/types";
import type {
  DbCeoChangeRequest,
  DbCeoChangeRequestInsert,
} from "../ceo/change-center";
import type {
  DbBusinessEvent,
  DbBusinessEventInsert,
  DbOperationalAlert,
  DbOperationalAlertInsert,
  DbOperationalAlertUpdate,
} from "../operations/types";

// ── Finanzas privadas (solo owner) ──────────────────────────────────────────

export type DbGastoCategoria =
  | "alquiler"
  | "personal"
  | "seguros_sociales"
  | "proveedores"
  | "suministros"
  | "impuestos"
  | "marketing"
  | "comisiones"
  | "otros";

export type DbGasto = {
  id: string;
  fecha: string;
  categoria: DbGastoCategoria;
  concepto: string;
  importe: number;
  empresa: "kosushi" | "spicy";
  fuente: string;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type DbGastoInsert = Omit<DbGasto, "id" | "created_at" | "updated_at"> & {
  id?: string;
  notas?: string | null;
  fuente?: string;
};

export type DbDocumentoCategoria =
  | "bancos"
  | "contratos"
  | "nominas"
  | "impuestos"
  | "seguros"
  | "licencias"
  | "otros";

export type DbDocumento = {
  id: string;
  nombre: string;
  categoria: DbDocumentoCategoria;
  storage_path: string;
  mime_type: string | null;
  tamano_bytes: number | null;
  notas: string | null;
  created_at: string;
};

export type DbDocumentoInsert = Omit<DbDocumento, "id" | "created_at"> & {
  id?: string;
  mime_type?: string | null;
  tamano_bytes?: number | null;
  notas?: string | null;
};

// ─── Inbox: mensajes y reseñas (migración 038) ───────────────────────────────

export type DbInboxPlatform =
  | "instagram"
  | "google"
  | "tripadvisor"
  | "facebook"
  | "whatsapp"
  | "tiktok"
  | "email"
  | "booking"
  | "thefork"
  | "manual";

export type DbInboxKind = "dm" | "comment" | "mention" | "story_reply" | "review" | "question";
export type DbInboxDirection = "in" | "out";
export type DbInboxStatus = "nuevo" | "en_curso" | "respondido" | "cerrado" | "ignorado";
export type DbInboxPriority = "baja" | "normal" | "alta" | "urgente";

export type DbInboxAccount = {
  id: string;
  platform: DbInboxPlatform;
  external_account_id: string;
  display_name: string | null;
  access_token_enc: string | null;
  refresh_token_enc: string | null;
  token_expires_at: string | null;
  meta: Record<string, unknown>;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type DbInboxThread = {
  id: string;
  account_id: string | null;
  platform: DbInboxPlatform;
  kind: DbInboxKind;
  external_thread_id: string;
  customer_external_id: string | null;
  customer_name: string | null;
  customer_username: string | null;
  customer_avatar_url: string | null;
  language: string | null;
  rating: number | null;
  sentiment: number | null;
  intents: string[];
  is_complaint: boolean;
  status: DbInboxStatus;
  priority: DbInboxPriority;
  unread: boolean;
  first_inbound_at: string | null;
  last_inbound_at: string | null;
  last_message_at: string | null;
  replied: boolean;
  replied_at: string | null;
  replied_by: string | null;
  assigned_to: string | null;
  permalink: string | null;
  created_at: string;
  updated_at: string;
};

export type DbInboxThreadInsert = Partial<DbInboxThread> & {
  platform: DbInboxPlatform;
  kind: DbInboxKind;
  external_thread_id: string;
};

export type DbInboxMessage = {
  id: string;
  thread_id: string;
  platform: DbInboxPlatform;
  direction: DbInboxDirection;
  external_id: string | null;
  author_name: string | null;
  author_username: string | null;
  body: string | null;
  attachments: unknown[];
  raw: unknown;
  sent_at: string | null;
  received_at: string;
  created_at: string;
};

export type DbInboxMessageInsert = Partial<DbInboxMessage> & {
  thread_id: string;
  platform: DbInboxPlatform;
  direction: DbInboxDirection;
};

export type DbInboxAiSuggestion = {
  id: string;
  thread_id: string;
  message_id: string | null;
  model: string;
  language: string | null;
  reply_text: string;
  analysis: Record<string, unknown>;
  used: boolean;
  created_at: string;
};

export type DbInboxAiSuggestionInsert = Partial<DbInboxAiSuggestion> & {
  thread_id: string;
  model: string;
  reply_text: string;
};

export type DbInboxWebhookEvent = {
  id: string;
  platform: DbInboxPlatform;
  signature_ok: boolean;
  payload: unknown;
  processed_at: string | null;
  error: string | null;
  received_at: string;
};

export type DbInboxWebhookEventInsert = Partial<DbInboxWebhookEvent> & {
  platform: DbInboxPlatform;
  signature_ok: boolean;
  payload: unknown;
};

export type DbInboxSettings = {
  id: boolean;
  horario: Record<string, [string, string]>;
  sla_aviso_min: number;
  sla_urgente_min: number;
  palabras_prioridad: string[];
  ia_activa: boolean;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      business_events: {
        Row: DbBusinessEvent;
        Insert: DbBusinessEventInsert;
        Update: Partial<DbBusinessEventInsert>;
        Relationships: [];
      };
      operational_alerts: {
        Row: DbOperationalAlert;
        Insert: DbOperationalAlertInsert;
        Update: DbOperationalAlertUpdate;
        Relationships: [];
      };
      roles: {
        Row: DbRole;
        Insert: { id: string; name_zh: string };
        Update: Partial<{ id: string; name_zh: string }>;
        Relationships: [];
      };
      users: {
        Row: DbUser;
        Insert: DbUserInsert;
        Update: Partial<DbUserInsert>;
        Relationships: [];
      };
      staff: {
        Row: DbStaff;
        Insert: DbStaffInsert;
        Update: DbStaffUpdate;
        Relationships: [];
      };
      attendance_credentials: {
        Row: DbAttendanceCredential;
        Insert: Omit<DbAttendanceCredential, "updated_at"> & { updated_at?: string };
        Update: Partial<Omit<DbAttendanceCredential, "employee_key">>;
        Relationships: [];
      };
      attendance_events: {
        Row: DbAttendanceEvent;
        Insert: DbAttendanceEventInsert;
        Update: Partial<DbAttendanceEventInsert>;
        Relationships: [];
      };
      attendance_correction_requests: {
        Row: DbAttendanceCorrection;
        Insert: DbAttendanceCorrectionInsert;
        Update: Partial<DbAttendanceCorrection>;
        Relationships: [];
      };
      turnos: {
        Row: DbTurno;
        Insert: DbTurnoInsert;
        Update: Partial<DbTurnoInsert>;
        Relationships: [];
      };
      mesas: {
        Row: DbMesa;
        Insert: Omit<DbMesa, "id">;
        Update: Partial<Omit<DbMesa, "id">>;
        Relationships: [];
      };
      clientes_reservas: {
        Row: DbClienteReserva;
        Insert: {
          id?: string;
          nombre: string;
          telefono: string;
          email?: string | null;
          visitas?: number;
          no_shows?: number;
          vip?: boolean;
          bloqueado?: boolean;
          notas?: string | null;
          ultima_visita?: string | null;
        };
        Update: Partial<Omit<DbClienteReserva, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      reservas: {
        Row: DbReserva;
        Insert: Omit<
          DbReserva,
          "id" | "created_at" | "updated_at" | "seated_at" | "confirmation_email_sent_at" | "confirmation_email_send_key" | "review_email_sent_at"
        > & {
          id?: string;
          seated_at?: string | null;
          confirmation_email_sent_at?: string | null;
          confirmation_email_send_key?: string | null;
          review_email_sent_at?: string | null;
        };
        Update: Partial<Omit<DbReserva, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      reservas_config: {
        Row: DbReservasConfig;
        Insert: Partial<DbReservasConfig>;
        Update: Partial<DbReservasConfig>;
        Relationships: [];
      };
      cierres_servicio: {
        Row: DbCierreServicio;
        Insert: Omit<DbCierreServicio, "id" | "created_at">;
        Update: Partial<Omit<DbCierreServicio, "id" | "created_at">>;
        Relationships: [];
      };
      lista_espera: {
        Row: DbListaEspera;
        Insert: DbListaEsperaInsert;
        Update: Partial<DbListaEsperaInsert>;
        Relationships: [];
      };
      announcements: {
        Row: DbAnnouncement;
        Insert: DbAnnouncementInsert;
        Update: DbAnnouncementUpdate;
        Relationships: [];
      };
      announcement_reads: {
        Row: DbAnnouncementRead;
        Insert: DbAnnouncementRead;
        Update: Partial<DbAnnouncementRead>;
        Relationships: [];
      };
      inventory_items: {
        Row: DbInventoryItem;
        Insert: Omit<DbInventoryItem, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<DbInventoryItem, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      inventory_movements: {
        Row: DbInventoryMovement;
        Insert: Omit<DbInventoryMovement, "id" | "created_at">;
        Update: never;
        Relationships: [];
      };
      sales_daily: {
        Row: DbSalesDaily;
        Insert: DbSalesDailyInsert;
        Update: Partial<DbSalesDailyInsert>;
        Relationships: [];
      };
      sales_import_log: {
        Row: DbSalesImportLog;
        Insert: DbSalesImportLogInsert;
        Update: Partial<DbSalesImportLogInsert>;
        Relationships: [];
      };
      ceo_conversations: {
        Row: DbCeoConversation;
        Insert: DbCeoConversationInsert;
        Update: Partial<DbCeoConversationInsert>;
        Relationships: [];
      };
      ceo_messages: {
        Row: DbCeoMessage;
        Insert: DbCeoMessageInsert;
        Update: Partial<DbCeoMessageInsert>;
        Relationships: [];
      };
      ceo_actions: {
        Row: DbCeoAction;
        Insert: DbCeoActionInsert;
        Update: Partial<DbCeoActionInsert>;
        Relationships: [];
      };
      ceo_drafts: {
        Row: DbCeoDraft;
        Insert: DbCeoDraftInsert;
        Update: Partial<DbCeoDraftInsert>;
        Relationships: [];
      };
      ceo_change_requests: {
        Row: DbCeoChangeRequest;
        Insert: DbCeoChangeRequestInsert;
        Update: Partial<DbCeoChangeRequestInsert>;
        Relationships: [];
      };
      dish_reorder_daily: {
        Row: DbDishReorderDaily;
        Insert: DbDishReorderDailyInsert;
        Update: Partial<DbDishReorderDailyInsert>;
        Relationships: [];
      };
      restosuite_sync_sessions: {
        Row: DbRestosuiteSyncSession;
        Insert: DbRestosuiteSyncSessionInsert;
        Update: DbRestosuiteSyncSessionUpdate;
        Relationships: [];
      };
      coach_conversations: {
        Row: DbCoachConversation;
        Insert: DbCoachConversationInsert;
        Update: Partial<DbCoachConversationInsert>;
        Relationships: [];
      };
      coach_messages: {
        Row: DbCoachMessage;
        Insert: DbCoachMessageInsert;
        Update: Partial<DbCoachMessageInsert>;
        Relationships: [];
      };
      coach_incident_reports: {
        Row: DbCoachIncidentReport;
        Insert: DbCoachIncidentReportInsert;
        Update: Partial<DbCoachIncidentReportInsert>;
        Relationships: [];
      };
      coach_knowledge_entries: {
        Row: DbCoachKnowledgeEntry;
        Insert: DbCoachKnowledgeEntryInsert;
        Update: Partial<DbCoachKnowledgeEntryInsert>;
        Relationships: [];
      };
      ceo_morning_briefs: {
        Row: DbCeoMorningBrief;
        Insert: DbCeoMorningBriefInsert;
        Update: Partial<DbCeoMorningBriefInsert>;
        Relationships: [];
      };
      auth_accounts: {
        Row: DbAuthAccount;
        Insert: DbAuthAccountInsert;
        Update: DbAuthAccountUpdate;
        Relationships: [];
      };
      auth_otp_sessions: {
        Row: DbAuthOtpSession;
        Insert: DbAuthOtpSessionInsert;
        Update: Partial<DbAuthOtpSessionInsert>;
        Relationships: [];
      };
      auth_login_logs: {
        Row: DbAuthLoginLog;
        Insert: DbAuthLoginLogInsert;
        Update: Partial<DbAuthLoginLogInsert>;
        Relationships: [];
      };
      auth_sessions: {
        Row: DbAuthSession;
        Insert: DbAuthSessionInsert;
        Update: Partial<DbAuthSessionInsert>;
        Relationships: [];
      };
      app_config: {
        Row: DbAppConfig;
        Insert: DbAppConfigInsert;
        Update: DbAppConfigInsert;
        Relationships: [];
      };
      gastos: {
        Row: DbGasto;
        Insert: DbGastoInsert;
        Update: Partial<DbGastoInsert>;
        Relationships: [];
      };
      documentos: {
        Row: DbDocumento;
        Insert: DbDocumentoInsert;
        Update: Partial<DbDocumentoInsert>;
        Relationships: [];
      };
      inbox_accounts: {
        Row: DbInboxAccount;
        Insert: Partial<DbInboxAccount> & {
          platform: DbInboxPlatform;
          external_account_id: string;
        };
        Update: Partial<DbInboxAccount>;
        Relationships: [];
      };
      inbox_threads: {
        Row: DbInboxThread;
        Insert: DbInboxThreadInsert;
        Update: Partial<DbInboxThread>;
        Relationships: [];
      };
      inbox_messages: {
        Row: DbInboxMessage;
        Insert: DbInboxMessageInsert;
        Update: Partial<DbInboxMessage>;
        Relationships: [];
      };
      inbox_ai_suggestions: {
        Row: DbInboxAiSuggestion;
        Insert: DbInboxAiSuggestionInsert;
        Update: Partial<DbInboxAiSuggestion>;
        Relationships: [];
      };
      inbox_webhook_events: {
        Row: DbInboxWebhookEvent;
        Insert: DbInboxWebhookEventInsert;
        Update: Partial<DbInboxWebhookEvent>;
        Relationships: [];
      };
      inbox_settings: {
        Row: DbInboxSettings;
        Insert: Partial<DbInboxSettings>;
        Update: Partial<DbInboxSettings>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      apply_inventory_movement: {
        Args: {
          p_item_id: string;
          p_movement_type: "entrada" | "salida" | "ajuste";
          p_quantity: number;
          p_note?: string;
        };
        Returns: DbInventoryItem;
      };
      create_online_reservation_atomic: {
        Args: {
          p_cliente_id: string | null;
          p_fecha: string;
          p_hora_inicio: string;
          p_servicio: string;
          p_personas: number;
          p_duracion_min: number;
          p_notas?: string | null;
        };
        Returns: {
          reservation_id: string;
          mesa_ids: number[];
        };
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
