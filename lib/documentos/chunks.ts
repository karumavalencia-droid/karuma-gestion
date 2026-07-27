import OpenAI from "openai";
import { getDocumentoAdmin } from "./repository";

const EMBEDDING_MODEL = process.env.DOCUMENTO_EMBEDDING_MODEL || "text-embedding-3-small";
const CHUNK_SIZE = 2400;
const CHUNK_OVERLAP = 300;

export function splitDocumentoText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length && chunks.length < 500) {
    const end = Math.min(normalized.length, start + CHUNK_SIZE);
    const chunk = normalized.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= normalized.length) break;
    start = Math.max(start + 1, end - CHUNK_OVERLAP);
  }
  return chunks;
}

export async function rebuildDocumentoChunks(documentId: string, extractedText: string | null) {
  const chunks = splitDocumentoText(extractedText || "");
  const supabase = getDocumentoAdmin();
  if (!chunks.length) {
    const { error } = await supabase.from("document_chunks").delete().eq("document_id", documentId);
    if (error) throw new Error(error.message);
    return { count: 0, embedded: false };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const { error: deleteError } = await supabase.from("document_chunks").delete().eq("document_id", documentId);
    if (deleteError) throw new Error(deleteError.message);
    const { error } = await supabase.from("document_chunks").insert(chunks.map((content, chunkIndex) => ({ document_id: documentId, chunk_index: chunkIndex, content, metadata: { source: "extracted_text" } })));
    if (error) throw new Error(error.message);
    return { count: chunks.length, embedded: false };
  }

  const client = new OpenAI({ apiKey });
  const response = await client.embeddings.create({ model: EMBEDDING_MODEL, input: chunks });
  const rows = chunks.map((content, chunkIndex) => ({ document_id: documentId, chunk_index: chunkIndex, content, embedding: response.data[chunkIndex]?.embedding || null, metadata: { source: "extracted_text" } }));
  const { error: deleteError } = await supabase.from("document_chunks").delete().eq("document_id", documentId);
  if (deleteError) throw new Error(deleteError.message);
  const { error } = await supabase.from("document_chunks").insert(rows);
  if (error) throw new Error(error.message);
  return { count: rows.length, embedded: true };
}

export const DOCUMENTO_EMBEDDING_MODEL = EMBEDDING_MODEL;
