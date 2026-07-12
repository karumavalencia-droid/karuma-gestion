import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import {
  getOwnConversation,
  listConversationMessages,
} from "@/lib/coach/conversations";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mensajes de una conversación propia. 404 si no existe o no es de la sesión. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json(
      { error: "not_authenticated", message: "Debes iniciar sesión." },
      { status: 401 },
    );
  }

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json(
      { error: "invalid_conversation", message: "Conversación inválida." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "coach_not_configured", message: "Servicio no disponible." },
      { status: 503 },
    );
  }

  const conversation = await getOwnConversation(supabase, user, id);
  if (!conversation) {
    return NextResponse.json(
      { error: "conversation_not_found", message: "Conversación no encontrada." },
      { status: 404 },
    );
  }

  const messages = await listConversationMessages(supabase, conversation.id);
  return NextResponse.json(
    {
      conversation: { id: conversation.id, title: conversation.title },
      messages: messages.map((message) => ({
        id: message.id,
        sender: message.sender,
        content: message.content,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
