-- Karuma ERP — announcements / 公告栏 and colleagues attendance view

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_key TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  department TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_employee_key
  ON announcements (employee_key);

CREATE INDEX IF NOT EXISTS idx_announcements_department
  ON announcements (department);

CREATE INDEX IF NOT EXISTS idx_announcements_created_at
  ON announcements (created_at DESC);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_manage_announcements" ON announcements;
CREATE POLICY "service_manage_announcements" ON announcements
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
