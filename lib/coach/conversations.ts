import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionUser } from "@/lib/auth/session";
import type { Database } from "@/lib/supabase/types";
import type { DbCoachConversation, DbCoachMessage } from "./types";

export type ConversationSummary = Pick<
  DbCoachConversation,
  "id" | "user_email" | "employee_id" | "title" | "updated_at"
>;

export type ConversationMessage = Pick<
  DbCoachMessage,
  "id" | "sender" | "content" | "created_at"
>;

const MAX_CONVERSATIONS = 20;
const MAX_MESSAGES = 100;

/**
 * Carga una conversación SOLO si pertenece a la sesión actual.
 * El aislamiento no depende del UUID: siempre se filtra por identidad —
 * empleados por employee_id, cuentas de gestión por user_email.
 */
export async function getOwnConversation(
  supabase: SupabaseClient<Database>,
  user: SessionUser,
  conversationId: string,
): Promise<ConversationSummary | null> {
  let query = supabase
    .from("coach_conversations")
    .select("id, user_email, employee_id, title, updated_at")
    .eq("id", conversationId);

  query = user.employeeId
    ? query.eq("employee_id", user.employeeId)
    : query.eq("user_email", user.email).is("employee_id", null);

  const { data, error } = await query.maybeSingle<ConversationSummary>();
  return error ? null : data;
}

/** Conversaciones de la sesión actual, la más reciente primero. */
export async function listOwnConversations(
  supabase: SupabaseClient<Database>,
  user: SessionUser,
): Promise<ConversationSummary[]> {
  let query = supabase
    .from("coach_conversations")
    .select("id, user_email, employee_id, title, updated_at");

  query = user.employeeId
    ? query.eq("employee_id", user.employeeId)
    : query.eq("user_email", user.email).is("employee_id", null);

  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .limit(MAX_CONVERSATIONS)
    .returns<ConversationSummary[]>();

  return error ? [] : (data ?? []);
}

/**
 * Mensajes visibles (user/assistant) de una conversación YA verificada como
 * propia con getOwnConversation. No exponer los mensajes tool al cliente.
 */
export async function listConversationMessages(
  supabase: SupabaseClient<Database>,
  conversationId: string,
): Promise<ConversationMessage[]> {
  const { data, error } = await supabase
    .from("coach_messages")
    .select("id, sender, content, created_at")
    .eq("conversation_id", conversationId)
    .in("sender", ["user", "assistant"])
    .order("created_at", { ascending: true })
    .limit(MAX_MESSAGES)
    .returns<ConversationMessage[]>();

  return error ? [] : (data ?? []);
}
