-- Crear tablas para la topología
CREATE TABLE IF NOT EXISTS zonas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  orden_visual INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mesas (
  id TEXT PRIMARY KEY,
  zona_id TEXT REFERENCES zonas(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 2,
  state TEXT NOT NULL DEFAULT 'disponible',
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  "stateUpdatedAt" BIGINT,
  "lockedUntil" BIGINT,
  "lockedBy" TEXT,
  "assignedTo" TEXT,
  "guests" INTEGER,
  "mergeGroup" TEXT,
  "limboUntil" BIGINT
);

CREATE TABLE IF NOT EXISTS elementos_topologia (
  id TEXT PRIMARY KEY,
  zona_id TEXT REFERENCES zonas(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  width NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  rotation NUMERIC NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- Políticas RLS (permitir todo por ahora al ser app interna)
ALTER TABLE zonas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE elementos_topologia ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all anon on zonas" ON zonas FOR ALL USING (true);
CREATE POLICY "Allow all anon on mesas" ON mesas FOR ALL USING (true);
CREATE POLICY "Allow all anon on elementos_topologia" ON elementos_topologia FOR ALL USING (true);
CREATE POLICY "Allow all anon on system_config" ON system_config FOR ALL USING (true);
