"use client";

import { useState } from "react";
import { AlertTriangle, Clock, MessageSquare, Star, MessagesSquare } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";

type ReviewStatus = "pending" | "awaiting" | "published";

type Review = {
  id: number;
  name: string;
  rating: number;
  comment: string;
  date: string;
  status: ReviewStatus;
  aiReply: string;
};

const REVIEWS_SEED: Review[] = [
  {
    id: 1,
    name: "Juan Perez",
    rating: 5,
    comment: "Excelente buffet de sushi.",
    date: "2026-06-10",
    status: "pending",
    aiReply: "",
  },
  {
    id: 2,
    name: "Emily Smith",
    rating: 4,
    comment: "Good food and friendly staff.",
    date: "2026-06-09",
    status: "pending",
    aiReply: "",
  },
  {
    id: 3,
    name: "Carlos Ruiz",
    rating: 1,
    comment: "Servicio lento.",
    date: "2026-06-08",
    status: "pending",
    aiReply: "",
  },
];

const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: "Sin responder",
  awaiting: "Pendiente",
  published: "Respondida",
};

const STATUS_STYLE: Record<ReviewStatus, string> = {
  pending: "bg-gray-50 text-gray-600 ring-gray-500/20",
  awaiting: "bg-amber-50 text-amber-700 ring-amber-600/20",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

function buildAiReply(rating: number, comment: string): string {
  if (!comment.trim()) {
    return "Muchas gracias por tu valoración.";
  }
  if (rating >= 5) {
    return "Muchas gracias por tu valoración. Nos alegra saber que disfrutaste de Karuma Sushi & Grill. ¡Te esperamos pronto!";
  }
  if (rating === 4) {
    return "Muchas gracias por tu visita y por tu valoración. Seguiremos mejorando para ofrecerte una experiencia aún mejor.";
  }
  if (rating === 3) {
    return "Gracias por compartir tu opinión. Nos gustaría saber qué podríamos mejorar para ofrecerte una mejor experiencia la próxima vez.";
  }
  return "Lamentamos mucho que tu experiencia no haya sido la esperada. Nos gustaría revisar lo ocurrido y mejorar. Puedes contactarnos directamente para poder ayudarte.";
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 sm:h-5 sm:w-5 ${
            n <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"
          }`}
        />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>(REVIEWS_SEED);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const total = reviews.length;
  const unreplied = reviews.filter((r) => r.status === "pending").length;
  const bad = reviews.filter((r) => r.rating <= 2).length;
  const awaiting = reviews.filter((r) => r.status === "awaiting").length;

  const handleGenerate = (id: number) => {
    setReviews((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const aiReply = buildAiReply(r.rating, r.comment);
        return { ...r, aiReply, status: "awaiting" };
      }),
    );
  };

  const handleSaveEdit = (id: number) => {
    setReviews((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, aiReply: editText, status: "awaiting" } : r,
      ),
    );
    setEditingId(null);
  };

  const handlePublish = (id: number) => {
    setReviews((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const reply =
          editingId === id && editText.trim() ? editText.trim() : r.aiReply;
        return { ...r, aiReply: reply, status: "published" };
      }),
    );
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Asistente de respuestas Google · datos mock locales</p>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          title="Total reseñas"
          value={String(total)}
          icon={MessagesSquare}
          iconColor="bg-karuma-50 text-karuma-600"
        />
        <StatCard
          title="Sin responder"
          value={String(unreplied)}
          icon={MessageSquare}
          iconColor="bg-gray-100 text-gray-600"
        />
        <StatCard
          title="Reseñas negativas"
          value={String(bad)}
          icon={AlertTriangle}
          iconColor="bg-red-50 text-red-600"
        />
        <StatCard
          title="Pendientes"
          value={String(awaiting)}
          icon={Clock}
          iconColor="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <article
            key={review.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
              <div className="space-y-1">
                <Stars rating={review.rating} />
                <p className="text-base font-semibold text-gray-900">{review.name}</p>
                <p className="text-sm text-gray-500">{review.date}</p>
              </div>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[review.status]}`}
              >
                {STATUS_LABEL[review.status]}
              </span>
            </div>

            <div className="space-y-4 pt-4">
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Contenido de la reseña
                </p>
                <p className="text-sm leading-relaxed text-gray-800">
                  {review.comment.trim() || (
                    <span className="italic text-gray-400">(Sin texto, solo puntuación)</span>
                  )}
                </p>
              </div>

              {(review.aiReply || editingId === review.id) && (
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                    Respuesta sugerida por IA
                  </p>
                  {editingId === review.id ? (
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20"
                      rows={4}
                    />
                  ) : (
                    <p
                      className={`rounded-lg border px-3 py-2.5 text-sm leading-relaxed ${
                        review.status === "published"
                          ? "border-emerald-100 bg-emerald-50 text-emerald-900"
                          : "border-karuma-100 bg-karuma-50/50 text-gray-800"
                      }`}
                    >
                      {review.aiReply}
                    </p>
                  )}
                </div>
              )}

              {review.status !== "published" && (
                <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4">
                  {review.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => handleGenerate(review.id)}
                      className="inline-flex min-h-[40px] items-center rounded-lg bg-karuma-600 px-4 py-2 text-sm font-medium text-white hover:bg-karuma-700"
                    >
                      Generar respuesta
                    </button>
                  )}
                  {review.status === "awaiting" && editingId !== review.id && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(review.id);
                          setEditText(review.aiReply);
                        }}
                        className="inline-flex min-h-[40px] items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Editar respuesta
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePublish(review.id)}
                        className="inline-flex min-h-[40px] items-center rounded-lg border border-karuma-200 bg-karuma-50 px-4 py-2 text-sm font-medium text-karuma-700 hover:bg-karuma-100"
                      >
                        Confirmar publicación
                      </button>
                    </>
                  )}
                  {review.status === "awaiting" && editingId === review.id && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(review.id)}
                        className="inline-flex min-h-[40px] items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Guardar edición
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePublish(review.id)}
                        className="inline-flex min-h-[40px] items-center rounded-lg border border-karuma-200 bg-karuma-50 px-4 py-2 text-sm font-medium text-karuma-700 hover:bg-karuma-100"
                      >
                        Confirmar publicación
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <p className="mb-2 text-sm font-semibold text-gray-900">Estado de integración Google API</p>
        <ul className="space-y-1 text-sm text-gray-600">
          <li>Modo actual: datos mock</li>
          <li>Siguiente paso: conectar Google Business Profile API</li>
          <li>Permiso necesario: business.manage</li>
          <li>La ficha del restaurante debe estar verificada</li>
        </ul>
      </div>
    </div>
  );
}
