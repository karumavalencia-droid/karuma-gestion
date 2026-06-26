export const ASSET_STATUSES = [
  "Pendiente",
  "Grabado",
  "Editado",
  "Publicado",
  "Buen resultado",
  "Mal resultado",
] as const;

export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const CONTENT_TYPES = [
  "Buffet",
  "Cocina",
  "Punto de vista cliente",
  "Gancho de precio",
  "Reseña Google",
  "Recordatorio fin de semana",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const PUBLISH_PLATFORMS = ["TikTok", "Instagram", "Ambas plataformas"] as const;

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
    contentType: "Gancho de precio",
    materialLink: "drive://karuma/raw/2026-06-08-buffet-price",
    status: "Publicado",
    platform: "Ambas plataformas",
    tiktokLink: "https://tiktok.com/@karuma/video/mock-001",
    instagramLink: "https://instagram.com/reel/mock-001",
    views: 1240,
    notes: "Precio en el primer segundo; grabado con apoyo de amigos",
  },
  {
    id: "va-2",
    title: "100 piezas de sushi en 60 segundos",
    shootDate: "2026-06-08",
    assignee: "Newton",
    contentType: "Cocina",
    materialLink: "drive://karuma/raw/2026-06-08-kitchen-60s",
    status: "Editado",
    platform: "TikTok",
    tiktokLink: "",
    instagramLink: "",
    views: 0,
    notes: "Pendiente de subtítulos y música",
  },
  {
    id: "va-3",
    title: "Encontré un buffet 4.9⭐ en Valencia",
    shootDate: "2026-06-09",
    assignee: "Isabel",
    contentType: "Reseña Google",
    materialLink: "",
    status: "Pendiente",
    platform: "Ambas plataformas",
    tiktokLink: "",
    instagramLink: "",
    views: 0,
    notes: "Necesita captura de Google Rating y fachada",
  },
  {
    id: "va-4",
    title: "Mesa llena de sushi - edición rápida",
    shootDate: "2026-06-05",
    assignee: "Edu",
    contentType: "Buffet",
    materialLink: "drive://karuma/raw/2026-06-05-table-full",
    status: "Buen resultado",
    platform: "Instagram",
    tiktokLink: "https://tiktok.com/@karuma/video/mock-004",
    instagramLink: "https://instagram.com/reel/mock-004",
    views: 3820,
    notes: "Alta retención; repetir la misma estructura",
  },
  {
    id: "va-5",
    title: "Domingo noche en Karuma",
    shootDate: "2026-06-01",
    assignee: "Celeste",
    contentType: "Recordatorio fin de semana",
    materialLink: "drive://karuma/raw/2026-06-01-sunday",
    status: "Mal resultado",
    platform: "TikTok",
    tiktokLink: "https://tiktok.com/@karuma/video/mock-005",
    instagramLink: "",
    views: 186,
    notes: "Inicio demasiado lento; repetir la semana que viene",
  },
  {
    id: "va-6",
    title: "POV cliente: ¿merece la pena?",
    shootDate: "2026-06-07",
    assignee: "Jhoan",
    contentType: "Punto de vista cliente",
    materialLink: "drive://karuma/raw/2026-06-07-guest-pov",
    status: "Grabado",
    platform: "Ambas plataformas",
    tiktokLink: "",
    instagramLink: "",
    views: 0,
    notes: "Material en el móvil del equipo; pendiente de subir a Drive",
  },
];

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

/** Lunes de esta semana a las 00:00, hora local. */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isPublishedStatus(status: AssetStatus): boolean {
  return status === "Publicado" || status === "Buen resultado" || status === "Mal resultado";
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
    contentType: "Buffet",
    materialLink: "",
    status: "Pendiente",
    platform: "Ambas plataformas",
    tiktokLink: "",
    instagramLink: "",
    views: 0,
    notes: "",
  };
}
