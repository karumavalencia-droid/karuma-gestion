import type { Metadata } from "next";
import { CoachPanel } from "@/components/coach/CoachPanel";

export const metadata: Metadata = {
  title: "Karuma Coach",
  description: "Asistente IA interno de Karuma",
};

export default function CoachPage() {
  return <CoachPanel />;
}
