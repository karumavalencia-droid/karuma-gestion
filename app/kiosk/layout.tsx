import type { Metadata, Viewport } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Karuma · Fichaje",
  description: "平板员工打卡",
};

export const viewport: Viewport = {
  themeColor: "#f9fafb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/** 独立全屏页：继承根 layout 的 globals.css，并使用与 ERP 一致的灰底容器 */
export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-gray-50 text-gray-900 antialiased">
      {children}
    </div>
  );
}
