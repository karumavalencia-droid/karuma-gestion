import type { DbDocumentoCategoria } from "@/lib/supabase/types";

/** Bucket privado de Supabase Storage para documentos confidenciales. */
export const DOCUMENTOS_BUCKET = "documentos";

export const DOCUMENTO_CATEGORIAS: DbDocumentoCategoria[] = [
  "bancos",
  "contratos",
  "nominas",
  "impuestos",
  "seguros",
  "licencias",
  "otros",
];

export const DOCUMENTO_CATEGORIA_LABELS: Record<DbDocumentoCategoria, string> = {
  bancos: "Bancos",
  contratos: "Contratos",
  nominas: "Nóminas",
  impuestos: "Impuestos",
  seguros: "Seguros",
  licencias: "Licencias",
  otros: "Otros",
};
