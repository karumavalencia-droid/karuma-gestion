import type { Metadata } from "next";
import { ChangeCenterRequestDetail } from "@/components/ceo/ChangeCenterRequestDetail";

export const metadata: Metadata = {
  title: "Change Request",
  description: "Karuma AI Change Center request detail",
};

export default async function ChangeRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChangeCenterRequestDetail id={id} />;
}
