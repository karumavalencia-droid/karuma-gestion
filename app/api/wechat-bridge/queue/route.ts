import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { getLegacySupabaseAdmin } from "@/lib/supabase/legacy-client";
import type { CominportOrder } from "@/src/data/cominportProducts";

const SUPPLIER_SLUG = /^[a-z0-9-]{2,80}$/;
const MAX_MESSAGE_LENGTH = 12_000;

type PendingWechatOrder = {
  id: string;
  supplier: string;
  message: string;
  order: CominportOrder;
  createdAt: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function readBridgeToken(request: NextRequest): string {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function tokenMatches(request: NextRequest): boolean {
  const expected = process.env.WECHAT_BRIDGE_TOKEN?.trim();
  const actual = readBridgeToken(request);
  if (!expected || !actual || expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

function ownerEmail(): string | null {
  const email = process.env.WECHAT_BRIDGE_OWNER_EMAIL?.trim().toLowerCase();
  return email && email.includes("@") ? email : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readPending(state: unknown): PendingWechatOrder[] {
  if (!isRecord(state) || !Array.isArray(state.pendingWechatOrders)) return [];
  return state.pendingWechatOrders.filter((item): item is PendingWechatOrder => {
    if (!isRecord(item)) return false;
    return typeof item.id === "string" && typeof item.supplier === "string" &&
      typeof item.message === "string" && isRecord(item.order) &&
      typeof item.createdAt === "string";
  }).slice(0, 10);
}

function readOrder(value: unknown): CominportOrder | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  return value as unknown as CominportOrder;
}

async function readState(supabase: ReturnType<typeof getLegacySupabaseAdmin>, email: string, supplier: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("supplier_catalog_state")
    .select("state")
    .eq("user_email", email)
    .eq("supplier_slug", supplier)
    .maybeSingle();
  if (error) throw error;
  return isRecord(data?.state) ? data.state : {};
}

async function writeState(
  supabase: ReturnType<typeof getLegacySupabaseAdmin>,
  email: string,
  supplier: string,
  state: Record<string, unknown>,
) {
  if (!supabase) throw new Error("database_unavailable");
  const { error } = await supabase.from("supplier_catalog_state").upsert({
    user_email: email,
    supplier_slug: supplier,
    state,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_email,supplier_slug" });
  if (error) throw error;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    supplier?: unknown;
    message?: unknown;
    order?: unknown;
  } | null;
  const supplier = typeof body?.supplier === "string" ? body.supplier.toLowerCase() : "";
  if (!SUPPLIER_SLUG.test(supplier)) return jsonError("Proveedor no válido", 400);
  if (typeof body?.message !== "string" || body.message.length === 0 || body.message.length > MAX_MESSAGE_LENGTH) {
    return jsonError("Mensaje no válido", 400);
  }
  if (!isRecord(body.order) || typeof body.order.id !== "string") {
    return jsonError("Pedido no válido", 400);
  }

  const user = await getSessionUser(request);
  if (!user) return jsonError("No has iniciado sesión", 401);
  if (!process.env.WECHAT_BRIDGE_TOKEN?.trim() || !ownerEmail()) {
    return jsonError("Puente WeChat no configurado", 503);
  }
  const supabase = getLegacySupabaseAdmin();
  if (!supabase) return jsonError("Sin conexión con la base de datos", 503);

  try {
    const state = await readState(supabase, user.email.toLowerCase(), supplier) ?? {};
    const order = readOrder(body.order);
    if (!order) return jsonError("Pedido no válido", 400);
    const pending = readPending(state).filter((item) => item.id !== order.id);
    const entry: PendingWechatOrder = {
      id: order.id,
      supplier,
      message: body.message,
      order,
      createdAt: new Date().toISOString(),
    };
    await writeState(supabase, user.email.toLowerCase(), supplier, {
      ...state,
      pendingWechatOrders: [...pending, entry].slice(-10),
    });
    return NextResponse.json({ ok: true, queued: true, orderId: entry.id });
  } catch (error) {
    console.error("[wechat-bridge] queue failed", error);
    return jsonError("No se pudo poner el pedido en cola", 500);
  }
}

export async function GET(request: NextRequest) {
  if (!tokenMatches(request)) return jsonError("Dispositivo no autorizado", 401);
  const email = ownerEmail();
  const supplier = request.nextUrl.searchParams.get("supplier")?.toLowerCase() ?? "yongxing";
  if (!email || !SUPPLIER_SLUG.test(supplier)) return jsonError("Configuración del puente incompleta", 503);
  const supabase = getLegacySupabaseAdmin();
  if (!supabase) return jsonError("Sin conexión con la base de datos", 503);
  try {
    const state = await readState(supabase, email, supplier);
    const next = readPending(state).find((item) => item.supplier === supplier) ?? null;
    return NextResponse.json({ order: next }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[wechat-bridge] poll failed", error);
    return jsonError("No se pudo consultar la cola", 500);
  }
}

export async function PATCH(request: NextRequest) {
  if (!tokenMatches(request)) return jsonError("Dispositivo no autorizado", 401);
  const body = await request.json().catch(() => null) as { supplier?: unknown; orderId?: unknown } | null;
  const email = ownerEmail();
  const supplier = typeof body?.supplier === "string" ? body.supplier.toLowerCase() : "";
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  if (!email || !SUPPLIER_SLUG.test(supplier) || !orderId) return jsonError("Datos no válidos", 400);
  const supabase = getLegacySupabaseAdmin();
  if (!supabase) return jsonError("Sin conexión con la base de datos", 503);
  try {
    const state = await readState(supabase, email, supplier) ?? {};
    await writeState(supabase, email, supplier, {
      ...state,
      pendingWechatOrders: readPending(state).filter((item) => item.id !== orderId),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[wechat-bridge] acknowledge failed", error);
    return jsonError("No se pudo confirmar el pedido", 500);
  }
}
