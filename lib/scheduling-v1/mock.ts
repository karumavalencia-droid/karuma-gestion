import { STAFF_MEMBERS } from "@/lib/staff/data";
import type { StaffMember, StaffStatus } from "@/lib/staff/types";
import {
  REST_DAY_TO_WEEK_DAY,
  getStaffFixedRestWeekDays,
  type RestDayKey,
} from "@/lib/staff/rest-days";

export type { StaffMember, StaffStatus };
export { STAFF_MEMBERS };

export type ShiftType = "午班" | "晚班" | "全天" | "休息" | "请假";

/** 每日用餐休息（不计入工作时间） */
export const MEAL_BREAK = {
  start: "12:30",
  end: "13:00",
  minutes: 30,
  label: "12:30 - 13:00",
  hours: 0.5,
} as const;

/** 月工时估算：按 4 个相同周次累加（mock） */
export const WEEKS_PER_MONTH = 4;

export type ShiftSegment = { start: string; end: string };

export const SHIFT_HOURS_LABEL: Record<ShiftType, string> = {
  午班: "12:00-16:30",
  晚班: "20:00-00:00",
  全天: "12:00-16:30 / 20:00-00:00",
  休息: "",
  请假: "",
};

/** 各班次时段（用于工时计算） */
export const SHIFT_SEGMENTS: Record<ShiftType, ShiftSegment[]> = {
  午班: [{ start: "12:00", end: "16:30" }],
  晚班: [{ start: "20:00", end: "00:00" }],
  全天: [
    { start: "12:00", end: "16:30" },
    { start: "20:00", end: "00:00" },
  ],
  休息: [],
  请假: [],
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** 时段总在岗时长（未扣用餐） */
export function calcSegmentGrossHours(segment: ShiftSegment): number {
  const start = timeToMinutes(segment.start);
  let end = timeToMinutes(segment.end);
  if (end <= start) end += 24 * 60;
  return (end - start) / 60;
}

/**
 * 用餐扣减规则：上班开始时间 < 12:30 时，扣除 0.5h；>= 12:30 不扣。
 * 例：11:30-16:00 扣；12:30-16:00 / 13:00-16:30 不扣。
 */
export function shouldDeductMealBreak(workStart: string): boolean {
  return timeToMinutes(workStart) < timeToMinutes(MEAL_BREAK.start);
}

/** 单时段有效工时 */
export function calcSegmentWorkHours(segment: ShiftSegment): number {
  const gross = calcSegmentGrossHours(segment);
  if (shouldDeductMealBreak(segment.start)) return gross - MEAL_BREAK.hours;
  return gross;
}

/** 班次总在岗时长（未扣用餐） */
export function getShiftGrossHours(shift: ShiftType): number {
  return SHIFT_SEGMENTS[shift].reduce((sum, seg) => sum + calcSegmentGrossHours(seg), 0);
}

/** 班次有效工时（按用餐规则扣除后） */
export function getShiftWorkHours(shift: ShiftType): number {
  return SHIFT_SEGMENTS[shift].reduce((sum, seg) => sum + calcSegmentWorkHours(seg), 0);
}

/** 班次是否包含需扣用餐的时段 */
export function shiftDeductsMealBreak(shift: ShiftType): boolean {
  return SHIFT_SEGMENTS[shift].some((seg) => shouldDeductMealBreak(seg.start));
}

/** 供排班页图例展示的有效工时 */
export const SHIFT_HOURS_VALUE: Record<ShiftType, number> = {
  午班: getShiftWorkHours("午班"),
  晚班: getShiftWorkHours("晚班"),
  全天: getShiftWorkHours("全天"),
  休息: 0,
  请假: 0,
};

/** @deprecated 使用 getShiftGrossHours */
export const SHIFT_HOURS_GROSS: Record<ShiftType, number> = {
  午班: getShiftGrossHours("午班"),
  晚班: getShiftGrossHours("晚班"),
  全天: getShiftGrossHours("全天"),
  休息: 0,
  请假: 0,
};

export function formatHours(hours: number): string {
  return Number.isInteger(hours) ? `${hours}h` : `${hours}h`;
}

export const WEEK_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"] as const;

export type WeekDay = (typeof WEEK_DAYS)[number];

/** @deprecated 请使用 getCurrentWeekContext().dates */
export const CURRENT_WEEK_DATES: Record<WeekDay, string> = {
  周一: "—",
  周二: "—",
  周三: "—",
  周四: "—",
  周五: "—",
  周六: "—",
  周日: "—",
};

export type LeaveStatus = "待审批" | "已批准" | "已拒绝";

export type LeaveRequest = {
  id: string;
  employeeId: string;
  employee: string;
  date: string;
  day: WeekDay;
  reason: string;
  status: LeaveStatus;
};

export const LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: "leave-1",
    employeeId: "edu",
    employee: "Edu",
    date: "2026-06-15",
    day: "周日",
    reason: "家庭原因",
    status: "已批准",
  },
  {
    id: "leave-2",
    employeeId: "karina",
    employee: "Karina",
    date: "2026-06-12",
    day: "周四",
    reason: "身体不适",
    status: "待审批",
  },
];

export function formatLeaveDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

export type ScheduleConflict = {
  id: string;
  employeeId: string;
  employee: string;
  day: WeekDay;
  shifts: ShiftType[];
  message: string;
};

/** 排班冲突：同一员工同一天重复排班 */
export const SCHEDULE_CONFLICTS: ScheduleConflict[] = [
  {
    id: "conflict-1",
    employeeId: "mauricio",
    employee: "Mauricio",
    day: "周六",
    shifts: ["全天", "晚班"],
    message: "全天已含晚班时段，不可同时排晚班",
  },
];

export type WeeklyScheduleRow = {
  employeeId: string;
  employee: string;
  days: Record<WeekDay, ShiftType>;
};

/** @deprecated 请使用 getCurrentWeekContext().label */
export const CURRENT_WEEK_LABEL = "本周";
/** @deprecated 请使用 getLastWeekContext().label */
export const LAST_WEEK_LABEL = "上周";

const REST_DAY: ShiftType = "休息";

function weekSchedule(
  employeeId: string,
  employee: string,
  days: Partial<Record<WeekDay, ShiftType>>,
): WeeklyScheduleRow {
  return {
    employeeId,
    employee,
    days: Object.fromEntries(
      WEEK_DAYS.map((d) => [d, days[d] ?? REST_DAY]),
    ) as Record<WeekDay, ShiftType>,
  };
}

/** 上周排班（复制来源） */
export const LAST_WEEK_SCHEDULE: WeeklyScheduleRow[] = [
  weekSchedule("jhoan", "Jhoan", {
    周一: "晚班",
    周二: "午班",
    周三: "晚班",
    周五: "晚班",
    周六: "午班",
  }),
  weekSchedule("isabel", "Isabel", {
    周一: "午班",
    周三: "晚班",
    周四: "午班",
    周六: "晚班",
  }),
  weekSchedule("celeste", "Celeste", {
    周二: "晚班",
    周三: "午班",
    周四: "晚班",
    周五: "午班",
    周日: "晚班",
  }),
  weekSchedule("edu", "Edu", {
    周一: "全天",
    周三: "午班",
    周四: "晚班",
    周六: "全天",
  }),
  weekSchedule("jeferson", "Jeferson", {
    周二: "午班",
    周三: "晚班",
    周四: "午班",
    周五: "晚班",
    周六: "午班",
  }),
  weekSchedule("newton", "Newton", {
    周一: "午班",
    周二: "晚班",
    周四: "午班",
    周六: "全天",
  }),
  weekSchedule("sebastian-rodriguez", "Sebastian Rodriguez", {
    周一: "全天",
    周二: "全天",
    周三: "全天",
    周四: "全天",
    周五: "全天",
  }),
  weekSchedule("sebastian-gomez", "Sebastian Gomez", {
    周二: "全天",
    周三: "全天",
    周四: "全天",
    周五: "全天",
    周六: "全天",
  }),
  weekSchedule("hoscar", "Hoscar", {
    周一: "午班",
    周三: "午班",
    周五: "午班",
    周六: "午班",
    周日: "午班",
  }),
  weekSchedule("junfeng", "Junfeng", {
    周二: "晚班",
    周四: "晚班",
    周五: "晚班",
    周六: "晚班",
    周日: "晚班",
  }),
  weekSchedule("mauricio", "Mauricio", {
    周一: "午班",
    周二: "晚班",
    周三: "午班",
    周日: "午班",
  }),
  weekSchedule("alex", "Alex", {
    周一: "全天",
    周二: "全天",
    周三: "全天",
    周六: "全天",
    周日: "全天",
  }),
  weekSchedule("karina", "Karina", {
    周二: "晚班",
    周三: "午班",
    周四: "晚班",
    周五: "午班",
    周六: "晚班",
  }),
];

const STAFF_BY_ID = new Map(STAFF_MEMBERS.map((s) => [s.id, s]));

const WORK_SHIFTS: ShiftType[] = ["午班", "晚班", "全天"];

export function isWorkShift(shift: ShiftType): boolean {
  return WORK_SHIFTS.includes(shift);
}

export type RestDayViolation = {
  id: string;
  employeeId: string;
  employee: string;
  day: WeekDay;
  shift: ShiftType;
  fixedRestLabel: string;
  message: string;
};

/** 检测固定休息日上的排班冲突 */
export function cloneWeeklySchedule(rows: WeeklyScheduleRow[]): WeeklyScheduleRow[] {
  return rows.map((row) => ({
    ...row,
    days: { ...row.days },
  }));
}

export function findRestDayViolations(rows: WeeklyScheduleRow[]): RestDayViolation[] {
  const violations: RestDayViolation[] = [];

  for (const row of rows) {
    const staff = STAFF_BY_ID.get(row.employeeId);
    if (!staff) continue;

    const fixedWeekDays = getStaffFixedRestWeekDays(staff);
    for (const weekDay of fixedWeekDays) {
      if (!weekDay) continue;
      const shift = row.days[weekDay as WeekDay];
      if (shift == null || !isWorkShift(shift)) continue;

      const restKey = (Object.entries(REST_DAY_TO_WEEK_DAY).find(
        ([, zh]) => zh === weekDay,
      )?.[0] ?? weekDay) as RestDayKey;

      violations.push({
        id: `rest-${row.employeeId}-${weekDay}`,
        employeeId: row.employeeId,
        employee: row.employee,
        day: weekDay as WeekDay,
        shift,
        fixedRestLabel: restKey,
        message: `固定休息日 ${restKey} 安排了 ${shift}`,
      });
    }
  }

  return violations;
}

/** 将固定休息日设为「休息」（不覆盖请假） */
export function applyFixedRestDays(rows: WeeklyScheduleRow[]): WeeklyScheduleRow[] {
  const next = cloneWeeklySchedule(rows);

  for (const row of next) {
    const staff = STAFF_BY_ID.get(row.employeeId);
    if (!staff) continue;

    for (const weekDay of getStaffFixedRestWeekDays(staff)) {
      if (!weekDay || !(weekDay in row.days)) continue;
      const day = weekDay as WeekDay;
      if (row.days[day] === "请假") continue;
      row.days[day] = "休息";
    }
  }

  return next;
}

export function calcWeekRestDays(days: Record<WeekDay, ShiftType>): number {
  return WEEK_DAYS.filter((day) => days[day] === "休息" || days[day] === "请假").length;
}

/** 固定休息日且为休息时显示 OFF */
export function isEmployeeFixedOffDay(employeeId: string, day: WeekDay): boolean {
  const staff = STAFF_BY_ID.get(employeeId);
  if (!staff) return false;
  return getStaffFixedRestWeekDays(staff).includes(day);
}

export const MAX_CONSECUTIVE_WORK_DAYS = 6;

export type ConsecutiveWorkWarning = {
  id: string;
  employeeId: string;
  employee: string;
  streakDays: number;
  startDay: WeekDay;
  endDay: WeekDay;
  message: string;
};

/** 连续工作超过 maxDays 天时警告（默认 > 6 天） */
export function findConsecutiveWorkWarnings(
  rows: WeeklyScheduleRow[],
  maxDays = MAX_CONSECUTIVE_WORK_DAYS,
): ConsecutiveWorkWarning[] {
  const warnings: ConsecutiveWorkWarning[] = [];

  for (const row of rows) {
    let streak = 0;
    let streakStart: WeekDay | null = null;
    let lastWorkDay: WeekDay | null = null;

    const flush = () => {
      if (streak > maxDays && streakStart && lastWorkDay) {
        warnings.push({
          id: `streak-${row.employeeId}-${streakStart}-${lastWorkDay}`,
          employeeId: row.employeeId,
          employee: row.employee,
          streakDays: streak,
          startDay: streakStart,
          endDay: lastWorkDay,
          message: `连续工作 ${streak} 天（${streakStart} 至 ${lastWorkDay}），超过 ${maxDays} 天`,
        });
      }
    };

    for (const day of WEEK_DAYS) {
      if (isWorkShift(row.days[day])) {
        if (streak === 0) streakStart = day;
        streak++;
        lastWorkDay = day;
      } else {
        flush();
        streak = 0;
        streakStart = null;
        lastWorkDay = null;
      }
    }
    flush();
  }

  return warnings;
}

export function applyLeaveRequests(rows: WeeklyScheduleRow[]): WeeklyScheduleRow[] {
  const next = cloneWeeklySchedule(rows);
  for (const leave of LEAVE_REQUESTS) {
    if (leave.status !== "已批准") continue;
    const row = next.find((r) => r.employeeId === leave.employeeId);
    if (row) row.days[leave.day] = "请假";
  }
  return next;
}

export function applyScheduleConflicts(rows: WeeklyScheduleRow[]): WeeklyScheduleRow[] {
  const next = cloneWeeklySchedule(rows);
  for (const conflict of SCHEDULE_CONFLICTS) {
    const row = next.find((r) => r.employeeId === conflict.employeeId);
    if (row) row.days[conflict.day] = conflict.shifts[0];
  }
  return next;
}

export function finalizeWeekSchedule(rows: WeeklyScheduleRow[]): WeeklyScheduleRow[] {
  return applyScheduleConflicts(applyLeaveRequests(rows));
}

/** 本周排班：上周工班 + 自动应用固定休息日 OFF + 请假/冲突 */
export function buildCurrentWeekSchedule(): WeeklyScheduleRow[] {
  return finalizeWeekSchedule(applyFixedRestDays(cloneWeeklySchedule(LAST_WEEK_SCHEDULE)));
}

/** 本周初始排班 */
export const CURRENT_WEEK_SCHEDULE: WeeklyScheduleRow[] = buildCurrentWeekSchedule();

export function calcWeekHours(days: Record<WeekDay, ShiftType>): number {
  return WEEK_DAYS.reduce((sum, day) => sum + getShiftWorkHours(days[day]), 0);
}

/** 月工时：按相同周排班 × WEEKS_PER_MONTH，同样适用用餐扣减规则 */
export function calcMonthHours(
  days: Record<WeekDay, ShiftType>,
  weeksInMonth = WEEKS_PER_MONTH,
): number {
  return calcWeekHours(days) * weeksInMonth;
}

export type RolePermissionRow = {
  role: string;
  roleLabel: string;
  permissions: string;
};

export const ROLE_PERMISSIONS: RolePermissionRow[] = [
  { role: "owner", roleLabel: "老板", permissions: "全部权限" },
  { role: "manager", roleLabel: "店长", permissions: "销售、排班、员工、库存" },
  { role: "kitchen", roleLabel: "厨房", permissions: "菜谱、库存、原料" },
  { role: "sushi", roleLabel: "寿司", permissions: "菜谱、排班、库存" },
  { role: "waiter", roleLabel: "服务员", permissions: "排班只读、菜谱只读" },
  { role: "cashier", roleLabel: "收银", permissions: "销售只读、Dashboard" },
  { role: "dishwasher", roleLabel: "洗碗", permissions: "只看我的排班" },
];

export type LoginAccount = {
  email: string;
  password: string;
  name: string;
  role: string;
};

export const LOGIN_ACCOUNTS: LoginAccount[] = [
  { email: "owner@karuma.es", password: "123456", name: "Zhou", role: "owner" },
  { email: "manager@karuma.es", password: "123456", name: "Maria", role: "manager" },
  { email: "kitchen@karuma.es", password: "123456", name: "Wang", role: "kitchen" },
  { email: "sushi@karuma.es", password: "123456", name: "Chen", role: "sushi" },
  { email: "waiter@karuma.es", password: "123456", name: "Laura", role: "waiter" },
  { email: "cashier@karuma.es", password: "123456", name: "Ana", role: "cashier" },
  { email: "dishwasher@karuma.es", password: "123456", name: "Pedro", role: "dishwasher" },
];
