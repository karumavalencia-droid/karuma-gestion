import type { Metadata, Viewport } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Karuma · Fichaje",
  description: "Fichaje de empleados en tablet",
};

export const viewport: Viewport = {
  themeColor: "#f9fafb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/** Página independiente a pantalla completa con estilos globales del ERP. */
export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-gray-50 text-gray-900 antialiased">
      {children}
    </div>
  );
}
