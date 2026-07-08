-- Auditoría de cambios y precios históricos

-- Tabla de auditoría
CREATE TABLE IF NOT EXISTS supplier_product_audit (
  id BIGSERIAL PRIMARY KEY,
  supplier_product_id INTEGER NOT NULL,
  supplier_id INTEGER NOT NULL REFERENCES suppliers (id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted'
  changed_fields JSONB,
  old_values JSONB,
  new_values JSONB,
  changed_by TEXT, -- user email or 'system'
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de precios históricos
CREATE TABLE IF NOT EXISTS supplier_product_prices (
  id BIGSERIAL PRIMARY KEY,
  supplier_product_id INTEGER NOT NULL,
  supplier_id INTEGER NOT NULL REFERENCES suppliers (id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  effective_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de resumen de gastos por proveedor/mes
CREATE TABLE IF NOT EXISTS supplier_spending_summary (
  id BIGSERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers (id) ON DELETE CASCADE,
  year_month TEXT NOT NULL, -- 'YYYY-MM'
  total_quantity NUMERIC(12, 2),
  total_cost NUMERIC(12, 2),
  product_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_supplier_id ON supplier_product_audit (supplier_id);
CREATE INDEX IF NOT EXISTS idx_audit_changed_at ON supplier_product_audit (changed_at);
CREATE INDEX IF NOT EXISTS idx_prices_supplier_id ON supplier_product_prices (supplier_id);
CREATE INDEX IF NOT EXISTS idx_prices_product_id ON supplier_product_prices (supplier_product_id);
CREATE INDEX IF NOT EXISTS idx_prices_effective_date ON supplier_product_prices (effective_date);
CREATE INDEX IF NOT EXISTS idx_spending_supplier_id ON supplier_spending_summary (supplier_id);
CREATE INDEX IF NOT EXISTS idx_spending_year_month ON supplier_spending_summary (year_month);

-- RLS
ALTER TABLE supplier_product_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_spending_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit logs are viewable by authenticated users" ON supplier_product_audit
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Prices are viewable by authenticated users" ON supplier_product_prices
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Spending summaries are viewable by authenticated users" ON supplier_spending_summary
  FOR SELECT USING (auth.role() = 'authenticated');
