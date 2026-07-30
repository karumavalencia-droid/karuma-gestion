// ─── Cliente Supabase SSR para middleware (edge) ──────────────────────────────
// El middleware NO puede usar next/headers cookies(); usa las cookies del
// NextRequest y propaga las actualizadas al NextResponse (refresco de sesión).

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest, NextResponse } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Crea un cliente Supabase Auth ligado a las cookies del request y que escribe
 * las cookies refrescadas en `response`. Devuelve null si falta configuración.
 */
export function getSupabaseAuthMiddleware(
  request: NextRequest,
  response: NextResponse,
): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });
}
