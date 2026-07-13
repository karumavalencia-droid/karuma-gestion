// ─── Puente Supabase Auth (aal2) → cookie karuma_session (owner) ──────────────
// Cuando el propietario alcanza aal2, se le emite ADEMÁS el cookie propio
// `karuma_session` con role=owner para que pueda usar la app de gestión normal
// (dashboard, reservas, etc.) sin tocar el flujo de empleados.
//
// El role SIEMPRE es "owner" fijado por el servidor tras confirmar owner+aal2
// (nunca proviene del cliente). La zona /owner privada exige, además de este
// cookie, una sesión Supabase Auth aal2 viva (doble condición).

import "server-only";
import type { NextResponse } from "next/server";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";

/**
 * Emite el cookie karuma_session(owner) en la respuesta. Se llama solo después
 * de verificar owner+aal2 en el servidor.
 */
export async function mintOwnerKarumaSession(
  response: NextResponse,
  owner: { email: string; name?: string | null },
): Promise<void> {
  const token = await createSessionToken({
    name: owner.name?.trim() || "Propietario",
    email: owner.email,
    role: "owner",
    employeeId: null,
  });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}
