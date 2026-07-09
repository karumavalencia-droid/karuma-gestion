import { getSupabaseAdmin } from "../supabase/admin";
import type {
  DbAnnouncement,
  DbAnnouncementInsert,
  DbAnnouncementUpdate,
} from "../supabase/types";

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
): Promise<DbAnnouncement[]> {
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
  return (data ?? []).map(mapAnnouncement);
}

export async function listMyAnnouncements(
  employeeKey: string,
): Promise<DbAnnouncement[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Base de datos no configurada");

  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("employee_key", employeeKey)
    .order("created_at", { ascending: false })
    .returns<DbAnnouncement[]>();

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAnnouncement);
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
