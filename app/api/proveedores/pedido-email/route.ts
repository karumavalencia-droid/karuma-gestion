import { NextResponse } from "next/server";
import {
  enviarPedidoProveedor,
  isValidEmail,
  type PedidoEmailItem,
} from "@/lib/proveedores/pedido-email";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_ITEMS = 300;

function sanitizeText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function parseItems(value: unknown): PedidoEmailItem[] {
  if (!Array.isArray(value)) return [];

  const items: PedidoEmailItem[] = [];
  for (const raw of value.slice(0, MAX_ITEMS)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const codigo = sanitizeText(item.codigo, 40);
    const nombre = sanitizeText(item.nombre, 160);
    const cantidad = Number(item.cantidad);
    if (!codigo || !nombre || !Number.isFinite(cantidad)) continue;

    const formato = sanitizeText(item.formato, 80);
    const unidad = sanitizeText(item.unidad, 80);
    items.push({
      codigo,
      nombre,
      ...(formato ? { formato } : {}),
      ...(unidad ? { unidad } : {}),
      cantidad: Math.max(1, Math.min(999, Math.floor(cantidad))),
    });
  }

  return items;
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 422 });
  }

  const to = sanitizeText(payload.to, 160);
  if (!isValidEmail(to)) {
    return NextResponse.json({ error: "Email del proveedor no válido" }, { status: 422 });
  }

  const items = parseItems(payload.items);
  if (items.length === 0) {
    return NextResponse.json({ error: "El carrito está vacío" }, { status: 422 });
  }

  const supplierName = sanitizeText(payload.supplierName, 80) || "Proveedor";
  const observations = sanitizeText(payload.observations, 2000);

  try {
    const result = await enviarPedidoProveedor({ supplierName, to, items, observations });
    if (!result.sent) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    return NextResponse.json({
      success: true,
      recipient: result.recipient,
      items: items.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fallo al enviar el pedido" },
      { status: 500 },
    );
  }
}
