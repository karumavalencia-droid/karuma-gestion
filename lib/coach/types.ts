/** Tipos de Karuma Coach (fase 1). Tablas de la migración 027_karuma_coach.sql. */

export const INCIDENT_CATEGORIES = [
  "equipment",
  "inventory",
  "hygiene",
  "customer_complaint",
  "safety",
  "other",
] as const;
export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

export const INCIDENT_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type IncidentPriority = (typeof INCIDENT_PRIORITIES)[number];

export const INCIDENT_STATUSES = [
  "pending",
  "reviewing",
  "resolved",
  "dismissed",
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const KNOWLEDGE_CATEGORIES = [
  "recipe",
  "rational",
  "pira",
  "service",
  "hygiene",
  "opening",
  "closing",
  "complaints",
  "equipment",
] as const;
export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number];

export type CoachSender = "user" | "assistant" | "tool";

export type DbCoachConversation = {
  id: string;
  user_email: string | null;
  employee_id: string | null;
  role: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type DbCoachConversationInsert = {
  id?: string;
  user_email?: string | null;
  employee_id?: string | null;
  role: string;
  title?: string | null;
  updated_at?: string;
};

export type DbCoachMessage = {
  id: string;
  conversation_id: string;
  sender: CoachSender;
  content: string;
  created_at: string;
};

export type DbCoachMessageInsert = {
  id?: string;
  conversation_id: string;
  sender: CoachSender;
  content: string;
};

export type DbCoachIncidentReport = {
  id: string;
  employee_id: string;
  employee_name: string | null;
  category: IncidentCategory;
  location: string | null;
  description: string;
  priority: IncidentPriority;
  status: IncidentStatus;
  source_conversation_id: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export type DbCoachIncidentReportInsert = {
  id?: string;
  employee_id: string;
  employee_name?: string | null;
  category: IncidentCategory;
  location?: string | null;
  description: string;
  priority?: IncidentPriority;
  status?: IncidentStatus;
  source_conversation_id?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
};

export type DbCoachKnowledgeEntry = {
  id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  keywords: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type DbCoachKnowledgeEntryInsert = {
  id?: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  keywords?: string[];
  active?: boolean;
  updated_at?: string;
};

/** Cuerpo aceptado por POST /api/coach/chat. Nada más se lee del cliente. */
export type CoachChatRequest = {
  conversationId?: string;
  message: string;
};

export type CoachChatResponse = {
  conversationId: string;
  reply: string;
};
