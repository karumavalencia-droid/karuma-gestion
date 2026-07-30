// ─── Fábrica de rutas CRUD para datos financieros privados ────────────────────
// Cada ruta /api/owner/finanzas/* comparte el mismo esqueleto seguro:
//   - requireOwnerApi() en CADA método (re-comprueba owner + aal2 + actividad),
//   - CSRF (isSameOrigin) en mutaciones,
//   - escritura con service role (RLS como defensa en profundidad),
//   - auditoría de view/create/delete,
//   - no-store en todas las respuestas.

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireOwnerApi, ownerJson, NO_STORE_HEADERS } from "./guards";
import { writePrivateAudit } from "./audit";
import { isSameOrigin } from "./validation";
import { NextResponse } from "next/server";

/** Admin sin tipado de tabla (las tablas privadas no están en Database). */
function admin(): SupabaseClient | null {
  return getSupabaseAdmin() as unknown as SupabaseClient | null;
}

function badRequest(message: string): NextResponse {
  return NextResponse.json(
    { error: "invalid_input", message },
    { status: 400, headers: NO_STORE_HEADERS },
  );
}

export interface FinanceRouteConfig {
  table: string;
  resource: string;
  orderBy: string;
  /** Valida el body del POST y devuelve la fila a insertar, o un mensaje de error. */
  parseCreate: (body: Record<string, unknown>) => Record<string, unknown> | { error: string };
}

export function makeFinanceRoute(config: FinanceRouteConfig) {
  async function GET() {
    const guard = await requireOwnerApi();
    if (!guard.ok) return guard.response;
    const db = admin();
    if (!db) return badRequest("Base de datos no disponible.");

    const { data, error } = await db
      .from(config.table)
      .select("*")
      .order(config.orderBy, { ascending: false })
      .limit(500);
    if (error) return badRequest("No se pudieron leer los datos.");

    await writePrivateAudit({
      actorId: guard.ctx.userId,
      actorEmail: guard.ctx.email,
      action: "view",
      resource: config.resource,
    });
    return ownerJson({ items: data ?? [] });
  }

  async function POST(request: Request) {
    const guard = await requireOwnerApi();
    if (!guard.ok) return guard.response;
    if (!isSameOrigin(request)) return badRequest("Origen no válido.");

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return badRequest("Solicitud inválida.");
    }
    const parsed = config.parseCreate(body);
    if ("error" in parsed) return badRequest(parsed.error as string);

    const db = admin();
    if (!db) return badRequest("Base de datos no disponible.");
    const { data, error } = await db
      .from(config.table)
      .insert({ ...parsed, created_by: guard.ctx.userId })
      .select("*")
      .single();
    if (error) return badRequest("No se pudo guardar.");

    await writePrivateAudit({
      actorId: guard.ctx.userId,
      actorEmail: guard.ctx.email,
      action: "create",
      resource: config.resource,
      resourceId: (data as { id?: string })?.id ?? null,
      request,
    });
    return ownerJson({ item: data }, { status: 201 });
  }

  async function DELETE(request: Request) {
    const guard = await requireOwnerApi();
    if (!guard.ok) return guard.response;
    if (!isSameOrigin(request)) return badRequest("Origen no válido.");

    const id = new URL(request.url).searchParams.get("id");
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return badRequest("Id inválido.");

    const db = admin();
    if (!db) return badRequest("Base de datos no disponible.");
    const { error } = await db.from(config.table).delete().eq("id", id);
    if (error) return badRequest("No se pudo borrar.");

    await writePrivateAudit({
      actorId: guard.ctx.userId,
      actorEmail: guard.ctx.email,
      action: "delete",
      resource: config.resource,
      resourceId: id,
      request,
    });
    return ownerJson({ ok: true });
  }

  return { GET, POST, DELETE };
}
