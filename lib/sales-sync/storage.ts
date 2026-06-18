import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { DailySalesRecord, DailySalesStore } from "./types";

const BUCKET_NAME = "karuma-private";
const FILE_PATH = "sales/daily-sales.json";

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
