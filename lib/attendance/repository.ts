import { getSupabaseAdmin, isSupabaseConfigured } from "../supabase/admin";
import type {
  DbAttendanceCredential,
  DbAttendanceEvent,
  DbAttendanceEventInsert,
} from "../supabase/types";
import type { AttendanceEvent, AttendanceEventType } from "./types";

type MemoryStore = {
  events: AttendanceEvent[];
};

const globalStore = globalThis as typeof globalThis & {
  __karumaAttendanceMemory?: MemoryStore;
};

function memoryStore(): MemoryStore {
  if (!globalStore.__karumaAttendanceMemory) {
    globalStore.__karumaAttendanceMemory = { events: [] };
  }
  return globalStore.__karumaAttendanceMemory;
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
  if (!supabase) throw new Error("数据库未配置");
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
  if (!supabase) throw new Error("数据库未配置");
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
  if (!supabase) throw new Error("数据库未配置");
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
