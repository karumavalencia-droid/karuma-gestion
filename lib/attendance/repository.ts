import { getSupabaseAdmin, isSupabaseConfigured } from "../supabase/admin";
import type {
  DbAttendanceCorrection,
  DbAttendanceCorrectionInsert,
  DbAttendanceCredential,
  DbAttendanceEvent,
  DbAttendanceEventInsert,
} from "../supabase/types";
import type {
  AttendanceCorrection,
  AttendanceCorrectionStatus,
  AttendanceEvent,
  AttendanceEventType,
} from "./types";

type MemoryStore = {
  events: AttendanceEvent[];
  corrections: AttendanceCorrection[];
};

const globalStore = globalThis as typeof globalThis & {
  __karumaAttendanceMemory?: MemoryStore;
};

function memoryStore(): MemoryStore {
  if (!globalStore.__karumaAttendanceMemory) {
    globalStore.__karumaAttendanceMemory = { events: [], corrections: [] };
  }
  return globalStore.__karumaAttendanceMemory;
}

function mapCorrection(row: DbAttendanceCorrection): AttendanceCorrection {
  return {
    id: row.id,
    employeeId: row.employee_key,
    employeeName: row.employee_name,
    type: row.event_type,
    occurredAt: row.occurred_at,
    businessDate: row.business_date,
    reason: row.reason,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
    appliedEventId: row.applied_event_id,
    createdAt: row.created_at,
  };
}

export async function listAttendanceCorrections(options?: {
  employeeId?: string;
  status?: AttendanceCorrectionStatus;
}): Promise<AttendanceCorrection[]> {
  requirePersistentStore();
  if (!isSupabaseConfigured()) {
    return memoryStore().corrections
      .filter((row) => !options?.employeeId || row.employeeId === options.employeeId)
      .filter((row) => !options?.status || row.status === options.status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Base de datos no configurada");
  let query = supabase
    .from("attendance_correction_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (options?.employeeId) query = query.eq("employee_key", options.employeeId);
  if (options?.status) query = query.eq("status", options.status);
  const { data, error } = await query.returns<DbAttendanceCorrection[]>();
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCorrection);
}

export async function createAttendanceCorrection(input: {
  employeeId: string;
  employeeName: string;
  type: AttendanceEventType;
  occurredAt: string;
  businessDate: string;
  reason: string;
}): Promise<AttendanceCorrection> {
  requirePersistentStore();
  const now = new Date().toISOString();
  if (!isSupabaseConfigured()) {
    const correction: AttendanceCorrection = {
      id: crypto.randomUUID(),
      ...input,
      status: "pending",
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      appliedEventId: null,
      createdAt: now,
    };
    memoryStore().corrections.push(correction);
    return correction;
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Base de datos no configurada");
  const row: DbAttendanceCorrectionInsert = {
    employee_key: input.employeeId,
    employee_name: input.employeeName,
    event_type: input.type,
    occurred_at: input.occurredAt,
    business_date: input.businessDate,
    reason: input.reason,
  };
  const { data, error } = await supabase
    .from("attendance_correction_requests")
    .insert(row)
    .select("*")
    .single()
    .returns<DbAttendanceCorrection>();
  if (error) throw new Error(error.message);
  return mapCorrection(data);
}

export async function reviewAttendanceCorrection(input: {
  id: string;
  status: Exclude<AttendanceCorrectionStatus, "pending">;
  reviewedBy: string;
  reviewNote?: string | null;
  appliedEventId?: string | null;
}): Promise<AttendanceCorrection | null> {
  requirePersistentStore();
  const reviewedAt = new Date().toISOString();
  if (!isSupabaseConfigured()) {
    const row = memoryStore().corrections.find((item) => item.id === input.id);
    if (!row) return null;
    Object.assign(row, {
      status: input.status,
      reviewedBy: input.reviewedBy,
      reviewedAt,
      reviewNote: input.reviewNote ?? null,
      appliedEventId: input.appliedEventId ?? null,
    });
    return row;
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Base de datos no configurada");
  const { data, error } = await supabase
    .from("attendance_correction_requests")
    .update({
      status: input.status,
      reviewed_by: input.reviewedBy,
      reviewed_at: reviewedAt,
      review_note: input.reviewNote ?? null,
      applied_event_id: input.appliedEventId ?? null,
    })
    .eq("id", input.id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle()
    .returns<DbAttendanceCorrection>();
  if (error) throw new Error(error.message);
  return data ? mapCorrection(data) : null;
}

function canUseMemoryStore(): boolean {
  return process.env.NODE_ENV !== "production";
}

function requirePersistentStore(): void {
  if (!isSupabaseConfigured() && !canUseMemoryStore()) {
    throw new Error("La base de datos de fichaje no está configurada");
  }
}

function mapEvent(row: DbAttendanceEvent): AttendanceEvent {
  return {
    id: row.id,
    requestId: row.request_id,
    employeeId: row.employee_key,
    employeeName: row.employee_name,
    type: row.event_type,
    occurredAt: row.occurred_at,
    receivedAt: row.received_at,
    businessDate: row.business_date,
    source: row.source,
    offline: row.offline,
    deviceId: row.device_id,
    latitude: row.latitude,
    longitude: row.longitude,
    locationAccuracy: row.location_accuracy,
    distanceFromStore: row.distance_from_store,
  };
}

export async function listAttendanceEvents(
  businessDate: string,
): Promise<AttendanceEvent[]> {
  requirePersistentStore();
  if (!isSupabaseConfigured()) {
    return memoryStore().events.filter((event) => event.businessDate === businessDate);
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Base de datos no configurada");
  const { data, error } = await supabase
    .from("attendance_events")
    .select("*")
    .eq("business_date", businessDate)
    .order("occurred_at")
    .returns<DbAttendanceEvent[]>();
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapEvent);
}

export async function findAttendanceEventByRequestId(
  requestId: string,
): Promise<AttendanceEvent | null> {
  requirePersistentStore();
  if (!isSupabaseConfigured()) {
    return memoryStore().events.find((event) => event.requestId === requestId) ?? null;
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Base de datos no configurada");
  const { data, error } = await supabase
    .from("attendance_events")
    .select("*")
    .eq("request_id", requestId)
    .maybeSingle()
    .returns<DbAttendanceEvent>();
  if (error) throw new Error(error.message);
  return data ? mapEvent(data) : null;
}

export async function createAttendanceEvent(input: {
  requestId: string;
  employeeId: string;
  employeeName: string;
  type: AttendanceEventType;
  occurredAt: string;
  businessDate: string;
  source?: "kiosk" | "mobile" | "admin";
  offline: boolean;
  deviceId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracy?: number | null;
  distanceFromStore?: number | null;
}): Promise<AttendanceEvent> {
  const now = new Date().toISOString();
  requirePersistentStore();
  if (!isSupabaseConfigured()) {
    const event: AttendanceEvent = {
      id: crypto.randomUUID(),
      requestId: input.requestId,
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      type: input.type,
      occurredAt: input.occurredAt,
      receivedAt: now,
      businessDate: input.businessDate,
      source: input.source ?? "kiosk",
      offline: input.offline,
      deviceId: input.deviceId ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      locationAccuracy: input.locationAccuracy ?? null,
      distanceFromStore: input.distanceFromStore ?? null,
    };
    memoryStore().events.push(event);
    return event;
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Base de datos no configurada");
  const row: DbAttendanceEventInsert = {
    request_id: input.requestId,
    employee_key: input.employeeId,
    employee_name: input.employeeName,
    event_type: input.type,
    occurred_at: input.occurredAt,
    business_date: input.businessDate,
    source: input.source ?? "kiosk",
    offline: input.offline,
    device_id: input.deviceId ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    location_accuracy: input.locationAccuracy ?? null,
    distance_from_store: input.distanceFromStore ?? null,
  };
  const { data, error } = await supabase
    .from("attendance_events")
    .insert(row)
    .select("*")
    .single()
    .returns<DbAttendanceEvent>();
  if (error) throw new Error(error.message);
  return mapEvent(data);
}

export async function getAttendancePinHash(employeeId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("attendance_credentials")
    .select("employee_key, pin_hash, active, updated_at")
    .eq("employee_key", employeeId)
    .eq("active", true)
    .maybeSingle()
    .returns<DbAttendanceCredential>();
  if (error) return null;
  return data?.pin_hash ?? null;
}
