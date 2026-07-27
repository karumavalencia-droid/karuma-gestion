"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bot,
  FileText,
  Loader2,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type {
  CeoChatConversation,
  CeoChatMessage,
  CeoChatStreamEvent,
  CeoDraftPreview,
  CeoInsightCard,
} from "@/lib/ceo/types";
import type { DbCeoDraft } from "@/lib/supabase/types";

type CeoAction = {
  id: string;
  label: string;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
  updated_at: string;
};

type EditableDraft = DbCeoDraft & {
  draft_type: CeoDraftPreview["draftType"];
};

type ChatState = {
  conversations: CeoChatConversation[];
  conversation: CeoChatConversation | null;
  messages: CeoChatMessage[];
  summary: string;
  cards: CeoInsightCard[];
  actions: string[];
  drafts: CeoDraftPreview[];
};

type CeoAttachment = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 3_000_000;

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

async function prepareAttachment(file: File): Promise<CeoAttachment> {
  if (!file.type.startsWith("image/")) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new Error(`${file.name} supera el límite de 3 MB`);
    }
    return {
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      dataUrl: await readAsDataUrl(file),
    };
  }

  const source = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo preparar la imagen");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("No se pudo comprimir la imagen"))),
      "image/jpeg",
      0.82,
    );
  });

  return {
    name: file.name.replace(/\.[^.]+$/, "") + ".jpg",
    type: "image/jpeg",
    size: blob.size,
    dataUrl: await readAsDataUrl(blob),
  };
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CeoChatPanel({ canManageActions = true }: { canManageActions?: boolean } = {}) {
  const autoBriefStorageKey = "karuma_ceo_auto_brief_v1";
  const autoBriefRunKey = "karuma_ceo_auto_brief_last_run_v1";
  const [state, setState] = useState<ChatState>({
    conversations: [],
    conversation: null,
    messages: [],
    summary: "",
    cards: [],
    actions: [],
    drafts: [],
  });
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<CeoAttachment[]>([]);
  const [preparingAttachments, setPreparingAttachments] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [actionsLoading, setActionsLoading] = useState(true);
  const [actions, setActions] = useState<CeoAction[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [drafts, setDrafts] = useState<EditableDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draftEditor, setDraftEditor] = useState<EditableDraft | null>(null);
  const [draftEditorTitle, setDraftEditorTitle] = useState("");
  const [draftEditorContent, setDraftEditorContent] = useState("");
  const [draftSaving, setDraftSaving] = useState(false);
  const [autoDailyBrief, setAutoDailyBrief] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autoBriefTriggeredRef = useRef(false);
  const router = useRouter();
  const anomalyAlerts = useMemo(() => {
    const alerts: Array<{
      title: string;
      detail: string;
      tone: "warning" | "danger" | "neutral";
      href: string;
      actionLabel: string;
    }> = [];
    const salesCard = state.cards.find((card) => card.title === "Ventas hoy");
    const stockCard = state.cards.find((card) => card.title === "Stock bajo");
    const reservationsCard = state.cards.find((card) => card.title === "Reservas hoy");
    const reviewsCard = state.cards.find((card) => card.title === "Reseñas");
    const pendingActions = canManageActions ? actions.filter((action) => action.status === "pending") : [];

    if (salesCard) {
      const salesValue = Number(String(salesCard.value).replace(/[^\d.-]/g, ""));
      if (Number.isFinite(salesValue) && salesValue < 500) {
        alerts.push({
          title: "Ventas muy bajas",
          detail: `La venta de hoy está en ${salesCard.value}. Conviene revisar si faltan cierres o si la actividad fue inusualmente baja.`,
          tone: "danger",
          href: "/sales",
          actionLabel: "Abrir ventas",
        });
      }
    }

    if (stockCard) {
      const stockValue = Number(String(stockCard.value).replace(/[^\d.-]/g, ""));
      if (Number.isFinite(stockValue) && stockValue > 0) {
        alerts.push({
          title: "Stock por revisar",
          detail: `Hay ${stockCard.value} productos con stock bajo. Es buen momento para confirmar reposición.`,
          tone: "warning",
          href: "/inventory",
          actionLabel: "Abrir inventario",
        });
      }
    }

    if (reservationsCard) {
      const reservationCount = Number(String(reservationsCard.value).replace(/[^\d.-]/g, ""));
      if (Number.isFinite(reservationCount) && reservationCount >= 8) {
        alerts.push({
          title: "Día con muchas reservas",
          detail: `Hoy hay ${reservationsCard.value} reservas. Revisa cobertura y ritmo de sala.`,
          tone: "warning",
          href: "/reservas",
          actionLabel: "Abrir reservas",
        });
      }
    }

    if (reviewsCard) {
      const rating = Number(String(reviewsCard.value).replace(/[^\d.-]/g, ""));
      if (Number.isFinite(rating) && rating < 4.6) {
        alerts.push({
          title: "Reputación a vigilar",
          detail: `La valoración visible está en ${reviewsCard.value}. Conviene priorizar respuestas pendientes y negativas.`,
          tone: "danger",
          href: "/reviews",
          actionLabel: "Abrir reseñas",
        });
      }
    }

    if (pendingActions.length > 0) {
      alerts.push({
        title: "Acciones pendientes",
        detail: `Tienes ${pendingActions.length} acción(es) por confirmar desde el AI CEO.`,
        tone: "neutral",
        href: "/ceo",
        actionLabel: "Volver al CEO",
      });
    }

    return alerts.slice(0, 4);
  }, [actions, state.cards]);

  async function loadConversation(conversationId?: string) {
    setLoadingHistory(true);
    setError(null);
    try {
      const url = conversationId ? `/api/ceo/chat?conversationId=${conversationId}` : "/api/ceo/chat";
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo cargar");

      if (conversationId) {
        setState((current) => ({
          conversations: current.conversations,
          conversation: data.conversation ?? null,
          messages: Array.isArray(data.messages) ? data.messages : [],
          summary: current.summary,
          cards: current.cards,
          actions: current.actions,
          drafts: current.drafts,
        }));
      } else {
        setState((current) => ({
          ...current,
          conversations: Array.isArray(data.conversations) ? data.conversations : [],
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el chat");
    } finally {
      setLoadingHistory(false);
    }
  }

  async function loadActions(conversationId?: string | null) {
    setActionsLoading(true);
    try {
      const url = conversationId ? `/api/ceo/actions?conversationId=${conversationId}` : "/api/ceo/actions";
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudieron cargar las acciones");
      setActions(Array.isArray(data.actions) ? data.actions : []);
    } catch {
      setActions([]);
    } finally {
      setActionsLoading(false);
    }
  }

  async function loadDrafts(conversationId?: string | null) {
    setDraftsLoading(true);
    try {
      const url = conversationId ? `/api/ceo/drafts?conversationId=${conversationId}` : "/api/ceo/drafts";
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudieron cargar los borradores");
      setDrafts(Array.isArray(data.drafts) ? data.drafts : []);
    } catch {
      setDrafts([]);
    } finally {
      setDraftsLoading(false);
    }
  }

  useEffect(() => {
    void loadConversation();
  }, []);

  useEffect(() => {
    if (!canManageActions) return;
    void loadActions(state.conversation?.id);
  }, [canManageActions, state.conversation?.id]);

  useEffect(() => {
    if (!canManageActions) return;
    void loadDrafts(state.conversation?.id);
  }, [canManageActions, state.conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [state.messages.length, state.conversation?.id]);

  useEffect(() => {
    const saved = window.localStorage.getItem(autoBriefStorageKey);
    setAutoDailyBrief(saved === "1");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(autoBriefStorageKey, autoDailyBrief ? "1" : "0");
  }, [autoDailyBrief]);

  useEffect(() => {
    if (!autoDailyBrief || autoBriefTriggeredRef.current) return;
    if (loadingHistory || loading || state.messages.length > 0) return;

    const today = new Date().toISOString().slice(0, 10);
    const lastRun = window.localStorage.getItem(autoBriefRunKey);
    if (lastRun === today) return;

    autoBriefTriggeredRef.current = true;
    window.localStorage.setItem(autoBriefRunKey, today);
    void sendQuickBrief();
  }, [autoDailyBrief, loadingHistory, loading, state.messages.length]);

  const currentTitle = useMemo(() => {
    if (state.conversation) return state.conversation.title;
    if (state.conversations[0]) return state.conversations[0].title;
    return "AI CEO";
  }, [state.conversation, state.conversations]);

  async function sendMessage() {
    const trimmed = message.trim();
    if ((!trimmed && attachments.length === 0) || loading || preparingAttachments) return;
    const outgoingAttachments = attachments;
    const prompt = trimmed || "Analiza los archivos adjuntos y dime qué información importante contienen.";
    const attachmentLabel =
      outgoingAttachments.length > 0
        ? `\n\nAdjuntos: ${outgoingAttachments.map((item) => item.name).join(", ")}`
        : "";

    setLoading(true);
    setError(null);
    const optimisticUser: CeoChatMessage = {
      id: `local-${Date.now()}`,
      conversation_id: state.conversation?.id ?? "local",
      sender: "user",
      content: `${prompt}${attachmentLabel}`,
      created_at: new Date().toISOString(),
    };

    setState((current) => ({
      ...current,
      messages: [...current.messages, optimisticUser],
    }));
    setMessage("");
    setAttachments([]);

    try {
      const res = await fetch("/api/ceo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: state.conversation?.id ?? undefined,
          message: prompt,
          attachments: outgoingAttachments,
          stream: true,
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? data?.error ?? "No se pudo enviar");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      let finalPayload: CeoChatStreamEvent | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const line = frame
            .split("\n")
            .map((entry) => entry.trim())
            .find((entry) => entry.startsWith("data: "));
          if (!line) continue;

          const payload = JSON.parse(line.slice(6)) as CeoChatStreamEvent;
          if (payload.type === "delta") {
            assistantText += payload.delta;
            setState((current) => {
              const draftAssistant: CeoChatMessage = {
                id: `assistant-live-${Date.now()}`,
                conversation_id: current.conversation?.id ?? "local",
                sender: "assistant",
                content: assistantText,
                created_at: new Date().toISOString(),
              };
              return {
                ...current,
                conversation:
                  current.conversation ?? {
                    id: "streaming",
                    user_email: "",
                    user_name: "",
                    role: "",
                    title: currentTitle,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                messages: [
                  ...current.messages.filter((item) => !item.id.startsWith("local-") && !item.id.startsWith("assistant-live-")),
                  draftAssistant,
                ],
              };
            });
          } else if (payload.type === "final") {
            finalPayload = payload;
          } else if (payload.type === "error") {
            throw new Error(payload.message);
          }
        }
      }

      if (!finalPayload || finalPayload.type !== "final") {
        throw new Error("No se recibió la respuesta final");
      }

      const assistantMessage: CeoChatMessage = {
        id: `assistant-${Date.now()}`,
        conversation_id: finalPayload.conversationId,
        sender: "assistant",
        content: finalPayload.reply,
        created_at: new Date().toISOString(),
      };

      setState((current) => ({
        conversations: current.conversations,
        conversation: current.conversation ?? {
          id: finalPayload.conversationId,
          user_email: "",
          user_name: "",
          role: "",
          title: currentTitle,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        messages: [
          ...current.messages.filter((item) => !item.id.startsWith("local-") && !item.id.startsWith("assistant-live-")),
          assistantMessage,
        ],
        summary: finalPayload.summary,
        cards: Array.isArray(finalPayload.cards) ? finalPayload.cards : current.cards,
        actions: Array.isArray(finalPayload.actions) ? finalPayload.actions : current.actions,
        drafts: Array.isArray(finalPayload.drafts) ? finalPayload.drafts : current.drafts,
      }));

      await loadConversation(finalPayload.conversationId);
      await loadActions(finalPayload.conversationId);
      await loadDrafts(finalPayload.conversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el mensaje");
      setState((current) => ({
        ...current,
        messages: current.messages.filter((item) => !item.id.startsWith("local-")),
      }));
      setAttachments(outgoingAttachments);
    } finally {
      setLoading(false);
    }
  }

  async function addAttachments(files: FileList | null) {
    if (!files?.length) return;
    setPreparingAttachments(true);
    setError(null);
    try {
      const available = Math.max(0, MAX_ATTACHMENTS - attachments.length);
      const selected = Array.from(files).slice(0, available);
      if (selected.length === 0) throw new Error("Puedes adjuntar un máximo de 3 archivos");
      const prepared = await Promise.all(selected.map(prepareAttachment));
      const totalBytes = [...attachments, ...prepared].reduce((sum, item) => sum + item.size, 0);
      if (totalBytes > MAX_ATTACHMENT_BYTES) {
        throw new Error("Los adjuntos juntos superan el límite de 3 MB");
      }
      setAttachments((current) => [...current, ...prepared].slice(0, MAX_ATTACHMENTS));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo adjuntar el archivo");
    } finally {
      setPreparingAttachments(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function sendQuickBrief() {
    setMessage("Hazme un resumen ejecutivo de hoy con ventas, turnos, reservas y alertas prioritarias.");
    await new Promise((resolve) => setTimeout(resolve, 0));
    const input = "Hazme un resumen ejecutivo de hoy con ventas, turnos, reservas y alertas prioritarias.";
    if (loading) return;

    setLoading(true);
    setError(null);
    const optimisticUser: CeoChatMessage = {
      id: `local-${Date.now()}`,
      conversation_id: state.conversation?.id ?? "local",
      sender: "user",
      content: input,
      created_at: new Date().toISOString(),
    };

    setState((current) => ({
      ...current,
      messages: [...current.messages, optimisticUser],
    }));
    setMessage("");

    try {
      const res = await fetch("/api/ceo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: state.conversation?.id ?? undefined,
          message: input,
          stream: true,
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? data?.error ?? "No se pudo enviar");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      let finalPayload: CeoChatStreamEvent | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const line = frame.split("\n").map((entry) => entry.trim()).find((entry) => entry.startsWith("data: "));
          if (!line) continue;
          const payload = JSON.parse(line.slice(6)) as CeoChatStreamEvent;
          if (payload.type === "delta") {
            assistantText += payload.delta;
            setState((current) => {
              const draftAssistant: CeoChatMessage = {
                id: `assistant-live-${Date.now()}`,
                conversation_id: current.conversation?.id ?? "local",
                sender: "assistant",
                content: assistantText,
                created_at: new Date().toISOString(),
              };
              return {
                ...current,
                conversation:
                  current.conversation ?? {
                    id: "streaming",
                    user_email: "",
                    user_name: "",
                    role: "",
                    title: currentTitle,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                messages: [
                  ...current.messages.filter((item) => !item.id.startsWith("local-") && !item.id.startsWith("assistant-live-")),
                  draftAssistant,
                ],
              };
            });
          } else if (payload.type === "final") {
            finalPayload = payload;
          } else if (payload.type === "error") {
            throw new Error(payload.message);
          }
        }
      }

      if (!finalPayload || finalPayload.type !== "final") throw new Error("No se recibió la respuesta final");
      setState((current) => ({
        conversations: current.conversations,
        conversation: current.conversation ?? {
          id: finalPayload.conversationId,
          user_email: "",
          user_name: "",
          role: "",
          title: currentTitle,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        messages: [
          ...current.messages.filter((item) => !item.id.startsWith("local-") && !item.id.startsWith("assistant-live-")),
          {
            id: `assistant-${Date.now()}`,
            conversation_id: finalPayload.conversationId,
            sender: "assistant",
            content: finalPayload.reply,
            created_at: new Date().toISOString(),
          },
        ],
        summary: finalPayload.summary,
        cards: Array.isArray(finalPayload.cards) ? finalPayload.cards : current.cards,
        actions: Array.isArray(finalPayload.actions) ? finalPayload.actions : current.actions,
        drafts: Array.isArray(finalPayload.drafts) ? finalPayload.drafts : current.drafts,
      }));
      await loadConversation(finalPayload.conversationId);
      await loadActions(finalPayload.conversationId);
      await loadDrafts(finalPayload.conversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el resumen");
      setState((current) => ({
        ...current,
        messages: current.messages.filter((item) => !item.id.startsWith("local-")),
      }));
    } finally {
      setLoading(false);
    }
  }

  async function updateAction(actionId: string, status: "confirmed" | "cancelled", createDraft = false) {
    if (!canManageActions) return;
    try {
      const res = await fetch("/api/ceo/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId, status, createDraft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo actualizar");
      setActions((current) => current.map((action) => (action.id === actionId ? data.action : action)));
      if (data.draft) {
        setDrafts((current) => [data.draft, ...current]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la acción");
    }
  }

  function openDraftEditor(draft: EditableDraft) {
    if (!canManageActions) return;
    setDraftEditor(draft);
    setDraftEditorTitle(draft.title);
    setDraftEditorContent(draft.content);
  }

  function closeDraftEditor() {
    setDraftEditor(null);
    setDraftEditorTitle("");
    setDraftEditorContent("");
  }

  async function saveDraftChanges() {
    if (!canManageActions) return;
    if (!draftEditor || !state.conversation?.id) return;
    const title = draftEditorTitle.trim();
    const content = draftEditorContent.trim();
    if (!title || !content) {
      setError("El borrador necesita título y contenido.");
      return;
    }

    setDraftSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/ceo/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draftEditor.id,
          conversation_id: state.conversation.id,
          draft_type: draftEditor.draft_type,
          title,
          content,
          status: draftEditor.status ?? "draft",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo guardar el borrador");
      setDrafts((current) => [data.draft as EditableDraft, ...current.filter((item) => item.id !== draftEditor.id)]);
      closeDraftEditor();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el borrador");
    } finally {
      setDraftSaving(false);
    }
  }

  async function updateDraftStatus(draftId: string, status: EditableDraft["status"]) {
    if (!canManageActions) return;
    try {
      const target = drafts.find((item) => item.id === draftId);
      if (!target) return;
      const res = await fetch("/api/ceo/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: target.id,
          conversation_id: target.conversation_id,
          draft_type: target.draft_type,
          title: target.title,
          content: target.content,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo actualizar el borrador");
      setDrafts((current) => current.map((item) => (item.id === draftId ? data.draft : item)));
      if (draftEditor?.id === draftId) {
        setDraftEditor(data.draft);
        setDraftEditorTitle(data.draft.title);
        setDraftEditorContent(data.draft.content);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el borrador");
    }
  }

  async function copyDraftContent() {
    if (!canManageActions) return;
    if (!draftEditor) return;
    try {
      await navigator.clipboard.writeText(`${draftEditor.title}\n\n${draftEditorContent}`);
    } catch {
      setError("No se pudo copiar el borrador.");
    }
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-4xl flex-col gap-4 overflow-x-hidden">
      <details className="order-2 min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-gray-800">
          <span>更多信息与管理工具</span>
          <span className="text-xs font-normal text-gray-500">历史、摘要、提醒和草稿</span>
        </summary>
        <aside className="grid min-w-0 gap-4 border-t border-gray-100 bg-gray-50 p-3 sm:grid-cols-2 sm:p-4">
        <div className="rounded-3xl bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 text-amber-300">
            <Bot className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-[0.24em]">AI CEO</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold">Karuma Executive Desk</h1>
          <p className="mt-2 text-sm text-gray-300">
            Consulta ventas, turnos y reservas desde el panel.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/10 text-white hover:bg-white/15"
              onClick={() => void loadConversation()}
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              Recargar
            </Button>
          </div>
        </div>

        <Card title="Conversaciones recientes" className="overflow-hidden">
          {loadingHistory ? (
            <div className="flex items-center gap-2 px-1 py-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando…
            </div>
          ) : state.conversations.length === 0 ? (
            <p className="text-sm text-gray-500">Aún no hay conversaciones guardadas.</p>
          ) : (
            <div className="space-y-2">
              {state.conversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => void loadConversation(conv.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    state.conversation?.id === conv.id
                      ? "border-karuma-300 bg-karuma-50"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <p className="truncate text-sm font-medium text-gray-900">{conv.title}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(conv.updated_at).toLocaleString("es-ES")}
                  </p>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card title="Sugerencias del CEO" className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>{state.summary || "Aquí aparecerá un resumen ejecutivo de la última respuesta."}</span>
          </div>
          {state.cards.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {state.cards.map((card) => (
                <div
                  key={`${card.title}-${card.value}`}
                  className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{card.title}</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900">{card.value}</p>
                  {card.detail && <p className="mt-1 text-xs text-gray-500">{card.detail}</p>}
                </div>
              ))}
            </div>
          )}
          {canManageActions ? (
            <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                待确认操作
              </p>
              {actionsLoading ? (
                <p className="mt-2 text-sm text-amber-900/70">Cargando acciones…</p>
              ) : actions.length === 0 ? (
                <p className="mt-2 text-sm text-amber-900/70">这个对话暂时没有需要确认的动作。</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm text-amber-900">
                  {actions.map((item) => (
                    <li key={item.id} className="rounded-xl bg-white px-3 py-2 shadow-sm">
                      <p>{item.label}</p>
                      <p className="mt-1 text-xs text-gray-500">Estado: {item.status}</p>
                      {item.status === "pending" && (
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" variant="success" onClick={() => void updateAction(item.id, "confirmed")}>
                            Confirmar
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => void updateAction(item.id, "confirmed", true)}>
                            Crear borrador
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void updateAction(item.id, "cancelled")}>
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Modo básico</p>
              <p className="mt-2 text-sm text-blue-900/80">
                Este acceso está pensado para preguntas y resúmenes. Los cambios del sistema solo los puede aprobar el owner.
              </p>
            </div>
          )}
        </Card>

        <Card title="Hoy en claro" className="space-y-3">
          <p className="text-sm text-gray-600">
            Un vistazo rápido a lo más importante del día sin tener que pedirlo otra vez.
          </p>
          <div className="grid gap-2">
            {state.cards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-3 py-4 text-sm text-gray-500">
                Aún no hay tarjetas para mostrar.
              </div>
            ) : (
              state.cards.slice(0, 4).map((card) => (
                <div key={`${card.title}-${card.value}`} className="rounded-2xl border border-gray-200 bg-white px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{card.title}</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{card.value}</p>
                  {card.detail && <p className="mt-1 text-xs text-gray-500">{card.detail}</p>}
                </div>
              ))
            )}
          </div>
          <Button className="w-full" onClick={() => void sendQuickBrief()} disabled={loading}>
            <Sparkles className="mr-2 h-4 w-4" />
            Generar hoy
          </Button>
          <button
            type="button"
            onClick={() =>
              setAutoDailyBrief((current) => {
                const next = !current;
                if (!next) window.localStorage.removeItem(autoBriefRunKey);
                return next;
              })
            }
            className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm transition ${
              autoDailyBrief
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-gray-200 bg-white text-gray-700"
            }`}
          >
            <div>
              <p className="font-semibold">Auto resumen diario</p>
              <p className="mt-1 text-xs text-gray-500">
                Al entrar al CEO, genera el resumen de hoy automáticamente.
              </p>
            </div>
            <span className={`rounded-full px-2 py-1 text-[11px] font-medium uppercase tracking-[0.12em] ${autoDailyBrief ? "bg-white text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
              {autoDailyBrief ? "Activo" : "Off"}
            </span>
          </button>
        </Card>

        {canManageActions ? (
          <Card title="Borradores listos" className="space-y-3">
            {draftsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando borradores…
              </div>
            ) : drafts.length === 0 ? (
              <p className="text-sm text-gray-500">No hay borradores por revisar ahora mismo.</p>
            ) : (
              <div className="space-y-3">
                {drafts.map((draft) => (
                  <button
                    key={draft.id}
                    type="button"
                    onClick={() => openDraftEditor(draft)}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-left transition hover:border-amber-300 hover:bg-amber-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{draft.draft_type}</p>
                        <h3 className="mt-1 text-sm font-semibold text-gray-900">{draft.title}</h3>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500">
                        Borrador
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{draft.content}</p>
                  </button>
                ))}
              </div>
            )}
          </Card>
        ) : (
          <Card title="Borradores" className="space-y-3">
            <p className="text-sm text-gray-500">Los borradores y ajustes se reservan para owner/admin.</p>
          </Card>
        )}

        <Card title="Alertas" className="space-y-3">
          <p className="text-sm text-gray-600">
            Señales que merecen atención antes de que se conviertan en un problema.
          </p>
          {anomalyAlerts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-green-200 bg-green-50 px-3 py-4 text-sm text-green-800">
              No hay alertas críticas ahora mismo.
            </div>
          ) : (
            <div className="space-y-2">
              {anomalyAlerts.map((alert) => (
                <button
                  key={alert.title}
                  type="button"
                  onClick={() => router.push(alert.href)}
                  className={`w-full rounded-2xl border px-3 py-3 text-left text-sm transition hover:-translate-y-0.5 hover:shadow-sm ${
                    alert.tone === "danger"
                      ? "border-rose-200 bg-rose-50 text-rose-800"
                      : alert.tone === "warning"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-gray-200 bg-white text-gray-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{alert.title}</p>
                    <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-600">
                      {alert.actionLabel}
                    </span>
                  </div>
                  <p className="mt-1 leading-6">{alert.detail}</p>
                </button>
              ))}
            </div>
          )}
          <Button className="w-full" onClick={() => void sendQuickBrief()} disabled={loading}>
            <Sparkles className="mr-2 h-4 w-4" />
            Generar hoy
          </Button>
        </Card>
        </aside>
      </details>

      <main className="order-1 flex min-h-[78vh] min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm sm:rounded-3xl">
        <div className="border-b border-gray-100 bg-gradient-to-r from-white via-white to-amber-50 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                Karuma ERP
              </p>
              <h2 className="mt-1 break-words text-xl font-semibold text-gray-900">{currentTitle}</h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <MessageSquare className="h-4 w-4" />
              <span>{state.messages.length} mensajes</span>
              {loading && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-amber-800">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generando respuesta
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,#fafafa_0%,#ffffff_100%)] px-4 py-5 sm:px-6">
          {error && (
            <div className="flex min-w-0 items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">{error}</span>
            </div>
          )}

          {state.messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-6 text-sm text-gray-500">
              Pregunta cosas como:
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {[
                  "Hoy, ¿cómo van las ventas?",
                  "Enséñame el turno de hoy",
                  "¿Qué reservas hay hoy?",
                ].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMessage(item)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            state.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[75%] ${
                    msg.sender === "user"
                      ? "bg-gray-900 text-white"
                      : msg.sender === "assistant"
                        ? "border border-gray-200 bg-white text-gray-800"
                        : "border border-amber-200 bg-amber-50 text-amber-900"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em] opacity-70">
                    <span>{msg.sender === "user" ? "Tú" : msg.sender === "assistant" ? "AI CEO" : "Tool"}</span>
                    <span>{formatTime(msg.created_at)}</span>
                  </div>
                  <div className="break-words whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-gray-100 bg-white px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.txt,.csv,text/plain,text/csv,application/pdf"
              multiple
              className="hidden"
              onChange={(event) => void addAttachments(event.target.files)}
            />
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment, index) => (
                  <div
                    key={`${attachment.name}-${index}`}
                    className="flex max-w-full items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-amber-700" />
                    <span className="max-w-48 truncate">{attachment.name}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      className="rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                      aria-label={`Quitar ${attachment.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe una pregunta para el AI CEO..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              disabled={loading}
              className="min-h-12 rounded-2xl px-4 py-3"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || preparingAttachments || attachments.length >= MAX_ATTACHMENTS}
                  className="shrink-0 gap-2 rounded-2xl"
                >
                  {preparingAttachments ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                  Adjuntar
                </Button>
                <p className="hidden text-xs text-gray-500 sm:block">
                  Fotos, PDF, TXT o CSV. Máximo 3 MB en total.
                </p>
              </div>
              <Button
                onClick={() => void sendMessage()}
                disabled={loading || preparingAttachments || (!message.trim() && attachments.length === 0)}
                className="shrink-0 gap-2 rounded-2xl"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar
              </Button>
            </div>
          </div>
        </div>
      </main>

      {canManageActions && draftEditor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-6">
          <div className="w-full max-w-2xl rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Editar borrador</p>
              <h3 className="mt-1 text-lg font-semibold text-gray-900">{draftEditor.title}</h3>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Título</label>
                <Input value={draftEditorTitle} onChange={(event) => setDraftEditorTitle(event.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Contenido</label>
                <textarea
                  value={draftEditorContent}
                  onChange={(event) => setDraftEditorContent(event.target.value)}
                  rows={10}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <Button variant="outline" onClick={closeDraftEditor} disabled={draftSaving}>
                Cerrar
              </Button>
              <Button variant="secondary" onClick={() => void copyDraftContent()} disabled={draftSaving}>
                Copiar
              </Button>
              <Button variant="outline" onClick={() => void updateDraftStatus(draftEditor.id, "reviewed")} disabled={draftSaving}>
                Marcar revisado
              </Button>
              <Button variant="outline" onClick={() => void updateDraftStatus(draftEditor.id, "archived")} disabled={draftSaving}>
                Archivar
              </Button>
              <Button onClick={() => void saveDraftChanges()} disabled={draftSaving}>
                {draftSaving ? "Guardando..." : "Guardar borrador"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
