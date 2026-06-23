-- Karuma ERP — personal employee accounts and mobile geofenced attendance

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS employee_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_employee_key_unique
  ON users (employee_key)
  WHERE employee_key IS NOT NULL;

ALTER TABLE attendance_events
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS distance_from_store DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_attendance_events_employee_date
  ON attendance_events (employee_key, business_date, occurred_at);

-- After this migration, optionally mirror the PIN employee accounts into
-- the users table with:
-- npm run setup:employee-accounts
