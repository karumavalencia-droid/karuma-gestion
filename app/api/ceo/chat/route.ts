import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSessionUser, isCeoAdmin } from "@/lib/auth/guards";
import {
  buildCeoSystemPrompt,
  getLowStockItems,
  getMonthSalesSummary,
  getProfitSummary,
  getReviewsSummary,
  getStaffSchedule,
  getTodayReservations,
  getTodaySales,
} from "@/lib/ceo/tools";
import type { CeoChatConversation, CeoChatResponse, CeoChatStreamEvent, CeoInsightCard } from "@/lib/ceo/types";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type {
  DbCeoActionInsert,
  DbCeoConversation,
  DbCeoDraftInsert,
  DbCeoMessage,
} from "@/lib/supabase/types";
import type { SessionUser } from "@/lib/auth/session";
import type { CeoDraftPreview } from "@/lib/ceo/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.OPENAI_MODEL || "gpt-5.6";
const MAX_HISTORY = 16;
const MAX_OUTPUT_TOKENS = 900;
const MAX_ROUNDS = 4;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const tools: OpenAI.Responses.Tool[] = [
  {
    type: "function",
    name: "get_today_sales",
    description: "Consultar las ventas de hoy en Karuma.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    strict: true,
  },
  {
    type: "function",
    name: "get_staff_schedule",
    description: "Consultar el turno del día para el equipo.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    strict: true,
  },
  {
    type: "function",
    name: "get_today_reservations",
    description: "Consultar el estado de las reservas de hoy.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    strict: true,
  },
  {
    type: "function",
    name: "get_month_sales_summary",
    description: "Consultar el resumen de ventas del mes actual.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    strict: true,
  },
  {
    type: "function",
    name: "get_low_stock_items",
    description: "Consultar productos con stock bajo.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    strict: true,
  },
  {
    type: "function",
    name: "get_profit_summary",
    description: "Consultar el resumen de beneficio y margen.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    strict: true,
  },
  {
    type: "function",
    name: "get_reviews_summary",
    description: "Consultar el resumen de reseñas y respuesta pendiente.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    strict: true,
  },
];

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const conversationId = request.nextUrl.searchParams.get("conversationId");
  if (conversationId && !UUID_PATTERN.test(conversationId)) {
    return NextResponse.json({ error: "invalid_conversation" }, { status: 400 });
  }

  if (conversationId) {
    const { data: conversation } = await supabase
      .from("ceo_conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_email", user.email)
      .maybeSingle()
      .returns<DbCeoConversation>();
    if (!conversation) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data: messages } = await supabase
      .from("ceo_messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .returns<DbCeoMessage[]>();

    return NextResponse.json({
      conversation,
      messages: messages ?? [],
    });
  }

  const { data: conversations } = await supabase
    .from("ceo_conversations")
    .select("*")
    .eq("user_email", user.email)
    .order("updated_at", { ascending: false })
    .limit(8)
    .returns<DbCeoConversation[]>();

  return NextResponse.json({ conversations: conversations ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  let body: { conversationId?: string; message?: string; stream?: boolean };
  try {
    body = (await request.json()) as { conversationId?: string; message?: string };
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "invalid_message" }, { status: 400 });
  }

  const conversationId =
    typeof body.conversationId === "string" && UUID_PATTERN.test(body.conversationId)
      ? body.conversationId
      : null;

  let conversation: CeoChatConversation;
  if (conversationId) {
    const { data } = await supabase
      .from("ceo_conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_email", user.email)
      .maybeSingle()
      .returns<DbCeoConversation>();
    if (!data) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    conversation = data;
  } else {
    const { data, error } = await supabase
      .from("ceo_conversations")
      .insert({
        user_email: user.email,
        user_name: user.name,
        role: user.role,
        title: message.slice(0, 64) || "AI CEO",
      })
      .select("*")
      .single<DbCeoConversation>();
    if (error || !data) {
      return NextResponse.json({ error: "conversation_create_failed" }, { status: 500 });
    }
    conversation = data;
  }

  const { data: historyRows } = await supabase
    .from("ceo_messages")
    .select("*")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY)
    .returns<DbCeoMessage[]>();

  const history = (historyRows ?? []).reverse();
  const pendingRows: Array<{
    conversation_id: string;
    sender: "user" | "assistant";
    content: string;
  }> = [{ conversation_id: conversation.id, sender: "user", content: message }];

  try {
    const result = await runCeoModel({
      apiKey,
      user,
      conversationId: conversation.id,
      history,
      message,
      canManageActions: isCeoAdmin(user),
    });

    pendingRows.push({ conversation_id: conversation.id, sender: "assistant", content: result.reply });
    await supabase.from("ceo_messages").insert(pendingRows);
    const canManageActions = isCeoAdmin(user);
    const actionRows: DbCeoActionInsert[] = canManageActions
      ? (result.actions ?? []).map((label) => ({
          conversation_id: conversation.id,
          label,
          status: "pending",
        }))
      : [];
    if (actionRows.length > 0) {
      await supabase.from("ceo_actions").insert(actionRows);
    }
    const drafts = canManageActions ? buildDrafts(result, conversation.id) : [];
    if (drafts.length > 0) {
      const draftRows: DbCeoDraftInsert[] = drafts.map((draft) => ({
        conversation_id: conversation.id,
        draft_type: draft.draftType,
        title: draft.title,
        content: draft.content,
        status: "draft",
      }));
      await supabase.from("ceo_drafts").insert(draftRows);
    }
    await supabase.from("ceo_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversation.id);

    const payload: CeoChatResponse = {
      conversationId: conversation.id,
      reply: result.reply,
      summary: result.summary,
      cards: result.cards,
      actions: canManageActions ? result.actions : [],
      drafts,
    };
    if (body.stream) {
      return streamCeoResponse(payload);
    }

    return NextResponse.json(
      {
        ...payload,
      } satisfies CeoChatResponse,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    await supabase.from("ceo_messages").insert(pendingRows);
    return NextResponse.json(
      {
        error: "chat_unavailable",
        message: error instanceof Error ? error.message : "AI CEO temporalmente no disponible",
      },
      { status: 502 },
    );
  }
}

function streamCeoResponse(payload: CeoChatResponse) {
  const encoder = new TextEncoder();
  const chunks = splitReply(payload.reply);
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: CeoChatStreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      for (const chunk of chunks) {
        send({ type: "delta", delta: chunk });
        await new Promise((resolve) => setTimeout(resolve, 16));
      }
      send({ type: "final", ...payload });
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function splitReply(reply: string) {
  const parts = reply.match(/.{1,24}(\s+|$)/g);
  return parts && parts.length > 0 ? parts : [reply];
}

async function runCeoModel(options: {
  apiKey: string;
  user: SessionUser;
  conversationId: string;
  history: DbCeoMessage[];
  message: string;
  canManageActions: boolean;
}): Promise<CeoChatResponse> {
  const client = new OpenAI({ apiKey: options.apiKey });
  const toolState: Record<string, unknown> = {};
  const input: OpenAI.Responses.ResponseInput = [
    ...options.history.map((row) => ({
      role: row.sender === "assistant" ? ("assistant" as const) : ("user" as const),
      content: row.content,
    })),
    { role: "user" as const, content: options.message },
  ];

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const response = await client.responses.create({
      model: MODEL,
      instructions: `${buildCeoSystemPrompt(options.user)}\n${options.canManageActions ? "Este usuario puede revisar cambios del sistema." : "Este usuario solo puede hacer preguntas básicas. No sugieras confirmaciones, borradores ni acciones de edición."}`,
      input,
      tools,
      max_output_tokens: MAX_OUTPUT_TOKENS,
      ...(round === MAX_ROUNDS - 1 ? { tool_choice: "none" as const } : {}),
    });

    const functionCalls = response.output.filter(
      (item): item is OpenAI.Responses.ResponseFunctionToolCall => item.type === "function_call",
    );

    if (functionCalls.length === 0) {
      const text = response.output_text.trim();
      if (text) {
        const summary = text.split("\n").slice(0, 2).join(" ").slice(0, 180) || text.slice(0, 180);
        return {
          conversationId: options.conversationId,
          reply: text,
          summary,
          cards: buildInsightCards(toolState),
          actions: buildActions(toolState),
        };
      }
      throw new Error("empty_response");
    }

    input.push(...(response.output as unknown as OpenAI.Responses.ResponseInput));

    for (const call of functionCalls) {
      const output = await runCeoTool(call.name);
      try {
        toolState[call.name] = JSON.parse(output) as unknown;
      } catch {
        toolState[call.name] = output;
      }
      input.push({
        type: "function_call_output",
        call_id: call.call_id,
        output,
      });
    }
  }

  throw new Error("tool_loop_exceeded");
}

function buildInsightCards(toolState: Record<string, unknown>): CeoInsightCard[] {
  const cards: CeoInsightCard[] = [];

  const todaySales = toolState.get_today_sales as
    | { found?: boolean; netSales?: number; customers?: number; orders?: number; averageTicket?: number }
    | undefined;
  if (todaySales) {
    cards.push(
      {
        title: "Ventas hoy",
        value: `€${Number(todaySales.netSales ?? 0).toLocaleString("es-ES", { maximumFractionDigits: 0 })}`,
        detail: `${Number(todaySales.customers ?? 0)} clientes · ${Number(todaySales.orders ?? 0)} pedidos`,
        tone: Number(todaySales.netSales ?? 0) > 0 ? "positive" : "neutral",
      },
      {
        title: "Ticket medio",
        value: `€${Number(todaySales.averageTicket ?? 0).toLocaleString("es-ES", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        detail: todaySales.found ? "Dato de hoy" : "Sin registro de ventas hoy",
        tone: "neutral",
      },
    );
  }

  const schedule = toolState.get_staff_schedule as
    | { total?: number; byService?: { comida?: unknown[]; cena?: unknown[]; descanso?: unknown[] } }
    | undefined;
  if (schedule) {
    cards.push({
      title: "Turnos hoy",
      value: `${Number(schedule.total ?? 0)}`,
      detail: `Comida ${schedule.byService?.comida?.length ?? 0} · Cena ${schedule.byService?.cena?.length ?? 0} · Descanso ${schedule.byService?.descanso?.length ?? 0}`,
      tone: "neutral",
    });
  }

  const reservations = toolState.get_today_reservations as
    | { total?: number; confirmed?: number; seated?: number; totalPeople?: number }
    | undefined;
  if (reservations) {
    cards.push({
      title: "Reservas hoy",
      value: `${Number(reservations.total ?? 0)}`,
      detail: `${Number(reservations.confirmed ?? 0)} confirmadas · ${Number(reservations.seated ?? 0)} sentadas · ${Number(reservations.totalPeople ?? 0)} pax`,
      tone: "neutral",
    });
  }

  const monthSales = toolState.get_month_sales_summary as
    | { revenue?: number; customers?: number; orders?: number }
    | undefined;
  if (monthSales) {
    cards.push({
      title: "Ventas mes",
      value: `€${Number(monthSales.revenue ?? 0).toLocaleString("es-ES", {
        maximumFractionDigits: 0,
      })}`,
      detail: `${Number(monthSales.orders ?? 0)} pedidos · ${Number(monthSales.customers ?? 0)} clientes`,
      tone: "positive",
    });
  }

  const stock = toolState.get_low_stock_items as { count?: number } | undefined;
  if (stock) {
    cards.push({
      title: "Stock bajo",
      value: `${Number(stock.count ?? 0)}`,
      detail: "Productos con pocas unidades",
      tone: Number(stock.count ?? 0) > 0 ? "warning" : "positive",
    });
  }

  const profit = toolState.get_profit_summary as
    | {
        ventas?: number;
        beneficioNeto?: number;
        margenNetoPct?: number;
        costePersonalPct?: number;
        costeComidaPct?: number;
      }
    | undefined;
  if (profit) {
    cards.push({
      title: "Beneficio neto",
      value: `€${Number(profit.beneficioNeto ?? 0).toLocaleString("es-ES", {
        maximumFractionDigits: 0,
      })}`,
      detail: `Margen ${Number(profit.margenNetoPct ?? 0)}% · Personal ${Number(profit.costePersonalPct ?? 0)}%`,
      tone: Number(profit.beneficioNeto ?? 0) >= 0 ? "positive" : "danger",
    });
  }

  const reviews = toolState.get_reviews_summary as
    | {
        rating?: number;
        totalResenas?: number;
        pendientes?: number;
        negativas?: number;
      }
    | undefined;
  if (reviews) {
    cards.push({
      title: "Reseñas",
      value: `${Number(reviews.rating ?? 0).toFixed(2)}★`,
      detail: `${Number(reviews.totalResenas ?? 0)} total · ${Number(reviews.pendientes ?? 0)} pendientes · ${Number(reviews.negativas ?? 0)} negativas`,
      tone: Number(reviews.rating ?? 0) >= 4.8 ? "positive" : "warning",
    });
  }

  return cards.slice(0, 6);
}

function buildActions(toolState: Record<string, unknown>): string[] {
  const actions: string[] = [];
  const stock = toolState.get_low_stock_items as
    | { items?: Array<{ name?: string; quantity?: number; minimum?: number }> }
    | undefined;
  if (stock?.items?.length) {
    const top = stock.items.slice(0, 3).map((item) => `${item.name ?? "Producto"} (${Number(item.quantity ?? 0)}/${Number(item.minimum ?? 0)})`);
    actions.push(`Revisar stock bajo: ${top.join(", ")}`);
  }

  const reservations = toolState.get_today_reservations as
    | { total?: number }
    | undefined;
  if ((reservations?.total ?? 0) > 0) {
    actions.push("Revisar reservas de hoy y confirmar mesas críticas.");
  }

  const todaySales = toolState.get_today_sales as { found?: boolean } | undefined;
  if (!todaySales?.found) {
    actions.push("No hay venta registrada hoy: revisar importación o sincronización.");
  }

  const reviews = toolState.get_reviews_summary as
    | { pendientes?: number; rating?: number; negativas?: number }
    | undefined;
  if ((reviews?.pendientes ?? 0) > 0) {
    actions.push(`Responder ${reviews?.pendientes ?? 0} reseña(s) pendientes para sostener la reputación.`);
  }
  if ((reviews?.negativas ?? 0) > 0) {
    actions.push("Revisar reseñas negativas y preparar respuesta personalizada.");
  }

  return actions.slice(0, 5);
}

function buildDrafts(result: CeoChatResponse, conversationId: string): CeoDraftPreview[] {
  const drafts: CeoDraftPreview[] = [];

  for (const action of result.actions) {
    if (action.toLowerCase().includes("stock")) {
      drafts.push({
        draftType: "purchase_note",
        title: "Borrador de compra",
        content: [
          "Asunto: Reposición urgente",
          "",
          "He detectado stock bajo y conviene revisar los productos afectados antes del siguiente servicio.",
          "1. Validar mínimos actuales",
          "2. Confirmar proveedor disponible",
          "3. Preparar pedido de reposición",
          "",
          `Referencia interna: ${conversationId}`,
        ].join("\n"),
      });
    }
    if (action.toLowerCase().includes("reseña")) {
      drafts.push({
        draftType: "review_reply",
        title: "Borrador de respuesta",
        content: [
          "Hola, gracias por tu comentario.",
          "Lamentamos que tu experiencia no haya sido la esperada y queremos revisarlo personalmente.",
          "Si nos dejas un detalle más, te contactaremos para resolverlo.",
        ].join("\n"),
      });
    }
    if (action.toLowerCase().includes("ventas") || action.toLowerCase().includes("sincronización")) {
      drafts.push({
        draftType: "ops_note",
        title: "Nota operativa",
        content: [
          "Revisar sincronización de ventas y confirmar que la importación diaria se ha completado.",
          "Comprobar si faltan tickets, cierres o eventos duplicados.",
          "Si hay incidencias, registrar el punto exacto de fallo y volver a ejecutar la importación.",
        ].join("\n"),
      });
    }
    if (action.toLowerCase().includes("reservas")) {
      drafts.push({
        draftType: "staff_message",
        title: "Mensaje de equipo",
        content: [
          "Equipo, hoy tenemos reservas relevantes que conviene vigilar de cerca.",
          "Por favor, revisad tiempos de pase, mesas críticas y posibles retrasos.",
          "Si aparece alguna incidencia, avisad de inmediato para reagrupar el servicio.",
        ].join("\n"),
      });
    }
  }

  const unique = new Map<string, CeoDraftPreview>();
  for (const draft of drafts) unique.set(`${draft.draftType}:${draft.title}`, draft);
  return [...unique.values()].slice(0, 5);
}

async function runCeoTool(name: string): Promise<string> {
  switch (name) {
    case "get_today_sales":
      return JSON.stringify(await getTodaySales());
    case "get_staff_schedule":
      return JSON.stringify(await getStaffSchedule());
    case "get_today_reservations":
      return JSON.stringify(await getTodayReservations());
    case "get_month_sales_summary":
      return JSON.stringify(await getMonthSalesSummary());
    case "get_low_stock_items":
      return JSON.stringify(await getLowStockItems());
    case "get_profit_summary":
      return JSON.stringify(getProfitSummary());
    case "get_reviews_summary":
      return JSON.stringify(getReviewsSummary());
    default:
      return JSON.stringify({ error: "unknown_tool" });
  }
}
