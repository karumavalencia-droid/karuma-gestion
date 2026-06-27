import { NextResponse } from "next/server";
import {
  deleteFactura,
  isFacturasStorageConfigured,
  readFacturasStore,
  upsertFacturas,
  type FacturaInput,
} from "@/lib/facturas/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isFacturasStorageConfigured()) {
    return NextResponse.json({
      configured: false,
      updatedAt: null,
      facturas: [],
    });
  }

  try {
    const store = await readFacturasStore();
    return NextResponse.json({
      configured: true,
      updatedAt: store.updatedAt,
      facturas: store.facturas,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to read invoices" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isFacturasStorageConfigured()) {
    return NextResponse.json(
      { error: "Invoice storage is not configured" },
      { status: 503 },
    );
  }

  try {
    const payload = (await request.json()) as {
      factura?: FacturaInput;
      facturas?: FacturaInput[];
    };
    const inputs = Array.isArray(payload.facturas)
      ? payload.facturas
      : payload.factura
        ? [payload.factura]
        : [];

    if (inputs.length === 0) {
      return NextResponse.json({ error: "No invoices received" }, { status: 422 });
    }

    const result = await upsertFacturas(inputs);
    return NextResponse.json({
      success: true,
      inserted: result.inserted,
      updated: result.updated,
      updatedAt: result.store.updatedAt,
      facturas: result.store.facturas,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save invoices" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isFacturasStorageConfigured()) {
    return NextResponse.json(
      { error: "Invoice storage is not configured" },
      { status: 503 },
    );
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing invoice id" }, { status: 422 });

    const store = await deleteFactura(id);
    return NextResponse.json({
      success: true,
      updatedAt: store.updatedAt,
      facturas: store.facturas,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete invoice" },
      { status: 500 },
    );
  }
}
