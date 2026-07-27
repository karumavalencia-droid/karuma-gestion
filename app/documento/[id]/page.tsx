import { DocumentoDetail } from "@/components/documento/DocumentoDetail";

export default async function DocumentoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DocumentoDetail id={id} />;
}
