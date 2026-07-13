// ─── POST /api/security/session-bridge ────────────────────────────────────────
// Se llama tras completar el MFA en el navegador (aal2). El SERVIDOR reconfirma
// owner+aal2 leyendo la sesión Supabase Auth y solo entonces:
//   - emite el cookie karuma_session(owner) para usar la app de gestión,
//   - marca la actividad del propietario (inicia la ventana de inactividad),
//   - registra la verificación MFA en auditoría.
// El role "owner" lo fija el servidor; el cliente nunca lo envía.

import { NextResponse } from "next/server";
import { getOwnerContext } from "@/lib/owner/session";
import { mintOwnerKarumaSession } from "@/lib/owner/bridge";
import { touchOwnerActivity, NO_STORE_HEADERS } from "@/lib/owner/guards";
import { writePrivateAudit } from "@/lib/owner/audit";
import { isSameOrigin } from "@/lib/owner/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "bad_origin", message: "Origen no válido." },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }

  const ctx = await getOwnerContext();
  if (ctx.gate === "unauthenticated") {
    return NextResponse.json(
      { error: "not_authenticated", message: "Inicia sesión." },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }
  if (ctx.gate !== "ok" || !ctx.email) {
    // Autenticado pero aún no owner+aal2: no se emite nada.
    return NextResponse.json(
      { error: "mfa_required", message: "Verificación en dos pasos incompleta." },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }

  const response = NextResponse.json(
    { ok: true, redirect: "/owner" },
    { headers: NO_STORE_HEADERS },
  );
  await mintOwnerKarumaSession(response, { email: ctx.email });
  await touchOwnerActivity(response);

  await writePrivateAudit({
    actorId: ctx.userId,
    actorEmail: ctx.email,
    action: "mfa_verify",
    resource: "session",
    request,
  });

  return response;
}
