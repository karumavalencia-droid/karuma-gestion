-- Karuma Coach — asistente IA interno para empleados (fase 1)
-- Conversaciones, mensajes, reportes de incidencias y base de conocimiento.
-- Mismo modelo de acceso que turnos/attendance: solo el service role (API del
-- servidor) accede a estas tablas; el navegador nunca las lee directamente.

-- Conversaciones de chat. Para cuentas de empleado se vincula por employee_id;
-- para cuentas de gestión (sin employeeId) se vincula por user_email.
CREATE TABLE IF NOT EXISTS coach_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT,
  employee_id TEXT,
  role TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_conversations_employee
  ON coach_conversations (employee_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_coach_conversations_email
  ON coach_conversations (user_email, updated_at DESC);

CREATE TABLE IF NOT EXISTS coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES coach_conversations (id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_messages_conversation
  ON coach_messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS coach_incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  employee_name TEXT,
  category TEXT NOT NULL CHECK (
    category IN ('equipment', 'inventory', 'hygiene', 'customer_complaint', 'safety', 'other')
  ),
  location TEXT,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (
    priority IN ('low', 'medium', 'high', 'urgent')
  ),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'reviewing', 'resolved', 'dismissed')
  ),
  source_conversation_id UUID REFERENCES coach_conversations (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_coach_incidents_status
  ON coach_incident_reports (status, created_at DESC);

-- Base de conocimiento estructurada (recetas, Rational, servicio, higiene…).
-- Fase 1: búsqueda simple por título/keywords/contenido, sin vectores.
CREATE TABLE IF NOT EXISTS coach_knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (
    category IN ('recipe', 'rational', 'pira', 'service', 'hygiene', 'opening', 'closing', 'complaints', 'equipment')
  ),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_knowledge_category
  ON coach_knowledge_entries (category) WHERE active;

-- RLS: solo service role, igual que turnos (010) y attendance (006).
ALTER TABLE coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_knowledge_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_manage_coach_conversations" ON coach_conversations;
CREATE POLICY "service_manage_coach_conversations" ON coach_conversations
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_manage_coach_messages" ON coach_messages;
CREATE POLICY "service_manage_coach_messages" ON coach_messages
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_manage_coach_incidents" ON coach_incident_reports;
CREATE POLICY "service_manage_coach_incidents" ON coach_incident_reports
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_manage_coach_knowledge" ON coach_knowledge_entries;
CREATE POLICY "service_manage_coach_knowledge" ON coach_knowledge_entries
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Datos de ejemplo, claramente marcados. Sustituir por contenido real de Karuma.
-- El WHERE NOT EXISTS hace la siembra idempotente si la migración se ejecuta dos veces.
INSERT INTO coach_knowledge_entries (category, title, content, keywords)
SELECT * FROM (VALUES
  (
    'rational',
    '[EJEMPLO] Limpieza diaria del horno Rational',
    'ESTE ES UN CONTENIDO DE EJEMPLO, PENDIENTE DE VALIDAR POR KARUMA. Al cierre: 1) Retirar bandejas y restos sólidos. 2) Iniciar el programa de autolimpieza según el nivel de suciedad. 3) Comprobar que hay pastillas de limpieza y abrillantador. 4) Dejar la puerta entreabierta al terminar. Si el horno muestra un error, no lo fuerces: apúntalo y avisa al encargado.',
    ARRAY['rational', 'horno', 'limpieza', 'autolimpieza', 'cierre']
  ),
  (
    'service',
    '[EJEMPLO] Protocolo básico de atención al cliente',
    'ESTE ES UN CONTENIDO DE EJEMPLO, PENDIENTE DE VALIDAR POR KARUMA. Saluda al cliente al llegar, confirma la reserva o asigna mesa, ofrece la carta y agua. Si un cliente tiene una queja: escucha sin interrumpir, discúlpate, y avisa al encargado si pide compensación o si la queja es grave. Nunca discutas con el cliente.',
    ARRAY['servicio', 'cliente', 'queja', 'protocolo', 'sala']
  ),
  (
    'hygiene',
    '[EJEMPLO] Lavado de manos y guantes',
    'ESTE ES UN CONTENIDO DE EJEMPLO, PENDIENTE DE VALIDAR POR KARUMA. Lávate las manos al entrar en cocina, después de tocar alimentos crudos, tras usar el baño y al cambiar de tarea. Usa guantes para manipular alimentos listos para comer y cámbialos entre tareas. El pelo debe ir recogido y con gorro en cocina.',
    ARRAY['higiene', 'manos', 'guantes', 'appcc', 'cocina']
  )
) AS seed (category, title, content, keywords)
WHERE NOT EXISTS (
  SELECT 1 FROM coach_knowledge_entries WHERE title LIKE '[EJEMPLO]%'
);
