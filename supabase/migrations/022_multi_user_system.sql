-- Tabla de usuarios del sistema (diferente de auth.users de Supabase)
CREATE TABLE IF NOT EXISTS app_users (
  id BIGSERIAL PRIMARY KEY,
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer', -- admin, buyer, manager, viewer
  department TEXT, -- compras, gerencia, operaciones, etc
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Tabla de permisos por rol
CREATE TABLE IF NOT EXISTS role_permissions (
  id BIGSERIAL PRIMARY KEY,
  role TEXT NOT NULL UNIQUE,
  permissions JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de auditoría de acciones de usuario
CREATE TABLE IF NOT EXISTS user_activity_log (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES app_users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- view, create, update, delete, export, approve
  resource_type TEXT NOT NULL, -- supplier, product, order, alert, etc
  resource_id BIGINT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de aprobaciones de órdenes de compra (workflow)
CREATE TABLE IF NOT EXISTS purchase_order_approvals (
  id BIGSERIAL PRIMARY KEY,
  purchase_order_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  requested_by BIGINT NOT NULL REFERENCES app_users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by BIGINT REFERENCES app_users(id),
  approved_at TIMESTAMPTZ,
  rejected_by BIGINT REFERENCES app_users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de asignación de proveedores a usuarios (control de acceso)
CREATE TABLE IF NOT EXISTS user_supplier_assignments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by BIGINT REFERENCES app_users(id),
  UNIQUE(user_id, supplier_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON user_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON user_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_po_approvals_purchase_order_id ON purchase_order_approvals(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_approvals_status ON purchase_order_approvals(status);
CREATE INDEX IF NOT EXISTS idx_supplier_assignments_user_id ON user_supplier_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_assignments_supplier_id ON user_supplier_assignments(supplier_id);

-- RLS
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_supplier_assignments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view themselves and admins can view all" ON app_users
  FOR SELECT USING (
    auth.uid() = auth_id OR
    (SELECT role FROM app_users WHERE auth_id = auth.uid()) = 'admin'
  );

CREATE POLICY "Only admins can update users" ON app_users
  FOR UPDATE USING (
    (SELECT role FROM app_users WHERE auth_id = auth.uid()) = 'admin'
  );

CREATE POLICY "Role permissions visible to authenticated" ON role_permissions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view activity log for their actions" ON user_activity_log
  FOR SELECT USING (
    user_id = (SELECT id FROM app_users WHERE auth_id = auth.uid()) OR
    (SELECT role FROM app_users WHERE auth_id = auth.uid()) = 'admin'
  );

CREATE POLICY "Approval workflow visible to relevant users" ON purchase_order_approvals
  FOR SELECT USING (
    requested_by = (SELECT id FROM app_users WHERE auth_id = auth.uid()) OR
    approved_by = (SELECT id FROM app_users WHERE auth_id = auth.uid()) OR
    (SELECT role FROM app_users WHERE auth_id = auth.uid()) = 'admin'
  );

-- Insertar roles y permisos por defecto
INSERT INTO role_permissions (role, permissions, description) VALUES
  ('admin', '{"suppliers": ["create","read","update","delete"], "products": ["create","read","update","delete"], "orders": ["create","read","update","delete","approve"], "reports": ["view","export"], "users": ["create","read","update","delete"], "notifications": ["configure"], "all": true}', 'Acceso total al sistema'),
  ('manager', '{"suppliers": ["read","update"], "products": ["read","update"], "orders": ["create","read","update","approve"], "reports": ["view","export"], "notifications": ["configure"], "users": ["read"]}', 'Gerencia - puede ver todo y aprobar órdenes'),
  ('buyer', '{"suppliers": ["read"], "products": ["read","update"], "orders": ["create","read"], "reports": ["view"], "notifications": ["view"]}', 'Comprador - puede crear órdenes'),
  ('viewer', '{"suppliers": ["read"], "products": ["read"], "orders": ["read"], "reports": ["view"], "notifications": ["view"]}', 'Espectador - solo lectura')
ON CONFLICT DO NOTHING;
