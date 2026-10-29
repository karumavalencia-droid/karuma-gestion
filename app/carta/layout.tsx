import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Carta de sushi y buffet en Valencia | Karuma",
  description: "Consulta la carta completa de Karuma en Valencia: sushi, cocina asiática, brasa, bebidas y postres.",
};

export const viewport: Viewport = {
  themeColor: "#f6f3ec",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function CartaLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100dvh] overflow-x-hidden bg-[#f6f3ec] text-stone-900 antialiased">{children}</div>;
}
