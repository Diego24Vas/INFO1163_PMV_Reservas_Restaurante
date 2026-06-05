-- ============================================================
-- Migration: Add historial_eventos table
-- ============================================================

CREATE TABLE IF NOT EXISTS historial_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waiter_id text NOT NULL,
  waiter_name text NOT NULL,
  table_number text NOT NULL,
  room_name text NOT NULL,
  action text NOT NULL,
  affected_waiter_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE historial_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all anon on historial_eventos"
  ON historial_eventos FOR ALL TO anon USING (true);

COMMENT ON TABLE historial_eventos IS 'Registro de cambios de estado de mesas para auditoría';
COMMENT ON COLUMN historial_eventos.waiter_id IS 'ID del camarero o "admin"';
COMMENT ON COLUMN historial_eventos.action IS 'disponible, asignacion, ocupada, sucia';
COMMENT ON COLUMN historial_eventos.affected_waiter_id IS 'Camarero afectado (reasignaciones)';
