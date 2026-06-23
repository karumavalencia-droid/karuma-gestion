-- Track post-visit review request emails for reservations.

ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS review_email_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_reservas_review_email_pending
  ON reservas (fecha, estado)
  WHERE review_email_sent_at IS NULL;
