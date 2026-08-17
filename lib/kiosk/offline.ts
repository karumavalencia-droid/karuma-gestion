import type { PendingPunch } from "@/lib/attendance/types";

const DB_NAME = "karuma-attendance";
const DB_VERSION = 1;
const STORE_NAME = "pending-punches";
const DEVICE_ID_KEY = "karuma-kiosk-device-id";
let memoryDeviceId: string | null = null;

function randomId(): string {
  try {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // Some older/insecure browser contexts expose crypto without randomUUID.
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createAttendanceRequestId(): string {
  return `attendance-${randomId()}`;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "requestId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error);
  });
}

export function getKioskDeviceId(): string {
  if (memoryDeviceId) return memoryDeviceId;
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) {
      memoryDeviceId = existing;
      return existing;
    }
    const next = `kiosk-${randomId()}`;
    localStorage.setItem(DEVICE_ID_KEY, next);
    memoryDeviceId = next;
    return next;
  } catch {
    // Private browsing can disable storage. A per-page ID is still useful for
    // idempotency and lets the punch continue instead of crashing the UI.
    memoryDeviceId = `browser-${randomId()}`;
    return memoryDeviceId;
  }
}

export async function queuePendingPunch(punch: PendingPunch): Promise<void> {
  await withStore("readwrite", (store) => store.put(punch));
}

export async function listPendingPunches(): Promise<PendingPunch[]> {
  const rows = await withStore<PendingPunch[]>("readonly", (store) => store.getAll());
  return rows.sort(
    (a, b) =>
      new Date(a.clientOccurredAt).getTime() -
      new Date(b.clientOccurredAt).getTime(),
  );
}

export async function removePendingPunch(requestId: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(requestId));
}
