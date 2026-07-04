import { NextResponse } from "next/server";
import { asesoriaEmail, enviarFacturasAsesoria, type EmpresaEnvio } from "@/lib/facturas/envio";
import {
  isFacturasStorageConfigured,
  readFacturasStore,
  upsertFacturas,
} from "@/lib/facturas/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isEmpresaEnvio(value: unknown): value is EmpresaEnvio {
  return value === "kosushi" || value === "spicy";
}

export async function POST(request: Request) {
  if (!isFacturasStorageConfigured()) {
    return NextResponse.json(
      { error: "El almacenamiento de facturas no está configurado" },
      { status: 503 },
    );
  }

  let payload: { empresa?: unknown; facturaIds?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido" }, { status: 422 });
  }

  if (!isEmpresaEnvio(payload.empresa)) {
    return NextResponse.json({ error: "Empresa inválida" }, { status: 422 });
  }
  const empresa = payload.empresa;

  const ids = Array.isArray(payload.facturaIds)
    ? payload.facturaIds.filter((id): id is string => typeof id === "string")
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "No se indicaron facturas" }, { status: 422 });
  }

  try {
    const store = await readFacturasStore();
    const byId = new Map(store.facturas.map((f) => [f.id, f]));
    const facturas = ids
      .map((id) => byId.get(id))
      .filter((f): f is NonNullable<typeof f> => Boolean(f));

    if (facturas.length === 0) {
      return NextResponse.json({ error: "Las facturas indicadas ya no existen" }, { status: 404 });
    }

    const result = await enviarFacturasAsesoria(empresa, facturas);
    if (!result.sent) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    const enviadoAt = Date.now();
    const updated = await upsertFacturas(
      facturas.map((f) => ({
        id: f.id,
        fecha: f.fecha,
        enviadoAt,
        enviadoA: result.recipient,
      })),
    );

    return NextResponse.json({
      success: true,
      emails: result.emails,
      recipient: result.recipient,
      count: facturas.length,
      facturas: updated.store.facturas,
      updatedAt: updated.store.updatedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron enviar las facturas" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    recipients: {
      kosushi: asesoriaEmail("kosushi"),
      spicy: asesoriaEmail("spicy"),
    },
  });
}
