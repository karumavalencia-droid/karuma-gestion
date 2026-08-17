-- Karuma ERP — employee attendance correction / attestation workflow

CREATE TABLE IF NOT EXISTS attendance_correction_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_key TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('in', 'out')),
  occurred_at TIMESTAMPTZ NOT NULL,
  business_date DATE NOT NULL,
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  applied_event_id UUID REFERENCES attendance_events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_corrections_employee_date
  ON attendance_correction_requests (employee_key, business_date, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_corrections_status
  ON attendance_correction_requests (status, created_at DESC);

ALTER TABLE attendance_correction_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_manage_attendance_corrections" ON attendance_correction_requests;
CREATE POLICY "service_manage_attendance_corrections" ON attendance_correction_requests
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
