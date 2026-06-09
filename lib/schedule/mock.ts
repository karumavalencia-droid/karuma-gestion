import { WEEK_DAYS, type ScheduleDepartment, type WeekDay } from "./constants";
import { calcSegmentHours } from "./hours";
import type { DaySchedule, EmployeeSchedule, TimeRange } from "./types";
import { cloneSchedules } from "./utils";

const REST: DaySchedule = { type: "rest" };

function work(...segments: TimeRange[]): DaySchedule {
  return { type: "work", segments };
}

function week(
  restDays: WeekDay[],
  defaultSegments: TimeRange[],
  overrides: Partial<Record<WeekDay, DaySchedule>> = {},
): Record<WeekDay, DaySchedule> {
  return Object.fromEntries(
    WEEK_DAYS.map((day) => {
      if (overrides[day]) return [day, overrides[day]!];
      if (restDays.includes(day)) return [day, REST];
      return [day, work(...defaultSegments)];
    }),
  ) as Record<WeekDay, DaySchedule>;
}

const L1130_1600: TimeRange = { start: "11:30", end: "16:00" };
const L1130_1630: TimeRange = { start: "11:30", end: "16:30" };
const L1230_1600: TimeRange = { start: "12:30", end: "16:00" };
const L1300_1630: TimeRange = { start: "13:00", end: "16:30" };
const L1330_1630: TimeRange = { start: "13:30", end: "16:30" };
const L1300_1600: TimeRange = { start: "13:00", end: "16:00" };
const L1300_1900: TimeRange = { start: "13:00", end: "19:00" };

const D1930_2230: TimeRange = { start: "19:30", end: "22:30" };
const D1930_2330: TimeRange = { start: "19:30", end: "23:30" };
const D2000_2300: TimeRange = { start: "20:00", end: "23:00" };
const D2030_2330: TimeRange = { start: "20:30", end: "23:30" };
const D1900_2330: TimeRange = { start: "19:00", end: "23:30" };
const D2000_2200: TimeRange = { start: "20:00", end: "22:00" };

/** 本周真实排班 mock（第一批） */
export const EMPLOYEE_SCHEDULES: EmployeeSchedule[] = [
  {
    id: "jhoan",
    name: "Jhoan",
    department: "Sala",
    team: "服务员",
    days: {
      周一: work(L1130_1600),
      周二: work(L1130_1600),
      周三: work(L1130_1600),
      周四: REST,
      周五: work(L1130_1600),
      周六: work(L1130_1630),
      周日: work(L1130_1630),
    },
  },
  {
    id: "isabel",
    name: "Isabel",
    department: "Sala",
    team: "服务员",
    days: week(["周日"], [L1230_1600, D1930_2230]),
  },
  {
    id: "celeste",
    name: "Celeste",
    department: "Sala",
    team: "服务员",
    days: week(["周二"], [L1300_1630, D2000_2300]),
  },
  {
    id: "edu",
    name: "Edu",
    department: "Sala",
    team: "服务员",
    days: week(["周三"], [L1330_1630, D2030_2330]),
  },
  {
    id: "jeferson",
    name: "Jeferson",
    department: "Cocina",
    team: "寿司",
    days: week(["周日", "周一"], [L1130_1600, D1930_2330]),
  },
  {
    id: "newton",
    name: "Newton",
    department: "Cocina",
    team: "寿司",
    days: week(["周五", "周六"], [L1130_1600, D1930_2330]),
  },
  {
    id: "sebastian-rodriguez",
    name: "Sebastian Rodriguez",
    department: "Cocina",
    team: "寿司",
    days: week(["周二", "周三"], [L1130_1600, D1930_2330]),
  },
  {
    id: "sebastian-gomez",
    name: "Sebastian Gomez",
    department: "Cocina",
    team: "寿司",
    days: week(["周六", "周日"], [L1300_1900, D2000_2200]),
  },
  {
    id: "hoscar",
    name: "Hoscar",
    department: "Cocina",
    team: "寿司",
    days: week(["周三"], [L1130_1630, D1900_2330]),
  },
  {
    id: "junfeng",
    name: "Junfeng",
    department: "Cocina",
    team: "寿司",
    days: week(["周二"], [L1130_1630, D1900_2330], {
      周二: work(L1130_1630),
    }),
  },
  {
    id: "mauricio",
    name: "Mauricio",
    department: "Cocina",
    team: "热厨",
    days: week(["周四", "周五"], [L1130_1600, D1930_2330]),
  },
  {
    id: "alex",
    name: "Alex",
    department: "Cocina",
    team: "热厨",
    days: week(["周四"], [L1130_1630, D1930_2330]),
  },
  {
    id: "karina",
    name: "Karina",
    department: "Cocina",
    team: "洗碗",
    days: week(["周一"], [L1300_1600, D2000_2300]),
  },
];

/** 上周排班（复制来源，与本周略有不同） */
export const LAST_WEEK_SCHEDULES: EmployeeSchedule[] = (() => {
  const rows = cloneSchedules(EMPLOYEE_SCHEDULES);
  const jhoan = rows.find((r) => r.id === "jhoan");
  if (jhoan) {
    jhoan.days.周四 = work(L1130_1600);
    jhoan.days.周五 = REST;
  }
  const edu = rows.find((r) => r.id === "edu");
  if (edu) {
    edu.days.周三 = work(L1330_1630, D2030_2330);
    edu.days.周五 = REST;
  }
  return rows;
})();

export function calcDayHours(day: DaySchedule): number {
  if (day.type !== "work") return 0;
  return day.segments.reduce((sum, seg) => sum + calcSegmentHours(seg), 0);
}

export function calcWeekHours(days: Record<WeekDay, DaySchedule>): number {
  return WEEK_DAYS.reduce((sum, day) => sum + calcDayHours(days[day]), 0);
}

export function schedulesByDepartment(dept: ScheduleDepartment): EmployeeSchedule[] {
  return EMPLOYEE_SCHEDULES.filter((e) => e.department === dept);
}
