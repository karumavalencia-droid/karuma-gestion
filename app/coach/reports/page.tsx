import type { Metadata } from "next";
import { CoachReportsPanel } from "@/components/coach/CoachReportsPanel";

export const metadata: Metadata = {
  title: "Reportes de incidencias — Karuma Coach",
  description: "Revisión de incidencias enviadas por el equipo",
};

export default function CoachReportsPage() {
  return <CoachReportsPanel />;
}
