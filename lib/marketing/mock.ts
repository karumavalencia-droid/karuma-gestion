/** Valores mock de Marketing; los textos están en lib/i18n.ts. */
export type GoalMetric = {
  id: string;
  labelKey: string;
  current: number;
  target: number;
  unit?: "€" | "reviews" | "fans";
};

export const THIRTY_DAY_GOALS: GoalMetric[] = [
  { id: "tiktok", labelKey: "TikTok", current: 63, target: 1000, unit: "fans" },
  { id: "instagram", labelKey: "Instagram", current: 496, target: 2000, unit: "fans" },
  {
    id: "google",
    labelKey: "googleReviewsGoal",
    current: 420,
    target: 600,
    unit: "reviews",
  },
  { id: "sunday", labelKey: "goalSundayRevenue", current: 2600, target: 3500, unit: "€" },
];

export const DAILY_PUBLISH_PLAN = {
  daily: [
    { platform: "TikTok", count: 3 },
    { platform: "Instagram Reels", count: 3 },
  ],
  weekOneCount: 21,
};
