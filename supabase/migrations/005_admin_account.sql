-- Built-in administrator account.
-- Email: admin@karuma.es
-- The password hash is bcrypt cost 12. Change it after first access.
INSERT INTO users (email, password_hash, name, role_id)
VALUES (
  'admin@karuma.es',
  '$2b$12$OzAUQHSAaO3utbaRjztr3.ml.nQCue8f179MlvbwiDHkwqzc3SoTK',
  'Karuma Admin',
  'owner'
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role_id = EXCLUDED.role_id;
