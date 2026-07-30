// ─── Contexto del propietario en Server Components / Route Handlers ───────────
// Construye el cliente SSR (cookies de next/headers) y delega en el núcleo.

import "server-only";
import { getSupabaseAuthServer } from "@/lib/supabase/ssr-server";
import { deriveOwnerContext, type OwnerContext } from "./context-core";

export type { OwnerContext, OwnerGate } from "./context-core";
export { isOwnerAal2 } from "./context-core";

const UNAUTH: OwnerContext = {
  gate: "unauthenticated",
  userId: null,
  email: null,
  isOwner: false,
  aal: null,
  hasVerifiedFactor: false,
};

/** Contexto del propietario para la petición actual (Server Component / API). */
export async function getOwnerContext(): Promise<OwnerContext> {
  const supabase = await getSupabaseAuthServer();
  if (!supabase) return UNAUTH;
  return deriveOwnerContext(supabase);
}
