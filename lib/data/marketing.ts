import { Promocion, CanalMarketing } from "@/lib/types";

export const promociones: Promocion[] = [
  {
    id: "1",
    nombre: "Buffet mediodía -10%",
    descuento: "10% L-V 13:00-15:00",
    vigencia: "01/06 – 30/06/2026",
    estado: "activa",
  },
  {
    id: "2",
    nombre: "2x1 en Gyozas",
    descuento: "Martes y miércoles",
    vigencia: "Todo junio 2026",
    estado: "activa",
  },
  {
    id: "3",
    nombre: "Menú San Valentín",
    descuento: "Menú especial parejas",
    vigencia: "14/02/2026",
    estado: "finalizada",
  },
  {
    id: "4",
    nombre: "Verano Karuma",
    descuento: "Buffet nocturno -15%",
    vigencia: "01/07 – 31/08/2026",
    estado: "programada",
  },
];

export const canalesMarketing: CanalMarketing[] = [
  { canal: "Google Ads", inversion: 450.00, conversiones: 128, roi: 3.2 },
  { canal: "Uber Eats Promos", inversion: 280.00, conversiones: 86, roi: 2.8 },
  { canal: "Glovo Ads", inversion: 180.00, conversiones: 54, roi: 2.4 },
  { canal: "Instagram / Facebook", inversion: 120.00, conversiones: 210, roi: 4.1 },
  { canal: "TikTok", inversion: 80.00, conversiones: 95, roi: 3.6 },
];

export const redesSociales = {
  instagram: { seguidores: 4820, engagement: "4,2%", publicacionesMes: 12 },
  facebook: { seguidores: 3150, engagement: "2,8%", publicacionesMes: 8 },
  tiktok: { seguidores: 2340, engagement: "6,1%", publicacionesMes: 16 },
};
