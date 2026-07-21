-- Track confirmation emails for reservation creation retries.

ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_reservas_confirmation_email_pending
  ON reservas (fecha, estado)
  WHERE confirmation_email_sent_at IS NULL;
