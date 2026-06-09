import { detectLanguage, generateAiReply, getCategory, isBadReview } from "@/lib/google-reviews/ai-reply";

export type ReplyStatus = "未回复" | "待确认" | "已回复";

export type GoogleReview = {
  id: string;
  guestName: string;
  rating: number;
  content: string;
  date: string;
  language: ReturnType<typeof detectLanguage>;
  category: ReturnType<typeof getCategory>;
  replyStatus: ReplyStatus;
  aiSuggestedReply: string;
  finalReply: string;
};

export const GOOGLE_API_INTEGRATION = {
  mode: "Mock 数据",
  nextStep: "连接 Google Business Profile API",
  requiredScope: "business.manage",
  storeRequirement: "店铺必须是已验证状态",
} as const;

const SEED_REVIEWS: GoogleReview[] = [
  {
    id: "gr-1",
    guestName: "Juan Perez",
    rating: 5,
    content: "Excelente buffet de sushi.",
    date: "2026-06-10",
    language: "es",
    category: "5星好评",
    replyStatus: "未回复",
    aiSuggestedReply: "",
    finalReply: "",
  },
  {
    id: "gr-2",
    guestName: "Emily Smith",
    rating: 4,
    content: "Good food and friendly staff.",
    date: "2026-06-09",
    language: "en",
    category: "4星好评",
    replyStatus: "未回复",
    aiSuggestedReply: "",
    finalReply: "",
  },
  {
    id: "gr-3",
    guestName: "Carlos Ruiz",
    rating: 1,
    content: "Servicio lento.",
    date: "2026-06-08",
    language: "es",
    category: "1-2星差评",
    replyStatus: "未回复",
    aiSuggestedReply: "",
    finalReply: "",
  },
];

function enrichReview(review: GoogleReview): GoogleReview {
  const language = detectLanguage(review.content);
  const category = getCategory(review.rating, review.content);
  return { ...review, language, category };
}

/** 内存 mock 存储（后续可替换为 Google API） */
let mockReviews: GoogleReview[] = SEED_REVIEWS.map(enrichReview);

function patchReview(id: string, patch: Partial<GoogleReview>): GoogleReview {
  const index = mockReviews.findIndex((r) => r.id === id);
  if (index === -1) throw new Error(`Review not found: ${id}`);
  const updated = enrichReview({ ...mockReviews[index], ...patch });
  mockReviews = [...mockReviews.slice(0, index), updated, ...mockReviews.slice(index + 1)];
  return updated;
}

/** Mock：获取 Google 评论列表 */
export async function listGoogleReviews(): Promise<GoogleReview[]> {
  return mockReviews.map((r) => ({ ...r }));
}

/** Mock：AI 生成回复 */
export async function generateReviewReply(review: GoogleReview): Promise<GoogleReview> {
  const aiSuggestedReply = generateAiReply(review.rating, review.content);
  return patchReview(review.id, {
    aiSuggestedReply,
    finalReply: aiSuggestedReply,
    replyStatus: "待确认",
  });
}

/** Mock：保存编辑后的回复 */
export async function saveReviewReply(reviewId: string, reply: string): Promise<GoogleReview> {
  const text = reply.trim();
  if (!text) throw new Error("Reply cannot be empty");
  return patchReview(reviewId, {
    aiSuggestedReply: text,
    finalReply: text,
    replyStatus: "待确认",
  });
}

/** Mock：确认发布回复（未连接真实 Google API） */
export async function publishReviewReply(reviewId: string, reply: string): Promise<GoogleReview> {
  const text = reply.trim();
  if (!text) throw new Error("Reply cannot be empty");
  return patchReview(reviewId, {
    finalReply: text,
    aiSuggestedReply: text,
    replyStatus: "已回复",
  });
}

export function computeReviewStats(reviews: GoogleReview[]) {
  return {
    total: reviews.length,
    unreplied: reviews.filter((r) => r.replyStatus === "未回复").length,
    bad: reviews.filter((r) => isBadReview(r.rating)).length,
    pending: reviews.filter((r) => r.replyStatus === "待确认").length,
    replied: reviews.filter((r) => r.replyStatus === "已回复").length,
  };
}
