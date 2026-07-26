"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  KNOWLEDGE_CATEGORIES,
  type KnowledgeCategory,
} from "@/lib/coach/types";

type Entry = {
  id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  keywords: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
};

type FormState = {
  id: string | null;
  category: KnowledgeCategory;
  title: string;
  content: string;
  keywords: string;
  active: boolean;
};

const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  recipe: "Receta",
  rational: "Rational",
  pira: "Pira / Plancha",
  service: "Servicio",
  hygiene: "Higiene",
  opening: "Apertura",
  closing: "Cierre",
  complaints: "Quejas",
  equipment: "Equipos",
};

const EMPTY_FORM: FormState = {
  id: null,
  category: "recipe",
  title: "",
  content: "",
  keywords: "",
  active: true,
};

const GENERIC_ERROR = "No se pudo completar la operación.";

function parseKeywords(raw: string): string[] {
  return raw
    .split(",")
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 15);
}

export function CoachKnowledgePanel() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<KnowledgeCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/coach/knowledge", { cache: "no-store" });
      const payload = (await response.json()) as {
        entries?: Entry[];
        message?: string;
      };
      if (!response.ok) throw new Error(payload.message ?? GENERIC_ERROR);
      setEntries(payload.entries ?? []);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (categoryFilter !== "all" && entry.category !== categoryFilter) return false;
      if (!term) return true;
      return (
        entry.title.toLowerCase().includes(term) ||
        entry.content.toLowerCase().includes(term) ||
        entry.keywords.some((keyword) => keyword.includes(term))
      );
    });
  }, [entries, categoryFilter, search]);

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setError("");
  }

  function openEdit(entry: Entry) {
    setForm({
      id: entry.id,
      category: entry.category,
      title: entry.title,
      content: entry.content,
      keywords: entry.keywords.join(", "),
      active: entry.active,
    });
    setError("");
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || saving) return;
    if (!form.title.trim() || !form.content.trim()) {
      setError("El título y el contenido son obligatorios.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        category: form.category,
        title: form.title.trim(),
        content: form.content.trim(),
        keywords: parseKeywords(form.keywords),
        active: form.active,
      };
      const response = await fetch(
        form.id ? `/api/coach/knowledge/${form.id}` : "/api/coach/knowledge",
        {
          method: form.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json()) as {
        entry?: Entry;
        message?: string;
      };
      if (!response.ok || !result.entry) {
        throw new Error(result.message ?? GENERIC_ERROR);
      }
      const saved = result.entry;
      setEntries((current) =>
        form.id
          ? current.map((entry) => (entry.id === saved.id ? saved : entry))
          : [saved, ...current],
      );
      setForm(null);
      setError("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : GENERIC_ERROR);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(entry: Entry) {
    if (busyId) return;
    setBusyId(entry.id);
    const previous = entries;
    setEntries((current) =>
      current.map((item) => item.id === entry.id ? { ...item, active: !entry.active } : item),
    );
    try {
      const response = await fetch(`/api/coach/knowledge/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: entry.category,
          title: entry.title,
          content: entry.content,
          keywords: entry.keywords,
          active: !entry.active,
        }),
      });
      const result = (await response.json()) as { entry?: Entry; message?: string };
      if (!response.ok || !result.entry) {
        throw new Error(result.message ?? GENERIC_ERROR);
      }
      const saved = result.entry;
      setEntries((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
      setError("");
    } catch (toggleError) {
      setEntries(previous);
      setError(toggleError instanceof Error ? toggleError.message : GENERIC_ERROR);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(entry: Entry) {
    if (busyId) return;
    if (
      !window.confirm(
        `¿Eliminar definitivamente "${entry.title}"? Para ocultarla sin borrar, usa Desactivar.`,
      )
    ) {
      return;
    }
    setBusyId(entry.id);
    const previous = entries;
    setEntries((current) => current.filter((item) => item.id !== entry.id));
    try {
      const response = await fetch(`/api/coach/knowledge/${entry.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { deleted?: string; message?: string };
      if (!response.ok || !result.deleted) {
        throw new Error(result.message ?? GENERIC_ERROR);
      }
      setError("");
    } catch (removeError) {
      setEntries(previous);
      setError(removeError instanceof Error ? removeError.message : GENERIC_ERROR);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Base de conocimiento"
        description="Recetas y estándares que Karuma Coach usa para responder al equipo"
      >
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-karuma-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-karuma-700"
        >
          <Plus className="h-4 w-4" />
          Nueva entrada
        </button>
      </PageHeader>

      {form && (
        <form
          onSubmit={submitForm}
          className="space-y-4 rounded-2xl border border-karuma-100 bg-white p-4 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-gray-900">
            {form.id ? "Editar entrada" : "Nueva entrada"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Categoría</span>
              <select
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value as KnowledgeCategory })
                }
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-karuma-500 focus:outline-none"
              >
                {KNOWLEDGE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Título</span>
              <input
                type="text"
                value={form.title}
                maxLength={150}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Ej.: Limpieza diaria del horno Rational"
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-karuma-500 focus:outline-none"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Contenido</span>
            <textarea
              value={form.content}
              maxLength={8000}
              rows={6}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
              placeholder="Pasos, cantidades, tiempos, temperaturas…"
              className="w-full resize-y rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-karuma-500 focus:outline-none"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">
                Palabras clave (separadas por comas)
              </span>
              <input
                type="text"
                value={form.keywords}
                onChange={(event) => setForm({ ...form, keywords: event.target.value })}
                placeholder="rational, horno, limpieza"
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-karuma-500 focus:outline-none"
              />
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm({ ...form, active: event.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-karuma-600 focus:ring-karuma-500"
              />
              Visible para Karuma Coach
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-karuma-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-karuma-700 disabled:opacity-50"
            >
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-200"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter("all")}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
            categoryFilter === "all"
              ? "bg-karuma-600 text-white"
              : "bg-white text-gray-600 shadow-sm hover:bg-gray-50"
          }`}
        >
          Todas
        </button>
        {KNOWLEDGE_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setCategoryFilter(category)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              categoryFilter === category
                ? "bg-karuma-600 text-white"
                : "bg-white text-gray-600 shadow-sm hover:bg-gray-50"
            }`}
          >
            {CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por título, contenido o palabra clave…"
            className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-karuma-500 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && entries.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-gray-400">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Cargando conocimiento…
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-12 text-center text-sm text-gray-500">
          {entries.length === 0
            ? "Todavía no hay entradas. Crea la primera con “Nueva entrada”."
            : "Sin resultados para este filtro."}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((entry) => (
            <li
              key={entry.id}
              className={`rounded-2xl border bg-white p-4 shadow-sm ${
                entry.active ? "border-gray-100" : "border-dashed border-gray-300 opacity-70"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-karuma-50 px-2.5 py-0.5 text-xs font-semibold text-karuma-700">
                  {CATEGORY_LABELS[entry.category]}
                </span>
                {!entry.active && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                    Oculta
                  </span>
                )}
                <h3 className="w-full text-sm font-semibold text-gray-900 sm:w-auto">
                  {entry.title}
                </h3>
              </div>

              <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-gray-600">
                {entry.content}
              </p>

              {entry.keywords.length > 0 && (
                <p className="mt-2 text-xs text-gray-400">
                  {entry.keywords.join(" · ")}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === entry.id}
                  onClick={() => openEdit(entry)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
                <button
                  type="button"
                  disabled={busyId === entry.id}
                  onClick={() => void toggleActive(entry)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                >
                  {entry.active ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      Activar
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={busyId === entry.id}
                  onClick={() => void remove(entry)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
