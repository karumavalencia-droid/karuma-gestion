import { NextResponse } from "next/server";
import { readFacturaAttachment, readFacturasStore } from "@/lib/facturas/storage";

export const dynamic = "force-dynamic";

function dataUrlToResponse(dataUrl: string, fileName: string) {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;

  return new NextResponse(Buffer.from(match[2], "base64"), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${encodeURIComponent(fileName || "factura")}"`,
      "Content-Type": match[1] || "application/octet-stream",
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const store = await readFacturasStore();
    const factura = store.facturas.find((item) => item.id === id);

    if (!factura) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (factura.archivoData) {
      const response = dataUrlToResponse(factura.archivoData, factura.archivoNombre);
      if (response) return response;
    }

    if (factura.archivoUrl && !factura.archivoPath) {
      return NextResponse.redirect(factura.archivoUrl);
    }

    if (!factura.archivoPath) {
      return NextResponse.json({ error: "Invoice file not found" }, { status: 404 });
    }

    const file = await readFacturaAttachment(factura.archivoPath);
    if (!file) {
      return NextResponse.json({ error: "Invoice file not found" }, { status: 404 });
    }

    return new NextResponse(file.bytes, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          factura.archivoNombre || "factura",
        )}"`,
        "Content-Type": factura.archivoTipo || file.contentType,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to read invoice file" },
      { status: 500 },
    );
  }
}
