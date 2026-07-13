// ─── Tipos de la zona privada del propietario ────────────────────────────────
// Filas/insert de las tablas de las migraciones 028–031. Se mantienen aquí
// (no en el Database gigante) para acotar el cambio; las consultas server usan
// el cliente admin y castean a estos tipos.

export type OwnerProfileRow = {
  user_id: string;
  email: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type BankTransactionRow = {
  id: string;
  booked_on: string;
  concept: string;
  counterparty: string | null;
  account_last4: string | null;
  amount_cents: number;
  currency: string;
  direction: "in" | "out";
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PayrollRecordRow = {
  id: string;
  period: string;
  employee_label: string;
  gross_cents: number;
  net_cents: number;
  cost_cents: number | null;
  currency: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RentExpenseRow = {
  id: string;
  period: string;
  concept: string;
  amount_cents: number;
  currency: string;
  paid_on: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PrivateExpenseRow = {
  id: string;
  spent_on: string;
  category: string;
  concept: string;
  amount_cents: number;
  currency: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PrivateFinancialDocumentRow = {
  id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  category: string;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
};

export type PrivateAuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  resource: string;
  resource_id: string | null;
  ip: string | null;
  user_agent: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

export const PRIVATE_FINANCE_BUCKET = "private-finance";
