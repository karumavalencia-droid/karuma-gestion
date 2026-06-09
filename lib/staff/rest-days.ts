export type RestDayKey =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export const REST_DAY_KEYS: RestDayKey[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const REST_DAY_LABEL: Record<RestDayKey, string> = {
  Monday: "Monday",
  Tuesday: "Tuesday",
  Wednesday: "Wednesday",
  Thursday: "Thursday",
  Friday: "Friday",
  Saturday: "Saturday",
  Sunday: "Sunday",
};

export const REST_DAY_TO_WEEK_DAY: Record<RestDayKey, string> = {
  Monday: "周一",
  Tuesday: "周二",
  Wednesday: "周三",
  Thursday: "周四",
  Friday: "周五",
  Saturday: "周六",
  Sunday: "周日",
};

export type FixedRestDays = {
  fixedRestDay1: RestDayKey | null;
  fixedRestDay2: RestDayKey | null;
};

function toWeekDay(key: string | null | undefined): string | null {
  if (!key) return null;
  const zh = REST_DAY_TO_WEEK_DAY[key as RestDayKey];
  return zh ?? null;
}

/** 固定休息日 → 排班表中文星期（周一…周日）；无效或混用语言键时跳过 */
export function getStaffFixedRestWeekDays(staff: FixedRestDays): string[] {
  const days: string[] = [];
  for (const key of [staff.fixedRestDay1, staff.fixedRestDay2]) {
    const zh = toWeekDay(key);
    if (zh && !days.includes(zh)) days.push(zh);
  }
  return days;
}

export function formatFixedRestDays(staff: FixedRestDays): string {
  const labels = [staff.fixedRestDay1, staff.fixedRestDay2]
    .filter((d): d is RestDayKey => Boolean(d))
    .filter((d, i, arr) => arr.indexOf(d) === i)
    .map((d) => REST_DAY_LABEL[d]);
  return labels.length > 0 ? labels.join("、") : "—";
}
