import { createHash } from "node:crypto";
import { getDocumentoAdmin } from "./repository";
import { DOCUMENTO_BUCKET } from "./types";
import { safeDocumentoFilename } from "./validation";

export async function uploadDocumentoObject(input: {
  bytes: Buffer;
  filename: string;
  mimeType: string;
  documentId: string;
  documentType: string;
  companyId?: string | null;
}) {
  const now = new Date();
  const prefix = input.companyId || "karuma";
  const path = `${prefix}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${input.documentType}/${input.documentId}-${safeDocumentoFilename(input.filename)}`;
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const { error } = await getDocumentoAdmin().storage.from(DOCUMENTO_BUCKET).upload(path, input.bytes, {
    contentType: input.mimeType || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return { path, sha256 };
}

export async function deleteDocumentoObject(path: string, bucket = DOCUMENTO_BUCKET) {
  const { error } = await getDocumentoAdmin().storage.from(bucket).remove([path]);
  if (error) throw new Error(error.message);
}

export async function createDocumentoSignedUrl(path: string, expiresInSeconds = 300, bucket = DOCUMENTO_BUCKET) {
  const { data, error } = await getDocumentoAdmin().storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "No se pudo generar la URL temporal");
  return data.signedUrl;
}
