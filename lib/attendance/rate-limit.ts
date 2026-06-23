type AttemptState = {
  failures: number[];
  lockedUntil: number;
};

const WINDOW_MS = 5 * 60 * 1000;
const LOCK_MS = 10 * 60 * 1000;
const MAX_FAILURES = 5;

const globalAttempts = globalThis as typeof globalThis & {
  __karumaAttendanceAttempts?: Map<string, AttemptState>;
};

function attempts(): Map<string, AttemptState> {
  if (!globalAttempts.__karumaAttendanceAttempts) {
    globalAttempts.__karumaAttendanceAttempts = new Map();
  }
  return globalAttempts.__karumaAttendanceAttempts;
}

export function isAttendanceAttemptLocked(key: string, now = Date.now()): boolean {
  const state = attempts().get(key);
  return Boolean(state && state.lockedUntil > now);
}

export function recordAttendanceFailure(key: string, now = Date.now()): void {
  const store = attempts();
  const current = store.get(key) ?? { failures: [], lockedUntil: 0 };
  current.failures = current.failures.filter((timestamp) => now - timestamp <= WINDOW_MS);
  current.failures.push(now);
  if (current.failures.length >= MAX_FAILURES) {
    current.lockedUntil = now + LOCK_MS;
    current.failures = [];
  }
  store.set(key, current);
}

export function clearAttendanceFailures(key: string): void {
  attempts().delete(key);
}
