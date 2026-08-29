import type { Metadata, Viewport } from "next";
import ReservationLanguage from "./ReservationLanguage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Reservas / Book a table · Karuma Sushi & Grill",
  description: "Reserva tu mesa / Book your table online at Karuma Sushi & Grill Valencia.",
};

export const viewport: Viewport = {
  themeColor: "#f6f3ec",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function ReservasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#f6f3ec] text-stone-900 antialiased">
      <ReservationLanguage />
      <div data-reservation-root lang="es">
        {children}
      </div>
    </div>
  );
}
