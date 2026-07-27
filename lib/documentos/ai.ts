import OpenAI from "openai";
import type { DocumentoType } from "./types";

export type DocumentoAiResult = {
  documentType: DocumentoType;
  summary: string;
  description: string;
  extractedText: string;
  tags: string[];
  confidence: number;
  invoice?: {
    invoiceNumber?: string;
    supplierName?: string;
    supplierTaxId?: string;
    documentDate?: string;
    dueDate?: string;
    amountNet?: number;
    vatAmount?: number;
    amountTotal?: number;
    currency?: string;
    items?: Array<{
      rawProductName: string;
      description?: string;
      quantity?: number;
      unit?: string;
      unitPrice?: number;
      taxRate?: number;
      lineTotal?: number;
    }>;
  };
};

const MODEL = process.env.OPENAI_DOCUMENT_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini";
const ALLOWED_TYPES = new Set<DocumentoType>([
  "invoice", "contract", "bank_receipt", "employee_document", "menu", "recipe",
  "image", "screenshot", "note", "idea", "legal", "tax", "other",
]);

function safeJson(text: string): Record<string, unknown> {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("AI returned invalid JSON");
  return parsed as Record<string, unknown>;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function textValue(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parseResult(raw: Record<string, unknown>): DocumentoAiResult {
  const documentType = ALLOWED_TYPES.has(raw.documentType as DocumentoType) ? raw.documentType as DocumentoType : "other";
  const invoiceRaw = raw.invoice && typeof raw.invoice === "object" ? raw.invoice as Record<string, unknown> : null;
  const rawItems = invoiceRaw && Array.isArray(invoiceRaw.items) ? invoiceRaw.items : [];
  const items = rawItems.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const rawProductName = textValue(row.rawProductName, 500);
    return rawProductName ? [{ rawProductName, description: textValue(row.description, 500) || undefined, quantity: finiteNumber(row.quantity), unit: textValue(row.unit, 80) || undefined, unitPrice: finiteNumber(row.unitPrice), taxRate: finiteNumber(row.taxRate), lineTotal: finiteNumber(row.lineTotal) }] : [];
  }).slice(0, 500);
  const confidence = Math.min(1, Math.max(0, finiteNumber(raw.confidence) ?? 0));
  return {
    documentType,
    summary: textValue(raw.summary, 2000),
    description: textValue(raw.description, 4000),
    extractedText: textValue(raw.extractedText, 500_000),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean).slice(0, 30) : [],
    confidence,
    ...(invoiceRaw ? { invoice: { invoiceNumber: textValue(invoiceRaw.invoiceNumber, 200), supplierName: textValue(invoiceRaw.supplierName, 300), supplierTaxId: textValue(invoiceRaw.supplierTaxId, 100), documentDate: textValue(invoiceRaw.documentDate, 20), dueDate: textValue(invoiceRaw.dueDate, 20), amountNet: finiteNumber(invoiceRaw.amountNet), vatAmount: finiteNumber(invoiceRaw.vatAmount), amountTotal: finiteNumber(invoiceRaw.amountTotal), currency: textValue(invoiceRaw.currency, 10), items } } : {}),
  };
}

export async function analyzeDocumento(input: {
  filename: string;
  mimeType: string;
  bytes: Buffer;
  notes?: string | null;
}): Promise<DocumentoAiResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY no está configurado");
  const client = new OpenAI({ apiKey });
  const base64 = input.bytes.toString("base64");
  const dataUrl = `data:${input.mimeType || "application/octet-stream"};base64,${base64}`;
  const isImage = input.mimeType.startsWith("image/");
  const isText = input.mimeType.startsWith("text/") || input.filename.toLowerCase().endsWith(".txt");
  const prompt = `Analiza este documento empresarial de Karuma. Nombre: ${input.filename}. Notas del usuario: ${input.notes || ""}. Nunca inventes campos; usa null o listas vacías si no hay evidencia.`;
  const content = isImage
    ? [
        { type: "text" as const, text: prompt },
        { type: "image_url" as const, image_url: { url: dataUrl, detail: "high" as const } },
      ]
    : [
        {
          type: "text" as const,
          text: `${prompt}\n\nContenido extraído:\n${isText ? input.bytes.toString("utf8").slice(0, 500_000) : "No hay texto extraíble disponible para este formato. Clasifica únicamente a partir del nombre y las notas; no inventes datos."}`,
        },
      ];

  // GPT-4.1 mini supports Chat Completions and Responses. We use the former
  // here because the deployed gateway rejects the legacy Responses
  // `input_text` content item, while Chat Completions has a stable text/image
  // schema for this constrained JSON extraction.
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `Eres un extractor documental conservador. Clasifica en uno de: ${[...ALLOWED_TYPES].join(", ")}. El resumen debe tener 1-3 frases. Si parece factura, extrae número, proveedor, NIF/CIF, fechas, importes, moneda y líneas, conservando el nombre original del producto. Responde JSON con estas claves: documentType, summary, description, extractedText, tags (array), confidence (0 a 1), invoice (objeto o null).`,
      },
      { role: "user", content },
    ],
    response_format: { type: "json_object" },
    max_tokens: 5000,
    temperature: 0,
  });
  return parseResult(safeJson(response.choices[0]?.message.content || ""));
}

export { MODEL as DOCUMENT_AI_MODEL };
