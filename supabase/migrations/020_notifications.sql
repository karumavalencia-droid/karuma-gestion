-- Sistema de notificaciones y recomendaciones

CREATE TABLE IF NOT EXISTS user_notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  supplier_id INTEGER,
  notification_type TEXT NOT NULL, -- 'alert', 'forecast', 'recommendation', 'system'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  data JSONB, -- contexto adicional
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de preferencias de notificación
CREATE TABLE IF NOT EXISTS notification_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  email_alerts BOOLEAN DEFAULT true,
  email_forecast BOOLEAN DEFAULT true,
  email_daily_digest BOOLEAN DEFAULT true,
  slack_enabled BOOLEAN DEFAULT false,
  slack_webhook TEXT,
  phone_alerts BOOLEAN DEFAULT false,
  phone_number TEXT,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de recomendaciones
CREATE TABLE IF NOT EXISTS supplier_recommendations (
  id BIGSERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers (id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL, -- 'negotiate', 'switch', 'consolidate', 'bulk_buy'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  potential_savings NUMERIC(12, 2),
  confidence_score NUMERIC(3, 2), -- 0.00 a 1.00
  priority INTEGER, -- 1-10
  action_required TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Tabla de auditoría de notificaciones enviadas
CREATE TABLE IF NOT EXISTS notification_log (
  id BIGSERIAL PRIMARY KEY,
  notification_id BIGINT REFERENCES user_notifications (id),
  channel TEXT NOT NULL, -- 'email', 'slack', 'sms', 'in_app'
  status TEXT NOT NULL, -- 'sent', 'failed', 'bounced'
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON user_notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_supplier_id ON user_notifications (supplier_id);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON user_notifications (priority);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON user_notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_recommendations_supplier_id ON supplier_recommendations (supplier_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_active ON supplier_recommendations (is_active);
CREATE INDEX IF NOT EXISTS idx_notification_log_channel ON notification_log (channel);

-- RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own notifications" ON user_notifications
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own notification read status" ON user_notifications
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can see own preferences" ON notification_preferences
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Recommendations visible to authenticated" ON supplier_recommendations
  FOR SELECT USING (auth.role() = 'authenticated');
