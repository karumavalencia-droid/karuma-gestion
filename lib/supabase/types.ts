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
  notas: string | null;
  origen: "online" | "telefono" | "walkin" | "manual";
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

export type Database = {
  public: {
    Tables: {
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
        Insert: Omit<DbReserva, "id" | "created_at" | "updated_at" | "review_email_sent_at"> & {
          id?: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
