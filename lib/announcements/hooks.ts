import { useCallback, useEffect, useState } from "react";
import type { DbAnnouncement } from "@/lib/supabase/types";

export function useAnnouncementRefresh(interval: number = 30000) {
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [shouldRefresh, setShouldRefresh] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setLastRefresh(new Date());
      setShouldRefresh(true);
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

  const markRefreshComplete = useCallback(() => {
    setShouldRefresh(false);
  }, []);

  return { lastRefresh, shouldRefresh, markRefreshComplete };
}

export function useAnnouncementStats(announcements: DbAnnouncement[]) {
  return {
    total: announcements.length,
    highPriority: announcements.filter((a) => a.priority === "high").length,
    completed: announcements.filter((a) => a.completed).length,
    pending: announcements.filter((a) => !a.completed).length,
  };
}

export function groupAnnouncementsByPriority(announcements: DbAnnouncement[]) {
  return {
    high: announcements.filter((a) => a.priority === "high" && !a.completed),
    normal: announcements.filter((a) => a.priority === "normal" && !a.completed),
    low: announcements.filter((a) => a.priority === "low" && !a.completed),
  };
}

export function sortAnnouncementsByDate(announcements: DbAnnouncement[]) {
  return [...announcements].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function filterAnnouncementsBySearch(
  announcements: DbAnnouncement[],
  query: string,
) {
  const lowerQuery = query.toLowerCase();
  return announcements.filter(
    (a) =>
      a.title.toLowerCase().includes(lowerQuery) ||
      a.description.toLowerCase().includes(lowerQuery) ||
      a.employee_name.toLowerCase().includes(lowerQuery),
  );
}
