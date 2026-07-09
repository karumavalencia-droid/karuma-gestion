"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Flag,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { DbAnnouncement } from "@/lib/supabase/types";

type AnnouncementsData = {
  myAnnouncements: DbAnnouncement[];
  departmentAnnouncements: DbAnnouncement[];
};

const priorityConfig = {
  low: { color: "bg-blue-50 text-blue-700", label: "Baja" },
  normal: { color: "bg-gray-50 text-gray-700", label: "Normal" },
  high: { color: "bg-red-50 text-red-700", label: "Alta" },
};

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnnouncementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "normal" as const,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/announcements/me", {
        cache: "no-store",
      });
      const payload = (await response.json()) as AnnouncementsData & {
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Error al cargar");
      setData(payload);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar los anuncios",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!formData.title.trim() || !formData.description.trim()) {
      setError("Todos los campos son requeridos");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/announcements/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? "Error al crear anuncio");
      }

      setFormData({ title: "", description: "", priority: "normal" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkComplete = async (id: string) => {
    try {
      const response = await fetch(`/api/announcements/me/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });

      if (!response.ok) throw new Error("Error al actualizar");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este anuncio?")) return;

    try {
      const response = await fetch(`/api/announcements/me/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error al eliminar");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 px-4 py-5 pb-24 text-white sm:py-8">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-karuma-300">Karuma ERP</p>
            <h1 className="text-2xl font-bold">Anuncios</h1>
            <p className="mt-1 text-xs text-gray-400">
              {data?.myAnnouncements?.length ?? 0} creados • {data?.departmentAnnouncements?.length ?? 0} pendientes
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </header>

        <section className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-karuma-600 px-5 py-3 text-sm font-bold text-white hover:bg-karuma-700"
          >
            <Plus className="h-5 w-5" />
            {showForm ? "Cancelar" : "Nuevo anuncio"}
          </button>

          {showForm && (
            <div className="overflow-hidden rounded-3xl bg-white text-gray-900 shadow-2xl">
              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">
                    Título
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Ej: Cambio de turno"
                    maxLength={200}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-karuma-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe qué es lo que tienes que hacer..."
                    maxLength={1000}
                    rows={4}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-karuma-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700">
                    Prioridad
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: e.target.value as "low" | "normal" | "high",
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-karuma-500 focus:outline-none"
                  >
                    <option value="low">Baja</option>
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-karuma-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-karuma-700 disabled:opacity-50"
                >
                  {submitting ? "Guardando..." : "Publicar anuncio"}
                </button>
              </form>
            </div>
          )}

          {loading && !data ? (
            <div className="flex min-h-40 items-center justify-center text-sm text-gray-500">
              <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
              Cargando anuncios…
            </div>
          ) : (
            <>
              {data?.myAnnouncements && data.myAnnouncements.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-gray-300">
                    Mis anuncios ({data.myAnnouncements.length})
                  </h2>
                  {data.myAnnouncements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className={`overflow-hidden rounded-2xl border p-4 transition ${
                        announcement.completed
                          ? "border-gray-700 bg-gray-800/30 opacity-60"
                          : "border-karuma-500/30 bg-gradient-to-br from-karuma-900/30 to-karuma-950/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-semibold ${announcement.completed ? "line-through text-gray-400" : "text-white"}`}>
                              {announcement.title}
                            </h3>
                            {announcement.completed && (
                              <span className="inline-flex rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300">
                                Completado
                              </span>
                            )}
                          </div>
                          <p className={`mt-1 text-sm ${announcement.completed ? "text-gray-500" : "text-gray-300"}`}>
                            {announcement.description}
                          </p>
                          <div className="mt-3 flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                                priorityConfig[
                                  announcement.priority as keyof typeof priorityConfig
                                ]?.color ?? priorityConfig.normal.color
                              }`}
                            >
                              <Flag className="h-3 w-3" />
                              {
                                priorityConfig[
                                  announcement.priority as keyof typeof priorityConfig
                                ]?.label
                              }
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(announcement.created_at).toLocaleDateString("es-ES", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!announcement.completed && (
                            <button
                              type="button"
                              onClick={() =>
                                void handleMarkComplete(announcement.id)
                              }
                              title="Marcar como completado"
                              className="rounded-lg bg-emerald-600/20 p-2 hover:bg-emerald-600/30 transition"
                            >
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleDelete(announcement.id)}
                            title="Eliminar"
                            className="rounded-lg bg-red-600/20 p-2 hover:bg-red-600/30 transition"
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {data?.departmentAnnouncements &&
                data.departmentAnnouncements.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-gray-300">
                      Anuncios del departamento ({data.departmentAnnouncements.length})
                    </h2>
                    {data.departmentAnnouncements.map((announcement) => (
                      <div
                        key={announcement.id}
                        className="overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-4 hover:bg-white/8 transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-white">
                                {announcement.title}
                              </h3>
                            </div>
                            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-2.5 py-1 text-xs text-blue-300">
                              <span>👤 {announcement.employee_name}</span>
                            </div>
                            <p className="mt-2 text-sm text-gray-300">
                              {announcement.description}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                                  priorityConfig[
                                    announcement.priority as keyof typeof priorityConfig
                                  ]?.color ?? priorityConfig.normal.color
                                }`}
                              >
                                <Flag className="h-3 w-3" />
                                {
                                  priorityConfig[
                                    announcement.priority as keyof typeof priorityConfig
                                  ]?.label
                                }
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(announcement.created_at).toLocaleDateString("es-ES", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              {!loading &&
                (!data?.myAnnouncements ||
                  (data.myAnnouncements.length === 0 &&
                    data.departmentAnnouncements.length === 0)) && (
                  <div className="flex min-h-40 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-center text-sm text-gray-400">
                    No hay anuncios. ¡Crea uno para compartir lo que tienes que hacer!
                  </div>
                )}
            </>
          )}
        </section>
      </div>

      <PortalTabs />
    </main>
  );
}
