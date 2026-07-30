"use client";

// ─── Cliente Supabase Auth para el navegador (cookies) ────────────────────────
// Usa createBrowserClient de @supabase/ssr para que la sesión del propietario se
// guarde en COOKIES (y así el middleware/servidor la puedan leer), no en
// localStorage. Solo ANON key pública.

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseAuthBrowser(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) client = createBrowserClient(url, key);
  return client;
}
