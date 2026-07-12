import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSessionUser } from "@/lib/auth/guards";
import type { SessionUser } from "@/lib/auth/session";
import { getOwnConversation } from "@/lib/coach/conversations";
import { buildCoachSystemPrompt } from "@/lib/coach/system-prompt";
import {
  COACH_TOOLS,
  runCreateIncidentReport,
  runGetMySchedule,
  runSearchKnowledge,
} from "@/lib/coach/tools";
import {
  runGetInventory,
  runGetTableStatus,
  runGetTeamToday,
  runGetTodayReservations,
  runGetTodaySales,
} from "@/lib/coach/restaurant-tools";
import type {
  DbCoachConversation,
  DbCoachMessage,
  DbCoachMessageInsert,
} from "@/lib/coach/types";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_MESSAGES = 20;
const MAX_TOOL_ROUNDS = 4;
const MAX_OUTPUT_TOKENS = 1000;
const DEFAULT_MODEL = "gpt-4.1-mini";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Solo estos campos se aceptan del cliente. Todo lo demás se rechaza. */
const ALLOWED_BODY_KEYS = new Set(["conversationId", "message"]);

// Debe ser una función: un NextResponse solo puede enviarse una vez.
function configError() {
  return NextResponse.json(
    {
      error: "coach_not_configured",
      message:
        "Karuma Coach no está disponible ahora mismo. Avisa al encargado si el problema continúa.",
    },
    { status: 503 },
  );
}

type ConversationRow = Pick<
  DbCoachConversation,
  "id" | "user_email" | "employee_id" | "title"
>;

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json(
      { error: "not_authenticated", message: "Debes iniciar sesión." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Solicitud inválida." },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !ALLOWED_BODY_KEYS.has(key))
  ) {
    return NextResponse.json(
      { error: "invalid_body", message: "Solicitud inválida." },
      { status: 400 },
    );
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json(
      {
        error: "invalid_message",
        message: `El mensaje debe tener entre 1 y ${MAX_MESSAGE_CHARS} caracteres.`,
      },
      { status: 400 },
    );
  }

  const conversationId =
    typeof body.conversationId === "string" && UUID_PATTERN.test(body.conversationId)
      ? body.conversationId
      : null;
  if (body.conversationId !== undefined && !conversationId) {
    return NextResponse.json(
      { error: "invalid_conversation", message: "Conversación inválida." },
      { status: 400 },
    );
  }

  // La clave de OpenAI SOLO existe en el servidor. Nunca NEXT_PUBLIC_*.
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[coach] configError: falta OPENAI_API_KEY en el runtime");
    return configError();
  }
  if (!isSupabaseConfigured()) {
    console.error("[coach] configError: Supabase no configurado");
    return configError();
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("[coach] configError: cliente admin de Supabase nulo");
    return configError();
  }

  // Conversación: cargar la propia o crear una nueva ligada a la sesión.
  let conversation: ConversationRow;
  if (conversationId) {
    const existing = await getOwnConversation(supabase, user, conversationId);
    if (!existing) {
      return NextResponse.json(
        { error: "conversation_not_found", message: "Conversación no encontrada." },
        { status: 404 },
      );
    }
    conversation = existing;
  } else {
    const { data, error } = await supabase
      .from("coach_conversations")
      .insert({
        user_email: user.email,
        employee_id: user.employeeId,
        role: user.role,
        title: message.slice(0, 60),
      })
      .select("id, user_email, employee_id, title")
      .single<ConversationRow>();
    if (error || !data) {
      console.error(
        "[coach] configError: fallo al crear la conversación",
        error?.message,
      );
      return configError();
    }
    conversation = data;
  }

  // Historial reciente (solo user/assistant; los mensajes tool son registro interno).
  const { data: historyRows } = await supabase
    .from("coach_messages")
    .select("sender, content, created_at")
    .eq("conversation_id", conversation.id)
    .in("sender", ["user", "assistant"])
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY_MESSAGES)
    .returns<Pick<DbCoachMessage, "sender" | "content" | "created_at">[]>();

  const history = (historyRows ?? []).reverse();

  const pendingMessages: DbCoachMessageInsert[] = [
    { conversation_id: conversation.id, sender: "user", content: message },
  ];

  let reply: string;
  try {
    reply = await runCoachModel({
      apiKey,
      user,
      conversationId: conversation.id,
      history,
      message,
      logTool: (entry) =>
        pendingMessages.push({
          conversation_id: conversation.id,
          sender: "tool",
          content: entry,
        }),
    });
  } catch {
    // Guarda al menos el mensaje del usuario para no perder el hilo.
    await supabase.from("coach_messages").insert(pendingMessages);
    return NextResponse.json(
      {
        error: "coach_unavailable",
        message:
          "Karuma Coach no ha podido responder. Inténtalo de nuevo en un momento.",
      },
      { status: 502 },
    );
  }

  pendingMessages.push({
    conversation_id: conversation.id,
    sender: "assistant",
    content: reply,
  });
  await supabase.from("coach_messages").insert(pendingMessages);
  await supabase
    .from("coach_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation.id);

  return NextResponse.json(
    { conversationId: conversation.id, reply },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function runCoachModel(options: {
  apiKey: string;
  user: SessionUser;
  conversationId: string;
  history: Pick<DbCoachMessage, "sender" | "content">[];
  message: string;
  logTool: (entry: string) => void;
}): Promise<string> {
  const { apiKey, user, conversationId, history, message, logTool } = options;
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  const input: OpenAI.Responses.ResponseInput = [
    ...history.map((row) => ({
      role: row.sender === "user" ? ("user" as const) : ("assistant" as const),
      content: row.content,
    })),
    { role: "user" as const, content: message },
  ];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const response = await client.responses.create({
      model,
      instructions: buildCoachSystemPrompt(user),
      input,
      tools: COACH_TOOLS,
      max_output_tokens: MAX_OUTPUT_TOKENS,
      // Última ronda: sin herramientas para forzar una respuesta de texto.
      ...(round === MAX_TOOL_ROUNDS ? { tool_choice: "none" as const } : {}),
    });

    const functionCalls = response.output.filter(
      (item): item is OpenAI.Responses.ResponseFunctionToolCall =>
        item.type === "function_call",
    );

    if (functionCalls.length === 0) {
      const text = response.output_text.trim();
      if (text) return text;
      throw new Error("empty_response");
    }

    // La API acepta reenviar los items de salida (incluidos reasoning y
    // function_call) como entrada del siguiente turno; el tipo del SDK no
    // refleja aún esa equivalencia.
    input.push(...(response.output as unknown as OpenAI.Responses.ResponseInput));

    for (const call of functionCalls) {
      const output = await executeCoachTool(call, user, conversationId);
      logTool(
        JSON.stringify({
          tool: call.name,
          arguments: call.arguments.slice(0, 500),
          output: output.slice(0, 1500),
        }),
      );
      input.push({
        type: "function_call_output",
        call_id: call.call_id,
        output,
      });
    }
  }

  throw new Error("tool_loop_exceeded");
}

/**
 * Ejecuta una herramienta con la identidad de la SESIÓN, nunca con la que
 * proponga el modelo o el cliente. El modelo no ejecuta SQL: cada herramienta
 * es una consulta fija del servidor.
 */
async function executeCoachTool(
  call: OpenAI.Responses.ResponseFunctionToolCall,
  user: SessionUser,
  conversationId: string,
): Promise<string> {
  let args: unknown = {};
  try {
    args = call.arguments ? JSON.parse(call.arguments) : {};
  } catch {
    return JSON.stringify({ error: "invalid_arguments" });
  }

  switch (call.name) {
    case "get_my_schedule":
      return runGetMySchedule(user);
    case "search_knowledge":
      return runSearchKnowledge(args);
    case "create_incident_report":
      return runCreateIncidentReport(args, user, conversationId);
    case "get_today_reservations":
      return runGetTodayReservations();
    case "get_table_status":
      return runGetTableStatus(args);
    case "get_today_sales":
      return runGetTodaySales(user);
    case "get_team_today":
      return runGetTeamToday();
    case "get_inventory":
      return runGetInventory(args);
    default:
      return JSON.stringify({ error: "unknown_tool" });
  }
}
