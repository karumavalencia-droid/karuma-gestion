-- Tabla de órdenes de compra
CREATE TABLE IF NOT EXISTS purchase_orders (
  id BIGSERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers (id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES supplier_products (id) ON DELETE SET NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(12, 2) NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, confirmed, shipped, received, cancelled
  auto_generated BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ
);

-- Tabla de órdenes automáticas programadas
CREATE TABLE IF NOT EXISTS supplier_auto_orders (
  id BIGSERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers (id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES supplier_products (id) ON DELETE CASCADE,
  auto_reorder_quantity NUMERIC(10, 2) NOT NULL,
  auto_reorder_threshold NUMERIC(10, 2) NOT NULL,
  frequency TEXT NOT NULL, -- weekly, biweekly, monthly
  last_ordered TIMESTAMPTZ,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders (status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at ON purchase_orders (created_at);
CREATE INDEX IF NOT EXISTS idx_auto_orders_supplier_id ON supplier_auto_orders (supplier_id);
CREATE INDEX IF NOT EXISTS idx_auto_orders_enabled ON supplier_auto_orders (enabled);
CREATE INDEX IF NOT EXISTS idx_auto_orders_product_id ON supplier_auto_orders (product_id);

-- RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_auto_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Purchase orders visible to authenticated" ON purchase_orders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Auto orders visible to authenticated" ON supplier_auto_orders
  FOR SELECT USING (auth.role() = 'authenticated');
