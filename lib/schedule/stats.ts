import { STAFF_TEAMS, type StaffTeam } from "./constants";
import type { EmployeeSchedule } from "./types";
import { getTodayWeekDay, isRestingDay, isWorkingDay } from "./utils";

export type ScheduleStats = {
  workingToday: number;
  restingToday: number;
  teamCounts: Record<StaffTeam, number>;
  restingTodayList: { id: string; name: string; team: StaffTeam; reason?: string }[];
};

export function computeScheduleStats(
  schedules: EmployeeSchedule[],
  today: ReturnType<typeof getTodayWeekDay> = getTodayWeekDay(),
): ScheduleStats {
  const teamCounts = Object.fromEntries(STAFF_TEAMS.map((t) => [t, 0])) as Record<
    StaffTeam,
    number
  >;

  let workingToday = 0;
  let restingToday = 0;
  const restingTodayList: ScheduleStats["restingTodayList"] = [];

  for (const row of schedules) {
    teamCounts[row.team]++;
    const day = row.days[today];
    if (isWorkingDay(day)) {
      workingToday++;
    } else if (isRestingDay(day)) {
      restingToday++;
      restingTodayList.push({
        id: row.id,
        name: row.name,
        team: row.team,
        reason: day.type === "leave" ? "请假" : "休息",
      });
    }
  }

  return { workingToday, restingToday, teamCounts, restingTodayList };
}
