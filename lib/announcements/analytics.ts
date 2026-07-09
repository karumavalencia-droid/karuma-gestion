import type { DbAnnouncement } from "@/lib/supabase/types";

export type AnnouncementStats = {
  totalCreated: number;
  totalCompleted: number;
  completionRate: number; // porcentaje
  averageTimeToComplete: number; // horas
  byPriority: {
    high: number;
    normal: number;
    low: number;
  };
  byDepartment: Record<string, number>;
  thisWeek: number;
  thisMonth: number;
};

export function calculateAnnouncementStats(
  announcements: DbAnnouncement[],
): AnnouncementStats {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const completed = announcements.filter((a) => a.completed);
  const completionRate =
    announcements.length > 0
      ? (completed.length / announcements.length) * 100
      : 0;

  const byPriority = {
    high: announcements.filter((a) => a.priority === "high").length,
    normal: announcements.filter((a) => a.priority === "normal").length,
    low: announcements.filter((a) => a.priority === "low").length,
  };

  const byDepartment = announcements.reduce(
    (acc, a) => {
      acc[a.department] = (acc[a.department] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const thisWeek = announcements.filter(
    (a) => new Date(a.created_at) > weekAgo,
  ).length;

  const thisMonth = announcements.filter(
    (a) => new Date(a.created_at) > monthAgo,
  ).length;

  const averageTimeToComplete =
    completed.length > 0
      ? completed.reduce((sum, a) => {
          const created = new Date(a.created_at).getTime();
          const updated = new Date(a.updated_at).getTime();
          return sum + (updated - created);
        }, 0) /
        completed.length /
        (1000 * 60 * 60) // convertir a horas
      : 0;

  return {
    totalCreated: announcements.length,
    totalCompleted: completed.length,
    completionRate: Math.round(completionRate * 10) / 10,
    averageTimeToComplete: Math.round(averageTimeToComplete * 10) / 10,
    byPriority,
    byDepartment,
    thisWeek,
    thisMonth,
  };
}

export function getAnnounceementTrends(
  announcements: DbAnnouncement[],
  days: number = 30,
) {
  const now = new Date();
  const dailyStats: Record<string, number> = {};

  for (let i = 0; i < days; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    dailyStats[dateStr] = 0;
  }

  announcements.forEach((a) => {
    const dateStr = new Date(a.created_at).toISOString().split("T")[0];
    if (dateStr in dailyStats) {
      dailyStats[dateStr]++;
    }
  });

  return dailyStats;
}

export function getDepartmentBreakdown(
  announcements: DbAnnouncement[],
): Array<{ department: string; count: number; highPriority: number }> {
  const depts = announcements.reduce(
    (acc, a) => {
      if (!acc[a.department]) {
        acc[a.department] = { count: 0, highPriority: 0 };
      }
      acc[a.department].count++;
      if (a.priority === "high") {
        acc[a.department].highPriority++;
      }
      return acc;
    },
    {} as Record<string, { count: number; highPriority: number }>,
  );

  return Object.entries(depts).map(([department, stats]) => ({
    department,
    ...stats,
  }));
}
