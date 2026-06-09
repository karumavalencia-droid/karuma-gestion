import { WEEK_DAYS, type WeekDay } from "./mock";

export type WeekContext = {
  weekStart: Date;
  weekEnd: Date;
  label: string;
  dates: Record<WeekDay, string>;
};

function startOfWeekMonday(ref: Date): Date {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const weekday = d.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  d.setDate(d.getDate() + diff);
  return d;
}

function formatMD(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function buildWeekContext(weekStart: Date): WeekContext {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const dates = Object.fromEntries(
    WEEK_DAYS.map((day, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return [day, formatMD(d)];
    }),
  ) as Record<WeekDay, string>;

  return {
    weekStart,
    weekEnd,
    label: `${formatMD(weekStart)} – ${formatMD(weekEnd)}`,
    dates,
  };
}

/** 本周（周一至周日） */
export function getCurrentWeekContext(refDate = new Date()): WeekContext {
  return buildWeekContext(startOfWeekMonday(refDate));
}

/** 上周 */
export function getLastWeekContext(refDate = new Date()): WeekContext {
  const start = startOfWeekMonday(refDate);
  start.setDate(start.getDate() - 7);
  return buildWeekContext(start);
}
