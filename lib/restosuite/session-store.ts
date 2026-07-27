import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  DbRestosuiteSyncSession,
  DbRestosuiteSyncSessionInsert,
} from "@/lib/supabase/types";
import type { RestosuiteReportConfig } from "@/lib/sales-sync/config";

export type RestosuiteSessionSource = "env" | "supabase" | null;

export type RestosuiteSessionConfig = RestosuiteReportConfig & {
  source: RestosuiteSessionSource;
  locationId: string | null;
};

export async function readRestosuiteSession(
  locationId: string,
): Promise<DbRestosuiteSyncSession | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("restosuite_sync_sessions")
    .select("*")
    .eq("location_id", locationId)
    .maybeSingle<DbRestosuiteSyncSession>();

  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function upsertRestosuiteSession(
  session: DbRestosuiteSyncSessionInsert,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase no está configurado");

  const { error } = await supabase
    .from("restosuite_sync_sessions")
    .upsert(
      {
        ...session,
        base_url: session.base_url ?? "https://bo.eu.restosuite.ai",
        accept_timezone: session.accept_timezone ?? "UTC+2",
        language_code: session.language_code ?? "zh_CN",
        currency: session.currency ?? "EUR",
      },
      { onConflict: "location_id" },
    );
  if (error) throw new Error(error.message);
}
