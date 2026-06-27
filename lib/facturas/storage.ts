import { CATEGORIAS_FACTURA, MAX_FILE_BYTES, fmtNum, genId } from "@/lib/facturas/helpers";
import type { CategoriaFactura, Factura, FacturasStore } from "@/lib/types";

const STORE_PATH = "facturas/facturas.json";
const FILES_PREFIX = "facturas/files";
const BLOB_API_URL = "https://blob.vercel-storage.com";

type FacturasCloudStore = FacturasStore & {
  version: 1;
  updatedAt: string | null;
};

type BlobCredentials = {
  token: string;
  storeId: string;
};

type BlobListResponse = {
  blobs?: Array<{
    url: string;
    pathname: string;
  }>;
};

export type FacturaInput = Partial<Factura> & {
  fecha: string;
  proveedor?: string;
  importe?: number;
};

function emptyStore(): FacturasCloudStore {
  return {
    version: 1,
    updatedAt: null,
    facturas: [],
  };
}

function getBlobCredentials(): BlobCredentials | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return null;
  const storeId = token.split("_")[3] || "";
  return storeId ? { token, storeId } : null;
}

function blobHeaders(credentials: BlobCredentials): Headers {
  return new Headers({
    Authorization: `Bearer ${credentials.token}`,
    "x-vercel-blob-store-id": credentials.storeId,
    "x-api-blob-request-attempt": "0",
    "x-api-blob-request-id": `${credentials.storeId}:${Date.now()}:${crypto.randomUUID()}`,
    "x-api-version": "12",
  });
}

function normalizeCategory(value: unknown): CategoriaFactura {
  const categoria = String(value ?? "Otros");
  return (CATEGORIAS_FACTURA as readonly string[]).includes(categoria)
    ? (categoria as CategoriaFactura)
    : "Otros";
}

function normalizeFactura(raw: unknown): Factura | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const fecha = String(r.fecha ?? "").slice(0, 10);
  if (!fecha) return null;

  return {
    id: String(r.id ?? genId()),
    fecha,
    proveedor: String(r.proveedor ?? "").trim() || "Sin proveedor",
    importe: fmtNum(parseFloat(String(r.importe ?? 0)) || 0),
    categoria: normalizeCategory(r.categoria),
    observaciones: String(r.observaciones ?? ""),
    archivoNombre: String(r.archivoNombre ?? ""),
    archivoTipo: String(r.archivoTipo ?? ""),
    archivoData: String(r.archivoData ?? ""),
    archivoPath: typeof r.archivoPath === "string" ? r.archivoPath : undefined,
    archivoUrl: typeof r.archivoUrl === "string" ? r.archivoUrl : undefined,
    archivoSource:
      r.archivoSource === "upload" ||
      r.archivoSource === "google-drive" ||
      r.archivoSource === "legacy"
        ? r.archivoSource
        : undefined,
    driveFileId: typeof r.driveFileId === "string" ? r.driveFileId : undefined,
    createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : undefined,
  };
}

function normalizeStore(value: unknown): FacturasCloudStore {
  if (!value || typeof value !== "object") return emptyStore();
  const object = value as Partial<FacturasCloudStore>;
  return {
    version: 1,
    updatedAt: typeof object.updatedAt === "string" ? object.updatedAt : null,
    facturas: Array.isArray(object.facturas)
      ? object.facturas.map(normalizeFactura).filter((f): f is Factura => f !== null)
      : [],
  };
}

async function findBlob(credentials: BlobCredentials, path: string): Promise<{ url: string } | null> {
  const listUrl = new URL(BLOB_API_URL);
  listUrl.searchParams.set("limit", "1");
  listUrl.searchParams.set("prefix", path);

  const listResponse = await fetch(listUrl, {
    headers: blobHeaders(credentials),
    cache: "no-store",
  });
  if (!listResponse.ok) {
    throw new Error(`Vercel Blob list failed with ${listResponse.status}`);
  }

  const listing = (await listResponse.json()) as BlobListResponse;
  const blob = listing.blobs?.find((item) => item.pathname === path);
  return blob ? { url: blob.url } : null;
}

async function readBlobJson(credentials: BlobCredentials, path: string): Promise<unknown | null> {
  const blob = await findBlob(credentials, path);
  if (!blob) return null;

  const response = await fetch(blob.url, {
    headers: { Authorization: `Bearer ${credentials.token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Vercel Blob read failed with ${response.status}`);
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function writeBlobBytes(
  credentials: BlobCredentials,
  path: string,
  body: BodyInit,
  contentType: string,
): Promise<void> {
  const headers = blobHeaders(credentials);
  headers.set("x-vercel-blob-access", "private");
  headers.set("x-add-random-suffix", "0");
  headers.set("x-allow-overwrite", "1");
  headers.set("x-content-type", contentType);
  headers.set("x-cache-control-max-age", "0");

  const uploadUrl = new URL(BLOB_API_URL);
  uploadUrl.searchParams.set("pathname", path);

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers,
    body,
  });
  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(
      `Vercel Blob write failed with ${response.status}${
        details ? `: ${details.slice(0, 200)}` : ""
      }`,
    );
  }
}

function extFromMime(tipo: string): string {
  if (tipo.includes("pdf")) return ".pdf";
  if (tipo.includes("png")) return ".png";
  if (tipo.includes("jpeg") || tipo.includes("jpg")) return ".jpg";
  return "";
}

function safeFileName(nombre: string, tipo: string): string {
  const dot = nombre.lastIndexOf(".");
  const rawBase = dot > 0 ? nombre.slice(0, dot) : nombre;
  const rawExt = dot > 0 ? nombre.slice(dot).toLowerCase() : extFromMime(tipo);
  const base =
    rawBase
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "factura";
  const ext = /^\.[a-z0-9]{1,8}$/.test(rawExt) ? rawExt : extFromMime(tipo);
  return `${base}${ext}`;
}

function parseDataUrl(dataUrl: string): { bytes: Buffer; contentType: string } | null {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;

  const bytes = Buffer.from(match[2], "base64");
  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw new Error(`Archivo demasiado grande (máx. ${MAX_FILE_BYTES / 1024 / 1024} MB)`);
  }

  return {
    bytes,
    contentType: match[1] || "application/octet-stream",
  };
}

async function maybeStoreAttachment(
  credentials: BlobCredentials,
  factura: Factura,
): Promise<Factura> {
  if (!factura.archivoData) return factura;

  const parsed = parseDataUrl(factura.archivoData);
  if (!parsed) return factura;

  const fileName = safeFileName(factura.archivoNombre || "factura", parsed.contentType);
  const archivoPath = `${FILES_PREFIX}/${factura.id}/${fileName}`;
  await writeBlobBytes(credentials, archivoPath, new Uint8Array(parsed.bytes), parsed.contentType);

  return {
    ...factura,
    archivoTipo: parsed.contentType,
    archivoPath,
    archivoData: "",
    archivoSource: "upload",
    updatedAt: Date.now(),
  };
}

export function isFacturasStorageConfigured(): boolean {
  return Boolean(getBlobCredentials());
}

export async function readFacturasStore(): Promise<FacturasCloudStore> {
  const credentials = getBlobCredentials();
  if (!credentials) return emptyStore();
  const value = await readBlobJson(credentials, STORE_PATH);
  return normalizeStore(value);
}

export async function writeFacturasStore(store: FacturasStore): Promise<FacturasCloudStore> {
  const credentials = getBlobCredentials();
  if (!credentials) throw new Error("BLOB_READ_WRITE_TOKEN is not configured");

  const next: FacturasCloudStore = {
    version: 1,
    updatedAt: new Date().toISOString(),
    facturas: store.facturas.map(normalizeFactura).filter((f): f is Factura => f !== null),
  };
  await writeBlobBytes(credentials, STORE_PATH, JSON.stringify(next, null, 2), "application/json");
  return next;
}

export async function upsertFacturas(
  inputs: FacturaInput[],
): Promise<{ inserted: number; updated: number; store: FacturasCloudStore }> {
  const credentials = getBlobCredentials();
  if (!credentials) throw new Error("BLOB_READ_WRITE_TOKEN is not configured");

  const store = await readFacturasStore();
  const byId = new Map(store.facturas.map((factura) => [factura.id, factura]));
  let inserted = 0;
  let updated = 0;

  for (const input of inputs) {
    const previous = input.id ? byId.get(input.id) : undefined;
    const normalized = normalizeFactura({
      ...previous,
      ...input,
      id: input.id || genId(),
      createdAt: previous?.createdAt ?? input.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    });
    if (!normalized) continue;

    const withAttachment = await maybeStoreAttachment(credentials, normalized);
    if (previous) updated += 1;
    else inserted += 1;
    byId.set(withAttachment.id, withAttachment);
  }

  const next = await writeFacturasStore({
    facturas: [...byId.values()].sort((a, b) => b.fecha.localeCompare(a.fecha)),
  });

  return { inserted, updated, store: next };
}

export async function deleteFactura(id: string): Promise<FacturasCloudStore> {
  const store = await readFacturasStore();
  const next = await writeFacturasStore({
    facturas: store.facturas.filter((factura) => factura.id !== id),
  });
  return next;
}

export async function readFacturaAttachment(
  archivoPath: string,
): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  const credentials = getBlobCredentials();
  if (!credentials) return null;

  const blob = await findBlob(credentials, archivoPath);
  if (!blob) return null;

  const response = await fetch(blob.url, {
    headers: { Authorization: `Bearer ${credentials.token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Vercel Blob file read failed with ${response.status}`);
  }

  return {
    bytes: await response.arrayBuffer(),
    contentType: response.headers.get("content-type") || "application/octet-stream",
  };
}
