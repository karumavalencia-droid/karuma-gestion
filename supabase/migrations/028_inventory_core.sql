-- Inventario operativo multi-dispositivo.
-- Solo crea tablas nuevas; no migra ni elimina datos existentes.

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Otros',
  unit TEXT NOT NULL DEFAULT 'ud',
  current_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
  minimum_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (minimum_quantity >= 0),
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  supplier_name TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items (id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada', 'salida', 'ajuste')),
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  note TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_active
  ON inventory_items (active, category, name);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_date
  ON inventory_movements (item_id, created_at DESC);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_items_authenticated_read" ON inventory_items;
CREATE POLICY "inventory_items_authenticated_read" ON inventory_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "inventory_items_authenticated_write" ON inventory_items;
CREATE POLICY "inventory_items_authenticated_write" ON inventory_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "inventory_movements_authenticated_read" ON inventory_movements;
CREATE POLICY "inventory_movements_authenticated_read" ON inventory_movements
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "inventory_movements_authenticated_insert" ON inventory_movements;
CREATE POLICY "inventory_movements_authenticated_insert" ON inventory_movements
  FOR INSERT TO authenticated WITH CHECK (true);
