"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChefHat, LoaderCircle, RefreshCw, Search } from "lucide-react";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { useAuth } from "@/lib/auth/AuthProvider";

type Recipe = { id: string; title: string; content: string };

export function RecipesErpPanel() {
  const { user } = useAuth();
  const isEmployee = Boolean(user?.employeeId);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/recetas", { cache: "no-store" });
      const payload = (await response.json()) as { recipes?: Recipe[]; message?: string };
      if (!response.ok) throw new Error(payload.message ?? "No se pudieron cargar las recetas.");
      setRecipes(payload.recipes ?? []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar las recetas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("es");
    return recipes.filter((recipe) =>
      !term || `${recipe.title} ${recipe.content}`.toLocaleLowerCase("es").includes(term),
    );
  }, [recipes, query]);

  return (
    <main className={isEmployee ? "min-h-[100dvh] bg-gray-50 px-4 pb-24 pt-6" : "space-y-6"}>
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><ChefHat className="h-6 w-6" /> Recetas</h1>
            <p className="mt-1 text-sm text-gray-600">Recetas publicadas para el equipo de Karuma.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void load()} disabled={loading} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:opacity-50">
              <RefreshCw className="mr-1 inline h-4 w-4" /> Actualizar
            </button>
            {user && !user.employeeId && (user.role === "owner" || user.role === "manager") && (
              <Link href="/coach/knowledge" className="rounded-lg bg-karuma-600 px-3 py-2 text-sm font-medium text-white">Gestionar recetas</Link>
            )}
          </div>
        </div>

        <label className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2">
          <Search className="h-5 w-5 text-gray-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar receta o ingrediente" aria-label="Buscar recetas" className="w-full bg-transparent text-sm outline-none" />
        </label>

        {loading && <p className="text-sm text-gray-600"><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />Cargando recetas…</p>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {!loading && !error && visible.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
            {query ? "No hay recetas que coincidan con la búsqueda." : "Todavía no hay recetas publicadas."}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {!loading && !error && visible.map((recipe) => (
            <article key={recipe.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">{recipe.title}</h2>
              <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">{recipe.content}</p>
            </article>
          ))}
        </div>
      </div>
      {isEmployee && <PortalTabs />}
    </main>
  );
}
