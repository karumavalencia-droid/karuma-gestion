-- Announcement read status tracking / Seguimiento de estado de lectura de anuncios

CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  employee_key TEXT NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(announcement_id, employee_key)
);

CREATE INDEX IF NOT EXISTS idx_announcement_reads_employee_key
  ON announcement_reads (employee_key);

CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement_id
  ON announcement_reads (announcement_id);

ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_manage_announcement_reads" ON announcement_reads;
CREATE POLICY "service_manage_announcement_reads" ON announcement_reads
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
