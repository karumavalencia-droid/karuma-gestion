"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChefHat, Search } from "lucide-react";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isCoachAdmin } from "@/lib/auth/guards";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type Recipe = { id: string; title: string; content: string; keywords: string[] };
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function RecipesErpPanel() {
  const { user } = useAuth();
  const { locale } = useLanguage();
  const zh = locale === "zh";
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetch("/api/recipes", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("recipes_unavailable");
        const data = await response.json();
        setRecipes(data.recipes);
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);

  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const filtered = recipes.filter((recipe) => {
    const text = normalize([recipe.title, recipe.content, ...recipe.keywords].join(" "));
    return terms.every((term) => text.includes(term));
  });

  return (
    <div className={user?.employeeId ? "min-h-screen bg-gray-50 p-4 pb-28" : "space-y-6"}>
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900"><ChefHat aria-hidden="true" />{zh ? "食谱" : "Recetas"}</h1>
            <p className="mt-2 text-sm text-gray-600">{zh ? "查看店内已发布的配方与完整制作步骤。" : "Consulta las recetas publicadas y su preparación completa."}</p>
          </div>
          {isCoachAdmin(user) && <Link href="/coach/knowledge" className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800">{zh ? "管理食谱" : "Gestionar recetas"}</Link>}
        </header>
        <label className="flex items-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3">
          <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
          <span className="sr-only">{zh ? "搜索食谱" : "Buscar recetas"}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={zh ? "搜索名称或食材，例如 tarta de queso" : "Buscar plato o ingrediente, p. ej. tarta de queso"} className="min-w-0 flex-1 bg-transparent text-gray-900 outline-none" />
        </label>
        {loading ? <p role="status">{zh ? "正在加载食谱…" : "Cargando recetas…"}</p> : error ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
            <p>{zh ? "暂时无法加载食谱，请重试。" : "No se pudieron cargar las recetas. Inténtalo de nuevo."}</p>
            <button onClick={() => setReload((value) => value + 1)} className="mt-3 underline">{zh ? "重试" : "Reintentar"}</button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">{recipes.length === 0
            ? (zh ? "目前还没有已发布的食谱。请负责人在“管理食谱”中添加店内标准做法。" : "Todavía no hay recetas publicadas. El encargado puede añadir la preparación del restaurante en Gestionar recetas.")
            : (zh ? "没有找到相关食谱，请尝试其他名称或食材。" : "No hay recetas que coincidan. Prueba otro nombre o ingrediente.")}</p>
        ) : <div className="space-y-3">{filtered.map((recipe) => (
          <details key={recipe.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <summary className="cursor-pointer text-lg font-semibold text-gray-900">{recipe.title}</summary>
            <div className="mt-4 whitespace-pre-wrap break-words border-t border-gray-100 pt-4 text-sm leading-7 text-gray-700">{recipe.content}</div>
          </details>
        ))}</div>}
      </div>
      {user?.employeeId && <PortalTabs />}
    </div>
  );
}
