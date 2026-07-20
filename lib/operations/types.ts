export type AlertSeverity = "low" | "medium" | "high" | "critical";
export type AlertStatus = "open" | "acknowledged" | "resolved" | "dismissed";

export type DbBusinessEvent = {
  id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  actor_email: string | null;
  source: string;
  previous_state: Record<string, unknown> | null;
  next_state: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
};

export type DbBusinessEventInsert = {
  id?: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  actor_email?: string | null;
  source?: string;
  previous_state?: Record<string, unknown> | null;
  next_state?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  occurred_at?: string;
  created_at?: string;
};

export type DbOperationalAlert = {
  id: string;
  alert_type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  entity_type: string | null;
  entity_id: string | null;
  source: string;
  evidence: Record<string, unknown>;
  suggested_action: string | null;
  owner_email: string | null;
  due_at: string | null;
  detected_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
};

export type DbOperationalAlertInsert = {
  id?: string;
  alert_type: string;
  severity?: AlertSeverity;
  status?: AlertStatus;
  title: string;
  description: string;
  entity_type?: string | null;
  entity_id?: string | null;
  source?: string;
  evidence?: Record<string, unknown>;
  suggested_action?: string | null;
  owner_email?: string | null;
  due_at?: string | null;
  detected_at?: string;
};

export type DbOperationalAlertUpdate = Partial<DbOperationalAlertInsert> & {
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  resolution_note?: string | null;
  updated_at?: string;
};
