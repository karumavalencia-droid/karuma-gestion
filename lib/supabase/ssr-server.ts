// ─── Cliente Supabase SSR (sesión Auth del propietario) ───────────────────────
// Cliente de Supabase Auth ligado a las cookies de la petición (next/headers).
// SOLO se usa para la sesión del propietario (login email+password + MFA/aal).
// Usa la ANON key pública (nunca la service-role en el navegador ni aquí).
//
// El resto de la app sigue usando el cookie propio `karuma_session` y el cliente
// admin (service role) — esto no los toca.

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Cliente SSR para Server Components / Route Handlers. Lee y (cuando puede)
 * refresca las cookies de sesión de Supabase Auth. En un Server Component la
 * escritura de cookies puede lanzar; se ignora con seguridad (el refresco real
 * ocurre en el middleware).
 */
export async function getSupabaseAuthServer(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component sin contexto de escritura: el middleware refresca.
        }
      },
    },
  });
}
