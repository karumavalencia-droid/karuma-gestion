import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Reservas · Karuma Sushi & Grill",
  description: "Reserva tu mesa online en Karuma Sushi & Grill Valencia. Buffet libre de sushi.",
};

export const viewport: Viewport = {
  themeColor: "#f6f3ec",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function ReservasLayout({ children }: { children: React.ReactNode }) {
  return <div lang="es" className="min-h-[100dvh] overflow-x-hidden bg-[#f6f3ec] text-stone-900 antialiased">{children}</div>;
}
