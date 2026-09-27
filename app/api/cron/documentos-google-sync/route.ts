import { NextResponse } from "next/server";
import { importGoogleDocuments } from "@/lib/documentos/google-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const result = await importGoogleDocuments({ gmailLimit: 200, driveLimit: 500 });
  const hasError = "error" in result.gmail || "error" in result.drive ||
    ("failed" in result.gmail && result.gmail.failed > 0) ||
    ("failed" in result.drive && result.drive.failed > 0);

  if (hasError) {
    console.error("[documentos] scheduled Google sync partially failed", result);
  }

  return NextResponse.json(
    { success: !hasError, startedAt, ...result },
    { status: hasError ? 500 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
