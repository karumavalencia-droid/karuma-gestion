type GoogleReviewApi = {
  name: string;
  reviewId: string;
  reviewer?: { displayName?: string; isAnonymous?: boolean };
  starRating?: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
  comment?: string;
  createTime?: string;
  updateTime?: string;
  reviewReply?: { comment?: string; updateTime?: string; reviewReplyState?: string; policyViolation?: string };
  reviewReplyUrl?: string;
};

export type GoogleReview = {
  name: string;
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createTime: string;
  updateTime: string;
  reply: string | null;
  replyState: string | null;
  policyViolation: string | null;
  replyUrl: string | null;
};

const STAR_TO_NUMBER = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 } as const;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function getAccessToken(): Promise<string> {
  const clientId = requiredEnv("GOOGLE_BUSINESS_CLIENT_ID");
  const clientSecret = requiredEnv("GOOGLE_BUSINESS_CLIENT_SECRET");
  const refreshToken = requiredEnv("GOOGLE_BUSINESS_REFRESH_TOKEN");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google OAuth token refresh failed (${response.status}): ${body}`);
  }

  const json = (await response.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Google OAuth response did not include access_token");
  return json.access_token;
}

function normalizeReview(review: GoogleReviewApi): GoogleReview {
  return {
    name: review.name,
    id: review.reviewId,
    reviewerName: review.reviewer?.displayName || "Usuario de Google",
    rating: review.starRating ? STAR_TO_NUMBER[review.starRating] : 0,
    comment: review.comment || "",
    createTime: review.createTime || "",
    updateTime: review.updateTime || review.createTime || "",
    reply: review.reviewReply?.comment || null,
    replyState: review.reviewReply?.reviewReplyState || null,
    policyViolation: review.reviewReply?.policyViolation || null,
    replyUrl: review.reviewReplyUrl || null,
  };
}

export function googleBusinessConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_BUSINESS_CLIENT_ID &&
      process.env.GOOGLE_BUSINESS_CLIENT_SECRET &&
      process.env.GOOGLE_BUSINESS_REFRESH_TOKEN &&
      process.env.GOOGLE_BUSINESS_ACCOUNT_ID &&
      process.env.GOOGLE_BUSINESS_LOCATION_ID,
  );
}

export async function listGoogleReviews(): Promise<GoogleReview[]> {
  const accountId = requiredEnv("GOOGLE_BUSINESS_ACCOUNT_ID");
  const locationId = requiredEnv("GOOGLE_BUSINESS_LOCATION_ID");
  const accessToken = await getAccessToken();
  const reviews: GoogleReview[] = [];
  let pageToken = "";

  do {
    const url = new URL(
      `https://mybusiness.googleapis.com/v4/accounts/${encodeURIComponent(accountId)}/locations/${encodeURIComponent(locationId)}/reviews`,
    );
    url.searchParams.set("pageSize", "50");
    url.searchParams.set("orderBy", "updateTime desc");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Google reviews list failed (${response.status}): ${body}`);
    }

    const json = (await response.json()) as {
      reviews?: GoogleReviewApi[];
      nextPageToken?: string;
    };
    reviews.push(...(json.reviews || []).map(normalizeReview));
    pageToken = json.nextPageToken || "";
  } while (pageToken);

  return reviews;
}

export async function replyToGoogleReview(reviewName: string, comment: string) {
  if (!/^accounts\/[^/]+\/locations\/[^/]+\/reviews\/[^/]+$/.test(reviewName)) {
    throw new Error("Invalid Google review resource name");
  }
  const cleanComment = comment.trim();
  if (!cleanComment) throw new Error("Reply cannot be empty");
  if (Buffer.byteLength(cleanComment, "utf8") > 4096) {
    throw new Error("Reply exceeds Google's 4096-byte limit");
  }

  const accessToken = await getAccessToken();
  const response = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}/reply`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ comment: cleanComment }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google review reply failed (${response.status}): ${body}`);
  }
  return response.json();
}
