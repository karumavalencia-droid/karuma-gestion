import { createHash, randomUUID } from "node:crypto";
import { getGmailAccessToken } from "@/lib/reservas/email";
import { createProcessingRun, getDocumentoAdmin } from "./repository";
import { deleteDocumentoObject, uploadDocumentoObject } from "./storage";
import { DOCUMENTO_BUCKET, DOCUMENTO_MAX_FILE_BYTES } from "./types";
import { detectDocumentoDuplicates } from "./associations";
import { inferDocumentoType, isAllowedDocumentoFile } from "./validation";

type DriveFile = { id?: string; name?: string; mimeType?: string; size?: string };
const DEFAULT_KOSUSHI_DRIVE_FOLDER_ID = "16U--WymbgE7QAbdK921PErr3n5MzJiyC";

async function driveRequest(url: string, accessToken: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`Google Drive respondió ${response.status}`);
  return response;
}

export async function importDocumentoDriveFolder(input: { actorEmail: string; folderId?: string; limit?: number }) {
  const accessToken = await getGmailAccessToken();
  if (!accessToken) throw new Error("Google no está configurado");
  const folderId = input.folderId?.trim() || process.env.DOCUMENTO_DRIVE_FOLDER_ID?.trim() || DEFAULT_KOSUSHI_DRIVE_FOLDER_ID;
  if (!folderId || !/^[a-zA-Z0-9_-]{10,200}$/.test(folderId)) throw new Error("Falta la carpeta de Drive");
  const limit = Math.min(Math.max(input.limit || 200, 1), 500);
  const files: DriveFile[] = [];
  let pageToken = "";
  do {
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("q", `'${folderId}' in parents and trashed = false`);
    url.searchParams.set("fields", "nextPageToken,files(id,name,mimeType,size)");
    url.searchParams.set("pageSize", String(Math.min(100, limit - files.length)));
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const page = await (await driveRequest(url.toString(), accessToken)).json() as { files?: DriveFile[]; nextPageToken?: string };
    files.push(...(page.files || []));
    pageToken = page.nextPageToken || "";
  } while (pageToken && files.length < limit);

  const summary = { folderId, files: files.length, imported: 0, skipped: 0, failed: 0, documentIds: [] as string[] };
  const supabase = getDocumentoAdmin();
  for (const file of files) {
    const fileId = file.id;
    const filename = file.name?.trim();
    const mimeType = file.mimeType || "application/octet-stream";
    if (!fileId || !filename || !isAllowedDocumentoFile(mimeType, filename) || Number(file.size || 0) > DOCUMENTO_MAX_FILE_BYTES) { summary.skipped++; continue; }
    const sourceId = `drive:${fileId}`;
    const { data: existingSource } = await supabase.from("documentos").select("id").eq("source_email_id", sourceId).is("deleted_at", null).maybeSingle();
    if (existingSource) { summary.skipped++; continue; }
    let objectPath: string | null = null;
    try {
      const bytes = Buffer.from(await (await driveRequest(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, accessToken)).arrayBuffer());
      if (!bytes.length || bytes.length > DOCUMENTO_MAX_FILE_BYTES) throw new Error("Archivo fuera de límite");
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const { data: existingHash } = await supabase.from("documentos").select("id").eq("sha256", sha256).is("deleted_at", null).limit(1).maybeSingle();
      if (existingHash) { summary.skipped++; continue; }
      const documentId = randomUUID();
      const documentType = inferDocumentoType(mimeType, filename);
      const uploaded = await uploadDocumentoObject({ bytes, filename, mimeType, documentId, documentType });
      objectPath = uploaded.path;
      const { error } = await supabase.from("documentos").insert({
        id: documentId, nombre: filename, title: filename, original_filename: filename, categoria: "otros",
        storage_path: uploaded.path, storage_bucket: DOCUMENTO_BUCKET, mime_type: mimeType,
        tamano_bytes: bytes.length, file_size: bytes.length, document_type: documentType, status: "uploaded",
        source: "google_drive", source_email_id: sourceId, sha256, uploaded_at: new Date().toISOString(),
        created_by_email: input.actorEmail, metadata: { google_drive_file_id: fileId, google_drive_folder_id: folderId },
      });
      if (error) throw new Error(error.message);
      try { await createProcessingRun(documentId, input.actorEmail); } catch (error) { console.error("[documentos] drive processing run skipped", error); }
      try { await detectDocumentoDuplicates(documentId); } catch (error) { console.error("[documentos] drive duplicate detection skipped", error); }
      summary.imported++;
      summary.documentIds.push(documentId);
    } catch (error) {
      if (objectPath) try { await deleteDocumentoObject(objectPath); } catch { /* best-effort cleanup */ }
      console.error("[documentos] drive import failed", { fileId, error });
      summary.failed++;
    }
  }
  return summary;
}
