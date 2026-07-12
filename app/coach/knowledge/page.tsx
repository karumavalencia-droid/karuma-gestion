import type { Metadata } from "next";
import { CoachKnowledgePanel } from "@/components/coach/CoachKnowledgePanel";

export const metadata: Metadata = {
  title: "Base de conocimiento — Karuma Coach",
  description: "Recetas y estándares internos para Karuma Coach",
};

export default function CoachKnowledgePage() {
  return <CoachKnowledgePanel />;
}
