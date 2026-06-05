-- ============================================================
-- SCHEMA MIGRATION: Add missing columns to mesas
-- ============================================================
ALTER TABLE mesas ADD COLUMN IF NOT EXISTS ultimo_cambio_estado timestamptz;
ALTER TABLE mesas ADD COLUMN IF NOT EXISTS asignado_a uuid;
ALTER TABLE mesas ADD COLUMN IF NOT EXISTS comensales integer;
ALTER TABLE mesas ADD COLUMN IF NOT EXISTS grupo_fusion text;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mesas_asignado_a_fkey') THEN
        ALTER TABLE mesas ADD CONSTRAINT mesas_asignado_a_fkey FOREIGN KEY (asignado_a) REFERENCES perfiles(id) DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
END $$;

-- ============================================================
-- SEED: Roles
-- ============================================================
INSERT INTO roles (nombre) VALUES ('Administrador') ON CONFLICT (nombre) DO NOTHING;
INSERT INTO roles (nombre) VALUES ('Camarero') ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- SEED: Perfiles (credentials stored locally, no auth.users)
--   Admin:  admin@restaurante.com / admin
--   Camarero: camarero@restaurante.com / camarero
-- ============================================================
DO $$
DECLARE
  admin_role_id uuid;
  camarero_role_id uuid;
BEGIN
  SELECT id INTO admin_role_id FROM roles WHERE nombre = 'Administrador';
  SELECT id INTO camarero_role_id FROM roles WHERE nombre = 'Camarero';

  IF NOT EXISTS (SELECT 1 FROM perfiles WHERE email = 'admin@restaurante.com') THEN
    INSERT INTO perfiles (email, password_hash, nombre, apellidos, rol_id)
    VALUES (
      'admin@restaurante.com',
      crypt('admin', gen_salt('bf')),
      'Admin',
      'Principal',
      admin_role_id
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM perfiles WHERE email = 'camarero@restaurante.com') THEN
    INSERT INTO perfiles (email, password_hash, nombre, apellidos, rol_id)
    VALUES (
      'camarero@restaurante.com',
      crypt('camarero', gen_salt('bf')),
      'Carlos',
      'Pérez',
      camarero_role_id
    );
  END IF;
END $$;
