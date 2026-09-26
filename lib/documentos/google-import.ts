import { createHash } from "node:crypto";
import { getDocumentoBucket } from "@/lib/documentos/constants";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const MAX_BYTES = 25 * 1024 * 1024;
const DEFAULT_DRIVE_FOLDERS = [
  "16U--WymbgE7QAbdK921PErr3n5MzJiyC",
  "0AEVeu04d_oqzUk9PVA",
];

const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".xml"];

type GoogleTokenResponse = { access_token?: string; error?: string; error_description?: string };
type DriveFile = { id?: string; name?: string; mimeType?: string; size?: string; modifiedTime?: string };
type GmailPart = {
  filename?: string;
  mimeType?: string;
  body?: { attachmentId?: string; size?: number; data?: string };
  parts?: GmailPart[];
};
type GmailMessage = {
  id: string;
  threadId?: string;
  payload?: { headers?: Array<{ name?: string; value?: string }>; parts?: GmailPart[]; body?: { data?: string } };
};

type ImportSummary = {
  scanned: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
};

function firstEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

export function googleImportConfigured() {
  return Boolean(
    firstEnv("GOOGLE_CLIENT_ID", "GMAIL_OAUTH_CLIENT_ID") &&
      firstEnv("GOOGLE_CLIENT_SECRET", "GMAIL_OAUTH_CLIENT_SECRET") &&
      firstEnv("GOOGLE_REFRESH_TOKEN", "GMAIL_OAUTH_REFRESH_TOKEN"),
  );
}

export async function getGoogleAccessToken(): Promise<string> {
  const clientId = firstEnv("GOOGLE_CLIENT_ID", "GMAIL_OAUTH_CLIENT_ID");
  const clientSecret = firstEnv("GOOGLE_CLIENT_SECRET", "GMAIL_OAUTH_CLIENT_SECRET");
  const refreshToken = firstEnv("GOOGLE_REFRESH_TOKEN", "GMAIL_OAUTH_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google OAuth no configurado: faltan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o GOOGLE_REFRESH_TOKEN",
    );
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const payload = (await response.json()) as GoogleTokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || `Google OAuth ${response.status}`);
  }
  return payload.access_token;
}

function safeName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_").slice(-140) || "documento";
}

function allowedFile(filename: string, mimeType: string) {
  const lower = filename.toLowerCase();
  return (
    mimeType === "application/pdf" ||
    mimeType.startsWith("image/") ||
    mimeType.includes("xml") ||
    ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))
  );
}

function inferDocumentKind(context: string) {
  const value = context.toLowerCase();
  if (/albar[aá]n|delivery\s*note/.test(value)) {
    return { tipo_documento: "albaran", document_type: "other" };
  }
  if (/factura|invoice|rechnung/.test(value)) {
    return { tipo_documento: "factura", document_type: "invoice" };
  }
  if (/recibo|receipt|ticket|payment/.test(value)) {
    return { tipo_documento: "recibo", document_type: "other" };
  }
  return { tipo_documento: "pendiente_revision", document_type: "other" };
}

function looksLikeSpicySoup(context: string) {
  return /spicy\s*soup|麻辣无情/i.test(context);
}

async function googleFetch(url: string, token: string) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Google API ${response.status}: ${url.includes("gmail") ? "Gmail" : "Drive"}`);
  return response;
}

async function alreadyImported(sourceFileId: string, sha256?: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase no configurado");

  const bySource = await supabase
    .from("documentos")
    .select("id")
    .eq("source_file_id", sourceFileId)
    .limit(1)
    .maybeSingle();
  if (bySource.data) return true;

  if (sha256) {
    const byHash = await supabase
      .from("documentos")
      .select("id")
      .eq("file_sha256", sha256)
      .limit(1)
      .maybeSingle();
    if (byHash.data) return true;
  }
  return false;
}

async function storeImportedFile(input: {
  bytes: Buffer;
  filename: string;
  mimeType: string;
  sourceType: "google_drive" | "gmail";
  sourceFileId: string;
  sourceEmailId?: string | null;
  context: string;
  metadata: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase no configurado");
  if (!input.bytes.length || input.bytes.length > MAX_BYTES) throw new Error("Archivo fuera de límite");

  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  if (await alreadyImported(input.sourceFileId, sha256)) return { skipped: true as const };

  const kind = inferDocumentKind(`${input.context} ${input.filename}`);
  const bucket = getDocumentoBucket("facturas");
  const now = new Date();
  const yearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const storagePath = `facturas/${yearMonth}/${Date.now()}-${sha256.slice(0, 10)}-${safeName(input.filename)}`;

  const upload = await supabase.storage.from(bucket).upload(storagePath, input.bytes, {
    contentType: input.mimeType || "application/octet-stream",
    upsert: false,
  });
  if (upload.error) throw new Error(`Storage: ${upload.error.message}`);

  const excludedEntity = looksLikeSpicySoup(input.context);
  const { data, error } = await supabase
    .from("documentos")
    .insert({
      nombre: input.filename,
      categoria: "facturas",
      storage_path: storagePath,
      mime_type: input.mimeType || null,
      tamano_bytes: input.bytes.length,
      tipo_documento: kind.tipo_documento,
      document_type: kind.document_type,
      source_type: input.sourceType,
      source: input.sourceType,
      source_file_id: input.sourceFileId,
      source_email_id: input.sourceEmailId || null,
      file_sha256: sha256,
      sha256,
      processing_status: excludedEntity ? "excluded_other_entity" : "needs_review",
      status: "uploaded",
      storage_bucket: bucket,
      metadata: {
        ...input.metadata,
        import_version: "google-sync-v1",
        accounting_status: "pending_review",
        do_not_count_as_purchase: true,
        excluded_other_entity: excludedEntity,
        target_company: excludedEntity ? "other" : "KOSUSHI_GRUPO_SL_UNVERIFIED",
      },
    })
    .select("id")
    .single();

  if (error) {
    await supabase.storage.from(bucket).remove([storagePath]);
    throw new Error(`Documentos: ${error.message}`);
  }
  return { skipped: false as const, id: data.id as string };
}

function driveFolderIds() {
  const configured = process.env.DOCUMENTO_DRIVE_FOLDER_IDS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return configured?.length ? configured : DEFAULT_DRIVE_FOLDERS;
}

export async function importDriveDocuments(input: { limit?: number } = {}): Promise<ImportSummary> {
  const token = await getGoogleAccessToken();
  const limit = Math.min(Math.max(input.limit || 500, 1), 1000);
  const summary: ImportSummary = { scanned: 0, imported: 0, skipped: 0, failed: 0, errors: [] };

  for (const folderId of driveFolderIds()) {
    const files: DriveFile[] = [];
    let pageToken = "";
    while (files.length < limit) {
      const url = new URL("https://www.googleapis.com/drive/v3/files");
      url.searchParams.set("q", `'${folderId}' in parents and trashed = false`);
      url.searchParams.set("fields", "nextPageToken,files(id,name,mimeType,size,modifiedTime)");
      url.searchParams.set("pageSize", String(Math.min(100, limit - files.length)));
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const page = (await (await googleFetch(url.toString(), token)).json()) as {
        files?: DriveFile[];
        nextPageToken?: string;
      };
      files.push(...(page.files || []));
      pageToken = page.nextPageToken || "";
      if (!pageToken) break;
    }

    for (const file of files) {
      summary.scanned++;
      const fileId = file.id;
      const filename = file.name?.trim() || "";
      const mimeType = file.mimeType || "application/octet-stream";
      if (!fileId || !filename || !allowedFile(filename, mimeType) || Number(file.size || 0) > MAX_BYTES) {
        summary.skipped++;
        continue;
      }
      const sourceFileId = `drive:${fileId}`;
      try {
        if (await alreadyImported(sourceFileId)) {
          summary.skipped++;
          continue;
        }
        const bytes = Buffer.from(
          await (await googleFetch(
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
            token,
          )).arrayBuffer(),
        );
        const stored = await storeImportedFile({
          bytes,
          filename,
          mimeType,
          sourceType: "google_drive",
          sourceFileId,
          context: filename,
          metadata: {
            google_drive_file_id: fileId,
            google_drive_folder_id: folderId,
            google_drive_modified_time: file.modifiedTime || null,
          },
        });
        if (stored.skipped) summary.skipped++;
        else summary.imported++;
      } catch (error) {
        summary.failed++;
        if (summary.errors.length < 20) summary.errors.push(`${filename}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  return summary;
}

function header(message: GmailMessage, name: string) {
  return message.payload?.headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value || "";
}

function attachmentParts(parts: GmailPart[] | undefined): GmailPart[] {
  return (parts || []).flatMap((part) => [
    ...(part.filename && part.body?.attachmentId ? [part] : []),
    ...attachmentParts(part.parts),
  ]);
}

function decodeBase64Url(value: string) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="), "base64");
}

export async function importGmailDocuments(input: { query?: string; limit?: number } = {}): Promise<ImportSummary> {
  const token = await getGoogleAccessToken();
  const limit = Math.min(Math.max(input.limit || 200, 1), 500);
  const query =
    input.query?.trim() ||
    process.env.DOCUMENTO_GMAIL_IMPORT_QUERY?.trim() ||
    'newer_than:35d -in:spam -in:trash has:attachment {factura invoice albaran recibo "delivery note"}';
  const summary: ImportSummary = { scanned: 0, imported: 0, skipped: 0, failed: 0, errors: [] };

  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("q", query);
  listUrl.searchParams.set("maxResults", String(limit));
  const listed = (await (await googleFetch(listUrl.toString(), token)).json()) as { messages?: Array<{ id?: string }> };

  for (const item of listed.messages || []) {
    if (!item.id) continue;
    const message = (await (await googleFetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(item.id)}?format=full`,
      token,
    )).json()) as GmailMessage;
    const subject = header(message, "subject");
    const sender = header(message, "from");
    const context = `${subject} ${sender}`;

    for (const part of attachmentParts(message.payload?.parts)) {
      summary.scanned++;
      const attachmentId = part.body?.attachmentId;
      const filename = part.filename?.trim() || "";
      const mimeType = part.mimeType || "application/octet-stream";
      if (!attachmentId || !filename || !allowedFile(filename, mimeType) || Number(part.body?.size || 0) > MAX_BYTES) {
        summary.skipped++;
        continue;
      }
      const sourceFileId = `gmail:${message.id}:${attachmentId}`;
      try {
        if (await alreadyImported(sourceFileId)) {
          summary.skipped++;
          continue;
        }
        const attachment = (await (await googleFetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(message.id)}/attachments/${encodeURIComponent(attachmentId)}`,
          token,
        )).json()) as { data?: string };
        if (!attachment.data) throw new Error("Adjunto vacío");
        const stored = await storeImportedFile({
          bytes: decodeBase64Url(attachment.data),
          filename,
          mimeType,
          sourceType: "gmail",
          sourceFileId,
          sourceEmailId: message.id,
          context,
          metadata: {
            gmail_message_id: message.id,
            gmail_thread_id: message.threadId || null,
            gmail_attachment_id: attachmentId,
            gmail_subject: subject,
            gmail_sender: sender,
          },
        });
        if (stored.skipped) summary.skipped++;
        else summary.imported++;
      } catch (error) {
        summary.failed++;
        if (summary.errors.length < 20) summary.errors.push(`${filename}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  return summary;
}

export async function importGoogleDocuments(input: { gmailQuery?: string; gmailLimit?: number; driveLimit?: number } = {}) {
  const [gmail, drive] = await Promise.allSettled([
    importGmailDocuments({ query: input.gmailQuery, limit: input.gmailLimit }),
    importDriveDocuments({ limit: input.driveLimit }),
  ]);
  return {
    configured: googleImportConfigured(),
    gmail: gmail.status === "fulfilled" ? gmail.value : { error: gmail.reason instanceof Error ? gmail.reason.message : String(gmail.reason) },
    drive: drive.status === "fulfilled" ? drive.value : { error: drive.reason instanceof Error ? drive.reason.message : String(drive.reason) },
  };
}
