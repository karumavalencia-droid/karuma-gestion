-- Sistema de alertas y umbales de stock

CREATE TABLE IF NOT EXISTS supplier_product_alerts (
  id BIGSERIAL PRIMARY KEY,
  supplier_product_id INTEGER NOT NULL,
  supplier_id INTEGER NOT NULL REFERENCES suppliers (id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'low_stock', 'price_change', 'no_purchase_recent'
  threshold_value NUMERIC(12, 2),
  current_value NUMERIC(12, 2),
  alert_message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Tabla de integración con facturas
CREATE TABLE IF NOT EXISTS supplier_invoice_items (
  id BIGSERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers (id) ON DELETE CASCADE,
  supplier_product_id INTEGER REFERENCES supplier_products (id) ON DELETE SET NULL,
  invoice_id TEXT NOT NULL, -- referencia a factura externa
  product_name TEXT NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(12, 2) NOT NULL,
  invoice_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_alerts_supplier_id ON supplier_product_alerts (supplier_id);
CREATE INDEX IF NOT EXISTS idx_alerts_product_id ON supplier_product_alerts (supplier_product_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON supplier_product_alerts (is_active);
CREATE INDEX IF NOT EXISTS idx_invoice_items_supplier_id ON supplier_invoice_items (supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON supplier_invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_date ON supplier_invoice_items (invoice_date);

-- RLS
ALTER TABLE supplier_product_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alerts are viewable by authenticated users" ON supplier_product_alerts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Invoice items are viewable by authenticated users" ON supplier_invoice_items
  FOR SELECT USING (auth.role() = 'authenticated');
