import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { DailySalesRecord, DailySalesStore } from "./types";

const BUCKET_NAME = "karuma-private";
const FILE_PATH = "sales/daily-sales.json";
const BLOB_API_URL = "https://blob.vercel-storage.com";

type BlobListResponse = {
  blobs?: Array<{
    url: string;
    pathname: string;
  }>;
};

function emptyStore(): DailySalesStore {
  return {
    version: 1,
    updatedAt: null,
    records: [],
  };
}

function normalizeStore(value: unknown): DailySalesStore {
  if (!value || typeof value !== "object") return emptyStore();
  const object = value as Partial<DailySalesStore>;
  return {
    version: 1,
    updatedAt: typeof object.updatedAt === "string" ? object.updatedAt : null,
    records: Array.isArray(object.records) ? object.records : [],
  };
}

function getBlobCredentials(): { token: string; storeId: string } | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return null;
  const storeId = token.split("_")[3] || "";
  return storeId ? { token, storeId } : null;
}

function blobHeaders(credentials: { token: string; storeId: string }): Headers {
  return new Headers({
    Authorization: `Bearer ${credentials.token}`,
    "x-vercel-blob-store-id": credentials.storeId,
    "x-api-blob-request-attempt": "0",
    "x-api-blob-request-id": `${credentials.storeId}:${Date.now()}:${crypto.randomUUID()}`,
    "x-api-version": "12",
  });
}

async function readBlobStore(credentials: { token: string; storeId: string }): Promise<DailySalesStore> {
  const listUrl = new URL(BLOB_API_URL);
  listUrl.searchParams.set("limit", "1");
  listUrl.searchParams.set("prefix", FILE_PATH);

  const listResponse = await fetch(listUrl, {
    headers: blobHeaders(credentials),
    cache: "no-store",
  });
  if (!listResponse.ok) {
    throw new Error(`Vercel Blob list failed with ${listResponse.status}`);
  }

  const listing = (await listResponse.json()) as BlobListResponse;
  const blob = listing.blobs?.find((item) => item.pathname === FILE_PATH);
  if (!blob) return emptyStore();

  const response = await fetch(blob.url, {
    headers: { Authorization: `Bearer ${credentials.token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Vercel Blob read failed with ${response.status}`);
  }

  try {
    return normalizeStore(await response.json());
  } catch {
    return emptyStore();
  }
}

async function writeBlobStore(
  credentials: { token: string; storeId: string },
  store: DailySalesStore,
): Promise<void> {
  const encodedPath = FILE_PATH.split("/").map(encodeURIComponent).join("/");
  const headers = blobHeaders(credentials);
  headers.set("x-vercel-blob-access", "private");
  headers.set("x-add-random-suffix", "0");
  headers.set("x-allow-overwrite", "1");
  headers.set("x-content-type", "application/json");
  headers.set("x-cache-control-max-age", "0");

  const response = await fetch(`${BLOB_API_URL}/${encodedPath}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(store, null, 2),
  });
  if (!response.ok) {
    throw new Error(`Vercel Blob write failed with ${response.status}`);
  }
}

export function isDailySalesStorageConfigured(): boolean {
  return Boolean(getBlobCredentials() || isSupabaseConfigured());
}

async function ensureBucket(): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase.storage.getBucket(BUCKET_NAME);
  if (data) return;
  if (error && !error.message.toLowerCase().includes("not found")) {
    throw new Error(error.message);
  }

  const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: false,
    fileSizeLimit: 1024 * 1024,
  });
  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new Error(createError.message);
  }
}

export async function readDailySalesStore(): Promise<DailySalesStore> {
  const blobCredentials = getBlobCredentials();
  if (blobCredentials) return readBlobStore(blobCredentials);
  if (!isSupabaseConfigured()) return emptyStore();
  const supabase = getSupabaseAdmin();
  if (!supabase) return emptyStore();

  await ensureBucket();
  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(FILE_PATH);

  if (error) {
    if (error.message.toLowerCase().includes("not found")) return emptyStore();
    throw new Error(error.message);
  }

  try {
    return normalizeStore(JSON.parse(await data.text()));
  } catch {
    return emptyStore();
  }
}

export async function writeDailySalesStore(store: DailySalesStore): Promise<void> {
  const blobCredentials = getBlobCredentials();
  if (blobCredentials) {
    await writeBlobStore(blobCredentials, store);
    return;
  }
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured");
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured");

  await ensureBucket();
  const body = Buffer.from(JSON.stringify(store, null, 2), "utf8");
  const { error } = await supabase.storage.from(BUCKET_NAME).upload(FILE_PATH, body, {
    contentType: "application/json",
    cacheControl: "0",
    upsert: true,
  });
  if (error) throw new Error(error.message);
}

export async function mergeDailySalesRecords(
  incoming: DailySalesRecord[],
): Promise<{ inserted: number; updated: number; store: DailySalesStore }> {
  const store = await readDailySalesStore();
  const byKey = new Map(store.records.map((record) => [`${record.locationId}:${record.date}`, record]));
  let inserted = 0;
  let updated = 0;

  for (const record of incoming) {
    const key = `${record.locationId}:${record.date}`;
    if (byKey.has(key)) updated++;
    else inserted++;
    byKey.set(key, record);
  }

  const nextStore: DailySalesStore = {
    version: 1,
    updatedAt: new Date().toISOString(),
    records: [...byKey.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
  await writeDailySalesStore(nextStore);
  return { inserted, updated, store: nextStore };
}
