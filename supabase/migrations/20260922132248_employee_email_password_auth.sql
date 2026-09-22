-- Employee account activation: verified personal email + private password.
-- Existing employee accounts keep their legacy PIN only until activation.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS must_set_password BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users
SET must_set_password = TRUE
WHERE employee_key IS NOT NULL
  AND email_verified_at IS NULL;

-- Legacy PIN roster entries that were never mirrored into users. The random
-- unusable hash cannot be used to sign in; must_set_password keeps email login
-- blocked until the employee proves the old PIN and verifies a personal email.
INSERT INTO users (email, password_hash, name, role_id, employee_key, must_set_password)
VALUES
  ('zhouzhou@karuma.es', '$2b$12$yNa7FyE70JsXYBNLNeJOIuvSdWaOrcbuGYinUZc8AyWgzkcbo.PEm', 'Zhou', 'owner', 'zhouzhou', TRUE),
  ('carlos@karuma.es', '$2b$12$yNa7FyE70JsXYBNLNeJOIuvSdWaOrcbuGYinUZc8AyWgzkcbo.PEm', 'Carlos', 'waiter', 'carlos', TRUE),
  ('vanessa@karuma.es', '$2b$12$yNa7FyE70JsXYBNLNeJOIuvSdWaOrcbuGYinUZc8AyWgzkcbo.PEm', 'Vanessa', 'waiter', 'vanessa', TRUE),
  ('jhon@karuma.es', '$2b$12$yNa7FyE70JsXYBNLNeJOIuvSdWaOrcbuGYinUZc8AyWgzkcbo.PEm', 'Jhon', 'kitchen', 'jhon', TRUE)
ON CONFLICT (email) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower_unique
  ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS employee_account_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_key TEXT NOT NULL,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('activation', 'password_reset')),
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_account_verifications_lookup
  ON employee_account_verifications (employee_key, purpose, created_at DESC)
  WHERE used_at IS NULL;

ALTER TABLE employee_account_verifications ENABLE ROW LEVEL SECURITY;

-- No client policy: only server APIs using the service role can read/write codes.
REVOKE ALL ON employee_account_verifications FROM anon, authenticated;

CREATE OR REPLACE FUNCTION complete_employee_password_change(
  p_verification_id UUID,
  p_employee_key TEXT,
  p_email TEXT,
  p_password_hash TEXT
)
RETURNS TABLE(session_version INTEGER, account_name TEXT, role_id TEXT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_verification employee_account_verifications%ROWTYPE;
  v_user users%ROWTYPE;
BEGIN
  SELECT * INTO v_verification
  FROM employee_account_verifications
  WHERE id = p_verification_id
    AND employee_key = p_employee_key
    AND LOWER(email) = LOWER(p_email)
    AND used_at IS NULL
    AND expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'verification_not_available';
  END IF;

  SELECT * INTO v_user
  FROM users
  WHERE employee_key = p_employee_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'employee_account_not_found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM users
    WHERE LOWER(email) = LOWER(p_email)
      AND employee_key IS DISTINCT FROM p_employee_key
  ) THEN
    RAISE EXCEPTION 'email_already_in_use';
  END IF;

  UPDATE users
  SET email = LOWER(p_email),
      password_hash = p_password_hash,
      email_verified_at = COALESCE(email_verified_at, NOW()),
      password_changed_at = NOW(),
      must_set_password = FALSE,
      session_version = users.session_version + 1
  WHERE employee_key = p_employee_key
  RETURNING users.session_version, users.name, users.role_id
  INTO session_version, account_name, role_id;

  UPDATE staff
  SET email = LOWER(p_email)
  WHERE LOWER(name) = LOWER(v_user.name);

  UPDATE attendance_credentials
  SET active = FALSE, updated_at = NOW()
  WHERE employee_key = p_employee_key;

  UPDATE employee_account_verifications
  SET used_at = NOW()
  WHERE id = p_verification_id;

  -- Invalidate every other unused code for this employee.
  UPDATE employee_account_verifications
  SET used_at = NOW()
  WHERE employee_key = p_employee_key
    AND used_at IS NULL;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION complete_employee_password_change(UUID, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION complete_employee_password_change(UUID, TEXT, TEXT, TEXT)
  TO service_role;
