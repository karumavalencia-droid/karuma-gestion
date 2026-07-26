export const DOCUMENTO_BUCKET = "documentos";
export const DOCUMENTO_MAX_FILE_BYTES = 25 * 1024 * 1024;

export const DOCUMENTO_STATUSES = [
  "uploading",
  "uploaded",
  "extracting",
  "classifying",
  "needs_review",
  "processed",
  "failed",
  "archived",
] as const;

export type DocumentoStatus = (typeof DOCUMENTO_STATUSES)[number];

export const DOCUMENTO_TYPES = [
  "invoice",
  "contract",
  "bank_receipt",
  "employee_document",
  "menu",
  "recipe",
  "image",
  "screenshot",
  "note",
  "idea",
  "legal",
  "tax",
  "other",
] as const;

export type DocumentoType = (typeof DOCUMENTO_TYPES)[number];

export type DocumentoRow = {
  id: string;
  nombre: string;
  title: string | null;
  original_filename: string | null;
  categoria: string;
  subcategory: string | null;
  storage_path: string;
  storage_bucket: string | null;
  mime_type: string | null;
  tamano_bytes: number | null;
  file_size: number | null;
  document_type: DocumentoType;
  status: DocumentoStatus;
  notas: string | null;
  summary: string | null;
  extracted_text: string | null;
  tags: string[];
  sha256: string | null;
  human_verified: boolean;
  invoice_items_human_verified: boolean;
  document_date: string | null;
  uploaded_at: string | null;
  processed_at: string | null;
  source: string | null;
  invoice_number: string | null;
  amount_net: number | null;
  vat_amount: number | null;
  amount_total: number | null;
  currency: string | null;
  payment_status: string | null;
  payment_date: string | null;
  legal_delivery_status?: "not_applicable" | "pending" | "sent" | "not_required";
  legal_sent_at?: string | null;
  legal_sent_to?: string | null;
  due_date: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  renewal_date: string | null;
  ai_confidence: number | null;
  ai_model: string | null;
  ai_processing_error: string | null;
  supplier_id: number | null;
  created_by_email: string | null;
  created_at: string;
  updated_at: string | null;
};

export type DocumentoListFilters = {
  query?: string;
  status?: DocumentoStatus;
  documentType?: DocumentoType;
  category?: string;
  companyId?: string;
  restaurantId?: string;
  supplierId?: number;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  paymentStatus?: string;
  humanVerified?: boolean;
  reviewQueue?: boolean;
  limit?: number;
};

export type InvoiceItemRow = {
  id: string;
  document_id: string;
  supplier_id: number | null;
  raw_product_name: string;
  normalized_product_id: string | null;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  tax_rate: number | null;
  line_total: number | null;
  human_verified: boolean;
  created_at: string;
  updated_at: string | null;
  updated_by_email: string | null;
};

export type DocumentoListResponse = {
  documentos: DocumentoRow[];
  stats: {
    pending: number;
    monthNew: number;
    total: number;
  };
};
