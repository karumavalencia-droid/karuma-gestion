import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/owner-guard";
import { importGoogleDocuments } from "@/lib/documentos/google-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const guard = await requireOwner(request);
  if ("response" in guard) return guard.response;

  let body: { gmailQuery?: unknown; gmailLimit?: unknown; driveLimit?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // Body is optional.
  }

  try {
    const result = await importGoogleDocuments({
      gmailQuery: typeof body.gmailQuery === "string" ? body.gmailQuery : undefined,
      gmailLimit: typeof body.gmailLimit === "number" ? body.gmailLimit : 200,
      driveLimit: typeof body.driveLimit === "number" ? body.driveLimit : 500,
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[documentos] google sync failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error sincronizando Gmail y Drive" },
      { status: 502 },
    );
  }
}
