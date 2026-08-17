import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/layout/Providers";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { NuevaVersion } from "@/components/pwa/NuevaVersion";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#111827",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Karuma Sushi & Grill · Valencia",
  description: "Sushi, brasa y una mesa para compartir en el centro de Valencia.",
  manifest: "/manifest.json",
  applicationName: "Karuma Sushi & Grill",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Karuma",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <PwaRegister />
        <NuevaVersion />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
