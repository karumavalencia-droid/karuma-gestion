import {
  DOCUMENTO_MAX_FILE_BYTES,
  DOCUMENTO_STATUSES,
  DOCUMENTO_TYPES,
  type DocumentoStatus,
  type DocumentoType,
} from "./types";

const SAFE_FILENAME = /[^a-zA-Z0-9._-]+/g;
const ALLOWED_EXTENSIONS = new Set(["pdf", "txt", "doc", "docx", "xls", "xlsx", "csv", "jpg", "jpeg", "png", "webp", "heic", "mp3", "m4a", "wav", "ogg"]);
const ALLOWED_MIME_PREFIXES = ["image/", "audio/", "text/"];
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
]);

export function safeDocumentoFilename(value: string): string {
  const normalized = value.normalize("NFKC").replace(SAFE_FILENAME, "-").replace(/^-+|-+$/g, "");
  return normalized.slice(0, 160) || "documento";
}

export function isDocumentoType(value: unknown): value is DocumentoType {
  return typeof value === "string" && DOCUMENTO_TYPES.includes(value as DocumentoType);
}

export function isDocumentoStatus(value: unknown): value is DocumentoStatus {
  return typeof value === "string" && DOCUMENTO_STATUSES.includes(value as DocumentoStatus);
}

export function validateDocumentoFile(file: File): string | null {
  if (file.size <= 0) return "El archivo está vacío.";
  if (file.size > DOCUMENTO_MAX_FILE_BYTES) {
    return `El archivo supera el límite de ${Math.round(DOCUMENTO_MAX_FILE_BYTES / 1024 / 1024)} MB.`;
  }
  if (!file.name.trim()) return "El archivo no tiene nombre.";
  if (!isAllowedDocumentoFile(file.type, file.name)) return "Este tipo de archivo no está permitido.";
  return null;
}

export function isAllowedDocumentoFile(mimeType: string, filename: string): boolean {
  const normalizedMime = mimeType.toLowerCase().trim();
  if (ALLOWED_MIME_TYPES.has(normalizedMime) || ALLOWED_MIME_PREFIXES.some((prefix) => normalizedMime.startsWith(prefix))) return true;
  const extension = filename.toLowerCase().split(".").pop() || "";
  return ALLOWED_EXTENSIONS.has(extension);
}

export function inferDocumentoType(mimeType: string, filename: string): DocumentoType {
  const name = filename.toLowerCase();
  if (mimeType === "text/plain" || name.endsWith(".txt")) return "note";
  if (mimeType.startsWith("image/")) return name.includes("screenshot") ? "screenshot" : "image";
  if (mimeType === "application/pdf" || /factura|invoice/.test(name)) return "other";
  return "other";
}
