export const ASSET_STATUSES = [
  "待拍摄",
  "已拍摄",
  "已剪辑",
  "已发布",
  "效果好",
  "效果差",
] as const;

export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const CONTENT_TYPES = [
  "自助餐展示",
  "厨房制作",
  "客人视角",
  "价格钩子",
  "Google好评",
  "周末提醒",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const PUBLISH_PLATFORMS = ["TikTok", "Instagram", "双平台"] as const;

export type PublishPlatform = (typeof PUBLISH_PLATFORMS)[number];

export type VideoAsset = {
  id: string;
  title: string;
  shootDate: string;
  assignee: string;
  contentType: ContentType;
  materialLink: string;
  status: AssetStatus;
  platform: PublishPlatform;
  tiktokLink: string;
  instagramLink: string;
  views: number;
  notes: string;
};

export const INITIAL_VIDEO_ASSETS: VideoAsset[] = [
  {
    id: "va-1",
    title: "24.50€ sushi ilimitado en Valencia",
    shootDate: "2026-06-08",
    assignee: "Celeste",
    contentType: "价格钩子",
    materialLink: "drive://karuma/raw/2026-06-08-buffet-price",
    status: "已发布",
    platform: "双平台",
    tiktokLink: "https://tiktok.com/@karuma/video/mock-001",
    instagramLink: "https://instagram.com/reel/mock-001",
    views: 1240,
    notes: "第一秒价格字幕，朋友协助拍摄",
  },
  {
    id: "va-2",
    title: "100 piezas de sushi en 60 segundos",
    shootDate: "2026-06-08",
    assignee: "Newton",
    contentType: "厨房制作",
    materialLink: "drive://karuma/raw/2026-06-08-kitchen-60s",
    status: "已剪辑",
    platform: "TikTok",
    tiktokLink: "",
    instagramLink: "",
    views: 0,
    notes: "待加字幕与 BGM",
  },
  {
    id: "va-3",
    title: "Encontré un buffet 4.9⭐ en Valencia",
    shootDate: "2026-06-09",
    assignee: "Isabel",
    contentType: "Google好评",
    materialLink: "",
    status: "待拍摄",
    platform: "双平台",
    tiktokLink: "",
    instagramLink: "",
    views: 0,
    notes: "需 Google 评分截图 + 门头",
  },
  {
    id: "va-4",
    title: "满桌寿司冲击感快剪",
    shootDate: "2026-06-05",
    assignee: "Edu",
    contentType: "自助餐展示",
    materialLink: "drive://karuma/raw/2026-06-05-table-full",
    status: "效果好",
    platform: "Instagram",
    tiktokLink: "https://tiktok.com/@karuma/video/mock-004",
    instagramLink: "https://instagram.com/reel/mock-004",
    views: 3820,
    notes: "完播率高，可复制同结构",
  },
  {
    id: "va-5",
    title: "周日晚上来 Karuma",
    shootDate: "2026-06-01",
    assignee: "Celeste",
    contentType: "周末提醒",
    materialLink: "drive://karuma/raw/2026-06-01-sunday",
    status: "效果差",
    platform: "TikTok",
    tiktokLink: "https://tiktok.com/@karuma/video/mock-005",
    instagramLink: "",
    views: 186,
    notes: "开头太慢，下周重拍",
  },
  {
    id: "va-6",
    title: "客人第一视角：值不值得来",
    shootDate: "2026-06-07",
    assignee: "Jhoan",
    contentType: "客人视角",
    materialLink: "drive://karuma/raw/2026-06-07-guest-pov",
    status: "已拍摄",
    platform: "双平台",
    tiktokLink: "",
    instagramLink: "",
    views: 0,
    notes: "素材在同事手机，待传到 Drive",
  },
];

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

/** 本周一 00:00（本地） */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isPublishedStatus(status: AssetStatus): boolean {
  return status === "已发布" || status === "效果好" || status === "效果差";
}

export function countPublishedThisWeek(assets: VideoAsset[], now: Date = new Date()): number {
  const start = getWeekStart(now).getTime();
  const end = start + 7 * 24 * 60 * 60 * 1000;
  return assets.filter((a) => {
    if (!isPublishedStatus(a.status)) return false;
    const t = parseDate(a.shootDate).getTime();
    return t >= start && t < end;
  }).length;
}

export function totalViews(assets: VideoAsset[]): number {
  return assets.reduce((sum, a) => sum + a.views, 0);
}

export function createEmptyAsset(): Omit<VideoAsset, "id"> {
  const today = new Date();
  const shootDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return {
    title: "",
    shootDate,
    assignee: "",
    contentType: "自助餐展示",
    materialLink: "",
    status: "待拍摄",
    platform: "双平台",
    tiktokLink: "",
    instagramLink: "",
    views: 0,
    notes: "",
  };
}
