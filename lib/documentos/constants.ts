import type { DbDocumentoCategoria } from "@/lib/supabase/types";

/** Bucket privado de Supabase Storage para documentos confidenciales generales. */
export const DOCUMENTOS_BUCKET = "documentos";

/** Bucket privado dedicado a facturas para automatización, conciliación y análisis. */
export const FACTURAS_BUCKET = "facturas";

export type DocumentoCategoria = DbDocumentoCategoria | "facturas";

export const DOCUMENTO_CATEGORIAS: DocumentoCategoria[] = [
  "bancos",
  "contratos",
  "nominas",
  "impuestos",
  "seguros",
  "licencias",
  "facturas",
  "otros",
];

export const DOCUMENTO_CATEGORIA_LABELS: Record<DocumentoCategoria, string> = {
  bancos: "Bancos",
  contratos: "Contratos",
  nominas: "Nóminas",
  impuestos: "Impuestos",
  seguros: "Seguros",
  licencias: "Licencias",
  facturas: "Facturas",
  otros: "Otros",
};

export function getDocumentoBucket(categoria: string | null | undefined): string {
  return categoria === "facturas" ? FACTURAS_BUCKET : DOCUMENTOS_BUCKET;
}
