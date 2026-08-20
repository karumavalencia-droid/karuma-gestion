import { NextResponse } from "next/server";
import { replyToGoogleReview } from "@/lib/google-reviews/google-api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { reviewName?: string; comment?: string };
    const reviewName = body.reviewName?.trim();
    const comment = body.comment?.trim();

    if (!reviewName || !comment) {
      return NextResponse.json({ error: "reviewName and comment are required" }, { status: 400 });
    }

    const reply = await replyToGoogleReview(reviewName, comment);
    return NextResponse.json({ ok: true, reply });
  } catch (error) {
    console.error("[google-reviews] reply failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 },
    );
  }
}
