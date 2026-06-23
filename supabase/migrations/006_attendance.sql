-- Karuma ERP — employee attendance / fichaje

CREATE TABLE IF NOT EXISTS attendance_credentials (
  employee_key TEXT PRIMARY KEY,
  pin_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL UNIQUE,
  employee_key TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('in', 'out')),
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  business_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'kiosk',
  offline BOOLEAN NOT NULL DEFAULT FALSE,
  device_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_events_business_date
  ON attendance_events (business_date, employee_key, occurred_at);

ALTER TABLE attendance_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_manage_attendance_credentials" ON attendance_credentials;
CREATE POLICY "service_manage_attendance_credentials" ON attendance_credentials
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_manage_attendance_events" ON attendance_events;
CREATE POLICY "service_manage_attendance_events" ON attendance_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- IMPORTANT:
-- PIN validation is handled by the app. You can optionally insert bcrypt
-- hashes privately in Supabase, or override the app PIN map with the
-- KARUMA_ATTENDANCE_PINS server environment variable.
