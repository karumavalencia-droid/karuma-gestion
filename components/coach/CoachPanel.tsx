"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenText,
  Bot,
  CalendarDays,
  ChefHat,
  ClipboardList,
  Flame,
  HeartHandshake,
  History,
  ListChecks,
  LoaderCircle,
  Send,
  SquarePen,
  X,
} from "lucide-react";

const MAX_MESSAGE_CHARS = 2000;

type ChatMessage = {
  id: string;
  sender: "user" | "assistant";
  content: string;
};

type SessionInfo = {
  name: string;
  employeeId: string | null;
};

type ConversationSummary = {
  id: string;
  title: string | null;
  updatedAt: string;
};

const QUICK_ACTIONS: { label: string; message: string; icon: typeof Bot }[] = [
  { label: "Mi horario", message: "¿Cuál es mi horario de esta semana?", icon: CalendarDays },
  { label: "Buscar una receta", message: "Quiero buscar una receta.", icon: ChefHat },
  { label: "Uso de Rational", message: "¿Cómo se usa el horno Rational?", icon: Flame },
  { label: "Reportar una incidencia", message: "Quiero reportar una incidencia.", icon: AlertTriangle },
  { label: "Atención al cliente", message: "¿Cómo atiendo una queja de un cliente?", icon: HeartHandshake },
  { label: "Mis tareas", message: "¿Cuáles son mis tareas de apertura y cierre?", icon: ListChecks },
];

const GENERIC_ERROR =
  "Karuma Coach no ha podido responder. Inténtalo de nuevo en un momento.";

let nextId = 0;
function newId(): string {
  nextId += 1;
  return `msg-${nextId}`;
}

function formatConversationDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function CoachPanel() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  // Sesión (nombre para el saludo) + reanudar la conversación más reciente.
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const sessionResponse = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        if (sessionResponse.ok) {
          const data = (await sessionResponse.json()) as {
            name?: string;
            employeeId?: string | null;
          };
          if (!cancelled && data.name) {
            setSession({ name: data.name, employeeId: data.employeeId ?? null });
          }
        }

        const listResponse = await fetch("/api/coach/conversations", {
          cache: "no-store",
        });
        if (!listResponse.ok) return;
        const list = (await listResponse.json()) as {
          conversations?: ConversationSummary[];
        };
        const items = list.conversations ?? [];
        if (cancelled) return;
        setConversations(items);

        if (items.length > 0) {
          await openConversation(items[0].id, () => cancelled);
        }
      } catch {
        // Sin red o sin datos: se empieza una conversación nueva.
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    void initialize();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function openConversation(id: string, isCancelled?: () => boolean) {
    const response = await fetch(`/api/coach/conversations/${id}`, {
      cache: "no-store",
    });
    if (!response.ok) return;
    const payload = (await response.json()) as {
      messages?: { id: string; sender: "user" | "assistant"; content: string }[];
    };
    if (isCancelled?.()) return;
    setConversationId(id);
    setMessages(
      (payload.messages ?? []).map((message) => ({
        id: message.id,
        sender: message.sender,
        content: message.content,
      })),
    );
    setError("");
  }

  function startNewConversation() {
    setConversationId(null);
    setMessages([]);
    setError("");
    setHistoryOpen(false);
  }

  async function refreshConversations() {
    try {
      const response = await fetch("/api/coach/conversations", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        conversations?: ConversationSummary[];
      };
      setConversations(payload.conversations ?? []);
    } catch {
      // La lista es informativa; no bloquea el chat.
    }
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setError("");
    setSending(true);
    setMessages((current) => [
      ...current,
      { id: newId(), sender: "user", content: trimmed },
    ]);
    setDraft("");

    try {
      const response = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          ...(conversationId ? { conversationId } : {}),
        }),
      });
      const payload = (await response.json()) as {
        conversationId?: string;
        reply?: string;
        message?: string;
      };
      if (!response.ok || !payload.reply) {
        throw new Error(payload.message ?? GENERIC_ERROR);
      }
      const isNewConversation = !conversationId && Boolean(payload.conversationId);
      if (payload.conversationId) setConversationId(payload.conversationId);
      setMessages((current) => [
        ...current,
        { id: newId(), sender: "assistant", content: payload.reply as string },
      ]);
      if (isNewConversation) void refreshConversations();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : GENERIC_ERROR);
    } finally {
      setSending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(draft);
  }

  const empty = messages.length === 0;
  const backHref = session?.employeeId ? "/my-attendance" : "/dashboard";

  return (
    <main className="flex min-h-[100dvh] flex-col bg-gray-100">
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-karuma-700 px-3 py-3 text-white shadow-md">
        <Link
          href={backHref}
          aria-label="Volver"
          className="rounded-full p-2 transition hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Bot className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold leading-tight">Karuma Coach</h1>
          <p className="truncate text-xs text-karuma-100">
            Asistente IA interno de Karuma
          </p>
        </div>
        {session && !session.employeeId && (
          <>
            <Link
              href="/coach/knowledge"
              aria-label="Base de conocimiento"
              className="rounded-full p-2 transition hover:bg-white/10"
            >
              <BookOpenText className="h-5 w-5" />
            </Link>
            <Link
              href="/coach/reports"
              aria-label="Reportes de incidencias"
              className="rounded-full p-2 transition hover:bg-white/10"
            >
              <ClipboardList className="h-5 w-5" />
            </Link>
          </>
        )}
        <button
          type="button"
          onClick={() => setHistoryOpen((open) => !open)}
          aria-label="Historial de conversaciones"
          className={`rounded-full p-2 transition hover:bg-white/10 ${
            historyOpen ? "bg-white/15" : ""
          }`}
        >
          <History className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={startNewConversation}
          aria-label="Nueva conversación"
          className="rounded-full p-2 transition hover:bg-white/10"
        >
          <SquarePen className="h-5 w-5" />
        </button>
      </header>

      {historyOpen && (
        <div className="fixed inset-0 z-20 bg-gray-900/40" onClick={() => setHistoryOpen(false)}>
          <div
            className="absolute inset-x-0 top-0 max-h-[70dvh] overflow-y-auto rounded-b-3xl bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Conversaciones</h2>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                aria-label="Cerrar historial"
                className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {conversations.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">
                Todavía no hay conversaciones.
              </p>
            ) : (
              <ul className="space-y-1">
                {conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryOpen(false);
                        void openConversation(conversation.id);
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-gray-100 ${
                        conversation.id === conversationId
                          ? "bg-karuma-50 text-karuma-800"
                          : "text-gray-700"
                      }`}
                    >
                      <span className="truncate">
                        {conversation.title || "Conversación"}
                      </span>
                      <span className="shrink-0 text-xs text-gray-400">
                        {formatConversationDate(conversation.updatedAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-3 pb-28 pt-4">
        {initializing ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-400">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Cargando…
          </div>
        ) : empty ? (
          <div className="flex flex-1 flex-col justify-center gap-5 py-6">
            <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-gray-800 shadow-sm">
              Hola{session ? `, ${session.name}` : ""}. ¿En qué puedo ayudarte hoy?
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  disabled={sending}
                  onClick={() => void send(action.message)}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left text-xs font-medium text-gray-700 shadow-sm transition hover:border-karuma-300 hover:bg-karuma-50 disabled:opacity-50"
                >
                  <action.icon className="h-4 w-4 shrink-0 text-karuma-600" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  message.sender === "user"
                    ? "self-end rounded-br-sm bg-karuma-600 text-white"
                    : "self-start rounded-tl-sm bg-white text-gray-800"
                }`}
              >
                {message.content}
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 self-start rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 text-sm text-gray-400 shadow-sm">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Escribiendo…
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white px-3 py-3"
      >
        <div className="mx-auto flex w-full max-w-2xl items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(draft);
              }
            }}
            maxLength={MAX_MESSAGE_CHARS}
            rows={1}
            placeholder="Escribe un mensaje…"
            className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-karuma-500 focus:ring-1 focus:ring-karuma-500"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label="Enviar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-karuma-600 text-white shadow transition hover:bg-karuma-700 disabled:opacity-40"
          >
            {sending ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
