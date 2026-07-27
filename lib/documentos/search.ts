import OpenAI from "openai";
import { getDocumentoAdmin, mapDocumentoRow } from "./repository";
import type { DocumentoRow } from "./types";

export type DocumentoEvidence = {
  document: DocumentoRow;
  pageNumber: number | null;
  chunkIndex: number | null;
  excerpt: string;
  similarity: number | null;
};

const EMBEDDING_MODEL = process.env.DOCUMENTO_EMBEDDING_MODEL || "text-embedding-3-small";
const STOP_WORDS = new Set(["que", "para", "con", "las", "los", "una", "uno", "del", "por", "the", "and", "find", "dame", "muestra", "documentos"]);

function searchTerms(question: string) {
  return question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((term) => term.length >= 3 && !STOP_WORDS.has(term))
    .slice(0, 12);
}

function excerpt(text: string | null | undefined, max = 700) {
  return (text || "").replace(/\s+/g, " ").trim().slice(0, max);
}

async function loadDocuments(ids: string[]) {
  if (!ids.length) return new Map<string, DocumentoRow>();
  const { data, error } = await getDocumentoAdmin().from("documentos").select("*").in("id", ids).is("deleted_at", null);
  if (error) throw new Error(error.message);
  return new Map((data || []).map((row) => {
    const document = mapDocumentoRow(row as Record<string, unknown>);
    return [document.id, document] as const;
  }));
}

async function keywordEvidence(question: string): Promise<DocumentoEvidence[]> {
  const supabase = getDocumentoAdmin();
  const terms = searchTerms(question);
  const queryText = terms.join(" ") || question.trim().slice(0, 100);
  const result = await supabase.from("documentos").select("*").is("deleted_at", null).textSearch("search_vector", queryText, { config: "simple", type: "plain" }).order("created_at", { ascending: false }).limit(20);
  if (!result.error) {
    return (result.data || []).map((row) => {
      const document = mapDocumentoRow(row as Record<string, unknown>);
      return { document, pageNumber: null, chunkIndex: null, excerpt: excerpt(document.extracted_text || document.summary || document.notas), similarity: null };
    });
  }

  // The fallback keeps the route usable while 040 is waiting for staging/production migration.
  const safe = queryText.replace(/[(),%_]/g, " ").trim().slice(0, 180);
  if (!safe) return [];
  const fallback = await supabase.from("documentos").select("*").is("deleted_at", null).or(`title.ilike.%${safe}%,nombre.ilike.%${safe}%,original_filename.ilike.%${safe}%,invoice_number.ilike.%${safe}%,extracted_text.ilike.%${safe}%`).order("created_at", { ascending: false }).limit(20);
  if (fallback.error) throw new Error(fallback.error.message);
  return (fallback.data || []).map((row) => {
    const document = mapDocumentoRow(row as Record<string, unknown>);
    return { document, pageNumber: null, chunkIndex: null, excerpt: excerpt(document.extracted_text || document.summary || document.notas), similarity: null };
  });
}

async function semanticEvidence(question: string): Promise<DocumentoEvidence[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];
  const client = new OpenAI({ apiKey });
  const embedding = await client.embeddings.create({ model: EMBEDDING_MODEL, input: question });
  const vector = embedding.data[0]?.embedding;
  if (!vector) return [];
  const { data, error } = await getDocumentoAdmin().rpc("match_document_chunks", { query_embedding: vector, match_threshold: 0.68, match_count: 12 });
  const rows = (data || []) as Array<Record<string, unknown>>;
  if (error || !rows.length) return [];
  const documents = await loadDocuments(rows.map((row) => String(row.document_id)));
  return rows.flatMap((row) => {
    const document = documents.get(String(row.document_id));
    if (!document) return [];
    return [{ document, pageNumber: typeof row.page_number === "number" ? row.page_number : null, chunkIndex: typeof row.chunk_index === "number" ? row.chunk_index : null, excerpt: excerpt(typeof row.content === "string" ? row.content : ""), similarity: typeof row.similarity === "number" ? row.similarity : null }];
  });
}

export async function retrieveDocumentoEvidence(question: string) {
  const [semantic, keyword] = await Promise.allSettled([semanticEvidence(question), keywordEvidence(question)]);
  const combined = [...(semantic.status === "fulfilled" ? semantic.value : []), ...(keyword.status === "fulfilled" ? keyword.value : [])];
  const seen = new Set<string>();
  const evidence = combined.filter((item) => {
    const key = `${item.document.id}:${item.chunkIndex ?? "document"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
  return { evidence, semanticAvailable: semantic.status === "fulfilled" && semantic.value.length > 0 };
}
