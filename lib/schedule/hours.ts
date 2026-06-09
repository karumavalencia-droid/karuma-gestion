import type { TimeRange } from "./types";

const MEAL_START = 12 * 60 + 30;
const MEAL_END = 13 * 60;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function segmentGrossHours({ start, end }: TimeRange): number {
  const s = timeToMinutes(start);
  let e = timeToMinutes(end);
  if (e <= s) e += 24 * 60;
  return (e - s) / 60;
}

/** 单段有效工时：开始 < 12:30 且覆盖 12:30-13:00 时扣 0.5h */
export function calcSegmentHours(segment: TimeRange): number {
  const gross = segmentGrossHours(segment);
  const start = timeToMinutes(segment.start);
  const end = timeToMinutes(segment.end);
  const coversMeal = start < MEAL_START && end > MEAL_END;
  if (coversMeal) return gross - 0.5;
  return gross;
}

export function formatHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}h` : `${rounded}h`;
}

export function formatTimeRange({ start, end }: TimeRange): string {
  return `${start}-${end}`;
}
