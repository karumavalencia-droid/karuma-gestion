import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  KNOWLEDGE_CATEGORIES,
  type DbCoachKnowledgeEntry,
  type KnowledgeCategory,
} from "./types";

const MAX_RESULTS = 5;
const MAX_CONTENT_CHARS = 700;

// Límites de edición (gestión).
const MAX_TITLE_CHARS_ADMIN = 150;
const MAX_CONTENT_CHARS_ADMIN = 8000;
const MAX_KEYWORDS_ADMIN = 15;
const MAX_KEYWORD_CHARS_ADMIN = 40;

export type KnowledgeEntryInput = {
  category: KnowledgeCategory;
  title: string;
  content: string;
  keywords: string[];
  active: boolean;
};

/**
 * Normaliza el cuerpo de creación/edición de una entrada de conocimiento.
 * Devuelve null si categoría, título o contenido faltan o son inválidos.
 */
export function parseKnowledgeBody(body: unknown): KnowledgeEntryInput | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const input = body as {
    category?: unknown;
    title?: unknown;
    content?: unknown;
    keywords?: unknown;
    active?: unknown;
  };

  if (!isKnowledgeCategory(input.category)) return null;

  const title =
    typeof input.title === "string"
      ? input.title.trim().slice(0, MAX_TITLE_CHARS_ADMIN)
      : "";
  if (!title) return null;

  const content =
    typeof input.content === "string"
      ? input.content.trim().slice(0, MAX_CONTENT_CHARS_ADMIN)
      : "";
  if (!content) return null;

  const keywords = Array.isArray(input.keywords)
    ? input.keywords
        .filter((keyword): keyword is string => typeof keyword === "string")
        .map((keyword) =>
          keyword.trim().toLowerCase().slice(0, MAX_KEYWORD_CHARS_ADMIN),
        )
        .filter(Boolean)
        .slice(0, MAX_KEYWORDS_ADMIN)
    : [];

  const active = typeof input.active === "boolean" ? input.active : true;

  return { category: input.category, title, content, keywords, active };
}

export function isKnowledgeCategory(value: unknown): value is KnowledgeCategory {
  return (
    typeof value === "string" &&
    (KNOWLEDGE_CATEGORIES as readonly string[]).includes(value)
  );
}

export type KnowledgeResult = {
  id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
};

/** Quita caracteres con significado en los filtros de PostgREST (, ( ) % _). */
function sanitizeTerm(term: string): string {
  return term.replace(/[,()%_\\]/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(value: string): string {
  return value.length > MAX_CONTENT_CHARS
    ? `${value.slice(0, MAX_CONTENT_CHARS)}…`
    : value;
}

/**
 * Búsqueda simple (sin SQL generado por el modelo): ilike sobre título y
 * contenido con la consulta completa y con cada palabra significativa.
 * Solo entradas con active = true, máximo 5 resultados recortados.
 */
export async function searchKnowledge(
  rawQuery: string,
  rawCategory?: unknown,
): Promise<{ results: KnowledgeResult[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { results: [], error: "knowledge_unavailable" };
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return { results: [], error: "knowledge_unavailable" };

  const query = sanitizeTerm(String(rawQuery ?? "")).slice(0, 120);
  if (!query) return { results: [] };

  const category = isKnowledgeCategory(rawCategory) ? rawCategory : null;

  const words = query
    .split(" ")
    .filter((word) => word.length >= 3)
    .slice(0, 6);
  const terms = [query, ...words.filter((word) => word !== query)];
  const orFilter = terms
    .flatMap((term) => [`title.ilike.%${term}%`, `content.ilike.%${term}%`])
    .join(",");

  let request = supabase
    .from("coach_knowledge_entries")
    .select("id, category, title, content, keywords")
    .eq("active", true)
    .or(orFilter)
    .limit(MAX_RESULTS);
  if (category) request = request.eq("category", category);

  const { data, error } = await request.returns<
    Pick<DbCoachKnowledgeEntry, "id" | "category" | "title" | "content" | "keywords">[]
  >();

  if (error) return { results: [], error: "knowledge_query_failed" };

  // Prioriza coincidencias en título o keywords sobre coincidencias solo en contenido.
  const lowerTerms = terms.map((term) => term.toLowerCase());
  const scored = (data ?? []).map((entry) => {
    const title = entry.title.toLowerCase();
    const keywords = entry.keywords.map((keyword) => keyword.toLowerCase());
    const score = lowerTerms.reduce((total, term) => {
      if (title.includes(term)) return total + 3;
      if (keywords.some((keyword) => keyword.includes(term))) return total + 2;
      return total + 1;
    }, 0);
    return { entry, score };
  });
  scored.sort((a, b) => b.score - a.score);

  return {
    results: scored.map(({ entry }) => ({
      id: entry.id,
      category: entry.category,
      title: entry.title,
      content: truncate(entry.content),
    })),
  };
}
