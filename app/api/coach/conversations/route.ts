import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { listOwnConversations } from "@/lib/coach/conversations";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Lista las conversaciones de Karuma Coach de la sesión actual. */
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json(
      { error: "not_authenticated", message: "Debes iniciar sesión." },
      { status: 401 },
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ conversations: [] });
  }

  const conversations = await listOwnConversations(supabase, user);
  return NextResponse.json(
    {
      conversations: conversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        updatedAt: conversation.updated_at,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
