export type ShiftType = "lunch" | "evening" | "full" | "rest" | "leave";

export const SHIFT_ORDER: ShiftType[] = ["lunch", "evening", "full", "rest", "leave"];

/** 用餐 12:30-13:00；上班开始 < 12:30 扣 0.5h，≥ 12:30 不扣 */
export const MEAL_BREAK_LABEL =
  "用餐 12:30-13:00 · 上班 < 12:30 扣 0.5h，≥ 12:30 不扣";

export const SHIFT_HOURS: Record<ShiftType, string> = {
  lunch: "12:00 - 16:30",
  evening: "20:00 - 00:00",
  full: "12:00 - 16:30\n20:00 - 00:00",
  rest: "—",
  leave: "—",
};

export function shiftLabelKey(type: ShiftType): string {
  return `pages.schedule.shifts.${type}`;
}

export function shiftVariant(
  type: ShiftType,
): "success" | "info" | "warning" | "neutral" | "danger" {
  switch (type) {
    case "lunch":
      return "info";
    case "evening":
      return "warning";
    case "full":
      return "success";
    case "rest":
      return "neutral";
    case "leave":
      return "danger";
  }
}
