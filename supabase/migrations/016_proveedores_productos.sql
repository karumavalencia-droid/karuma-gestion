-- Tablas para gestionar proveedores y productos

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT,
  phone TEXT,
  website TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_products (
  id BIGSERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers (id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL,
  unit TEXT NOT NULL,
  rango INTEGER,
  invoice_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier_id ON supplier_products (supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_date ON supplier_products (invoice_date);

-- Insert Jet Extramar supplier
INSERT INTO suppliers (id, name, contact_email, phone, website, notes)
VALUES (7331, 'Jet Extramar', 'info@jetextramar.es', '+34 96 166 74 06', 'https://www.jetextramar.es', 'Proveedor de productos frescos')
ON CONFLICT (id) DO NOTHING;

-- RLS para suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suppliers are viewable by authenticated users" ON suppliers
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS para supplier_products
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Supplier products are viewable by authenticated users" ON supplier_products
  FOR SELECT USING (auth.role() = 'authenticated');
