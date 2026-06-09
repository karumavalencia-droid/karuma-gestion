export const WEEK_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"] as const;

export type WeekDay = (typeof WEEK_DAYS)[number];

export type ScheduleDepartment = "Sala" | "Cocina";

/** 岗位编制（用于顶部统计） */
export type StaffTeam = "服务员" | "寿司" | "热厨" | "洗碗";

export const STAFF_TEAMS: StaffTeam[] = ["服务员", "寿司", "热厨", "洗碗"];

export const SCHEDULE_DEPARTMENTS: {
  id: ScheduleDepartment;
  title: string;
  subtitle: string;
}[] = [
  { id: "Sala", title: "Sala", subtitle: "服务员" },
  { id: "Cocina", title: "Cocina", subtitle: "厨房" },
];
