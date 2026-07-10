import { getSupabaseAdmin } from "../supabase/admin";
import type {
  DbAnnouncement,
  DbAnnouncementInsert,
  DbAnnouncementUpdate,
} from "../supabase/types";

export type AnnouncementWithReadStatus = DbAnnouncement & {
  is_read?: boolean;
};

function mapAnnouncement(row: DbAnnouncement): DbAnnouncement {
  return {
    id: row.id,
    employee_key: row.employee_key,
    employee_name: row.employee_name,
    department: row.department,
    title: row.title,
    description: row.description,
    priority: row.priority,
    completed: row.completed,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listAnnouncementsByDepartment(
  department: string,
  employeeKey?: string,
): Promise<AnnouncementWithReadStatus[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Base de datos no configurada");

  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("department", department)
    .eq("completed", false)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<DbAnnouncement[]>();

  if (error) throw new Error(error.message);

  const announcements = (data ?? []).map(mapAnnouncement);

  if (!employeeKey) return announcements;

  const { data: reads, error: readsError } = await supabase
    .from("announcement_reads")
    .select("announcement_id")
    .eq("employee_key", employeeKey)
    .returns<{ announcement_id: string }[]>();

  // Degradación elegante: si la tabla announcement_reads aún no existe
  // (migración 025 sin aplicar), tratamos todo como no leído en lugar de fallar.
  if (readsError) {
    if (readsError.code === "42P01") {
      return announcements.map((a) => ({ ...a, is_read: false }));
    }
    throw new Error(readsError.message);
  }

  const readIds = new Set((reads ?? []).map((r) => r.announcement_id));

  return announcements.map((a) => ({
    ...a,
    is_read: readIds.has(a.id),
  }));
}

export async function listMyAnnouncements(
  employeeKey: string,
): Promise<AnnouncementWithReadStatus[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Base de datos no configurada");

  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("employee_key", employeeKey)
    .order("created_at", { ascending: false })
    .returns<DbAnnouncement[]>();

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAnnouncement).map((a) => ({ ...a, is_read: false }));
}

export async function createAnnouncement(
  input: DbAnnouncementInsert,
): Promise<DbAnnouncement> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Base de datos no configurada");

  const { data, error } = await supabase
    .from("announcements")
    .insert([input])
    .select()
    .single()
    .returns<DbAnnouncement>();

  if (error) throw new Error(error.message);
  return mapAnnouncement(data);
}

export async function updateAnnouncement(
  id: string,
  input: DbAnnouncementUpdate,
): Promise<DbAnnouncement> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Base de datos no configurada");

  const { data, error } = await supabase
    .from("announcements")
    .update(input)
    .eq("id", id)
    .select()
    .single()
    .returns<DbAnnouncement>();

  if (error) throw new Error(error.message);
  return mapAnnouncement(data);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Base de datos no configurada");

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function markAnnouncementAsRead(
  announcementId: string,
  employeeKey: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Base de datos no configurada");

  // Delete existing read record if it exists, then insert
  await supabase
    .from("announcement_reads")
    .delete()
    .eq("announcement_id", announcementId)
    .eq("employee_key", employeeKey);

  const { error } = await supabase
    .from("announcement_reads")
    .insert([
      {
        announcement_id: announcementId,
        employee_key: employeeKey,
        read_at: new Date().toISOString(),
      },
    ]);

  if (error) throw new Error(error.message);
}

export async function markAnnouncementAsUnread(
  announcementId: string,
  employeeKey: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Base de datos no configurada");

  const { error } = await supabase
    .from("announcement_reads")
    .delete()
    .eq("announcement_id", announcementId)
    .eq("employee_key", employeeKey);

  if (error) throw new Error(error.message);
}
