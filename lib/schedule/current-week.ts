import { WEEK_DAYS, type WeekDay } from "./constants";

export type WeekContext = {
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

export function getCurrentWeekContext(refDate = new Date()): WeekContext {
  const weekStart = startOfWeekMonday(refDate);
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
    label: `${formatMD(weekStart)} – ${formatMD(weekEnd)}`,
    dates,
  };
}
