-- Karuma ERP Phase 3: users, staff, roles

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name_zh TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES roles (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES roles (id) ON DELETE RESTRICT,
  phone TEXT,
  email TEXT,
  hire_date DATE,
  contract_type TEXT,
  weekly_hours INTEGER NOT NULL DEFAULT 40,
  hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '在职',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_role_id ON staff (role_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users (role_id);

CREATE OR REPLACE FUNCTION set_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS staff_updated_at ON staff;
CREATE TRIGGER staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION set_staff_updated_at();

-- Roles
INSERT INTO roles (id, name_zh) VALUES
  ('owner', '老板'),
  ('manager', '店长'),
  ('kitchen', '厨房'),
  ('sushi', '寿司'),
  ('waiter', '服务员'),
  ('cashier', '收银'),
  ('dishwasher', '洗碗')
ON CONFLICT (id) DO NOTHING;

-- Default password for all seed users: 123456
-- bcrypt hash generated with cost 10
INSERT INTO users (email, password_hash, name, role_id) VALUES
  ('owner@karuma.es', '$2b$10$KwGY.do7XCOwYJJLESvUtecb1ZlVnSBNfA8xtEa5DP.IIJcIxFcAm', 'Zhou', 'owner'),
  ('manager@karuma.es', '$2b$10$KwGY.do7XCOwYJJLESvUtecb1ZlVnSBNfA8xtEa5DP.IIJcIxFcAm', 'Maria', 'manager'),
  ('kitchen@karuma.es', '$2b$10$KwGY.do7XCOwYJJLESvUtecb1ZlVnSBNfA8xtEa5DP.IIJcIxFcAm', 'Wang', 'kitchen'),
  ('sushi@karuma.es', '$2b$10$KwGY.do7XCOwYJJLESvUtecb1ZlVnSBNfA8xtEa5DP.IIJcIxFcAm', 'Chen', 'sushi'),
  ('waiter@karuma.es', '$2b$10$KwGY.do7XCOwYJJLESvUtecb1ZlVnSBNfA8xtEa5DP.IIJcIxFcAm', 'Laura', 'waiter'),
  ('cashier@karuma.es', '$2b$10$KwGY.do7XCOwYJJLESvUtecb1ZlVnSBNfA8xtEa5DP.IIJcIxFcAm', 'Ana', 'cashier'),
  ('dishwasher@karuma.es', '$2b$10$KwGY.do7XCOwYJJLESvUtecb1ZlVnSBNfA8xtEa5DP.IIJcIxFcAm', 'Pedro', 'dishwasher')
ON CONFLICT (email) DO NOTHING;

INSERT INTO staff (id, name, position, role_id, phone, email, hire_date, contract_type, weekly_hours, hourly_rate, status) VALUES
  ('a0000001-0000-4000-8000-000000000001', 'Zhou', '老板', 'owner', '+34 600 111 001', 'owner@karuma.es', '2020-01-01', '全职', 40, 0, '在职'),
  ('a0000001-0000-4000-8000-000000000002', 'Maria', '店长', 'manager', '+34 612 345 678', 'manager@karuma.es', '2022-03-15', '全职', 40, 15.00, '在职'),
  ('a0000001-0000-4000-8000-000000000003', 'Chen', '寿司师傅', 'sushi', '+34 623 456 789', 'sushi@karuma.es', '2023-01-10', '全职', 40, 14.50, '在职'),
  ('a0000001-0000-4000-8000-000000000004', 'Wang', '厨房', 'kitchen', '+34 634 567 890', 'kitchen@karuma.es', '2023-06-01', '全职', 40, 13.50, '在职'),
  ('a0000001-0000-4000-8000-000000000005', 'Laura', '服务员', 'waiter', '+34 645 678 901', 'waiter@karuma.es', '2024-02-20', '兼职', 30, 11.50, '在职'),
  ('a0000001-0000-4000-8000-000000000008', 'Jhoan', '服务员', 'waiter', '+34 678 901 234', 'jhoan@karuma.es', '2024-08-01', '兼职', 30, 11.50, '在职'),
  ('a0000001-0000-4000-8000-000000000009', 'Isabel', '服务员', 'waiter', '+34 689 012 345', 'isabel@karuma.es', '2024-09-10', '兼职', 30, 11.50, '在职'),
  ('a0000001-0000-4000-8000-00000000000a', 'Celeste', '服务员', 'waiter', '+34 690 123 456', 'celeste@karuma.es', '2025-01-15', '兼职', 25, 11.50, '在职'),
  ('a0000001-0000-4000-8000-00000000000b', 'Edu', '服务员', 'waiter', '+34 601 234 567', 'edu@karuma.es', '2025-03-01', '兼职', 30, 11.50, '在职'),
  ('a0000001-0000-4000-8000-000000000006', 'Ana', '收银', 'cashier', '+34 656 789 012', 'cashier@karuma.es', '2023-09-15', '全职', 35, 12.50, '在职'),
  ('a0000001-0000-4000-8000-000000000007', 'Pedro', '洗碗', 'dishwasher', '+34 667 890 123', 'dishwasher@karuma.es', '2024-06-01', '兼职', 30, 11.00, '在职')
ON CONFLICT (id) DO NOTHING;
