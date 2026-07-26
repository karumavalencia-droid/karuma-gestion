export type CeoChatRole = "user" | "assistant" | "tool" | "system";

export type CeoChatConversation = {
  id: string;
  user_email: string;
  user_name: string;
  role: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type CeoChatMessage = {
  id: string;
  conversation_id: string;
  sender: CeoChatRole;
  content: string;
  created_at: string;
};

export type CeoChatPayload = {
  conversationId: string | null;
  message: string;
};

export type CeoChatToolResult = {
  label: string;
  data: Record<string, unknown>;
};

export type CeoInsightCard = {
  title: string;
  value: string;
  detail?: string;
  tone?: "positive" | "neutral" | "warning" | "danger";
};

export type CeoChatResponse = {
  conversationId: string;
  reply: string;
  summary: string;
  cards: CeoInsightCard[];
  actions: string[];
  drafts: CeoDraftPreview[];
};

export type CeoChatStreamEvent =
  | { type: "delta"; delta: string }
  | {
      type: "final";
      conversationId: string;
      reply: string;
      summary: string;
      cards: CeoInsightCard[];
      actions: string[];
      drafts: CeoDraftPreview[];
    }
  | { type: "error"; message: string };

export type CeoDraftPreview = {
  draftType: "purchase_note" | "staff_message" | "review_reply" | "ops_note";
  title: string;
  content: string;
};
