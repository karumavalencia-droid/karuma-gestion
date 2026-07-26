-- Tabla de webhooks para integraciones
CREATE TABLE IF NOT EXISTS webhooks (
  id BIGSERIAL PRIMARY KEY,
  event TEXT NOT NULL,
  -- supplier.created, supplier.updated, product.created, product.updated,
  -- alert.triggered, order.approved, order.rejected, forecast.updated
  url TEXT NOT NULL,
  api_key TEXT,
  active BOOLEAN DEFAULT true,
  retry_count INTEGER DEFAULT 0,
  last_triggered TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de logs de integración
CREATE TABLE IF NOT EXISTS integration_logs (
  id BIGSERIAL PRIMARY KEY,
  integration_type TEXT NOT NULL, -- sap, netsuite, oracle, etc
  sync_log JSONB NOT NULL,
  status TEXT DEFAULT 'success', -- success, failed, partial
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de API keys para acceso público
CREATE TABLE IF NOT EXISTS api_keys (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT,
  user_id BIGINT REFERENCES app_users(id) ON DELETE CASCADE,
  scopes TEXT[] DEFAULT ARRAY['read:suppliers', 'read:products'],
  rate_limit INTEGER DEFAULT 1000, -- requests por hora
  last_used TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Tabla de llamadas a API (para rate limiting)
CREATE TABLE IF NOT EXISTS api_call_logs (
  id BIGSERIAL PRIMARY KEY,
  api_key_id BIGINT REFERENCES api_keys(id),
  endpoint TEXT,
  method TEXT,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_webhooks_event ON webhooks(event);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active);
CREATE INDEX IF NOT EXISTS idx_integration_logs_type ON integration_logs(integration_type);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_api_key_id ON api_call_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_created_at ON api_call_logs(created_at);

-- RLS
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "API keys visible to admin" ON api_keys
  FOR SELECT USING ((SELECT role FROM app_users WHERE auth_id = auth.uid()) = 'admin');

CREATE POLICY "Integration logs visible to admin" ON integration_logs
  FOR SELECT USING ((SELECT role FROM app_users WHERE auth_id = auth.uid()) = 'admin');
