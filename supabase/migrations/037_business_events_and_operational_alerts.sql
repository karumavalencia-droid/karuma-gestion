-- ============================================================================
-- 037_business_events_and_operational_alerts.sql
-- Unified operational timeline and exception center for Karuma ERP.
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  event_type text NOT NULL,
  actor_email text,
  source text NOT NULL DEFAULT 'system',
  previous_state jsonb,
  next_state jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_events_entity
  ON business_events (entity_type, entity_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_events_type_time
  ON business_events (event_type, occurred_at DESC);

CREATE TABLE IF NOT EXISTS operational_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  title text NOT NULL,
  description text NOT NULL,
  entity_type text,
  entity_id text,
  source text NOT NULL DEFAULT 'system',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  suggested_action text,
  owner_email text,
  due_at timestamptz,
  detected_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operational_alerts_work_queue
  ON operational_alerts (status, severity, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_operational_alerts_entity
  ON operational_alerts (entity_type, entity_id, detected_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_operational_alerts_active_fingerprint
  ON operational_alerts (alert_type, entity_type, entity_id)
  WHERE status IN ('open', 'acknowledged') AND entity_id IS NOT NULL;

CREATE OR REPLACE FUNCTION set_operational_alerts_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_operational_alerts_updated_at ON operational_alerts;
CREATE TRIGGER trg_operational_alerts_updated_at
  BEFORE UPDATE ON operational_alerts
  FOR EACH ROW EXECUTE FUNCTION set_operational_alerts_updated_at();

ALTER TABLE business_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_manage_business_events" ON business_events;
CREATE POLICY "service_manage_business_events" ON business_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_manage_operational_alerts" ON operational_alerts;
CREATE POLICY "service_manage_operational_alerts" ON operational_alerts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- First live detector: inventory below its configured minimum.
CREATE OR REPLACE FUNCTION detect_inventory_stock_exception()
RETURNS trigger AS $$
BEGIN
  INSERT INTO business_events (
    entity_type, entity_id, event_type, source, previous_state, next_state
  ) VALUES (
    'inventory_item',
    NEW.id::text,
    'inventory.quantity_changed',
    'inventory_trigger',
    CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('quantity', OLD.current_quantity) ELSE NULL END,
    jsonb_build_object('quantity', NEW.current_quantity, 'minimum', NEW.minimum_quantity)
  );

  IF NEW.active AND NEW.current_quantity < NEW.minimum_quantity THEN
    UPDATE operational_alerts
      SET severity = CASE
            WHEN NEW.current_quantity <= 0 THEN 'critical'
            WHEN NEW.current_quantity <= NEW.minimum_quantity * 0.5 THEN 'high'
            ELSE 'medium'
          END,
          title = 'Stock bajo: ' || NEW.name,
          description = format(
            'Quedan %s %s; el mínimo configurado es %s.',
            NEW.current_quantity, NEW.unit, NEW.minimum_quantity
          ),
          evidence = jsonb_build_object(
            'current_quantity', NEW.current_quantity,
            'minimum_quantity', NEW.minimum_quantity,
            'unit', NEW.unit,
            'supplier', NEW.supplier_name
          ),
          suggested_action = 'Revisar consumo y preparar reposición con el proveedor.',
          status = 'open',
          resolved_at = NULL,
          resolution_note = NULL
      WHERE alert_type = 'inventory.low_stock'
        AND entity_type = 'inventory_item'
        AND entity_id = NEW.id::text
        AND status IN ('open', 'acknowledged');

    IF NOT FOUND THEN
      INSERT INTO operational_alerts (
        alert_type, severity, title, description, entity_type, entity_id,
        source, evidence, suggested_action
      ) VALUES (
        'inventory.low_stock',
        CASE
          WHEN NEW.current_quantity <= 0 THEN 'critical'
          WHEN NEW.current_quantity <= NEW.minimum_quantity * 0.5 THEN 'high'
          ELSE 'medium'
        END,
        'Stock bajo: ' || NEW.name,
        format(
          'Quedan %s %s; el mínimo configurado es %s.',
          NEW.current_quantity, NEW.unit, NEW.minimum_quantity
        ),
        'inventory_item',
        NEW.id::text,
        'inventory_trigger',
        jsonb_build_object(
          'current_quantity', NEW.current_quantity,
          'minimum_quantity', NEW.minimum_quantity,
          'unit', NEW.unit,
          'supplier', NEW.supplier_name
        ),
        'Revisar consumo y preparar reposición con el proveedor.'
      );
    END IF;
  ELSE
    UPDATE operational_alerts
      SET status = 'resolved',
          resolved_at = now(),
          resolution_note = 'Resuelta automáticamente al recuperar el nivel de stock.'
      WHERE alert_type = 'inventory.low_stock'
        AND entity_type = 'inventory_item'
        AND entity_id = NEW.id::text
        AND status IN ('open', 'acknowledged');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The production database may receive this migration before inventory_core.
-- Install and backfill the detector only when inventory_items already exists.
DO $$
BEGIN
  IF to_regclass('public.inventory_items') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_inventory_stock_exception ON public.inventory_items';
    EXECUTE '
      CREATE TRIGGER trg_inventory_stock_exception
      AFTER INSERT OR UPDATE OF current_quantity, minimum_quantity, active
      ON public.inventory_items
      FOR EACH ROW EXECUTE FUNCTION detect_inventory_stock_exception()
    ';

    EXECUTE $backfill$
      INSERT INTO operational_alerts (
        alert_type, severity, title, description, entity_type, entity_id,
        source, evidence, suggested_action
      )
      SELECT
        'inventory.low_stock',
        CASE
          WHEN current_quantity <= 0 THEN 'critical'
          WHEN current_quantity <= minimum_quantity * 0.5 THEN 'high'
          ELSE 'medium'
        END,
        'Stock bajo: ' || name,
        format('Quedan %s %s; el mínimo configurado es %s.', current_quantity, unit, minimum_quantity),
        'inventory_item',
        id::text,
        'inventory_backfill',
        jsonb_build_object(
          'current_quantity', current_quantity,
          'minimum_quantity', minimum_quantity,
          'unit', unit,
          'supplier', supplier_name
        ),
        'Revisar consumo y preparar reposición con el proveedor.'
      FROM public.inventory_items
      WHERE active AND current_quantity < minimum_quantity
      ON CONFLICT (alert_type, entity_type, entity_id)
        WHERE status IN ('open', 'acknowledged') AND entity_id IS NOT NULL
      DO NOTHING
    $backfill$;
  END IF;
END;
$$;
