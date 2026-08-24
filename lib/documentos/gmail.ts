import { createHash, randomUUID } from "node:crypto";
import { getGmailAccessToken } from "@/lib/reservas/email";
import { createProcessingRun, getDocumentoAdmin } from "./repository";
import { uploadDocumentoObject, deleteDocumentoObject } from "./storage";
import { DOCUMENTO_BUCKET, DOCUMENTO_MAX_FILE_BYTES } from "./types";
import { inferDocumentoType, isAllowedDocumentoFile } from "./validation";
import { detectDocumentoDuplicates } from "./associations";

type GmailPart = {
  filename?: string;
  mimeType?: string;
  body?: { attachmentId?: string; size?: number };
  parts?: GmailPart[];
};

type GmailMessage = {
  id: string;
  threadId?: string;
  payload?: { headers?: Array<{ name?: string; value?: string }>; parts?: GmailPart[] };
};

type GmailAttachment = { data?: string; size?: number };

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Buffer.from(padded, "base64");
}

function messageHeaders(message: GmailMessage) {
  const all = message.payload?.headers || [];
  const get = (name: string) => all.find((header) => header.name?.toLowerCase() === name)?.value || null;
  return { subject: get("subject"), from: get("from") };
}

function attachmentParts(parts: GmailPart[] | undefined): GmailPart[] {
  return (parts || []).flatMap((part) => [
    ...(part.filename && part.body?.attachmentId ? [part] : []),
    ...attachmentParts(part.parts),
  ]);
}

async function gmailJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`Gmail respondió ${response.status}`);
  return response.json() as Promise<T>;
}

export async function importDocumentoGmailAttachments(input: { actorEmail: string; query?: string; limit?: number }) {
  const accessToken = await getGmailAccessToken();
  if (!accessToken) throw new Error("Gmail no está configurado");
  const limit = Math.min(Math.max(input.limit || 20, 1), 100);
  const query = input.query?.trim() || process.env.DOCUMENTO_GMAIL_IMPORT_QUERY?.trim() || "has:attachment newer_than:30d";
  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("q", query);
  listUrl.searchParams.set("maxResults", String(limit));
  const listed = await gmailJson<{ messages?: Array<{ id?: string }> }>(listUrl.toString(), accessToken);
  const summary = { query, messages: listed.messages?.length || 0, imported: 0, skipped: 0, failed: 0, documentIds: [] as string[] };
  const supabase = getDocumentoAdmin();

  for (const listedMessage of listed.messages || []) {
    if (!listedMessage.id) continue;
    const message = await gmailJson<GmailMessage>(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(listedMessage.id)}?format=full`, accessToken);
    const meta = messageHeaders(message);
    for (const part of attachmentParts(message.payload?.parts)) {
      const attachmentId = part.body?.attachmentId;
      const filename = part.filename?.trim();
      if (!attachmentId || !filename) continue;
      if ((part.body?.size || 0) > DOCUMENTO_MAX_FILE_BYTES) { summary.skipped++; continue; }
      if (!isAllowedDocumentoFile(part.mimeType || "", filename)) { summary.skipped++; continue; }
      const { error: reservationError } = await supabase.from("document_email_imports").insert({ gmail_message_id: message.id, gmail_attachment_id: attachmentId, gmail_thread_id: message.threadId || null, sender_email: meta.from, subject: meta.subject, status: "importing" });
      if (reservationError) {
        // The unique pair makes retries idempotent without changing Gmail state.
        summary.skipped++;
        continue;
      }
      let objectPath: string | null = null;
      try {
        const attachment = await gmailJson<GmailAttachment>(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(message.id)}/attachments/${encodeURIComponent(attachmentId)}`, accessToken);
        if (!attachment.data) throw new Error("Adjunto vacío");
        const bytes = decodeBase64Url(attachment.data);
        if (!bytes.length || bytes.length > DOCUMENTO_MAX_FILE_BYTES) throw new Error("Adjunto fuera de límite");
        const sha256 = createHash("sha256").update(bytes).digest("hex");
        const { data: existingHash } = await supabase.from("documentos").select("id").eq("sha256", sha256).is("deleted_at", null).limit(1).maybeSingle();
        if (existingHash) {
          await supabase.from("document_email_imports").update({ document_id: existingHash.id, status: "skipped", error_message: "Duplicado por contenido" }).eq("gmail_message_id", message.id).eq("gmail_attachment_id", attachmentId);
          summary.skipped++;
          continue;
        }
        const documentId = randomUUID();
        const mimeType = part.mimeType || "application/octet-stream";
        const documentType = inferDocumentoType(mimeType, filename);
        const uploaded = await uploadDocumentoObject({ bytes, filename, mimeType, documentId, documentType });
        objectPath = uploaded.path;
        const title = meta.subject?.slice(0, 240) || filename;
        const { error: documentError } = await supabase.from("documentos").insert({
          id: documentId,
          nombre: title,
          title,
          original_filename: filename,
          categoria: "otros",
          storage_path: uploaded.path,
          storage_bucket: DOCUMENTO_BUCKET,
          mime_type: mimeType,
          tamano_bytes: bytes.length,
          file_size: bytes.length,
          document_type: documentType,
          status: "uploaded",
          source: "gmail_attachment",
          source_email_id: `${message.id}:${attachmentId}`,
          sha256,
          uploaded_at: new Date().toISOString(),
          created_by_email: input.actorEmail,
          metadata: { gmail_message_id: message.id, gmail_attachment_id: attachmentId, gmail_thread_id: message.threadId || null, gmail_subject: meta.subject, gmail_sender: meta.from },
        });
        if (documentError) throw new Error(documentError.message);
        await supabase.from("document_email_imports").update({ document_id: documentId, status: "imported", error_message: null }).eq("gmail_message_id", message.id).eq("gmail_attachment_id", attachmentId);
        try { await createProcessingRun(documentId, input.actorEmail); } catch (processingError) { console.error("[documentos] gmail processing run skipped", processingError); }
        try { await detectDocumentoDuplicates(documentId); } catch (duplicateError) { console.error("[documentos] gmail duplicate detection skipped", duplicateError); }
        summary.imported++;
        summary.documentIds.push(documentId);
      } catch (error) {
        if (objectPath) {
          try { await deleteDocumentoObject(objectPath); } catch (cleanupError) { console.error("[documentos] gmail orphan cleanup failed", cleanupError); }
        }
        await supabase.from("document_email_imports").update({ status: "failed", error_message: error instanceof Error ? error.message.slice(0, 2000) : "Error de importación" }).eq("gmail_message_id", message.id).eq("gmail_attachment_id", attachmentId);
        console.error("[documentos] gmail attachment import failed", { messageId: message.id, attachmentId, error });
        summary.failed++;
      }
    }
  }
  return summary;
}
