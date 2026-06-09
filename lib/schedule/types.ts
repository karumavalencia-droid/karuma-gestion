import type { ScheduleDepartment, StaffTeam, WeekDay } from "./constants";

export type TimeRange = { start: string; end: string };

export type DaySchedule =
  | { type: "rest" }
  | { type: "leave" }
  | { type: "work"; segments: TimeRange[] };

export type EmployeeSchedule = {
  id: string;
  name: string;
  department: ScheduleDepartment;
  team: StaffTeam;
  days: Record<WeekDay, DaySchedule>;
};

export type LeaveStatus = "待审批" | "已批准" | "已拒绝";

export type LeaveRequest = {
  id: string;
  employeeId: string;
  employee: string;
  day: WeekDay;
  reason: string;
  status: LeaveStatus;
};
