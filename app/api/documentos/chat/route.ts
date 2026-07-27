import OpenAI from "openai";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { isDocumentoOwner } from "@/lib/documentos/permissions";
import { retrieveDocumentoEvidence, type DocumentoEvidence } from "@/lib/documentos/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function sourcePayload(item: DocumentoEvidence) {
  return {
    id: item.document.id,
    title: item.document.title || item.document.nombre,
    filename: item.document.original_filename,
    documentType: item.document.document_type,
    documentDate: item.document.document_date,
    amountTotal: item.document.amount_total,
    currency: item.document.currency,
    pageNumber: item.pageNumber,
    excerpt: item.excerpt,
    similarity: item.similarity,
    href: `/documento/${item.document.id}`,
  };
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!isDocumentoOwner(user)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  let body: { question?: unknown };
  try {
    body = await request.json() as { question?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 1000) : "";
  if (!question) return NextResponse.json({ error: "Escribe una pregunta" }, { status: 400 });

  try {
    const { evidence, semanticAvailable } = await retrieveDocumentoEvidence(question);
    const sources = evidence.map(sourcePayload);
    if (!evidence.length) {
      return NextResponse.json({ answer: "No he encontrado evidencia suficiente en Documento para responder a esta pregunta.", sources: [], computed: { documentCount: 0, totalAmount: null }, retrieval: { semanticAvailable } });
    }

    const totalAmount = evidence.reduce((sum, item) => sum + (typeof item.document.amount_total === "number" ? item.document.amount_total : 0), 0);
    const currencies = [...new Set(evidence.map((item) => item.document.currency).filter(Boolean))];
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ answer: `He encontrado ${evidence.length} documento(s) relevante(s). Revisa las fuentes adjuntas; el resumen AI requiere configurar OPENAI_API_KEY.`, sources, computed: { documentCount: evidence.length, totalAmount: totalAmount || null, currencies }, retrieval: { semanticAvailable } });
    }

    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model: process.env.OPENAI_DOCUMENT_CHAT_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions: "Eres el asistente de documentos de Karuma. Responde en español, de forma breve y verificable. Usa únicamente la evidencia proporcionada. Si la evidencia no permite una conclusión, dilo claramente. No inventes cifras, fechas, proveedores ni relaciones. No incluyas fuentes que no estén en la lista.",
      input: `Pregunta del dueño:\n${question}\n\nEvidencia recuperada:\n${JSON.stringify(sources)}\n\nCálculos hechos por el programa:\n${JSON.stringify({ documentCount: evidence.length, totalAmount: totalAmount || null, currencies })}`,
      max_output_tokens: 900,
    });
    return NextResponse.json({ answer: response.output_text.trim() || "No he podido generar una respuesta basada en la evidencia.", sources, computed: { documentCount: evidence.length, totalAmount: totalAmount || null, currencies }, retrieval: { semanticAvailable } });
  } catch (error) {
    console.error("[documentos] chat failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "No se pudo consultar el archivo" }, { status: 502 });
  }
}
