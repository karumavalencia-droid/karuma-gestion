import {
  detectLanguage,
  generateAiReply,
  getCategory,
  type ReviewCategory,
  type ReviewLanguage,
} from "./ai-reply";

export type ReplyStatus = "未回复" | "已回复" | "待确认";

export type GoogleReview = {
  id: string;
  guestName: string;
  rating: number;
  content: string;
  date: string;
  language: ReviewLanguage;
  category: ReviewCategory;
  replyStatus: ReplyStatus;
  aiSuggestedReply: string;
  finalReply: string;
};

export const GOOGLE_REVIEWS_MOCK: GoogleReview[] = [
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

export function enrichReview(review: GoogleReview): GoogleReview {
  const language = detectLanguage(review.content);
  const category = getCategory(review.rating, review.content);
  return { ...review, language, category };
}

export function createReviewWithAiReply(review: GoogleReview): GoogleReview {
  const aiSuggestedReply = generateAiReply(review.rating, review.content);
  return enrichReview({
    ...review,
    aiSuggestedReply,
    finalReply: review.finalReply || aiSuggestedReply,
    replyStatus: "待确认",
  });
}
