import { NextResponse } from "next/server";
import { googleBusinessConfigured, listGoogleReviews } from "@/lib/google-reviews/google-api";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!googleBusinessConfigured()) {
    return NextResponse.json({ configured: false, reviews: [] });
  }

  try {
    const reviews = await listGoogleReviews();
    return NextResponse.json({ configured: true, reviews });
  } catch (error) {
    console.error("[google-reviews] list failed", error);
    return NextResponse.json(
      { configured: true, reviews: [], error: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 },
    );
  }
}
