-- Track confirmation emails for reservations so retries do not resend them.

ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmation_email_send_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reservas_confirmation_email_send_key
  ON reservas (confirmation_email_send_key)
  WHERE confirmation_email_send_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reservas_confirmation_email_pending
  ON reservas (fecha, estado)
  WHERE confirmation_email_sent_at IS NULL;
