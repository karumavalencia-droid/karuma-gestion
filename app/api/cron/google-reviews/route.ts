import { NextResponse } from "next/server";
import { generateAiReply } from "@/lib/google-reviews/ai-reply";
import { googleBusinessConfigured, listGoogleReviews, replyToGoogleReview } from "@/lib/google-reviews/google-api";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!googleBusinessConfigured()) return NextResponse.json({ ok: true, configured: false, replied: 0 });
  if (process.env.GOOGLE_REVIEWS_AUTO_REPLY !== "true") {
    return NextResponse.json({ ok: true, configured: true, autoReply: false, replied: 0 });
  }

  try {
    const reviews = await listGoogleReviews();
    const eligible = reviews.filter((review) => review.rating >= 4 && !review.reply);
    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const review of eligible) {
      try {
        const reply = generateAiReply(review.rating, review.comment);
        await replyToGoogleReview(review.name, reply);
        results.push({ id: review.id, ok: true });
      } catch (error) {
        results.push({ id: review.id, ok: false, error: error instanceof Error ? error.message : "Unknown error" });
      }
    }

    return NextResponse.json({
      ok: true,
      configured: true,
      autoReply: true,
      scanned: reviews.length,
      eligible: eligible.length,
      replied: results.filter((item) => item.ok).length,
      results,
    });
  } catch (error) {
    console.error("[google-reviews-cron] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 },
    );
  }
}
