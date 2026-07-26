import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "./admin";

/**
 * Legacy supplier tables are not fully represented in Database yet.
 * Keep this boundary explicit until those tables are regenerated into types.
 */
export function getLegacySupabaseAdmin(): SupabaseClient | null {
  return getSupabaseAdmin() as unknown as SupabaseClient | null;
}
