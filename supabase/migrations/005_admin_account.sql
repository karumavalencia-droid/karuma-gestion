-- Built-in administrator account.
-- Login username: karuma
-- The password hash is bcrypt cost 12. Change it after first access.
INSERT INTO users (email, password_hash, name, role_id)
VALUES (
  'admin@karuma.es',
  '$2b$12$9FsIkdLeg57Lccg94zxxAeFeLS3L2ACMtHIXA4Axc6R3jE7zzMnO.',
  'Karuma Admin',
  'owner'
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role_id = EXCLUDED.role_id;
