"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, MessageSquare, RefreshCw, Star, WifiOff } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { generateAiReply } from "@/lib/google-reviews/ai-reply";

type Review = {
  name: string;
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createTime: string;
  updateTime: string;
  reply: string | null;
  replyState: string | null;
  policyViolation: string | null;
  replyUrl: string | null;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-4 w-4 sm:h-5 sm:w-5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/reviews", { cache: "no-store" });
      const data = (await response.json()) as { configured?: boolean; reviews?: Review[]; error?: string };
      setConfigured(Boolean(data.configured));
      if (!response.ok) throw new Error(data.error || "No se pudieron cargar las reseñas");
      setReviews(data.reviews || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando reseñas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const stats = useMemo(() => ({
    total: reviews.length,
    unreplied: reviews.filter((r) => !r.reply).length,
    bad: reviews.filter((r) => r.rating <= 2).length,
    awaiting: reviews.filter((r) => !r.reply && r.rating <= 3).length,
  }), [reviews]);

  function draftFor(review: Review) {
    return drafts[review.id] ?? generateAiReply(review.rating, review.comment);
  }

  async function publish(review: Review) {
    const comment = draftFor(review).trim();
    if (!comment) return;
    setPublishingId(review.id);
    setError("");
    try {
      const response = await fetch("/api/reviews/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewName: review.name, comment }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo publicar la respuesta");
      setReviews((current) => current.map((item) => item.id === review.id ? { ...item, reply: comment } : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error publicando respuesta");
    } finally {
      setPublishingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">Google Business Profile · reseñas reales</p>
          <p className="mt-1 text-xs text-gray-400">4–5 estrellas pueden automatizarse; 1–3 estrellas quedan para revisión humana.</p>
        </div>
        <button type="button" onClick={() => void loadReviews()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard title="Total reseñas" value={String(stats.total)} icon={MessageSquare} iconColor="bg-karuma-50 text-karuma-600" />
        <StatCard title="Sin responder" value={String(stats.unreplied)} icon={Clock} iconColor="bg-gray-100 text-gray-600" />
        <StatCard title="Reseñas negativas" value={String(stats.bad)} icon={AlertTriangle} iconColor="bg-red-50 text-red-600" />
        <StatCard title="Revisión humana" value={String(stats.awaiting)} icon={CheckCircle2} iconColor="bg-amber-50 text-amber-600" />
      </div>

      {configured === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex gap-3"><WifiOff className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Google todavía no está autorizado</p><p className="mt-1">El código ya está preparado. Falta añadir las credenciales OAuth de la cuenta que administra la ficha de Karuma.</p></div></div>
        </div>
      )}

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading && reviews.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Cargando reseñas de Google…</div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const draft = draftFor(review);
            const needsHumanReview = review.rating <= 3;
            return (
              <article key={review.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
                  <div className="space-y-1"><Stars rating={review.rating} /><p className="text-base font-semibold text-gray-900">{review.reviewerName}</p><p className="text-sm text-gray-500">{review.createTime ? new Date(review.createTime).toLocaleDateString("es-ES") : ""}</p></div>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${review.reply ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : needsHumanReview ? "bg-amber-50 text-amber-700 ring-amber-600/20" : "bg-karuma-50 text-karuma-700 ring-karuma-600/20"}`}>{review.reply ? "Respondida" : needsHumanReview ? "Revisar antes de publicar" : "Lista para responder"}</span>
                </div>

                <div className="space-y-4 pt-4">
                  <div><p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">Reseña</p><p className="text-sm leading-relaxed text-gray-800">{review.comment.trim() || <span className="italic text-gray-400">(Sin texto, solo puntuación)</span>}</p></div>

                  {review.reply ? (
                    <div><p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">Respuesta publicada</p><p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm leading-relaxed text-emerald-900">{review.reply}</p>{review.policyViolation && <p className="mt-2 text-xs text-red-600">Google marcó una incidencia de política: {review.policyViolation}</p>}</div>
                  ) : (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between gap-3"><p className="text-xs font-medium uppercase tracking-wide text-gray-400">Respuesta sugerida</p>{needsHumanReview && <span className="text-xs font-medium text-amber-700">Revisión humana obligatoria</span>}</div>
                      <textarea value={draft} onChange={(e) => setDrafts((current) => ({ ...current, [review.id]: e.target.value }))} rows={4} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20" />
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button type="button" onClick={() => setDrafts((current) => ({ ...current, [review.id]: generateAiReply(review.rating, review.comment) }))} className="inline-flex min-h-10 items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Regenerar borrador</button>
                        <button type="button" onClick={() => void publish(review)} disabled={publishingId === review.id} className="inline-flex min-h-10 items-center rounded-lg bg-karuma-600 px-4 py-2 text-sm font-medium text-white hover:bg-karuma-700 disabled:opacity-50">{publishingId === review.id ? "Publicando…" : "Publicar en Google"}</button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
          {!loading && configured && reviews.length === 0 && <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Google no devolvió reseñas para esta ubicación.</div>}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <p className="mb-2 text-sm font-semibold text-gray-900">Automatización segura</p>
        <ul className="space-y-1 text-sm text-gray-600"><li>4–5 estrellas: auto-respuesta disponible mediante cron.</li><li>1–3 estrellas: nunca se publican automáticamente.</li><li>La respuesta puede editarse antes de enviarla.</li><li>Los rechazos de política de Google se muestran cuando la API los devuelve.</li></ul>
      </div>
    </div>
  );
}
