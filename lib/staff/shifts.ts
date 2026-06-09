/** 员工标准班次（与排班 ShiftType 工作班次一致） */
export type StandardShift = "午班" | "晚班" | "全天";

export const STANDARD_SHIFT_OPTIONS: StandardShift[] = ["午班", "晚班", "全天"];

export function formatStandardShift(shift: StandardShift | null): string {
  return shift ?? "待确认";
}
