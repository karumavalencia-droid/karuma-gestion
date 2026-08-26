import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { getLegacySupabaseAdmin } from "@/lib/supabase/legacy-client";

const MAX_STATE_BYTES = 900_000;
const SUPPLIER_SLUG = /^[a-z0-9_-]{2,80}$/;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && item.length <= 200))].slice(0, max);
}

function normalizeState(value: unknown, previousState: Record<string, unknown> = {}): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const state: Record<string, unknown> = {
    favorites: normalizeStringArray(raw.favorites, 2000),
    orders: Array.isArray(raw.orders) ? raw.orders.slice(0, 100) : [],
    cart: Array.isArray(raw.cart) ? raw.cart.slice(0, 300) : [],
    whatsappNumber: typeof raw.whatsappNumber === "string" ? raw.whatsappNumber.replace(/\D/g, "").slice(0, 20) : "",
    wechatId: typeof raw.wechatId === "string" ? raw.wechatId.slice(0, 100) : "",
    observations: typeof raw.observations === "string" ? raw.observations.slice(0, 2000) : "",
    pendingWechatOrders: Array.isArray(raw.pendingWechatOrders)
      ? raw.pendingWechatOrders.slice(0, 10)
      : Array.isArray(previousState.pendingWechatOrders)
        ? previousState.pendingWechatOrders.slice(0, 10)
        : [],
  };
  return JSON.stringify(state).length <= MAX_STATE_BYTES ? state : {};
}

async function getContext(request: NextRequest, supplier: string) {
  const user = await getSessionUser(request);
  if (!user) return { error: jsonError("No has iniciado sesión", 401) } as const;
  if (!SUPPLIER_SLUG.test(supplier)) return { error: jsonError("Proveedor no válido", 400) } as const;
  const supabase = getLegacySupabaseAdmin();
  if (!supabase) return { error: jsonError("Sin conexión con la base de datos", 503) } as const;
  return { user, supabase } as const;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ supplier: string }> },
) {
  const { supplier } = await params;
  const context = await getContext(request, supplier.toLowerCase());
  if ("error" in context) return context.error;

  const { data, error } = await context.supabase
    .from("supplier_catalog_state")
    .select("state,updated_at")
    .eq("user_email", context.user.email.toLowerCase())
    .eq("supplier_slug", supplier.toLowerCase())
    .maybeSingle();

  if (error) {
    console.error("[supplier-catalog-state] read failed", error.message);
    return jsonError("No se pudo leer la sincronización", 500);
  }

  return NextResponse.json(
    { state: data?.state ?? null, updatedAt: data?.updated_at ?? null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ supplier: string }> },
) {
  const { supplier } = await params;
  const context = await getContext(request, supplier.toLowerCase());
  if ("error" in context) return context.error;

  const body = await request.json().catch(() => null) as { state?: unknown } | null;
  const previous = await context.supabase
    .from("supplier_catalog_state")
    .select("state")
    .eq("user_email", context.user.email.toLowerCase())
    .eq("supplier_slug", supplier.toLowerCase())
    .maybeSingle();
  const previousState = previous.data?.state && typeof previous.data.state === "object"
    ? previous.data.state as Record<string, unknown>
    : {};
  const state = normalizeState(body?.state, previousState);
  const { error } = await context.supabase
    .from("supplier_catalog_state")
    .upsert(
      {
        user_email: context.user.email.toLowerCase(),
        supplier_slug: supplier.toLowerCase(),
        state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_email,supplier_slug" },
    );

  if (error) {
    console.error("[supplier-catalog-state] write failed", error.message);
    return jsonError("No se pudo guardar la sincronización", 500);
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
