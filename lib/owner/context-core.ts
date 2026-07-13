// ─── Núcleo del contexto del propietario (sin origen de cookies) ──────────────
// Deriva el estado owner+MFA a partir de CUALQUIER cliente Supabase Auth (el de
// Server Components o el de middleware). No importa next/headers para poder
// usarse también en el edge (middleware).
//
// La comprobación de "es owner" se hace con service role (control del servidor),
// NUNCA con user_metadata.

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { OwnerProfileRow } from "./db-types";

export type OwnerGate =
  | "unauthenticated"
  | "not_owner"
  | "needs_setup"
  | "needs_verify"
  | "ok";

export interface OwnerContext {
  gate: OwnerGate;
  userId: string | null;
  email: string | null;
  isOwner: boolean;
  aal: "aal1" | "aal2" | null;
  hasVerifiedFactor: boolean;
}

const UNAUTH: OwnerContext = {
  gate: "unauthenticated",
  userId: null,
  email: null,
  isOwner: false,
  aal: null,
  hasVerifiedFactor: false,
};

async function isActiveOwner(userId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;
  const { data, error } = await admin
    .from("owner_profiles")
    .select("user_id, is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle<Pick<OwnerProfileRow, "user_id" | "is_active">>();
  return Boolean(!error && data);
}

/**
 * Deriva el contexto del propietario. Nunca lanza: ante cualquier fallo devuelve
 * el estado más restrictivo posible.
 */
export async function deriveOwnerContext(
  supabase: SupabaseClient,
): Promise<OwnerContext> {
  let user: User | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return UNAUTH;
    user = data.user;
  } catch {
    return UNAUTH;
  }

  const email = user.email ?? null;

  const owner = await isActiveOwner(user.id);
  if (!owner) {
    return { gate: "not_owner", userId: user.id, email, isOwner: false, aal: null, hasVerifiedFactor: false };
  }

  let currentLevel: string | null = null;
  let nextLevel: string | null = null;
  try {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    currentLevel = data?.currentLevel ?? null;
    nextLevel = data?.nextLevel ?? null;
  } catch {
    currentLevel = null;
    nextLevel = null;
  }

  const hasVerifiedFactor = nextLevel === "aal2" || currentLevel === "aal2";
  const aal: "aal1" | "aal2" | null =
    currentLevel === "aal2" ? "aal2" : currentLevel === "aal1" ? "aal1" : null;

  if (aal === "aal2") {
    return { gate: "ok", userId: user.id, email, isOwner: true, aal, hasVerifiedFactor: true };
  }

  return {
    gate: hasVerifiedFactor ? "needs_verify" : "needs_setup",
    userId: user.id,
    email,
    isOwner: true,
    aal: aal ?? "aal1",
    hasVerifiedFactor,
  };
}

export function isOwnerAal2(ctx: OwnerContext): boolean {
  return ctx.gate === "ok";
}
